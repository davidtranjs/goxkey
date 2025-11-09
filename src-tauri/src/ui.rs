use serde::{Deserialize, Serialize};
use std::sync::{
    atomic::{AtomicBool, Ordering},
    Mutex,
};

use crate::{
    app_handle,
    input::{rebuild_keyboard_layout_map, TypingMethod, INPUT_STATE},
    platform::{
        is_launch_on_login, update_launch_on_login, KeyModifier, SYMBOL_ALT, SYMBOL_CTRL,
        SYMBOL_SHIFT, SYMBOL_SUPER,
    },
};

#[cfg(target_os = "macos")]
use crate::platform::{SystemTray, SystemTrayMenuItemKey};
#[cfg(target_os = "macos")]
use once_cell::sync::OnceCell;

#[derive(Debug, Clone, Serialize)]
pub struct MacroEntry {
    pub from: String,
    pub to: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct HotkeyState {
    pub display: String,
    pub super_key: bool,
    pub ctrl_key: bool,
    pub alt_key: bool,
    pub shift_key: bool,
    pub capslock_key: bool,
    pub letter_key: String,
}

#[derive(Debug, Clone, Serialize)]
pub struct ModifierSymbols {
    pub super_key: &'static str,
    pub ctrl_key: &'static str,
    pub alt_key: &'static str,
    pub shift_key: &'static str,
}

#[derive(Debug, Clone, Serialize)]
pub struct UiSnapshot {
    pub is_enabled: bool,
    pub typing_method: TypingMethod,
    pub hotkey: HotkeyState,
    pub is_macro_enabled: bool,
    pub is_auto_toggle_enabled: bool,
    pub launch_on_login: bool,
    pub macros: Vec<MacroEntry>,
    pub is_gox_mode_enabled: bool,
    pub has_accessibility_permission: bool,
    pub symbols: ModifierSymbols,
}

#[derive(Debug, Deserialize)]
pub struct HotkeyUpdate {
    pub super_key: bool,
    pub ctrl_key: bool,
    pub alt_key: bool,
    pub shift_key: bool,
    pub capslock_key: bool,
    pub letter_key: String,
}

#[cfg(target_os = "macos")]
static SYSTEM_TRAY: OnceCell<Mutex<SystemTray>> = OnceCell::new();

static ACCESSIBILITY_GRANTED: AtomicBool = AtomicBool::new(false);

pub fn set_accessibility_permission(granted: bool) {
    ACCESSIBILITY_GRANTED.store(granted, Ordering::SeqCst);
}

pub fn init_system_tray() {
    #[cfg(target_os = "macos")]
    {
        SYSTEM_TRAY.get_or_init(|| {
            let mut tray = SystemTray::new();
            setup_system_tray_actions(&mut tray);
            Mutex::new(tray)
        });
    }
}

#[cfg(target_os = "macos")]
fn setup_system_tray_actions(tray: &mut SystemTray) {
    use crate::input::TypingMethod;

    tray.set_menu_item_callback(SystemTrayMenuItemKey::ShowUI, || {
        app_handle::show_main_window();
    });
    tray.set_menu_item_callback(SystemTrayMenuItemKey::Enable, || unsafe {
        INPUT_STATE.toggle_vietnamese();
        app_handle::emit_update_ui();
    });
    tray.set_menu_item_callback(SystemTrayMenuItemKey::TypingMethodTelex, || unsafe {
        INPUT_STATE.set_method(TypingMethod::Telex);
        app_handle::emit_update_ui();
    });
    tray.set_menu_item_callback(SystemTrayMenuItemKey::TypingMethodVNI, || unsafe {
        INPUT_STATE.set_method(TypingMethod::VNI);
        app_handle::emit_update_ui();
    });
    tray.set_menu_item_callback(SystemTrayMenuItemKey::Exit, || {
        app_handle::exit_app();
    });
}

pub fn format_letter_key(c: Option<char>) -> String {
    if let Some(c) = c {
        return if c.is_ascii_whitespace() {
            String::from("Space")
        } else {
            c.to_ascii_uppercase().to_string()
        };
    }
    String::new()
}

pub fn letter_key_to_char(input: &str) -> Option<char> {
    match input {
        "Space" => Some(' '),
        s => {
            if input.len() > 1 {
                None
            } else {
                s.chars().last()
            }
        }
    }
}

fn build_hotkey_state() -> HotkeyState {
    unsafe {
        let (modifiers, keycode) = INPUT_STATE.get_hotkey().inner();
        HotkeyState {
            display: INPUT_STATE.get_hotkey().to_string(),
            super_key: modifiers.is_super(),
            ctrl_key: modifiers.is_control(),
            alt_key: modifiers.is_alt(),
            shift_key: modifiers.is_shift(),
            capslock_key: modifiers.is_capslock(),
            letter_key: format_letter_key(keycode),
        }
    }
}

fn gather_macros() -> Vec<MacroEntry> {
    unsafe {
        INPUT_STATE
            .get_macro_table()
            .iter()
            .map(|(from, to)| MacroEntry {
                from: from.to_string(),
                to: to.to_string(),
            })
            .collect()
    }
}

fn update_tray(snapshot: &UiSnapshot) {
    #[cfg(target_os = "macos")]
    if let Some(tray) = SYSTEM_TRAY.get() {
        let mut tray = tray.lock().unwrap();
        if snapshot.is_enabled {
            let title = if snapshot.is_gox_mode_enabled {
                "gõ"
            } else {
                "VN"
            };
            tray.set_title(title);
            tray.set_menu_item_title(SystemTrayMenuItemKey::Enable, "Tắt gõ tiếng Việt");
        } else {
            let title = if snapshot.is_gox_mode_enabled {
                match snapshot.typing_method {
                    TypingMethod::Telex => "gox",
                    TypingMethod::VNI => "go4",
                }
            } else {
                "EN"
            };
            tray.set_title(title);
            tray.set_menu_item_title(SystemTrayMenuItemKey::Enable, "Bật gõ tiếng Việt");
        }

        match snapshot.typing_method {
            TypingMethod::VNI => {
                tray.set_menu_item_title(SystemTrayMenuItemKey::TypingMethodTelex, "Telex");
                tray.set_menu_item_title(SystemTrayMenuItemKey::TypingMethodVNI, "VNI ✓");
            }
            TypingMethod::Telex => {
                tray.set_menu_item_title(SystemTrayMenuItemKey::TypingMethodTelex, "Telex ✓");
                tray.set_menu_item_title(SystemTrayMenuItemKey::TypingMethodVNI, "VNI");
            }
        }
    }
}

pub fn snapshot() -> UiSnapshot {
    rebuild_keyboard_layout_map();
    unsafe {
        let snapshot = UiSnapshot {
            is_enabled: INPUT_STATE.is_enabled(),
            typing_method: INPUT_STATE.get_method(),
            hotkey: build_hotkey_state(),
            is_macro_enabled: INPUT_STATE.is_macro_enabled(),
            is_auto_toggle_enabled: INPUT_STATE.is_auto_toggle_enabled(),
            launch_on_login: is_launch_on_login(),
            macros: gather_macros(),
            is_gox_mode_enabled: INPUT_STATE.is_gox_mode_enabled(),
            symbols: ModifierSymbols {
                super_key: SYMBOL_SUPER,
                ctrl_key: SYMBOL_CTRL,
                alt_key: SYMBOL_ALT,
                shift_key: SYMBOL_SHIFT,
            },
            has_accessibility_permission: ACCESSIBILITY_GRANTED.load(Ordering::SeqCst),
        };
        update_tray(&snapshot);
        snapshot
    }
}

pub fn toggle_vietnamese() -> UiSnapshot {
    unsafe {
        INPUT_STATE.toggle_vietnamese();
    }
    snapshot()
}

pub fn set_typing_method(method: TypingMethod) -> UiSnapshot {
    unsafe {
        INPUT_STATE.set_method(method);
    }
    snapshot()
}

pub fn set_hotkey(update: HotkeyUpdate) -> UiSnapshot {
    let mut modifiers = KeyModifier::new();
    modifiers.apply(
        update.super_key,
        update.ctrl_key,
        update.alt_key,
        update.shift_key,
        update.capslock_key,
    );

    let letter = letter_key_to_char(&update.letter_key);
    let sequence = format!(
        "{}{}",
        modifiers,
        match letter {
            Some(' ') => String::from("space"),
            Some(c) => c.to_string(),
            None => String::new(),
        }
    );

    unsafe {
        INPUT_STATE.set_hotkey(&sequence);
    }
    snapshot()
}

pub fn set_launch_on_login(enabled: bool) -> Result<UiSnapshot, String> {
    update_launch_on_login(enabled).map_err(|err| err.to_string())?;
    Ok(snapshot())
}

pub fn toggle_macro_enabled() -> UiSnapshot {
    unsafe {
        INPUT_STATE.toggle_macro_enabled();
    }
    snapshot()
}

pub fn toggle_auto_toggle() -> UiSnapshot {
    unsafe {
        INPUT_STATE.toggle_auto_toggle();
    }
    snapshot()
}

pub fn add_macro(from: String, to: String) -> UiSnapshot {
    unsafe {
        INPUT_STATE.add_macro(from, to);
    }
    snapshot()
}

pub fn delete_macro(source: String) -> UiSnapshot {
    unsafe {
        INPUT_STATE.delete_macro(&source);
    }
    snapshot()
}
