type OptimisticAnnotationUpdateOptions<TEntry, TValue> = {
  annotations: TEntry[];
  getCurrentAnnotations: () => Record<string, TValue>;
  setAnnotations: (next: Record<string, TValue>) => void;
  getPath: (annotation: TEntry) => string;
  getValue: (annotation: TEntry) => TValue;
  defaultValue: TValue;
  persistFn: (annotations: TEntry[]) => Promise<unknown>;
  label: string;
};

export function applyOptimisticAnnotationUpdate<TEntry, TValue>({
  annotations,
  getCurrentAnnotations,
  setAnnotations,
  getPath,
  getValue,
  defaultValue,
  persistFn,
  label,
}: OptimisticAnnotationUpdateOptions<TEntry, TValue>) {
  if (!annotations.length) {
    return;
  }

  const previous = annotations.reduce<Record<string, TValue>>(
    (accumulator, annotation) => {
      const path = getPath(annotation);

      accumulator[path] = getCurrentAnnotations()[path] ?? defaultValue;

      return accumulator;
    },
    {},
  );

  const nextMap = { ...getCurrentAnnotations() };

  annotations.forEach((annotation) => {
    nextMap[getPath(annotation)] = getValue(annotation);
  });

  setAnnotations(nextMap);

  void persistFn(annotations).catch((error) => {
    console.error(`[${label}] persist failed`, error);

    setAnnotations({ ...getCurrentAnnotations(), ...previous });
  });
}
