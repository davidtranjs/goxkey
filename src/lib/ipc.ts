import { invoke } from "@tauri-apps/api/core";

export type TypingMethod = "telex" | "vni";

export type HotkeyState = {
  display: string;
  letter?: string;
  superKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  capslockKey: boolean;
};

export type HotkeyValidation = {
  isValid: boolean;
  hasConflict: boolean;
  message?: string;
};

export type MacroEntry = {
  source: string;
  target: string;
};

export type AppInfo = {
  identifier: string;
  name: string;
  path: string;
};

export type UiState = {
  isEnabled: boolean;
  typingMethod: TypingMethod;
  autoToggleEnabled: boolean;
  macroEnabled: boolean;
  macros: MacroEntry[];
  launchOnLogin: boolean;
  activeApp: string;
  hotkey: HotkeyState;
  goxModeEnabled: boolean;
  accessibilityReady: boolean;
  version: string;
  showMenubarIcon: boolean;
  theme: string;
  vietnameseModeEnabled: boolean;
  excludedApps: AppInfo[];
  excludeAppsEnabled: boolean;
  openWindowOnLaunch: boolean;
  language: string;
};

async function invokeCommand<T>(
  command: string,
  args?: Record<string, unknown>
): Promise<T> {
  try {
    return await invoke<T>(command, args);
  } catch (error) {
    console.error(`IPC command '${command}' failed:`, error);
    throw error;
  }
}

export const ipc = {
  getState: () => invokeCommand<UiState>("get_state"),

  setEnabled: (enabled: boolean) =>
    invokeCommand<UiState>("set_enabled", { enabled }),

  setTypingMethod: (method: TypingMethod) =>
    invokeCommand<UiState>("set_typing_method", { method }),

  setHotkey: (hotkey: string) =>
    invokeCommand<UiState>("set_hotkey", { hotkey }),

  checkHotkey: (hotkey: string) =>
    invokeCommand<HotkeyValidation>("check_hotkey", { hotkey }),

  setAutoToggle: (enabled: boolean) =>
    invokeCommand<UiState>("set_auto_toggle", { enabled }),

  setLaunchOnLogin: (enabled: boolean) =>
    invokeCommand<UiState>("set_launch_on_login", { enabled }),

  setShowMenubarIcon: (enabled: boolean) =>
    invokeCommand<UiState>("set_show_menubar_icon", { enabled }),

  setMacroEnabled: (enabled: boolean) =>
    invokeCommand<UiState>("set_macro_enabled", { enabled }),

  setExcludeAppsEnabled: (enabled: boolean) =>
    invokeCommand<UiState>("set_exclude_apps_enabled", { enabled }),

  setTheme: (theme: string) =>
    invokeCommand<UiState>("set_theme", { theme }),

  setLanguage: (language: string) =>
    invokeCommand<UiState>("set_language", { language }),

  addMacro: (source: string, target: string) =>
    invokeCommand<UiState>("add_macro", { source, target }),

  deleteMacro: (source: string) =>
    invokeCommand<UiState>("delete_macro", { source }),

  addExcludedApp: (app: AppInfo) =>
    invokeCommand<UiState>("add_excluded_app", { app }),

  removeExcludedApp: (path: string) =>
    invokeCommand<UiState>("remove_excluded_app", { path }),

  setOpenWindowOnLaunch: (enabled: boolean) =>
    invokeCommand<UiState>("set_open_window_on_launch", { enabled }),

  searchApps: (query?: string) => invokeCommand<AppInfo[]>("search_apps", { query }),

  openUrl: (url: string) => invokeCommand<void>("open_url", { url }),
};
