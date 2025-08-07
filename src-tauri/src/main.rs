// Prevents additional console window on Windows in release, DO NOT REMOVE!!
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use app_lib::commands::logging::init_logging;

fn main() {
    init_logging();
    app_lib::run();
}
