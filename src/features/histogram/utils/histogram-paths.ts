const HISTOGRAM_HEIGHT = 100;
const HISTOGRAM_STEP = 100 / 255;

export const computeCurve = (values: number[]) => {
  return values
    .map((value, index) => {
      const x = index * HISTOGRAM_STEP;
      const y = HISTOGRAM_HEIGHT - value * HISTOGRAM_HEIGHT;

      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
};

export const computeArea = (values: number[]) => {
  const points = values.map((value, index) => {
    const x = index * HISTOGRAM_STEP;
    const y = HISTOGRAM_HEIGHT - value * HISTOGRAM_HEIGHT;

    return `${x.toFixed(2)},${y.toFixed(2)}`;
  });

  return `M 0 ${HISTOGRAM_HEIGHT} L ${points.join(" ")} L 100 ${HISTOGRAM_HEIGHT} Z`;
};
