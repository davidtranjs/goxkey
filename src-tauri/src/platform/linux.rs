use std::{env, path::PathBuf};

use super::CallbackFn;

pub type Handle = ();

pub const SYMBOL_SHIFT: &str = "⇧";
pub const SYMBOL_CTRL: &str = "⌃";
pub const SYMBOL_SUPER: &str = "❖";
pub const SYMBOL_ALT: &str = "⌥";

pub fn get_home_dir() -> Option<PathBuf> {
    env::var("HOME").ok().map(PathBuf::from)
}

pub fn send_backspace(_handle: Handle, _count: usize) -> Result<(), ()> {
    unimplemented!("Linux implementation not available")
}

pub fn send_string(_handle: Handle, _string: &str) -> Result<(), ()> {
    unimplemented!("Linux implementation not available")
}

pub fn run_event_listener(_callback: &CallbackFn) {
    unimplemented!("Linux implementation not available")
}

pub fn ensure_accessibility_permission() -> bool {
    false
}

pub fn is_in_text_selection() -> bool {
    false
}

pub fn update_launch_on_login(_is_enable: bool) -> Result<(), auto_launch::Error> {
    Err(auto_launch::Error::OsError(
        "Not implemented on Linux".into(),
    ))
}

pub fn is_launch_on_login() -> bool {
    false
}
