const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export const formatBytes = (bytes: number) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "-";
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

export const formatShutterSpeed = (seconds: number | null) => {
  if (!seconds || seconds <= 0) {
    return "-";
  }

  if (seconds >= 1) {
    return `${seconds.toFixed(1)}s`;
  }

  const denominator = Math.round(1 / seconds);

  return `1/${denominator}s`;
};

export const formatAperture = (value: number | null) =>
  value ? `f/${value.toFixed(1)}` : "-";

export const formatFocalLength = (value: number | null) =>
  value ? `${value.toFixed(0)}mm` : "-";

export const formatExposureBias = (value: number | null) => {
  if (value === null || value === undefined) {
    return "-";
  }

  const sign = value > 0 ? "+" : "";

  return `${sign}${value.toFixed(1)} EV`;
};

export const formatDimensions = (
  width: number | null,
  height: number | null,
) => {
  if (!width || !height) {
    return "-";
  }

  return `${width} x ${height}`;
};

export const formatDateTaken = (value: string | null) => {
  if (!value) {
    return "-";
  }

  const match = value.match(
    /^(\d{4}):(\d{2}):(\d{2})[ T](\d{2}):(\d{2}):(\d{2})/,
  );

  if (!match) {
    return value;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour24 = Number(match[4]);
  const minute = match[5];
  const second = match[6];

  const monthName = MONTH_NAMES[month - 1];

  if (!monthName || Number.isNaN(year) || Number.isNaN(day)) {
    return value;
  }

  const suffix = hour24 >= 12 ? "PM" : "AM";
  const hour12 = hour24 % 12 || 12;

  return `${monthName} ${day}, ${year} at ${hour12}:${minute}:${second} ${suffix}`;
};

export const formatGPS = (lat: number | null, lon: number | null) => {
  if (lat === null || lon === null || lat === undefined || lon === undefined) {
    return "-";
  }

  return `${lat.toFixed(5)}, ${lon.toFixed(5)}`;
};
