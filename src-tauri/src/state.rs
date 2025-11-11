use serde::{Deserialize, Serialize};

use crate::apps::AppInfo;
use crate::config::CONFIG_MANAGER;
use crate::input::{TypingMethod, INPUT_STATE};
use crate::platform::is_launch_on_login;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "lowercase")]
pub enum TypingMethodDto {
    Telex,
    Vni,
}

impl From<TypingMethod> for TypingMethodDto {
    fn from(value: TypingMethod) -> Self {
        match value {
            TypingMethod::Telex => Self::Telex,
            TypingMethod::VNI => Self::Vni,
        }
    }
}

impl From<TypingMethodDto> for TypingMethod {
    fn from(value: TypingMethodDto) -> Self {
        match value {
            TypingMethodDto::Telex => TypingMethod::Telex,
            TypingMethodDto::Vni => TypingMethod::VNI,
        }
    }
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct HotkeyState {
    pub display: String,
    pub letter: Option<String>,
    pub super_key: bool,
    pub ctrl_key: bool,
    pub alt_key: bool,
    pub shift_key: bool,
    pub capslock_key: bool,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct MacroEntry {
    pub source: String,
    pub target: String,
}

#[derive(Debug, Clone, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct UiState {
    pub is_enabled: bool,
    pub typing_method: TypingMethodDto,
    pub auto_toggle_enabled: bool,
    pub macro_enabled: bool,
    pub macros: Vec<MacroEntry>,
    pub launch_on_login: bool,
    pub active_app: String,
    pub hotkey: HotkeyState,
    pub gox_mode_enabled: bool,
    pub accessibility_ready: bool,
    pub version: String,
    pub show_menubar_icon: bool,
    pub theme: String,
    pub vietnamese_mode_enabled: bool,
    pub excluded_apps: Vec<AppInfo>,
    pub exclude_apps_enabled: bool,
    pub open_window_on_launch: bool,
}

impl UiState {
    pub fn snapshot(accessibility_ready: bool) -> Self {
        unsafe {
            let input_state = &INPUT_STATE;
            let (modifiers, letter_key) = input_state.get_hotkey().inner();
            let hotkey = HotkeyState {
                display: input_state.get_hotkey().to_string(),
                letter: format_letter_key(letter_key),
                super_key: modifiers.is_super(),
                ctrl_key: modifiers.is_control(),
                alt_key: modifiers.is_alt(),
                shift_key: modifiers.is_shift(),
                capslock_key: modifiers.is_capslock(),
            };
            let macros = input_state
                .get_macro_table()
                .iter()
                .map(|(source, target)| MacroEntry {
                    source: source.to_owned(),
                    target: target.to_owned(),
                })
                .collect();
            let show_menubar_icon = CONFIG_MANAGER
                .lock()
                .map(|c| c.show_menubar_icon())
                .unwrap_or(true);
            let theme = CONFIG_MANAGER
                .lock()
                .map(|c| c.get_theme().to_string())
                .unwrap_or_else(|_| "system".to_string());

            let vietnamese_mode_enabled = CONFIG_MANAGER
                .lock()
                .map(|c| c.is_vietnamese_mode_enabled())
                .unwrap_or(true);

            let excluded_apps = CONFIG_MANAGER
                .lock()
                .map(|c| c.get_excluded_apps().clone())
                .unwrap_or_default();

            let exclude_apps_enabled = CONFIG_MANAGER
                .lock()
                .map(|c| c.is_exclude_apps_enabled())
                .unwrap_or(true);

            let open_window_on_launch = CONFIG_MANAGER
                .lock()
                .map(|c| c.open_window_on_launch())
                .unwrap_or(false);

            Self {
                is_enabled: input_state.is_enabled(),
                typing_method: input_state.get_method().into(),
                auto_toggle_enabled: input_state.is_auto_toggle_enabled(),
                macro_enabled: input_state.is_macro_enabled(),
                macros,
                launch_on_login: is_launch_on_login(),
                active_app: input_state.active_app().to_string(),
                hotkey,
                gox_mode_enabled: input_state.is_gox_mode_enabled(),
                accessibility_ready,
                version: env!("CARGO_PKG_VERSION").to_string(),
                show_menubar_icon,
                theme,
                vietnamese_mode_enabled,
                excluded_apps,
                exclude_apps_enabled,
                open_window_on_launch,
            }
        }
    }
}

fn format_letter_key(letter: Option<char>) -> Option<String> {
    letter.map(|c| {
        if c.is_ascii_whitespace() {
            "Space".to_string()
        } else {
            c.to_ascii_uppercase().to_string()
        }
    })
}
