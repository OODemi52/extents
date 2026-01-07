import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from "@heroui/modal";
import { Button } from "@heroui/button";
import { Tabs, Tab } from "@heroui/tabs";

import { useSettingsStore } from "../stores/settings-store";
import { SystemTab } from "../system";

import appIcon from "@/assets/icons/app-icon.png";

export function SettingsModal() {
  const { isSettingsModalOpen, closeSettingsModal } = useSettingsStore();

  return (
    <Modal
      backdrop="blur"
      className="border-2 border-zinc-700"
      isOpen={isSettingsModalOpen}
      placement="center"
      onOpenChange={closeSettingsModal}
    >
      <ModalContent className="w-[900px] max-w-[90vw] h-[600px] max-h-[90vh] p-0">
        <ModalHeader className=" font-bold justify-between h-14 pl-2 pt-1 pb-0 border-b border-b-zinc-700 bg-zinc-[#1c1c1f]">
          <img alt="Settings" className="h-12 w-12 mr-2" src={appIcon} />
          <h1 className="pt-5 pr-2 pb-1 text-12 text-zinc-300">Settings</h1>
        </ModalHeader>

        <ModalBody className="relative flex h-full p-0">
          <Tabs
            isVertical
            classNames={{
              base: "h-full pt-2",
              tabWrapper: "h-full items-stretch",
              tabList: "ml-2 h-auto min-h-full flex flex-col items-stretch",
              tab: "items-start text-left h-24 bg-zinc-700",
              panel: "flex-1 h-full border-l border-l-zinc-800 pt-3 p-4",
            }}
            variant="light"
          >
            <Tab
              key="system"
              title={
                <div className="flex-col justify-start text-start">
                  <h4 className="tracking-wide text-2xl font-bold">System</h4>
                  <p className=" text-[12px] font-light italic leading-[1.1] text-zinc-400 whitespace-normal break-words">
                    Cache management, storage usage, and internal system
                    settings.
                  </p>
                </div>
              }
            >
              <SystemTab />
            </Tab>
          </Tabs>
        </ModalBody>

        <ModalFooter>
          <Button color="primary" onPress={closeSettingsModal}>
            Close
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
