use std::sync::atomic::{AtomicBool, Ordering};

use once_cell::sync::OnceCell;
use tauri::{AppHandle, Emitter};

use crate::state::UiState;

static APP_HANDLE: OnceCell<AppHandle> = OnceCell::new();
static ACCESSIBILITY_READY: AtomicBool = AtomicBool::new(false);

pub fn register_app_handle(handle: &AppHandle) {
    let _ = APP_HANDLE.set(handle.clone());
}

pub fn set_accessibility_ready(value: bool) {
    ACCESSIBILITY_READY.store(value, Ordering::SeqCst);
}

pub fn accessibility_ready() -> bool {
    ACCESSIBILITY_READY.load(Ordering::SeqCst)
}

pub fn emit_state_changed() {
    if let Some(handle) = APP_HANDLE.get() {
        if let Err(err) = handle.emit("state-changed", current_state()) {
            log::warn!("failed to emit state change: {err}");
        }
        update_tray_menu_if_exists(handle);
    }
}

fn update_tray_menu_if_exists(handle: &AppHandle) {
    if let Some(tray) = handle.tray_by_id("main-tray") {
        let state = current_state();
        if let Ok(menu) = build_tray_menu_internal(handle, &state) {
            let _ = tray.set_menu(Some(menu));
        }
    }
}

pub fn build_tray_menu(app: &AppHandle) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let state = current_state();
    build_tray_menu_internal(app, &state)
}

fn build_tray_menu_internal(
    app: &AppHandle,
    state: &UiState,
) -> Result<tauri::menu::Menu<tauri::Wry>, tauri::Error> {
    let vietnamese_mode_item = tauri::menu::CheckMenuItemBuilder::with_id(
        "vietnamese_mode",
        if state.is_enabled {
            "Tắt tiếng Việt"
        } else {
            "Bật tiếng Việt"
        },
    )
    .checked(state.is_enabled)
    .build(app)?;

    let show_ui_item = tauri::menu::MenuItemBuilder::with_id("show_ui", "Hiện cửa sổ").build(app)?;
    let quit_item = tauri::menu::MenuItemBuilder::with_id("quit", "Thoát").build(app)?;

    tauri::menu::MenuBuilder::new(app)
        .item(&vietnamese_mode_item)
        .separator()
        .item(&show_ui_item)
        .separator()
        .item(&quit_item)
        .build()
}

pub fn current_state() -> UiState {
    UiState::snapshot(accessibility_ready())
}
