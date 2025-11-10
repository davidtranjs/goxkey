import { useCallback, useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

import "./index.css"
import { ipc, type UiState } from "./lib"
import {
  LoadingScreen,
  AccessibilityAlert,
  ToggleRow,
  MainToggle,
  HotkeyConfig,
  ThemeSelector,
  MacroForm,
  MacroList,
} from "./components"
import { Card } from "./components/card"

export default function App() {
  const [state, setState] = useState<UiState | null>(null);
  const stateRef = useRef<UiState | null>(null);
  const [macroSource, setMacroSource] = useState("");
  const [macroTarget, setMacroTarget] = useState("");

  const runCommand = useCallback(async (handler: () => Promise<UiState>) => {
    try {
      const nextState = await handler();
      stateRef.current = nextState;
      setState(nextState);
    } catch (error) {
      console.error("Command failed:", error);
    }
  }, []);

  const refreshState = useCallback(async () => {
    try {
      const nextState = await ipc.getState();
      stateRef.current = nextState;
      setState(nextState);
    } catch (error) {
      console.error("Failed to refresh state:", error);
    }
  }, []);

  useEffect(() => {
    refreshState();
    let unlisten: UnlistenFn | null = null;
    let cancelled = false;

    const register = async () => {
      try {
        const handler = await listen("state-changed", () => {
          console.log("state-changed event received");
          refreshState();
        });
        if (cancelled) {
          handler();
        } else {
          unlisten = handler;
        }
      } catch (error) {
        console.error("Failed to register state listener:", error);
      }
    };

    register();

    return () => {
      cancelled = true;
      if (unlisten) {
        unlisten();
      }
    };
  }, [refreshState]);

  useEffect(() => {
    if (!state) return;
    const htmlElement = document.documentElement;
    const theme = state.theme;

    if (theme === "dark") {
      htmlElement.classList.add("dark");
    } else if (theme === "light") {
      htmlElement.classList.remove("dark");
    } else if (theme === "system") {
      const isDarkMode = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      if (isDarkMode) {
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
      }
    }
  }, [state?.theme]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        refreshState();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refreshState]);

  if (!state) {
    return <LoadingScreen />;
  }

  const handleMacroSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!macroSource.trim() || !macroTarget.trim()) {
      return;
    }
    runCommand(() => ipc.addMacro(macroSource.trim(), macroTarget.trim()));
    setMacroSource("");
    setMacroTarget("");
  };

  const saveHotkey = async (hotkey: string) => {
    await runCommand(() => ipc.setHotkey(hotkey));
  };

  return (
    <div className="h-screen bg-[#ececec] dark:bg-[#1e1e1e] flex">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="max-w-3xl px-5 py-5">
            {!state.accessibilityReady ? (
              <AccessibilityAlert />
            ) : (
              <>
                <MainToggle
                  isEnabled={state.isEnabled}
                  activeApp={state.activeApp}
                  onToggle={() =>
                    runCommand(() => ipc.setEnabled(!state.isEnabled))
                  }
                  typingMethod={state.typingMethod}
                  onTypingMethodChange={(method) =>
                    runCommand(() => ipc.setTypingMethod(method))
                  }
                />

                <section className="mt-4">
                  <Card className="border-gray-200 dark:border-gray-700/50 divide-y divide-gray-200 dark:divide-gray-700/50">
                    <ToggleRow
                      title="Tự đổi theo app"
                      description="Chuyển Việt/Anh tự động"
                      checked={state.autoToggleEnabled}
                      onClick={() =>
                        runCommand(() =>
                          ipc.setAutoToggle(!state.autoToggleEnabled)
                        )
                      }
                    />

                    <ToggleRow
                      title="Mở cùng macOS"
                      description="Khởi động tự động"
                      checked={state.launchOnLogin}
                      onClick={() =>
                        runCommand(() =>
                          ipc.setLaunchOnLogin(!state.launchOnLogin)
                        )
                      }
                    />

                    <ToggleRow
                      title="Icon menubar"
                      description="Hiện icon trên menu"
                      checked={state.showMenubarIcon}
                      onClick={() =>
                        runCommand(() =>
                          ipc.setShowMenubarIcon(!state.showMenubarIcon)
                        )
                      }
                    />

                    <ToggleRow
                      title="Macro"
                      description="Bật/tắt thay thế từ"
                      checked={state.macroEnabled}
                      onClick={() =>
                        runCommand(() =>
                          ipc.setMacroEnabled(!state.macroEnabled)
                        )
                      }
                    />

                    <ThemeSelector
                      theme={state.theme}
                      onThemeChange={(theme) =>
                        runCommand(() => ipc.setTheme(theme))
                      }
                    />
                  </Card>
                </section>

                <HotkeyConfig
                  currentHotkey={state.hotkey.display}
                  onSave={saveHotkey}
                />

                <section className="mt-4">
                  <Card className="border-gray-200 dark:border-gray-700/50 px-4 py-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5">
                      Thêm từ viết tắt để tự động thay thế
                    </p>
                    <MacroForm
                      source={macroSource}
                      target={macroTarget}
                      macroEnabled={state.macroEnabled}
                      onSourceChange={setMacroSource}
                      onTargetChange={setMacroTarget}
                      onSubmit={handleMacroSubmit}
                    />
                    <MacroList
                      macros={state.macros}
                      onDelete={(source) =>
                        runCommand(() => ipc.deleteMacro(source))
                      }
                    />
                  </Card>
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
