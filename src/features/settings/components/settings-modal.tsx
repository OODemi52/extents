import { memo } from "react";
import { Button, Modal, Tabs } from "@heroui/react";

import { useSettingsStore } from "../stores/settings-store";
import { SystemTab } from "../system";

import appIcon from "@/assets/icons/app-icon.png";

export const SettingsModal = memo(function SettingsModal() {
  const isSettingsModalOpen = useSettingsStore(
    (state) => state.isSettingsModalOpen,
  );
  const closeSettingsModal = useSettingsStore(
    (state) => state.closeSettingsModal,
  );

  return (
    <Modal
      isOpen={isSettingsModalOpen}
      onOpenChange={(isOpen) => {
        if (!isOpen) {
          closeSettingsModal();
        }
      }}
    >
      <Modal.Backdrop variant="blur">
        <Modal.Container placement="center" size="lg">
          <Modal.Dialog className="h-[600px] max-h-[calc(100vh-2rem)] w-[860px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-[16px] border border-zinc-700/50 bg-zinc-950 p-0 text-zinc-100 shadow-2xl">
            <Modal.Header className="flex h-14 shrink-0 items-center gap-3 border-b border-white/[0.055] px-5 py-0">
              <img
                alt=""
                aria-hidden="true"
                className="h-7 w-7 shrink-0"
                src={appIcon}
              />
              <Modal.Heading className="text-sm font-semibold text-zinc-100">
                Settings
              </Modal.Heading>
            </Modal.Header>

            <Modal.Body className="min-h-0 flex-1 overflow-hidden p-0">
              <Tabs
                aria-label="Settings sections"
                className="grid h-full w-full grid-cols-[13rem_minmax(0,1fr)] overflow-hidden"
                defaultSelectedKey="system"
                orientation="vertical"
                variant="secondary"
              >
                <Tabs.ListContainer className="h-full border-r border-white/[0.055] bg-zinc-950/40 p-3">
                  <Tabs.List className="w-full bg-transparent p-0">
                    <Tabs.Tab
                      className="h-auto min-h-14 w-full justify-start rounded-xl px-3 py-2 text-left text-zinc-400 data-[selected=true]:bg-zinc-800 data-[selected=true]:text-zinc-100"
                      id="system"
                    >
                      <div className="flex min-w-0 flex-col gap-0.5">
                        <span className="text-sm font-medium">System</span>
                        <span className="text-xs font-normal leading-4 text-zinc-500">
                          Storage and cache
                        </span>
                      </div>
                    </Tabs.Tab>
                  </Tabs.List>
                </Tabs.ListContainer>
                <Tabs.Panel className="min-w-0 overflow-y-auto p-6" id="system">
                  <SystemTab />
                </Tabs.Panel>
              </Tabs>
            </Modal.Body>

            <Modal.Footer className="flex h-14 shrink-0 items-center border-t border-white/[0.055] px-5 py-0">
              <Button
                className="min-w-20 rounded-xl font-medium"
                size="sm"
                variant="secondary"
                onPress={closeSettingsModal}
              >
                Close
              </Button>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
});
