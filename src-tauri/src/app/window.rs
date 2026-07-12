use tauri::{LogicalSize, Manager, WebviewWindow, Wry};
use tauri_plugin_window_state::AppHandleExt;

const FIRST_LAUNCH_MONITOR_SCALE: f64 = 0.88;

/// Applies first-launch geometry when no persisted state exists, then shows the window.
pub(crate) fn show_main_window(window: &WebviewWindow<Wry>) -> tauri::Result<()> {
    match has_saved_window_state(window) {
        Ok(false) => match apply_first_launch_geometry(window) {
            Ok(()) => {}
            Err(error) => log::warn!("Failed to apply first-launch window geometry: {error}"),
        },
        Ok(true) => {}
        Err(error) => log::warn!("Failed to inspect persisted window state: {error}"),
    }

    window.show()
}

fn has_saved_window_state(window: &WebviewWindow<Wry>) -> tauri::Result<bool> {
    let app = window.app_handle();

    let app_config_dir = match app.path().app_config_dir() {
        Ok(app_config_dir) => app_config_dir,
        Err(error) => return Err(error),
    };

    let state_path = app_config_dir.join(app.filename());

    Ok(state_path.is_file())
}

fn apply_first_launch_geometry(window: &WebviewWindow<Wry>) -> tauri::Result<()> {
    let current_monitor = match window.current_monitor() {
        Ok(current_monitor) => current_monitor,
        Err(error) => return Err(error),
    };

    let monitor = match current_monitor {
        Some(monitor) => Some(monitor),
        None => match window.primary_monitor() {
            Ok(primary_monitor) => primary_monitor,
            Err(error) => return Err(error),
        },
    };

    if let Some(monitor) = monitor {
        let monitor_size = monitor.size().to_logical::<f64>(monitor.scale_factor());
        let width = (monitor_size.width * FIRST_LAUNCH_MONITOR_SCALE).round();
        let height = (monitor_size.height * FIRST_LAUNCH_MONITOR_SCALE).round();

        match window.set_size(LogicalSize::new(width, height)) {
            Ok(()) => {}
            Err(error) => return Err(error),
        }
    }

    window.center()
}
