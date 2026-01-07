export const formatBytes = (bytes: number | null | undefined) => {
  if (!Number.isFinite(bytes) || bytes == null) {
    return "-";
  }

  if (bytes === 0) {
    return "0 B";
  }

  const units = ["B", "KB", "MB", "GB", "TB"];
  const index = Math.min(
    units.length - 1,
    Math.floor(Math.log(bytes) / Math.log(1024)),
  );

  const value = bytes / 1024 ** index;
  const formatted = value >= 10 ? value.toFixed(0) : value.toFixed(1);

  return `${formatted} ${units[index]}`;
};
