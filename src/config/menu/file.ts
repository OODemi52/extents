const fileSubmenu = await Submenu.new({
  text: "File",
  items: [
    await MenuItem.new({
      id: "file.import",
      text: "Import…",
      accelerator: "CmdOrCtrl+I",
      action: () => {
        console.log("Import");
      },
    }),
    await MenuItem.new({
      id: "file.export",
      text: "Export…",
      accelerator: "CmdOrCtrl+E",
      enabled: false, // dynamic
      action: () => {
        console.log("Export");
      },
    }),
  ],
});
