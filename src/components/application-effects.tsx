import { memo } from "react";

import { useActiveSidecar } from "@/features/sidecar/hooks/use-active-sidecar";
import { useFilteredSelectionSync } from "@/features/filter/hooks/use-filtered-files";
import { useCacheSize } from "@/features/settings/system/hooks/use-cache-size";
import { useAnnotations } from "@/hooks/use-annotations";
import { useApplicationKeyboard } from "@/hooks/use-application-keyboard";
import { useExifMetadata } from "@/hooks/use-exif-metadata";

const AnnotationEffects = memo(function AnnotationEffects() {
  useAnnotations();

  return null;
});

const ExifEffects = memo(function ExifEffects() {
  useExifMetadata();

  return null;
});

const CacheEffects = memo(function CacheEffects() {
  useCacheSize();

  return null;
});

const SidecarEffects = memo(function SidecarEffects() {
  useActiveSidecar();

  return null;
});

const FilteredSelectionEffects = memo(function FilteredSelectionEffects() {
  useFilteredSelectionSync();

  return null;
});

const KeyboardEffects = memo(function KeyboardEffects() {
  useApplicationKeyboard();

  return null;
});

export const ApplicationEffects = memo(function ApplicationEffects() {
  return (
    <>
      <AnnotationEffects />
      <ExifEffects />
      <CacheEffects />
      <SidecarEffects />
      <FilteredSelectionEffects />
      <KeyboardEffects />
    </>
  );
});
