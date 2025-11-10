#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod config;
mod events;
mod hotkey;
mod input;
mod platform;
mod scripting;
mod state;

use std::thread;

use crate::hotkey::Hotkey;
use input::{
    rebuild_keyboard_layout_map, HOTKEY_MATCHING, HOTKEY_MATCHING_CIRCUIT_BREAK, HOTKEY_MODIFIERS,
    INPUT_STATE,
};
use serde::Serialize;
use platform::{
    add_app_change_callback, ensure_accessibility_permission, run_event_listener, send_backspace,
    send_string, EventTapType, Handle, KeyModifier, PressedKey, KEY_DELETE, KEY_ENTER, KEY_ESCAPE,
    KEY_SPACE, KEY_TAB, RAW_ARROW_DOWN, RAW_ARROW_LEFT, RAW_ARROW_RIGHT, RAW_ARROW_UP,
    RAW_KEY_GLOBE,
};
use state::{TypingMethodDto, UiState};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, Manager, WebviewWindowBuilder};

fn do_transform_keys(handle: Handle, is_delete: bool) -> bool {
    unsafe {
        if let Ok((output, transform_result)) = INPUT_STATE.transform_keys() {
            log::debug!("Transformed: {:?}", output);
            if INPUT_STATE.should_send_keyboard_event(&output) || is_delete {
                if INPUT_STATE.should_dismiss_selection_if_needed() {
                    _ = send_string(handle, " ");
                    _ = send_backspace(handle, 1);
                }

                let backspace_count = INPUT_STATE.get_backspace_count(is_delete);
                log::debug!("Backspace count: {}", backspace_count);
                _ = send_backspace(handle, backspace_count);
                _ = send_string(handle, &output);
                log::debug!("Sent: {:?}", output);
                INPUT_STATE.replace(output);
                if transform_result.letter_modification_removed
                    || transform_result.tone_mark_removed
                {
                    INPUT_STATE.stop_tracking();
                }
                return true;
            }
        }
    }
    false
}

fn do_restore_word(handle: Handle) {
    unsafe {
        let backspace_count = INPUT_STATE.get_backspace_count(true);
        log::debug!("Backspace count: {}", backspace_count);
        _ = send_backspace(handle, backspace_count);
        let typing_buffer = INPUT_STATE.get_typing_buffer();
        _ = send_string(handle, typing_buffer);
        log::debug!("Sent: {:?}", typing_buffer);
        INPUT_STATE.replace(typing_buffer.to_owned());
    }
}

fn do_macro_replace(handle: Handle, target: &String) {
    unsafe {
        let backspace_count = INPUT_STATE.get_backspace_count(true);
        log::debug!("Backspace count: {}", backspace_count);
        _ = send_backspace(handle, backspace_count);
        _ = send_string(handle, target);
        log::debug!("Sent: {:?}", target);
        INPUT_STATE.replace(target.to_owned());
    }
}

unsafe fn toggle_vietnamese() {
    INPUT_STATE.toggle_vietnamese();
    events::emit_state_changed();
}

unsafe fn auto_toggle_vietnamese() {
    if !INPUT_STATE.is_auto_toggle_enabled() {
        return;
    }
    let has_change = INPUT_STATE.update_active_app().is_some();
    if !has_change {
        return;
    }
    events::emit_state_changed();
}

fn event_handler(
    handle: Handle,
    event_type: EventTapType,
    pressed_key: Option<PressedKey>,
    modifiers: KeyModifier,
) -> bool {
    unsafe {
        let pressed_key_code = pressed_key.and_then(|p| match p {
            PressedKey::Char(c) => Some(c),
            _ => None,
        });

        if event_type == EventTapType::FlagsChanged {
            if modifiers.is_empty() {
                if HOTKEY_MATCHING && !HOTKEY_MATCHING_CIRCUIT_BREAK {
                    toggle_vietnamese();
                }
                HOTKEY_MODIFIERS = KeyModifier::MODIFIER_NONE;
                HOTKEY_MATCHING = false;
                HOTKEY_MATCHING_CIRCUIT_BREAK = false;
            } else {
                HOTKEY_MODIFIERS.set(modifiers, true);
            }
        }

        let is_hotkey_matched = INPUT_STATE
            .get_hotkey()
            .is_match(HOTKEY_MODIFIERS, pressed_key_code);
        if HOTKEY_MATCHING && !is_hotkey_matched {
            HOTKEY_MATCHING_CIRCUIT_BREAK = true;
        }
        HOTKEY_MATCHING = is_hotkey_matched;

        match pressed_key {
            Some(pressed_key) => match pressed_key {
                PressedKey::Raw(raw_keycode) => {
                    if raw_keycode == RAW_KEY_GLOBE {
                        toggle_vietnamese();
                        return true;
                    }
                    if raw_keycode == RAW_ARROW_UP || raw_keycode == RAW_ARROW_DOWN {
                        INPUT_STATE.new_word();
                    }
                    if raw_keycode == RAW_ARROW_LEFT || raw_keycode == RAW_ARROW_RIGHT {
                        INPUT_STATE.new_word();
                    }
                }
                PressedKey::Char(keycode) => {
                    if INPUT_STATE.is_enabled() {
                        match keycode {
                            KEY_ENTER | KEY_TAB | KEY_SPACE | KEY_ESCAPE => {
                                let is_valid_word = vi::validation::is_valid_word(
                                    INPUT_STATE.get_displaying_word(),
                                );
                                let is_allowed_word =
                                    INPUT_STATE.is_allowed_word(INPUT_STATE.get_displaying_word());
                                let is_transformed_word = !INPUT_STATE
                                    .get_typing_buffer()
                                    .eq(INPUT_STATE.get_displaying_word());
                                if is_transformed_word && !is_valid_word && !is_allowed_word {
                                    do_restore_word(handle);
                                }

                                if INPUT_STATE.previous_word_is_stop_tracking_words() {
                                    INPUT_STATE.clear_previous_word();
                                }

                                if keycode == KEY_TAB || keycode == KEY_SPACE {
                                    if let Some(macro_target) = INPUT_STATE.get_macro_target() {
                                        log::debug!("Macro: {}", macro_target);
                                        do_macro_replace(handle, macro_target)
                                    }
                                }

                                INPUT_STATE.new_word();
                            }
                            KEY_DELETE => {
                                if !modifiers.is_empty() && !modifiers.is_shift() {
                                    INPUT_STATE.new_word();
                                } else {
                                    INPUT_STATE.pop();
                                }
                            }
                            c => {
                                if "()[]{}<>/\\!@#$%^&*-_=+|~`,.;'\"/".contains(c)
                                    || (c.is_numeric() && modifiers.is_shift())
                                {
                                    if c.is_numeric() {
                                        INPUT_STATE.push(c);
                                    }
                                    INPUT_STATE.new_word();
                                } else if modifiers.is_super() || modifiers.is_alt() {
                                    INPUT_STATE.new_word();
                                } else if INPUT_STATE.is_tracking() {
                                    INPUT_STATE.push(
                                        if modifiers.is_shift() || modifiers.is_capslock() {
                                            c.to_ascii_uppercase()
                                        } else {
                                            c
                                        },
                                    );
                                    let ret = do_transform_keys(handle, false);
                                    INPUT_STATE.stop_tracking_if_needed();
                                    return ret;
                                }
                            }
                        }
                    } else if matches!(keycode, KEY_ENTER | KEY_TAB | KEY_SPACE | KEY_ESCAPE) {
                        INPUT_STATE.new_word();
                    } else if !modifiers.is_empty() {
                        INPUT_STATE.new_word();
                    }
                }
            },
            None => {
                let previous_modifiers = INPUT_STATE.get_previous_modifiers();
                if previous_modifiers.is_empty() {
                    if modifiers.is_control() {
                        if !INPUT_STATE.get_typing_buffer().is_empty() {
                            do_restore_word(handle);
                        }
                        INPUT_STATE.set_temporary_disabled();
                    }
                    if modifiers.is_super() || event_type == EventTapType::Other {
                        INPUT_STATE.new_word();
                    }
                }
            }
        }
        INPUT_STATE.save_previous_modifiers(modifiers);
    }
    false
}

fn spawn_event_sources() {
    thread::spawn(|| {
        run_event_listener(&event_handler);
    });
    add_app_change_callback(|| unsafe {
        auto_toggle_vietnamese();
    });
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct HotkeyValidation {
    is_valid: bool,
    has_conflict: bool,
    message: Option<String>,
}

#[tauri::command]
fn get_state() -> UiState {
    events::current_state()
}

#[tauri::command]
fn set_enabled(enabled: bool) -> UiState {
    unsafe {
        if INPUT_STATE.is_enabled() != enabled {
            INPUT_STATE.toggle_vietnamese();
        }
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn set_typing_method(method: TypingMethodDto) -> UiState {
    unsafe {
        INPUT_STATE.set_method(method.into());
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn check_hotkey(hotkey: String) -> HotkeyValidation {
    if hotkey.trim().is_empty() {
        return HotkeyValidation {
            is_valid: false,
            has_conflict: false,
            message: Some("Hotkey cannot be empty".to_string()),
        };
    }
    let parsed = Hotkey::from_str(&hotkey);
    let (modifiers, key) = parsed.inner();
    match platform::check_hotkey_conflict(modifiers, key) {
        Ok(()) => HotkeyValidation {
            is_valid: true,
            has_conflict: false,
            message: None,
        },
        Err(reason) => {
            let invalid_causes = ["Hotkey needs a key", "Unsupported key"];
            let is_invalid = invalid_causes.contains(&reason.as_str());
            HotkeyValidation {
                is_valid: !is_invalid,
                has_conflict: !is_invalid,
                message: Some(reason),
            }
        }
    }
}

#[tauri::command]
fn set_hotkey(hotkey: String) -> UiState {
    unsafe {
        INPUT_STATE.set_hotkey(&hotkey);
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn set_auto_toggle(enabled: bool) -> UiState {
    unsafe {
        if INPUT_STATE.is_auto_toggle_enabled() != enabled {
            INPUT_STATE.toggle_auto_toggle();
        }
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn set_macro_enabled(enabled: bool) -> UiState {
    unsafe {
        if INPUT_STATE.is_macro_enabled() != enabled {
            INPUT_STATE.toggle_macro_enabled();
        }
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn add_macro(source: String, target: String) -> UiState {
    if source.trim().is_empty() || target.trim().is_empty() {
        return events::current_state();
    }
    unsafe {
        INPUT_STATE.add_macro(source.trim().to_string(), target.trim().to_string());
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn delete_macro(source: String) -> UiState {
    unsafe {
        INPUT_STATE.delete_macro(&source);
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn set_launch_on_login(enabled: bool) -> UiState {
    if let Err(err) = platform::update_launch_on_login(enabled) {
        log::error!("Unable to update launch on login: {err}");
    }
    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn set_show_menubar_icon(app: AppHandle, enabled: bool) -> UiState {
    config::CONFIG_MANAGER
        .lock()
        .unwrap()
        .set_show_menubar_icon(enabled);

    if let Some(tray) = app.tray_by_id("main-tray") {
        if enabled {
            let _ = tray.set_visible(true);
        } else {
            let _ = tray.set_visible(false);
        }
    }

    events::emit_state_changed();
    events::current_state()
}

#[tauri::command]
fn set_theme(theme: String) -> UiState {
    config::CONFIG_MANAGER
        .lock()
        .unwrap()
        .set_theme(&theme);

    events::emit_state_changed();
    events::current_state()
}

fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.set_focus();
    } else {
        let _ = WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
            .title("Gõ Key")
            .inner_size(420.0, 640.0)
            .resizable(false)
            .build();
    }
}

fn main() {
    env_logger::init();
    rebuild_keyboard_layout_map();

    tauri::Builder::default()
        .setup(|app| {
            events::register_app_handle(&app.handle());
            let has_permission = ensure_accessibility_permission();
            events::set_accessibility_ready(has_permission);
            if has_permission {
                spawn_event_sources();
            }

            // Build tray menu
            let tray_menu = events::build_tray_menu(&app.handle())?;

            // Create tray icon
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().unwrap().clone())
                .menu(&tray_menu)
                .on_menu_event(|app, event| match event.id().as_ref() {
                    "vietnamese_mode" => {
                        unsafe {
                            toggle_vietnamese();
                        }
                    }
                    "show_ui" => {
                        show_main_window(app);
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    if let TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } = event
                    {
                        let app = tray.app_handle();
                        show_main_window(app);
                    }
                })
                .build(app)?;

            // Check if menubar icon should be visible
            let show_menubar_icon = config::CONFIG_MANAGER
                .lock()
                .map(|c| c.show_menubar_icon())
                .unwrap_or(true);
            if !show_menubar_icon {
                if let Some(tray) = app.tray_by_id("main-tray") {
                    let _ = tray.set_visible(false);
                }
            }

            app.emit("state-changed", events::current_state())?;
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_state,
            set_enabled,
            set_typing_method,
            check_hotkey,
            set_hotkey,
            set_auto_toggle,
            set_macro_enabled,
            add_macro,
            delete_macro,
            set_launch_on_login,
            set_show_menubar_icon,
            set_theme
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
