import { CheckMenuItem, MenuItem, Submenu } from "@tauri-apps/api/menu";

import { separator, setExclusiveChecked } from "./standard";

import { useRatingStore } from "@/features/annotate/rating/store/use-rating-store";
import { useImageStore } from "@/store/image-store";

const ratingGroup: CheckMenuItem[] = [];
const flagGroup: CheckMenuItem[] = [];

const ratingTitle = await MenuItem.new({
  id: "photo.section.rating",
  text: "Set Rating",
  enabled: false,
});

const ratingZero = await CheckMenuItem.new({
  id: "photo.rating.0",
  text: "0 Stars",
  accelerator: "0",
  enabled: false,
  action: () => {
    const { selectedPaths } = useImageStore.getState();

    if (!selectedPaths.size) {
      return;
    }

    useRatingStore
      .getState()
      .setRatings([...selectedPaths].map((path) => ({ path, value: 0 })));
  },
});

const ratingOne = await CheckMenuItem.new({
  id: "photo.rating.1",
  text: "1 Star",
  accelerator: "1",
  enabled: false,
  action: () => {
    const { selectedPaths } = useImageStore.getState();

    if (!selectedPaths.size) {
      return;
    }

    useRatingStore
      .getState()
      .setRatings([...selectedPaths].map((path) => ({ path, value: 1 })));
  },
});

const ratingTwo = await CheckMenuItem.new({
  id: "photo.rating.2",
  text: "2 Stars",
  accelerator: "2",
  enabled: false,
  action: () => {
    const { selectedPaths } = useImageStore.getState();

    if (!selectedPaths.size) {
      return;
    }

    useRatingStore
      .getState()
      .setRatings([...selectedPaths].map((path) => ({ path, value: 2 })));
  },
});

const ratingThree = await CheckMenuItem.new({
  id: "photo.rating.3",
  text: "3 Stars",
  accelerator: "3",
  enabled: false,
  action: () => {
    const { selectedPaths } = useImageStore.getState();

    if (!selectedPaths.size) {
      return;
    }

    useRatingStore
      .getState()
      .setRatings([...selectedPaths].map((path) => ({ path, value: 3 })));
  },
});

const ratingFour = await CheckMenuItem.new({
  id: "photo.rating.4",
  text: "4 Stars",
  accelerator: "4",
  enabled: false,
  action: () => {
    const { selectedPaths } = useImageStore.getState();

    if (!selectedPaths.size) {
      return;
    }

    useRatingStore
      .getState()
      .setRatings([...selectedPaths].map((path) => ({ path, value: 4 })));
  },
});

const ratingFive = await CheckMenuItem.new({
  id: "photo.rating.5",
  text: "5 Stars",
  accelerator: "5",
  enabled: false,
  action: () => {
    const { selectedPaths } = useImageStore.getState();

    if (!selectedPaths.size) {
      return;
    }

    useRatingStore
      .getState()
      .setRatings([...selectedPaths].map((path) => ({ path, value: 5 })));
  },
});

ratingGroup.push(
  ratingZero,
  ratingOne,
  ratingTwo,
  ratingThree,
  ratingFour,
  ratingFive,
);

const updateRatingMenuState = () => {
  const { selectedPaths } = useImageStore.getState();
  const hasSelection = selectedPaths.size > 0;

  ratingGroup.forEach((item) => {
    void item.setEnabled(hasSelection);
  });

  if (!hasSelection) {
    setExclusiveChecked(ratingGroup, null);

    return;
  }

  const { ratings } = useRatingStore.getState();
  const paths = [...selectedPaths];
  const firstRating = ratings[paths[0]] ?? 0;
  const isUniform = paths.every((path) => (ratings[path] ?? 0) === firstRating);

  if (!isUniform) {
    setExclusiveChecked(ratingGroup, null);

    return;
  }

  setExclusiveChecked(ratingGroup, `photo.rating.${firstRating}`);
};

updateRatingMenuState();
useImageStore.subscribe(updateRatingMenuState);
useRatingStore.subscribe(updateRatingMenuState);

const flagTitle = await MenuItem.new({
  id: "photo.section.flag",
  text: "Set Flag",
  enabled: false,
});

const flagUnflagged = await CheckMenuItem.new({
  id: "photo.flag.unflagged",
  text: "Unflagged",
  accelerator: "U",
  checked: true,
  action: (id) => setExclusiveChecked(flagGroup, id),
});

const flagPick = await CheckMenuItem.new({
  id: "photo.flag.pick",
  text: "Pick",
  accelerator: "Z",
  action: (id) => setExclusiveChecked(flagGroup, id),
});

const flagReject = await CheckMenuItem.new({
  id: "photo.flag.reject",
  text: "Reject",
  accelerator: "X",
  action: (id) => setExclusiveChecked(flagGroup, id),
});

flagGroup.push(flagUnflagged, flagPick, flagReject);

const increaseFlagStatus = await MenuItem.new({
  id: "photo.flag.increase",
  text: "Increase Flag Status",
  accelerator: "CmdOrCtrl+Up",
  enabled: false,
});

const decreaseFlagStatus = await MenuItem.new({
  id: "photo.flag.decrease",
  text: "Decrease Flag Status",
  accelerator: "CmdOrCtrl+Down",
  enabled: false,
});

const autoAdvance = await CheckMenuItem.new({
  id: "photo.autoAdvance",
  text: "Auto-Advance",
  enabled: false,
});

const createAlbum = await MenuItem.new({
  id: "photo.createAlbum",
  text: "Create Album with 1 Photo...",
  enabled: false,
});

const albumsTitle = await MenuItem.new({
  id: "photo.albums.title",
  text: "Albums",
  enabled: false,
});

const addToAlbum = await Submenu.new({
  text: "Add to Album",
  items: [albumsTitle],
});

const addKeyword = await MenuItem.new({
  id: "photo.addKeyword",
  text: "Add Keyword...",
  accelerator: "CmdOrCtrl+K",
  enabled: false,
});

const editDateTime = await MenuItem.new({
  id: "photo.editDateTime",
  text: "Edit Date and Time...",
  enabled: false,
});

const rotateLeft = await MenuItem.new({
  id: "photo.rotateLeft",
  text: "Rotate Left (CCW)",
  accelerator: "CmdOrCtrl+[",
  enabled: false,
});

const rotateRight = await MenuItem.new({
  id: "photo.rotateRight",
  text: "Rotate Right (CW)",
  accelerator: "CmdOrCtrl+]",
  enabled: false,
});

const flipHorizontal = await MenuItem.new({
  id: "photo.flipHorizontal",
  text: "Flip Horizontal",
  accelerator: "Shift+CmdOrCtrl+[",
  enabled: false,
});

const flipVertical = await MenuItem.new({
  id: "photo.flipVertical",
  text: "Flip Vertical",
  accelerator: "Shift+CmdOrCtrl+]",
  enabled: false,
});

const autoSettings = await MenuItem.new({
  id: "photo.autoSettings",
  text: "Auto Settings",
  accelerator: "Shift+A",
  enabled: false,
});

const updateLegacySettings = await MenuItem.new({
  id: "photo.updateLegacySettings",
  text: "Update Legacy Settings",
  enabled: false,
});

const updateAiSettings = await MenuItem.new({
  id: "photo.updateAiSettings",
  text: "Update AI Settings",
  enabled: false,
});

const deleteEmptyMasks = await MenuItem.new({
  id: "photo.deleteEmptyMasks",
  text: "Delete Empty Masks in Photo",
  enabled: false,
});

const highDynamicRange = await MenuItem.new({
  id: "photo.highDynamicRange",
  text: "High Dynamic Range",
  enabled: false,
});

const convertToBlackAndWhite = await MenuItem.new({
  id: "photo.convertToBlackAndWhite",
  text: "Convert to Black and White",
  enabled: false,
});

const autoCorrectRedEye = await MenuItem.new({
  id: "photo.autoCorrectRedEye",
  text: "Auto Correct Red Eye",
  enabled: false,
});

const copyEditSettings = await MenuItem.new({
  id: "photo.copyEditSettings",
  text: "Copy Edit Settings",
  accelerator: "CmdOrCtrl+C",
  enabled: false,
});

const chooseEditSettingsToCopy = await MenuItem.new({
  id: "photo.chooseEditSettingsToCopy",
  text: "Choose Edit Settings to Copy...",
  accelerator: "Shift+CmdOrCtrl+C",
  enabled: false,
});

const pasteEditSettings = await MenuItem.new({
  id: "photo.pasteEditSettings",
  text: "Paste Edit Settings",
  accelerator: "CmdOrCtrl+V",
  enabled: false,
});

const pasteEditSettingsToSelection = await MenuItem.new({
  id: "photo.pasteEditSettingsToSelection",
  text: "Paste Settings to Entire Selection",
  accelerator: "Shift+CmdOrCtrl+V",
  enabled: false,
});

const createVersion = await MenuItem.new({
  id: "photo.createVersion",
  text: "Create Version...",
  accelerator: "Ctrl+Shift+S",
  enabled: false,
});

const resetEdits = await MenuItem.new({
  id: "photo.resetEdits",
  text: "Reset Edits",
  accelerator: "CmdOrCtrl+R",
  enabled: false,
});

const hdrMerge = await MenuItem.new({
  id: "photo.photoMerge.hdr",
  text: "HDR Merge...",
  accelerator: "Ctrl+H",
  enabled: false,
});

const panoramaMerge = await MenuItem.new({
  id: "photo.photoMerge.panorama",
  text: "Panorama Merge...",
  accelerator: "Ctrl+M",
  enabled: false,
});

const hdrPanoramaMerge = await MenuItem.new({
  id: "photo.photoMerge.hdrPanorama",
  text: "HDR Panorama Merge...",
  enabled: false,
});

const photoMergeSubmenu = await Submenu.new({
  text: "Photo Merge",
  items: [hdrMerge, panoramaMerge, hdrPanoramaMerge],
});

export const photoSubmenu = await Submenu.new({
  text: "Photo",
  items: [
    ratingTitle,
    ratingZero,
    ratingOne,
    ratingTwo,
    ratingThree,
    ratingFour,
    ratingFive,
    separator,
    flagTitle,
    flagUnflagged,
    flagPick,
    flagReject,
    separator,
    increaseFlagStatus,
    decreaseFlagStatus,
    separator,
    autoAdvance,
    separator,
    createAlbum,
    addToAlbum,
    separator,
    addKeyword,
    editDateTime,
    separator,
    rotateLeft,
    rotateRight,
    flipHorizontal,
    flipVertical,
    separator,
    autoSettings,
    updateLegacySettings,
    updateAiSettings,
    deleteEmptyMasks,
    separator,
    highDynamicRange,
    convertToBlackAndWhite,
    separator,
    autoCorrectRedEye,
    separator,
    copyEditSettings,
    chooseEditSettingsToCopy,
    pasteEditSettings,
    pasteEditSettingsToSelection,
    separator,
    createVersion,
    separator,
    resetEdits,
    separator,
    photoMergeSubmenu,
  ],
});
