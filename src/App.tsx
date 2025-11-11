import { useCallback, useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"

import "./index.css"
import { ipc, type UiState } from "@/lib"
import { I18nProvider, useI18n } from "@/lib/i18n"
import {
  LoadingScreen,
  AccessibilityAlert,
  ToggleRow,
  MainToggle,
  HotkeyConfig,
  ThemeSelector,
  LanguageSelector,
  MacroForm,
  MacroList,
  ExcludedAppsSection,
} from "@/components"
import { Card } from "@/components/card"

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
  }, [state]);

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

  const language = state.language || "vi";

  return (
    <I18nProvider
      defaultLanguage={language as "en" | "vi"}
      onLanguageChange={(lang) => {
        runCommand(() => ipc.setLanguage(lang));
      }}
    >
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
                      <AppSettingsContent state={state} runCommand={runCommand} />
                    </Card>
                  </section>

                  <HotkeyConfig
                    currentHotkey={state.hotkey.display}
                    onSave={saveHotkey}
                  />

                  <ExcludedAppsSection
                    excludeAppsEnabled={state.excludeAppsEnabled}
                    excludedApps={state.excludedApps}
                    onToggle={() =>
                      runCommand(() =>
                        ipc.setExcludeAppsEnabled(!state.excludeAppsEnabled)
                      )
                    }
                    onAdd={(app) => runCommand(() => ipc.addExcludedApp(app))}
                    onRemove={(path) =>
                      runCommand(() => ipc.removeExcludedApp(path))
                    }
                  />

                  <section className="mt-4">
                    <Card className="border-gray-200 dark:border-gray-700/50 px-4 py-3">
                      <MacroSectionContent
                        state={state}
                        macroSource={macroSource}
                        macroTarget={macroTarget}
                        onSourceChange={setMacroSource}
                        onTargetChange={setMacroTarget}
                        onSubmit={handleMacroSubmit}
                        runCommand={runCommand}
                      />
                    </Card>
                  </section>

                  <footer className="mt-6 pb-6 flex flex-wrap gap-4 justify-center">
                    <button
                      onClick={() => ipc.openUrl("https://goxgox.davidtran.dev?ref=macos_app")}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      aria-label="Go to homepage"
                    >
                      🏡
                    </button>
                    <button
                      onClick={() => ipc.openUrl("https://github.com/davidtranjs/goxgox")}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      aria-label="Report issues"
                    >
                      🐛
                    </button>
                    <button
                      onClick={() => ipc.openUrl("https://goxgox.davidtran.dev/donate?ref=macos_app")}
                      className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                      aria-label="Donate"
                    >
                      📈
                    </button>
                  </footer>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </I18nProvider>
  );
}

function AppSettingsContent({
  state,
  runCommand,
}: {
  state: UiState;
  runCommand: (handler: () => Promise<UiState>) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <ToggleRow
        title={t.settings.autoToggleByApp}
        description={t.settings.autoToggleDescription}
        checked={state.autoToggleEnabled}
        onClick={() =>
          runCommand(() => ipc.setAutoToggle(!state.autoToggleEnabled))
        }
      />

      <ToggleRow
        title={t.settings.launchOnLogin}
        description={t.settings.launchOnLoginDescription}
        checked={state.launchOnLogin}
        onClick={() =>
          runCommand(() => ipc.setLaunchOnLogin(!state.launchOnLogin))
        }
      />

      <ToggleRow
        title={t.settings.openWindowOnLaunch}
        checked={state.openWindowOnLaunch}
        onClick={() =>
          runCommand(() => ipc.setOpenWindowOnLaunch(!state.openWindowOnLaunch))
        }
      />

      <ToggleRow
        title={t.settings.menubarIcon}
        description={t.settings.menubarIconDescription}
        checked={state.showMenubarIcon}
        onClick={() =>
          runCommand(() => ipc.setShowMenubarIcon(!state.showMenubarIcon))
        }
      />

      <ToggleRow
        title={t.settings.macro}
        description={t.settings.macroDescription}
        checked={state.macroEnabled}
        onClick={() =>
          runCommand(() => ipc.setMacroEnabled(!state.macroEnabled))
        }
      />

      <ThemeSelector
        theme={state.theme}
        onThemeChange={(theme) => runCommand(() => ipc.setTheme(theme))}
      />

      <LanguageSelector
        language={state.language || "vi"}
        onLanguageChange={(language) =>
          runCommand(() => ipc.setLanguage(language))
        }
      />
    </>
  );
}

function MacroSectionContent({
  state,
  macroSource,
  macroTarget,
  onSourceChange,
  onTargetChange,
  onSubmit,
  runCommand,
}: {
  state: UiState;
  macroSource: string;
  macroTarget: string;
  onSourceChange: (value: string) => void;
  onTargetChange: (value: string) => void;
  onSubmit: (event: FormEvent) => void;
  runCommand: (handler: () => Promise<UiState>) => void;
}) {
  const { t } = useI18n();

  return (
    <>
      <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5">
        {t.macro.addDescription}
      </p>
      <MacroForm
        source={macroSource}
        target={macroTarget}
        macroEnabled={state.macroEnabled}
        onSourceChange={onSourceChange}
        onTargetChange={onTargetChange}
        onSubmit={onSubmit}
      />
      <MacroList
        macros={state.macros}
        onDelete={(source) => runCommand(() => ipc.deleteMacro(source))}
      />
    </>
  );
}
