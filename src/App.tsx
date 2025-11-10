import { useCallback, useEffect, useState } from "react";
import type { FormEvent } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";

import "./index.css";

type TypingMethod = "telex" | "vni";

type HotkeyState = {
  display: string;
  letter?: string;
  superKey: boolean;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  capslockKey: boolean;
};

type MacroEntry = {
  source: string;
  target: string;
};

type UiState = {
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
};

type TabType = "general" | "advanced";

export default function App() {
  const [state, setState] = useState<UiState | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("general");
  const [macroSource, setMacroSource] = useState("");
  const [macroTarget, setMacroTarget] = useState("");
  const [hotkeyInput, setHotkeyInput] = useState("");
  const [isSavingHotkey, setIsSavingHotkey] = useState(false);

  const runCommand = useCallback(
    async (command: string, args?: Record<string, unknown>) => {
      try {
        const nextState = await invoke<UiState>(command, args);
        setState(nextState);
      } catch (error) {
        console.error(`Command ${command} failed`, error);
      }
    },
    []
  );

  useEffect(() => {
    invoke<UiState>("get_state").then(setState).catch(console.error);
    const unlistenPromise = listen<UiState>("state-changed", (event) => {
      setState(event.payload);
    });
    return () => {
      unlistenPromise.then((unlisten) => unlisten());
    };
  }, []);

  useEffect(() => {
    if (!state) return;
    const htmlElement = document.documentElement;
    const theme = state.theme;

    if (theme === "dark") {
      htmlElement.classList.add("dark");
    } else if (theme === "light") {
      htmlElement.classList.remove("dark");
    } else if (theme === "system") {
      const isDarkMode = window.matchMedia("(prefers-color-scheme: dark)").matches;
      if (isDarkMode) {
        htmlElement.classList.add("dark");
      } else {
        htmlElement.classList.remove("dark");
      }
    }
  }, [state?.theme]);

  const hotkeyDisplay = state?.hotkey.display;

  useEffect(() => {
    if (hotkeyDisplay !== undefined) {
      setHotkeyInput(hotkeyDisplay);
    }
  }, [hotkeyDisplay]);

  if (!state) {
    return (
      <main className="flex h-screen items-center justify-center bg-[#ececec] dark:bg-[#1e1e1e]">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Đang khởi động…
        </p>
      </main>
    );
  }

  const handleMacroSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!macroSource.trim() || !macroTarget.trim()) {
      return;
    }
    runCommand("add_macro", {
      source: macroSource.trim(),
      target: macroTarget.trim(),
    });
    setMacroSource("");
    setMacroTarget("");
  };

  const saveHotkey = async () => {
    if (!hotkeyInput.trim()) {
      return;
    }
    setIsSavingHotkey(true);
    await runCommand("set_hotkey", { hotkey: hotkeyInput.trim() });
    setIsSavingHotkey(false);
  };

  return (
    <div className="h-screen bg-[#ececec] dark:bg-[#1e1e1e] flex">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1e1e1e]">
          <div className="max-w-3xl px-5 py-5">
            {!state.accessibilityReady ? (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/50 px-4 py-3.5">
                <h2 className="text-[13px] font-semibold text-amber-900 dark:text-amber-100">
                  Cần cấp quyền Accessibility
                </h2>
                <p className="mt-2 text-[11px] text-amber-800 dark:text-amber-200/90 leading-relaxed">
                  macOS yêu cầu bạn cấp quyền Accessibility để Gõ Key có thể
                  lắng nghe bàn phím và nhập văn bản.
                </p>
                <ol className="mt-2.5 space-y-1 text-[11px] text-amber-800 dark:text-amber-200/80">
                  <li>
                    1. Mở System Settings → Privacy &amp; Security →
                    Accessibility.
                  </li>
                  <li>2. Thêm Gõ Key vào danh sách và bật công tắc.</li>
                  <li>3. Khởi động lại ứng dụng sau khi đã bật quyền.</li>
                </ol>
                <p className="mt-2.5 text-[10px] text-amber-700 dark:text-amber-300/70">
                  Đã bật nhưng vẫn thấy thông báo? Thử thoát ứng dụng hoàn toàn
                  rồi mở lại.
                </p>
              </div>
            ) : activeTab === "general" ? (
              <>
                <section>
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700/50 divide-y divide-gray-200 dark:divide-gray-700/50">
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex-1">
                        <p className="text-[13px] text-gray-900 dark:text-gray-100">
                          Bật gõ tiếng Việt
                        </p>
                        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
                          Ứng dụng: {state.activeApp.split("/").pop()}
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          runCommand("set_enabled", {
                            enabled: !state.isEnabled,
                          })
                        }
                        className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
                          state.isEnabled
                            ? "bg-[#30d158]"
                            : "bg-gray-300 dark:bg-gray-600"
                        }`}
                      >
                        <span
                          className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
                            state.isEnabled
                              ? "translate-x-[18px]"
                              : "translate-x-[2px]"
                          }`}
                        />
                      </button>
                    </div>

                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] text-gray-900 dark:text-gray-100 flex-1">
                          Kiểu gõ
                        </p>
                        <div className="inline-flex rounded-md bg-gray-100 dark:bg-[#2c2c2e] p-0.5 border border-gray-200 dark:border-gray-700/50">
                          <button
                            onClick={() =>
                              runCommand("set_typing_method", {
                                method: "telex",
                              })
                            }
                            className={`px-4 py-1 text-[11px] font-medium rounded transition-all ${
                              state.typingMethod === "telex"
                                ? "bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            Telex
                          </button>
                          <button
                            onClick={() =>
                              runCommand("set_typing_method", { method: "vni" })
                            }
                            className={`px-4 py-1 text-[11px] font-medium rounded transition-all ${
                              state.typingMethod === "vni"
                                ? "bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            VNI
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mt-4">
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700/50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex-1">
                        <p className="text-[13px] text-gray-900 dark:text-gray-100 mb-1">
                          Bật/tắt gõ tiếng Việt
                        </p>
                        <div className="flex gap-2">
                          <input
                            className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2c2c2e] px-2 py-1 text-[11px] text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent focus:outline-none"
                            value={hotkeyInput}
                            onChange={(event) =>
                              setHotkeyInput(event.target.value)
                            }
                            placeholder="ctrl+space"
                          />
                          <button
                            className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${
                              isSavingHotkey
                                ? "bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed"
                                : "bg-[#007aff] hover:bg-[#0051d5] text-white"
                            }`}
                            onClick={saveHotkey}
                            disabled={isSavingHotkey}
                          >
                            Lưu
                          </button>
                        </div>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
                          Hiện tại:{" "}
                          <span className="text-gray-900 dark:text-gray-100 font-medium">
                            {state.hotkey.display || "Chưa đặt"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mt-4">
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700/50 divide-y divide-gray-200 dark:divide-gray-700/50">
                    <ToggleRow
                      title="Tự đổi theo app"
                      description="Chuyển Việt/Anh tự động"
                      checked={state.autoToggleEnabled}
                      onClick={() =>
                        runCommand("set_auto_toggle", {
                          enabled: !state.autoToggleEnabled,
                        })
                      }
                    />

                    <ToggleRow
                      title="Mở cùng macOS"
                      description="Khởi động tự động"
                      checked={state.launchOnLogin}
                      onClick={() =>
                        runCommand("set_launch_on_login", {
                          enabled: !state.launchOnLogin,
                        })
                      }
                    />

                    <ToggleRow
                      title="Icon menubar"
                      description="Hiện icon trên menu"
                      checked={state.showMenubarIcon}
                      onClick={() =>
                        runCommand("set_show_menubar_icon", {
                          enabled: !state.showMenubarIcon,
                        })
                      }
                    />

                    <ToggleRow
                      title="Macro"
                      description="Bật/tắt thay thế từ"
                      checked={state.macroEnabled}
                      onClick={() =>
                        runCommand("set_macro_enabled", {
                          enabled: !state.macroEnabled,
                        })
                      }
                    />

                    <div className="px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-[13px] text-gray-900 dark:text-gray-100 flex-1">
                          Giao diện
                        </p>
                        <div className="inline-flex rounded-md bg-gray-100 dark:bg-[#2c2c2e] p-0.5 border border-gray-200 dark:border-gray-700/50">
                          <button
                            onClick={() =>
                              runCommand("set_theme", {
                                theme: "system",
                              })
                            }
                            className={`px-3 py-1 text-[11px] font-medium rounded transition-all ${
                              state.theme === "system"
                                ? "bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            Tự động
                          </button>
                          <button
                            onClick={() =>
                              runCommand("set_theme", {
                                theme: "light",
                              })
                            }
                            className={`px-3 py-1 text-[11px] font-medium rounded transition-all ${
                              state.theme === "light"
                                ? "bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            Sáng
                          </button>
                          <button
                            onClick={() =>
                              runCommand("set_theme", {
                                theme: "dark",
                              })
                            }
                            className={`px-3 py-1 text-[11px] font-medium rounded transition-all ${
                              state.theme === "dark"
                                ? "bg-white dark:bg-[#3a3a3c] text-gray-900 dark:text-white shadow-sm"
                                : "text-gray-600 dark:text-gray-400"
                            }`}
                          >
                            Tối
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </section>

                <section className="mt-4">
                  <div className="bg-white dark:bg-[#1e1e1e] rounded-lg border border-gray-200 dark:border-gray-700/50 px-4 py-3">
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-2.5">
                      Thêm từ viết tắt để tự động thay thế
                    </p>
                    <form
                      className="flex gap-2 mb-3"
                      onSubmit={handleMacroSubmit}
                    >
                      <input
                        className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2c2c2e] px-2 py-1 text-[11px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent focus:outline-none disabled:bg-gray-100 dark:disabled:bg-[#3a3a3c] disabled:text-gray-400"
                        placeholder="từ"
                        value={macroSource}
                        onChange={(e) => setMacroSource(e.target.value)}
                        disabled={!state.macroEnabled}
                      />
                      <input
                        className="flex-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-[#2c2c2e] px-2 py-1 text-[11px] text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-600 focus:border-transparent focus:outline-none disabled:bg-gray-100 dark:disabled:bg-[#3a3a3c] disabled:text-gray-400"
                        placeholder="thay thế"
                        value={macroTarget}
                        onChange={(e) => setMacroTarget(e.target.value)}
                        disabled={!state.macroEnabled}
                      />
                      <button
                        type="submit"
                        className={`rounded px-3 py-1 text-[11px] font-medium transition-colors ${
                          state.macroEnabled
                            ? "bg-[#007aff] hover:bg-[#0051d5] text-white"
                            : "bg-gray-300 dark:bg-gray-600 text-gray-400 cursor-not-allowed"
                        }`}
                        disabled={!state.macroEnabled}
                      >
                        Thêm
                      </button>
                    </form>

                    {state.macros.length > 0 && (
                      <div className="space-y-1.5 max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700/50 pt-3 mt-1">
                        {state.macros.map((entry) => (
                          <div
                            key={`${entry.source}-${entry.target}`}
                            className="flex items-center justify-between rounded bg-gray-50 dark:bg-[#2c2c2e] px-2.5 py-2 border border-gray-200 dark:border-gray-600"
                          >
                            <div>
                              <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100">
                                {entry.source}
                              </p>
                              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                → {entry.target}
                              </p>
                            </div>
                            <button
                              className="text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 transition-colors text-sm leading-none ml-2"
                              onClick={() =>
                                runCommand("delete_macro", {
                                  source: entry.source,
                                })
                              }
                            >
                              ✕
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </section>
              </>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-[13px]">
                Chức năng đang phát triển
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ToggleRow({
  title,
  description,
  checked,
  onClick,
}: {
  title: string;
  description: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex-1">
        <p className="text-[13px] text-gray-900 dark:text-gray-100">{title}</p>
        <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
          {description}
        </p>
      </div>
      <button
        onClick={onClick}
        className={`relative inline-flex h-[20px] w-[36px] items-center rounded-full transition-colors duration-200 flex-shrink-0 ${
          checked ? "bg-[#30d158]" : "bg-gray-300 dark:bg-gray-600"
        }`}
      >
        <span
          className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow-sm transition-transform duration-200 ${
            checked ? "translate-x-[18px]" : "translate-x-[2px]"
          }`}
        />
      </button>
    </div>
  );
}
