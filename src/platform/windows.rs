// TODO: Implement this

use std::{env, path::PathBuf};
use druid::{Selector, commands::CLOSE_WINDOW};

use super::CallbackFn;

pub const SYMBOL_SHIFT: &str = "⇧";
pub const SYMBOL_CTRL: &str = "⌃";
pub const SYMBOL_SUPER: &str = "⊞";
pub const SYMBOL_ALT: &str = "⌥";

pub type Handle = usize;

pub fn get_home_dir() -> Option<PathBuf> {
    env::var("USERPROFILE").ok().map(PathBuf::from)
        .or_else(|| env::var("HOMEDRIVE").ok().and_then(|home_drive| {
            env::var("HOMEPATH").ok().map(|home_path| {
                PathBuf::from(format!("{}{}", home_drive, home_path))
            })
        }))
}

pub fn send_backspace(handle: Handle, count: usize) -> Result<(), ()> {
    todo!()
}

pub fn send_string(handle: Handle, string: &str) -> Result<(), ()> {
    todo!()
}

pub fn run_event_listener(callback: &CallbackFn) {
    todo!()
}

pub fn ensure_accessibility_permission() -> bool {
    true
}

pub fn is_in_text_selection() -> bool {
    todo!()
}

pub fn get_active_app_name() -> String {
    // TODO: Implement proper app detection on Windows
    "Unknown".to_string()
}

pub fn get_running_applications() -> Vec<String> {
    // TODO: Implement proper running applications detection on Windows
    // For now, return a placeholder list
    vec!["Unknown".to_string()]
}

pub fn add_app_change_callback<F>(_cb: F)
where
    F: Fn() + Send + 'static,
{
    // TODO: Implement app change callback on Windows
}

pub fn update_launch_on_login(is_enable: bool) -> Result<(), String> {
    // TODO: Implement launch on login for Windows
    Err("Not implemented on Windows".to_string())
}

pub fn is_launch_on_login() -> bool {
    // TODO: Implement launch on login check for Windows
    false
}

#[derive(Debug, Clone, Copy)]
pub enum SystemTrayMenuItemKey {
    ShowUI,
    Enable,
    TypingMethodTelex,
    TypingMethodVNI,
    Exit,
}

pub struct SystemTray;

impl SystemTray {
    pub fn new() -> Self {
        Self
    }

    pub fn set_title(&mut self, _title: &str) {
        // TODO: Implement system tray on Windows
    }

    pub fn set_menu_item_title(&mut self, _key: SystemTrayMenuItemKey, _title: &str) {
        // TODO: Implement system tray on Windows
    }

    pub fn set_menu_item_callback<F>(&mut self, _key: SystemTrayMenuItemKey, _callback: F)
    where
        F: Fn() + Send + 'static,
    {
        // TODO: Implement system tray on Windows
    }
}
