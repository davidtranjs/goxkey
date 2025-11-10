import { useCallback, useEffect, useMemo, useState } from "react";
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
};

export default function App() {
  const [state, setState] = useState<UiState | null>(null);
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
    [],
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

  const hotkeyDisplay = state?.hotkey.display;

  useEffect(() => {
    if (hotkeyDisplay !== undefined) {
      setHotkeyInput(hotkeyDisplay);
    }
  }, [hotkeyDisplay]);

  const macroDisabledLabel = useMemo(() => {
    if (!state) return "";
    return state.macroEnabled ? "Thay thế từ" : "Bật tính năng macro để sử dụng";
  }, [state]);

  if (!state) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-100">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">Đang khởi động…</p>
      </main>
    );
  }

  const handleMacroSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!macroSource.trim() || !macroTarget.trim()) {
      return;
    }
    runCommand("add_macro", { source: macroSource.trim(), target: macroTarget.trim() });
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
    <div className="min-h-screen bg-slate-900 px-4 py-6 text-slate-100 sm:px-6">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-5">
        <header className="flex flex-col gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 px-5 py-4 shadow-xl shadow-cyan-500/5">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-cyan-300/70">GÕ KEY</p>
              <h1 className="text-2xl font-semibold text-white">Bàn điều khiển</h1>
            </div>
            <span className="rounded-full bg-cyan-500/20 px-3 py-1 text-xs font-medium text-cyan-200">
              v{state.version}
            </span>
          </div>
          <p className="text-sm text-slate-400">
            {state.goxModeEnabled ? "Chế độ GõX đang bật." : "Đang dùng chế độ tiêu chuẩn."}
          </p>
        </header>

        {!state.accessibilityReady ? (
          <section className="rounded-2xl border border-amber-400/30 bg-amber-950/40 px-5 py-6 text-amber-50">
            <h2 className="text-lg font-semibold text-amber-300">Cần cấp quyền Accessibility</h2>
            <p className="mt-2 text-sm text-amber-100/80">
              macOS yêu cầu bạn cấp quyền Accessibility để Gõ Key có thể lắng nghe bàn phím và nhập văn bản.
            </p>
            <ol className="mt-4 space-y-2 text-sm text-amber-100/70">
              <li>1. Mở System Settings → Privacy &amp; Security → Accessibility.</li>
              <li>2. Thêm Gõ Key vào danh sách và bật công tắc.</li>
              <li>3. Khởi động lại ứng dụng sau khi đã bật quyền.</li>
            </ol>
            <p className="mt-4 text-xs text-amber-200/80">
              Đã bật nhưng vẫn thấy thông báo? Thử thoát ứng dụng hoàn toàn rồi mở lại.
            </p>
          </section>
        ) : (
          <>
            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Trạng thái</p>
                    <p className="mt-1 text-xl font-semibold text-white">
                      {state.isEnabled ? "Đang bật" : "Đang tắt"}
                    </p>
                    <p className="text-xs text-slate-400">Ứng dụng hiện tại: {state.activeApp.split("/").pop()}</p>
                  </div>
                  <button
                    className={`rounded-full px-4 py-1 text-sm font-semibold transition ${state.isEnabled ? "bg-cyan-500/90 text-white" : "bg-slate-700 text-slate-200"}`}
                    onClick={() => runCommand("set_enabled", { enabled: !state.isEnabled })}
                  >
                    {state.isEnabled ? "Tắt" : "Bật"}
                  </button>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Kiểu gõ</p>
                <div className="mt-3 flex gap-3">
                  {([
                    { label: "Telex", value: "telex" },
                    { label: "VNI", value: "vni" },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      className={`flex-1 rounded-xl border px-4 py-3 text-sm font-semibold transition ${state.typingMethod === option.value ? "border-cyan-400 bg-cyan-500/10 text-cyan-200" : "border-slate-800 bg-slate-900 text-slate-200"}`}
                      onClick={() => runCommand("set_typing_method", { method: option.value })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </section>

            <section className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <ToggleRow
                  title="Tự đổi theo ứng dụng"
                  description="Tự chuyển Việt/Anh dựa trên ứng dụng trước đó"
                  checked={state.autoToggleEnabled}
                  onClick={() => runCommand("set_auto_toggle", { enabled: !state.autoToggleEnabled })}
                />
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <ToggleRow
                    title="Mở cùng macOS"
                    description="Khởi chạy Gõ Key khi máy bật lên"
                    checked={state.launchOnLogin}
                    onClick={() => runCommand("set_launch_on_login", { enabled: !state.launchOnLogin })}
                  />
                </div>
                <div className="mt-4 border-t border-slate-800 pt-4">
                  <ToggleRow
                    title="Hiện icon trên menubar"
                    description="Hiển thị biểu tượng Gõ Key trên thanh menu macOS"
                    checked={state.showMenubarIcon}
                    onClick={() => runCommand("set_show_menubar_icon", { enabled: !state.showMenubarIcon })}
                  />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                <ToggleRow
                  title="Macro"
                  description="Tự động thay thế cụm gõ theo bảng bên dưới"
                  checked={state.macroEnabled}
                  onClick={() => runCommand("set_macro_enabled", { enabled: !state.macroEnabled })}
                />
                <div className="mt-4 text-sm text-slate-400">{macroDisabledLabel}</div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Phím tắt bật/tắt</p>
                  <p className="text-lg font-semibold text-white">{state.hotkey.display || "Chưa đặt"}</p>
                  <p className="text-xs text-slate-400">Ví dụ: ctrl+space, super+shift+z…</p>
                </div>
                <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:justify-end">
                  <input
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    value={hotkeyInput}
                    onChange={(event) => setHotkeyInput(event.target.value)}
                    placeholder="ctrl+space"
                  />
                  <button
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${isSavingHotkey ? "bg-slate-700 text-slate-300" : "bg-cyan-500/90 text-white"}`}
                    onClick={saveHotkey}
                    disabled={isSavingHotkey}
                  >
                    Lưu phím tắt
                  </button>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm uppercase tracking-[0.25em] text-slate-500">Macro thay thế</p>
                  <p className="text-xs text-slate-400">Gõ từ bên trái, tự chuyển sang bên phải khi nhấn Space/Tab.</p>
                </div>
                <form className="flex flex-col gap-2 sm:flex-row" onSubmit={handleMacroSubmit}>
                  <input
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    placeholder="vd: tt" value={macroSource} onChange={(e) => setMacroSource(e.target.value)}
                    disabled={!state.macroEnabled}
                  />
                  <input
                    className="flex-1 rounded-xl border border-slate-800 bg-slate-900 px-3 py-2 text-sm text-slate-100 focus:border-cyan-500 focus:outline-none"
                    placeholder="vd: thân tặng" value={macroTarget} onChange={(e) => setMacroTarget(e.target.value)}
                    disabled={!state.macroEnabled}
                  />
                  <button
                    type="submit"
                    className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${state.macroEnabled ? "bg-cyan-500/90 text-white" : "bg-slate-700 text-slate-400"}`}
                    disabled={!state.macroEnabled}
                  >
                    Thêm
                  </button>
                </form>
              </div>
              <div className="mt-4 space-y-2">
                {state.macros.length === 0 ? (
                  <p className="text-sm text-slate-500">Chưa có macro nào.</p>
                ) : (
                  state.macros.map((entry) => (
                    <div
                      key={`${entry.source}-${entry.target}`}
                      className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900/60 px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-white">{entry.source}</p>
                        <p className="text-xs text-slate-400">→ {entry.target}</p>
                      </div>
                      <button
                        className="text-xs font-semibold text-rose-300"
                        onClick={() => runCommand("delete_macro", { source: entry.source })}
                      >
                        Xóa
                      </button>
                    </div>
                  ))
                )}
              </div>
            </section>
          </>
        )}

        <footer className="pb-4 text-center text-xs text-slate-500">
          Gõ Key · {new Date().getFullYear()}
        </footer>
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
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-sm font-semibold text-white">{title}</p>
        <p className="text-xs text-slate-400">{description}</p>
      </div>
      <button
        onClick={onClick}
        className={`relative inline-flex h-6 w-12 items-center rounded-full transition ${checked ? "bg-cyan-500/80" : "bg-slate-700"}`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${checked ? "translate-x-6" : "translate-x-1"}`}
        />
      </button>
    </div>
  );
}
