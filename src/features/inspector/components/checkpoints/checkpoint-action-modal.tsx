import { Button, Modal, Spinner } from "@heroui/react";

import { cn } from "@/lib/cn";

export type CheckpointCaptureProgress = {
  completed: number;
  total: number;
  label: string;
};

type CheckpointConfirmationModalProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  isLoading?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function CheckpointConfirmationModal({
  isOpen,
  title,
  description,
  confirmLabel,
  isLoading = false,
  onCancel,
  onConfirm,
}: CheckpointConfirmationModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onOpenChange={(open) => {
        if (!open && !isLoading) {
          onCancel();
        }
      }}
    >
      <Modal.Backdrop isDismissable={!isLoading} variant="blur">
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog
            className={cn(
              "overflow-hidden rounded-[16px] text-zinc-100",
              "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
            )}
          >
            <Modal.Header className="px-4 py-3 text-sm">
              <Modal.Heading>{title}</Modal.Heading>
            </Modal.Header>
            <Modal.Body className="px-4 py-4 text-sm text-zinc-400">
              {description}
            </Modal.Body>
            <Modal.Footer className="px-4 py-3">
              <Button
                className="h-8 min-w-20 rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] px-3 text-[11px] text-zinc-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] hover:bg-[rgba(50,50,50,0.99)] hover:text-white"
                isDisabled={isLoading}
                size="sm"
                onPress={onCancel}
              >
                Cancel
              </Button>
              <Button
                className={cn(
                  "h-8 min-w-20 rounded-[16px] border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] px-3 text-[11px] text-zinc-300 shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)] hover:bg-[rgba(50,50,50,0.99)] hover:text-white",
                  "text-red-300 hover:text-red-200",
                )}
                isPending={isLoading}
                size="sm"
                onPress={onConfirm}
              >
                {confirmLabel}
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

export function CheckpointCaptureModal({
  isOpen,
  progress,
}: {
  isOpen: boolean;
  progress: CheckpointCaptureProgress | null;
}) {
  const total = progress?.total ?? 0;
  const completed = progress?.completed ?? 0;
  const progressPercent = total > 0 ? (completed / total) * 100 : 0;

  return (
    <Modal isOpen={isOpen}>
      <Modal.Backdrop
        isKeyboardDismissDisabled
        isDismissable={false}
        variant="blur"
      >
        <Modal.Container placement="center" size="sm">
          <Modal.Dialog
            aria-label="Capturing inspection set"
            className={cn(
              "overflow-hidden rounded-[16px] text-zinc-100",
              "border border-zinc-700/50 bg-[rgba(30,30,30,0.99)] shadow-[2px_4px_16px_0px_rgba(248,248,248,0.06)_inset] drop-shadow-[0_0_1px_rgba(0,0,0,0.6)]",
            )}
          >
            <Modal.Body className="flex flex-row items-center gap-4 py-5">
              <Spinner color="current" size="sm" />
              <div className="min-w-0 flex-1 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-sm font-medium text-zinc-100">
                    Capturing inspection set
                  </div>
                  <div className="text-[11px] text-zinc-500">
                    {total > 0 ? `${completed}/${total}` : "Preparing"}
                  </div>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-zinc-900">
                  <div
                    className="h-full rounded-full bg-blue-500 transition-[width] duration-200"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <div className="truncate text-xs text-zinc-500">
                  {progress?.label ?? "Preparing renderer output"}
                </div>
              </div>
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
