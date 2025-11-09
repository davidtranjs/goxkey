use once_cell::sync::OnceCell;
use tauri::{AppHandle, Manager, Wry};

static APP_HANDLE: OnceCell<AppHandle<Wry>> = OnceCell::new();

pub fn set_app_handle(handle: AppHandle<Wry>) {
    let _ = APP_HANDLE.set(handle);
}

pub fn with_app<F, R>(f: F) -> Option<R>
where
    F: FnOnce(&AppHandle<Wry>) -> R,
{
    APP_HANDLE.get().map(f)
}

pub fn emit_update_ui() {
    if let Some(handle) = APP_HANDLE.get() {
        let _ = handle.emit_all("ui://update", ());
    }
}

pub fn show_main_window() {
    if let Some(handle) = APP_HANDLE.get() {
        if let Some(window) = handle.get_window("main") {
            let _ = window.show();
            let _ = window.set_focus();
        }
    }
}

pub fn hide_main_window() {
    if let Some(handle) = APP_HANDLE.get() {
        if let Some(window) = handle.get_window("main") {
            let _ = window.hide();
        }
    }
}

pub fn exit_app() {
    if let Some(handle) = APP_HANDLE.get() {
        handle.exit(0);
    }
}
