import type { AnnotationEntry } from "@/types/file-annotations";

type OptimisticAnnotationUpdateOptions<TValue> = {
  annotations: AnnotationEntry<TValue>[];
  getCurrentAnnotationsState: () => Record<string, TValue>;
  setAnnotations: (next: Record<string, TValue>) => void;
  defaultValue: TValue;
  persistFn: (annotations: AnnotationEntry<TValue>[]) => Promise<unknown>;
  label: string;
};

export function applyOptimisticAnnotationUpdate<TValue>({
  annotations,
  getCurrentAnnotationsState,
  setAnnotations,
  defaultValue,
  persistFn,
  label,
}: OptimisticAnnotationUpdateOptions<TValue>) {
  if (!annotations.length) {
    return;
  }

  const previous = annotations.reduce<Record<string, TValue>>(
    (accumulator, annotation) => {
      const path = annotation.path;

      accumulator[path] = getCurrentAnnotationsState()[path] ?? defaultValue;

      return accumulator;
    },
    {},
  );

  const nextMap = { ...getCurrentAnnotationsState() };

  annotations.forEach((annotation) => {
    nextMap[annotation.path] = annotation.value;
  });

  setAnnotations(nextMap);

  void persistFn(annotations).catch((error) => {
    console.error(`[${label}] persist failed`, error);

    setAnnotations({ ...getCurrentAnnotationsState(), ...previous });
  });
}
