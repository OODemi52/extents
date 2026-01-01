import {
  Menu,
  CheckMenuItem,
  IconMenuItem,
  MenuItem,
} from "@tauri-apps/api/menu";
import { Image } from "@tauri-apps/api/image";

export async function setupMenu() {
  let currentLanguage = "en";

  const check_sub_item_en = await CheckMenuItem.new({
    id: "en",
    text: "English",
    checked: currentLanguage === "en",
    action: () => {
      currentLanguage = "en";
      check_sub_item_en.setChecked(currentLanguage === "en");
      check_sub_item_zh.setChecked(currentLanguage === "cn");
      console.log("English pressed");
    },
  });

  const check_sub_item_zh = await CheckMenuItem.new({
    id: "zh",
    text: "Chinese",
    checked: currentLanguage === "zh",
    action: () => {
      currentLanguage = "zh";
      check_sub_item_en.setChecked(currentLanguage === "en");
      check_sub_item_zh.setChecked(currentLanguage === "zh");
      check_sub_item_zh.setAccelerator("Ctrl+L");
      console.log("Chinese pressed");
    },
  });

  // Load icon from path
  const icon = await Image.fromPath("../src/icon.png");
  const icon2 = await Image.fromPath("../src/icon-2.png");

  const icon_item = await IconMenuItem.new({
    id: "icon_item",
    text: "Icon Item",
    icon: icon,
    action: () => {
      icon_item.setIcon(icon2);
      console.log("icon pressed");
    },
  });

  const text_item = await MenuItem.new({
    id: "text_item",
    text: "Text Item",
    action: () => {
      text_item.setText("Text Item Changed");
      console.log("text pressed");
    },
  });

  const menu = await Menu.new({
    items: [
      {
        id: "change menu",
        text: "change_menu",
        items: [text_item, check_sub_item_en, check_sub_item_zh, icon_item],
      },
    ],
  });

  await menu.setAsAppMenu();
}
