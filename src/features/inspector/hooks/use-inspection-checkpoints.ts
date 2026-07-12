import type { EditRecipe } from "@/types/sidecar";
import type { CaptureInspectionCheckpointVariant } from "@/types/inspection-checkpoint";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { api } from "@/services/api";
import { useActiveSidecarStore } from "@/features/sidecar/store/active-sidecar-store";
import { useInspectionWorkspaceStore } from "@/features/inspector/store/inspection-workspace-store";
import { useImageStore } from "@/store/image-store";
import { useImageTransformStore } from "@/store/transform-store";
import { useLayoutStore } from "@/store/layout-store";

const DEFAULT_RECIPE: EditRecipe = {
  exposure_ev: 0,
};

const EXPOSURE_REFERENCE_VALUES = [-2, -1, 0, 1, 2];

type CaptureProgress = {
  completed: number;
  total: number;
  label: string;
};

type CaptureMutationArgs = {
  onProgress?: (progress: CaptureProgress) => void;
};

export function useInspectionCheckpoints() {
  const queryClient = useQueryClient();
  const files = useImageStore((state) => state.files);
  const selectedIndex = useImageStore((state) => state.selectedIndex);
  const activeLayout = useLayoutStore((state) => state.activeLayout);
  const scale = useImageTransformStore((state) => state.scale);
  const offsetX = useImageTransformStore((state) => state.offsetX);
  const offsetY = useImageTransformStore((state) => state.offsetY);
  const sidecar = useActiveSidecarStore((state) => state.sidecar);
  const clearCheckpoint = useInspectionWorkspaceStore(
    (state) => state.clearCheckpoint,
  );
  const selectedImage = selectedIndex !== null ? files[selectedIndex] : null;
  const sourcePath = selectedImage?.path ?? null;

  const allCheckpointsQuery = useQuery({
    queryKey: ["inspection-checkpoints"],
    queryFn: () => api.inspection.listCheckpoints({ limit: 50 }),
  });
  const currentImageCheckpointsQuery = useQuery({
    queryKey: ["inspection-checkpoints", "source", sourcePath],
    queryFn: () => {
      if (!sourcePath) {
        return [];
      }

      return api.inspection.listCheckpointsForSource({
        sourcePath,
        limit: 100,
      });
    },
    enabled: Boolean(sourcePath),
  });

  const allCheckpoints = allCheckpointsQuery.data ?? [];
  const currentImageCheckpoints = currentImageCheckpointsQuery.data ?? [];

  const capture = useMutation({
    mutationFn: async (args?: CaptureMutationArgs) => {
      if (!sourcePath) {
        throw new Error("No image is selected.");
      }

      const editRecipe = sidecar?.recipe ?? DEFAULT_RECIPE;
      const variants = buildExposureCaptureVariants(editRecipe);
      const total = variants.length;
      let checkpointId: number | null = null;

      args?.onProgress?.({
        completed: 0,
        total,
        label: "Preparing",
      });

      const checkpoint = await api.inspection.createCheckpointSet({
        sourcePath,
        activeLayout,
        label: selectedImage?.fileName ?? null,
        viewport: {
          activeLayout,
          scale,
          offsetX,
          offsetY,
        },
        editRecipe,
        notes: null,
      });

      checkpointId = checkpoint.id;

      try {
        for (const [index, variant] of variants.entries()) {
          args?.onProgress?.({
            completed: index,
            total,
            label: variant.label,
          });

          await waitForProgressPaint();

          await api.inspection.captureCheckpointArtifact({
            checkpointId: checkpoint.id,
            variantIndex: index,
            label: variant.label,
            editRecipe: variant.editRecipe,
            restoreEditRecipe: editRecipe,
          });

          args?.onProgress?.({
            completed: index + 1,
            total,
            label: variant.label,
          });

          await waitForProgressPaint();
        }

        await waitForCaptureCompletionDisplay();
      } catch (error) {
        if (checkpointId !== null) {
          try {
            await api.inspection.deleteCheckpoint({ id: checkpointId });
          } catch {
            // Preserve the capture error. A stale partial checkpoint can be cleared later.
          }
        }

        throw error;
      }

      return checkpoint;
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["inspection-checkpoints"],
      });
    },
  });

  const deleteCheckpoint = useMutation({
    mutationFn: (id: number) => api.inspection.deleteCheckpoint({ id }),
    onSuccess: () => {
      clearCheckpoint();
      void queryClient.invalidateQueries({
        queryKey: ["inspection-checkpoints"],
      });
    },
  });

  const deleteCurrentImageCheckpoints = useMutation({
    mutationFn: () => {
      if (!sourcePath) {
        throw new Error("No image is selected.");
      }

      return api.inspection.deleteCheckpointsForSource(sourcePath);
    },
    onSuccess: () => {
      clearCheckpoint();
      void queryClient.invalidateQueries({
        queryKey: ["inspection-checkpoints"],
      });
    },
  });

  const deleteAllCheckpoints = useMutation({
    mutationFn: () => api.inspection.deleteAllCheckpoints(),
    onSuccess: () => {
      clearCheckpoint();
      void queryClient.invalidateQueries({
        queryKey: ["inspection-checkpoints"],
      });
    },
  });

  return {
    allCheckpoints,
    currentImageCheckpoints,
    isLoading:
      allCheckpointsQuery.isLoading || currentImageCheckpointsQuery.isLoading,
    error: allCheckpointsQuery.error ?? currentImageCheckpointsQuery.error,
    capture,
    deleteCheckpoint,
    deleteCurrentImageCheckpoints,
    deleteAllCheckpoints,
    canCapture: Boolean(sourcePath),
    canDeleteCurrentImageCheckpoints: Boolean(sourcePath),
  };
}

function buildExposureCaptureVariants(
  recipe: EditRecipe,
): CaptureInspectionCheckpointVariant[] {
  return EXPOSURE_REFERENCE_VALUES.map((exposureEv) => ({
    label: formatExposureLabel(exposureEv),
    editRecipe: {
      ...recipe,
      exposure_ev: exposureEv,
    },
  }));
}

function formatExposureLabel(exposureEv: number) {
  if (exposureEv > 0) {
    return `+${exposureEv} EV`;
  }

  return `${exposureEv} EV`;
}

const waitForProgressPaint = () =>
  new Promise<void>((resolve) => {
    requestAnimationFrame(() => {
      window.setTimeout(resolve, 0);
    });
  });

const waitForCaptureCompletionDisplay = () =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, 350);
  });
