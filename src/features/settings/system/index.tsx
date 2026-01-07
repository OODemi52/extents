import { CacheSettings } from "./components/cache-settings";

export function SystemTab() {
  return (
    <div className="flex flex-col gap-4">
      <CacheSettings />
    </div>
  );
}
