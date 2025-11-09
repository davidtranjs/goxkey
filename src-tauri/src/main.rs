mod app_handle;
mod config;
mod hotkey;
mod input;
mod platform;
mod scripting;
mod ui;

use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;

use app_handle::emit_update_ui;
use input::{
    rebuild_keyboard_layout_map, TypingMethod, HOTKEY_MATCHING, HOTKEY_MATCHING_CIRCUIT_BREAK,
    HOTKEY_MODIFIERS, INPUT_STATE,
};
use log::debug;
use platform::{
    add_app_change_callback, ensure_accessibility_permission, run_event_listener, send_backspace,
    send_string, EventTapType, Handle, KeyModifier, PressedKey, KEY_DELETE, KEY_ENTER, KEY_ESCAPE,
    KEY_SPACE, KEY_TAB, RAW_ARROW_DOWN, RAW_ARROW_LEFT, RAW_ARROW_RIGHT, RAW_ARROW_UP,
    RAW_KEY_GLOBE,
};
use tauri::Manager;
use ui::{HotkeyUpdate, UiSnapshot};

static LISTENER_STARTED: AtomicBool = AtomicBool::new(false);

fn do_transform_keys(handle: Handle, is_delete: bool) -> bool {
    unsafe {
        if let Ok((output, transform_result)) = INPUT_STATE.transform_keys() {
            debug!("Transformed: {:?}", output);
            if INPUT_STATE.should_send_keyboard_event(&output) || is_delete {
                if INPUT_STATE.should_dismiss_selection_if_needed() {
                    _ = send_string(handle, " ");
                    _ = send_backspace(handle, 1);
                }

                let backspace_count = INPUT_STATE.get_backspace_count(is_delete);
                debug!("Backspace count: {}", backspace_count);
                _ = send_backspace(handle, backspace_count);
                _ = send_string(handle, &output);
                debug!("Sent: {:?}", output);
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
        debug!("Backspace count: {}", backspace_count);
        _ = send_backspace(handle, backspace_count);
        let typing_buffer = INPUT_STATE.get_typing_buffer();
        _ = send_string(handle, typing_buffer);
        debug!("Sent: {:?}", typing_buffer);
        INPUT_STATE.replace(typing_buffer.to_owned());
    }
}

fn do_macro_replace(handle: Handle, target: &String) {
    unsafe {
        let backspace_count = INPUT_STATE.get_backspace_count(true);
        debug!("Backspace count: {}", backspace_count);
        _ = send_backspace(handle, backspace_count);
        _ = send_string(handle, target);
        debug!("Sent: {:?}", target);
        INPUT_STATE.replace(target.to_owned());
    }
}

unsafe fn toggle_vietnamese() {
    INPUT_STATE.toggle_vietnamese();
    emit_update_ui();
}

unsafe fn auto_toggle_vietnamese() {
    if !INPUT_STATE.is_auto_toggle_enabled() {
        return;
    }
    let has_change = INPUT_STATE.update_active_app().is_some();
    if !has_change {
        return;
    }
    emit_update_ui();
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
                                        debug!("Macro: {}", macro_target);
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
                    } else {
                        match keycode {
                            KEY_ENTER | KEY_TAB | KEY_SPACE | KEY_ESCAPE => {
                                INPUT_STATE.new_word();
                            }
                            _ => {
                                if !modifiers.is_empty() {
                                    INPUT_STATE.new_word();
                                }
                            }
                        }
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

fn start_listeners() {
    if LISTENER_STARTED.swap(true, Ordering::SeqCst) {
        return;
    }
    rebuild_keyboard_layout_map();
    thread::spawn(|| {
        run_event_listener(&event_handler);
    });
    add_app_change_callback(|| {
        unsafe { auto_toggle_vietnamese() };
    });
}

#[tauri::command]
fn get_ui_state() -> UiSnapshot {
    ui::snapshot()
}

#[tauri::command]
fn toggle_vietnamese_command() -> UiSnapshot {
    ui::toggle_vietnamese()
}

#[tauri::command]
fn set_typing_method_command(method: TypingMethod) -> UiSnapshot {
    ui::set_typing_method(method)
}

#[tauri::command]
fn set_hotkey_command(update: HotkeyUpdate) -> UiSnapshot {
    ui::set_hotkey(update)
}

#[tauri::command]
fn set_launch_on_login_command(enabled: bool) -> Result<UiSnapshot, String> {
    ui::set_launch_on_login(enabled)
}

#[tauri::command]
fn toggle_macro_command() -> UiSnapshot {
    ui::toggle_macro_enabled()
}

#[tauri::command]
fn toggle_auto_toggle_command() -> UiSnapshot {
    ui::toggle_auto_toggle()
}

#[tauri::command]
fn add_macro_command(from: String, to: String) -> UiSnapshot {
    ui::add_macro(from, to)
}

#[tauri::command]
fn delete_macro_command(from: String) -> UiSnapshot {
    ui::delete_macro(from)
}

#[tauri::command]
fn request_accessibility_permission() -> bool {
    let granted = ensure_accessibility_permission();
    ui::set_accessibility_permission(granted);
    if granted {
        start_listeners();
    }
    emit_update_ui();
    granted
}

fn main() {
    env_logger::init();
    tauri::Builder::default()
        .setup(|app| {
            app_handle::set_app_handle(app.handle().clone());
            ui::init_system_tray();
            let granted = ensure_accessibility_permission();
            ui::set_accessibility_permission(granted);
            if granted {
                start_listeners();
            }
            emit_update_ui();
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_ui_state,
            toggle_vietnamese_command,
            set_typing_method_command,
            set_hotkey_command,
            set_launch_on_login_command,
            toggle_macro_command,
            toggle_auto_toggle_command,
            add_macro_command,
            delete_macro_command,
            request_accessibility_permission,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
