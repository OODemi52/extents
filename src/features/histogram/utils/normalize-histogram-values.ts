import type { HistogramData } from "@/types/histogram";

export const normalizeHistogramValues = (
  data: HistogramData,
): HistogramData => {
  const maxValue = Math.max(
    1,
    ...data.red,
    ...data.green,
    ...data.blue,
    ...data.luma,
  );

  const normalize = (values: number[]) =>
    values.map((value) => value / maxValue);

  return {
    red: normalize(data.red),
    green: normalize(data.green),
    blue: normalize(data.blue),
    luma: normalize(data.luma),
  };
};
