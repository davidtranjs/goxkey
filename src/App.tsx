import { invoke } from "@tauri-apps/api/tauri";
import { listen } from "@tauri-apps/api/event";
import { getVersion } from "@tauri-apps/api/app";
import { useCallback, useEffect, useMemo, useState } from "react";

interface MacroEntry {
  from: string;
  to: string;
}

interface HotkeyState {
  display: string;
  super_key: boolean;
  ctrl_key: boolean;
  alt_key: boolean;
  shift_key: boolean;
  capslock_key: boolean;
  letter_key: string;
}

interface ModifierSymbols {
  super_key: string;
  ctrl_key: string;
  alt_key: string;
  shift_key: string;
}

type TypingMethod = "VNI" | "Telex";

interface UiSnapshot {
  is_enabled: boolean;
  typing_method: TypingMethod;
  hotkey: HotkeyState;
  is_macro_enabled: boolean;
  is_auto_toggle_enabled: boolean;
  launch_on_login: boolean;
  macros: MacroEntry[];
  is_gox_mode_enabled: boolean;
  has_accessibility_permission: boolean;
  symbols: ModifierSymbols;
}

interface HotkeyUpdate {
  super_key: boolean;
  ctrl_key: boolean;
  alt_key: boolean;
  shift_key: boolean;
  capslock_key: boolean;
  letter_key: string;
}

const defaultHotkey: HotkeyUpdate = {
  super_key: false,
  ctrl_key: false,
  alt_key: false,
  shift_key: false,
  capslock_key: false,
  letter_key: ""
};

function normalizeLetterInput(value: string): string {
  if (!value) {
    return "";
  }
  if (value.toLowerCase() === "space" || value === " ") {
    return "Space";
  }
  return value.trim().slice(0, 1).toUpperCase();
}

function App(): JSX.Element {
  const [snapshot, setSnapshot] = useState<UiSnapshot | null>(null);
  const [hotkeyForm, setHotkeyForm] = useState<HotkeyUpdate>(defaultHotkey);
  const [macroFrom, setMacroFrom] = useState("");
  const [macroTo, setMacroTo] = useState("");
  const [busy, setBusy] = useState(false);
  const [appVersion, setAppVersion] = useState("0.0.0");

  const applySnapshot = useCallback((next: UiSnapshot) => {
    setSnapshot(next);
    setHotkeyForm({
      super_key: next.hotkey.super_key,
      ctrl_key: next.hotkey.ctrl_key,
      alt_key: next.hotkey.alt_key,
      shift_key: next.hotkey.shift_key,
      capslock_key: next.hotkey.capslock_key,
      letter_key: next.hotkey.letter_key
    });
  }, []);

  const refresh = useCallback(async () => {
    try {
      const state = await invoke<UiSnapshot>("get_ui_state");
      applySnapshot(state);
    } catch (error) {
      console.error("Failed to load UI state", error);
    }
  }, [applySnapshot]);

  useEffect(() => {
    refresh();
    getVersion().then(setAppVersion).catch(() => setAppVersion("0.0.0"));
    const subscription = listen("ui://update", () => {
      refresh();
    });
    return () => {
      subscription.then((unlisten) => unlisten());
    };
  }, [refresh]);

  const statusLabel = useMemo(() => {
    if (!snapshot) {
      return "";
    }
    if (!snapshot.has_accessibility_permission) {
      return "Chưa cấp quyền trợ năng";
    }
    if (snapshot.is_enabled) {
      return snapshot.is_gox_mode_enabled ? "Chế độ gõ" : "Đang bật";
    }
    return "Đang tắt";
  }, [snapshot]);

  const handle = useCallback(
    async <T,>(action: () => Promise<T>, onSuccess?: (value: T) => void) => {
      try {
        setBusy(true);
        const result = await action();
        onSuccess?.(result);
      } catch (error) {
        console.error(error);
        window.alert("Thao tác thất bại. Vui lòng thử lại.");
      } finally {
        setBusy(false);
      }
    },
    []
  );

  const updateHotkey = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      await handle(
        () =>
          invoke<UiSnapshot>("set_hotkey_command", {
            update: { ...hotkeyForm, letter_key: normalizeLetterInput(hotkeyForm.letter_key) }
          }),
        applySnapshot
      );
    },
    [applySnapshot, handle, hotkeyForm]
  );

  const addMacro = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const from = macroFrom.trim();
      const to = macroTo.trim();
      if (!from || !to) {
        return;
      }
      await handle(
        () => invoke<UiSnapshot>("add_macro_command", { from, to }),
        (state) => {
          applySnapshot(state);
          setMacroFrom("");
          setMacroTo("");
        }
      );
    },
    [applySnapshot, handle, macroFrom, macroTo]
  );

  const requestPermission = useCallback(async () => {
    await handle(async () => {
      const granted = await invoke<boolean>("request_accessibility_permission");
      if (!granted) {
        window.alert(
          "Ứng dụng cần quyền trợ năng để hoạt động. Vui lòng cấp quyền trong phần Cài đặt của macOS."
        );
      }
      await refresh();
      return granted;
    });
  }, [handle, refresh]);

  if (!snapshot) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center">
        <div className="animate-pulse text-lg">Đang tải…</div>
      </div>
    );
  }

  if (!snapshot.has_accessibility_permission) {
    return (
      <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-lg w-full rounded-2xl border border-slate-700 bg-slate-800/70 p-8 shadow-xl space-y-6">
          <header className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">GõKey cần quyền trợ năng</h1>
            <p className="text-sm text-slate-300">
              Để theo dõi và chuyển đổi phím, GõKey cần quyền Accessibility. Nhấn nút bên dưới để
              mở hộp thoại cấp quyền, sau đó bật GõKey trong danh sách.
            </p>
          </header>
          <div className="rounded-xl bg-slate-900/60 border border-slate-700 p-4 text-sm text-slate-300 space-y-2">
            <p>1. Nhấn “Mở tùy chọn trợ năng”.</p>
            <p>2. Chọn “Bảo mật &amp; Quyền riêng tư” → “Trợ năng”.</p>
            <p>3. Thêm hoặc bật “GõKey” trong danh sách ứng dụng được phép.</p>
            <p>4. Khởi động lại ứng dụng nếu cần.</p>
          </div>
          <button
            type="button"
            className="w-full rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700"
            onClick={requestPermission}
            disabled={busy}
          >
            Mở tùy chọn trợ năng
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 p-6">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-lg">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-2xl font-semibold">GõKey v{appVersion}</h1>
              <p className="text-sm text-slate-300">{statusLabel}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  snapshot.is_enabled
                    ? "bg-emerald-500/20 text-emerald-300"
                    : "bg-slate-700 text-slate-300"
                }`}
              >
                {snapshot.is_enabled ? "Đang bật" : "Đang tắt"}
              </span>
              {snapshot.is_gox_mode_enabled && (
                <span className="rounded-full bg-sky-500/20 px-3 py-1 text-xs font-semibold text-sky-200">
                  GõX mode
                </span>
              )}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-lg space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Bật gõ tiếng Việt</span>
              <button
                type="button"
                className={`inline-flex items-center rounded-full px-4 py-2 text-xs font-semibold transition ${
                  snapshot.is_enabled
                    ? "bg-emerald-500 text-emerald-950 hover:bg-emerald-400"
                    : "bg-slate-700 text-slate-200 hover:bg-slate-600"
                }`}
                onClick={() => handle(() => invoke<UiSnapshot>("toggle_vietnamese_command"), applySnapshot)}
                disabled={busy}
              >
                {snapshot.is_enabled ? "Tắt" : "Bật"}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-sm font-medium">Kiểu gõ</span>
              <div className="flex gap-3">
                {(["Telex", "VNI"] as TypingMethod[]).map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() =>
                      handle(() => invoke<UiSnapshot>("set_typing_method_command", { method }), applySnapshot)
                    }
                    disabled={busy}
                    className={`flex-1 rounded-xl border px-4 py-2 text-sm transition ${
                      snapshot.typing_method === method
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-200"
                        : "border-slate-700 bg-slate-900/60 text-slate-200 hover:border-slate-600"
                    }`}
                  >
                    {method}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              <span>Khởi động cùng hệ điều hành</span>
              <input
                type="checkbox"
                checked={snapshot.launch_on_login}
                onChange={(event) =>
                  handle(
                    () => invoke<UiSnapshot>("set_launch_on_login_command", { enabled: event.target.checked }),
                    applySnapshot
                  )
                }
                className="h-5 w-5 rounded border border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                disabled={busy}
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              <span>Bật bảng macro</span>
              <input
                type="checkbox"
                checked={snapshot.is_macro_enabled}
                onChange={() => handle(() => invoke<UiSnapshot>("toggle_macro_command"), applySnapshot)}
                className="h-5 w-5 rounded border border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                disabled={busy}
              />
            </label>

            <label className="flex items-center justify-between gap-3 text-sm font-medium">
              <span>Tự động chuyển ngôn ngữ theo ứng dụng</span>
              <input
                type="checkbox"
                checked={snapshot.is_auto_toggle_enabled}
                onChange={() => handle(() => invoke<UiSnapshot>("toggle_auto_toggle_command"), applySnapshot)}
                className="h-5 w-5 rounded border border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                disabled={busy}
              />
            </label>
          </div>

          <div className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-lg">
            <h2 className="text-lg font-semibold">Phím tắt chuyển chế độ</h2>
            <p className="mt-1 text-xs text-slate-300">
              Hiện tại: <span className="font-semibold text-emerald-300">{snapshot.hotkey.display || "(Chưa đặt)"}</span>
            </p>
            <form className="mt-4 space-y-4" onSubmit={updateHotkey}>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {["super_key", "ctrl_key", "alt_key", "shift_key", "capslock_key"].map((key) => {
                  const labelMap: Record<string, string> = {
                    super_key: `${snapshot.symbols.super_key} Super`,
                    ctrl_key: `${snapshot.symbols.ctrl_key} Control`,
                    alt_key: `${snapshot.symbols.alt_key} Option`,
                    shift_key: `${snapshot.symbols.shift_key} Shift`,
                    capslock_key: "Caps Lock"
                  };
                  return (
                    <label key={key} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border border-slate-600 bg-slate-900 text-emerald-500 focus:ring-emerald-400"
                        checked={(hotkeyForm as Record<string, boolean>)[key] ?? false}
                        onChange={(event) =>
                          setHotkeyForm((current) => ({ ...current, [key]: event.target.checked }))
                        }
                        disabled={busy}
                      />
                      <span>{labelMap[key]}</span>
                    </label>
                  );
                })}
              </div>
              <label className="block text-sm">
                <span>Phím chữ</span>
                <input
                  type="text"
                  value={hotkeyForm.letter_key}
                  onChange={(event) =>
                    setHotkeyForm((current) => ({ ...current, letter_key: event.target.value }))
                  }
                  placeholder="Space hoặc ký tự"
                  className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
                  maxLength={5}
                  disabled={busy}
                />
              </label>
              <div className="flex justify-end">
                <button
                  type="submit"
                  className="rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700"
                  disabled={busy}
                >
                  Lưu phím tắt
                </button>
              </div>
            </form>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700 bg-slate-800/70 p-6 shadow-lg space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Macro</h2>
            <span className="text-xs text-slate-400">Tổng {snapshot.macros.length}</span>
          </div>
          <p className="text-sm text-slate-300">
            Macro cho phép gõ tắt những cụm từ thường dùng. Ví dụ, nhập <code className="rounded bg-slate-900/70 px-1">gk</code> →
            <code className="rounded bg-slate-900/70 px-1">gõ tiếng Việt</code>.
          </p>
          <form className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]" onSubmit={addMacro}>
            <input
              type="text"
              value={macroFrom}
              onChange={(event) => setMacroFrom(event.target.value)}
              placeholder="Từ gốc"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              disabled={!snapshot.is_macro_enabled || busy}
            />
            <input
              type="text"
              value={macroTo}
              onChange={(event) => setMacroTo(event.target.value)}
              placeholder="Thay bằng"
              className="rounded-lg border border-slate-700 bg-slate-900/60 px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              disabled={!snapshot.is_macro_enabled || busy}
            />
            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-emerald-700"
              disabled={!snapshot.is_macro_enabled || busy || !macroFrom.trim() || !macroTo.trim()}
            >
              Thêm
            </button>
          </form>
          <div className="max-h-64 overflow-y-auto rounded-xl border border-slate-700">
            {snapshot.macros.length === 0 ? (
              <div className="p-4 text-sm text-slate-300">Chưa có macro nào.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-slate-900/70 text-left text-xs uppercase tracking-wide text-slate-400">
                  <tr>
                    <th className="px-4 py-2">Từ gốc</th>
                    <th className="px-4 py-2">Thay bằng</th>
                    <th className="px-4 py-2 text-right">&nbsp;</th>
                  </tr>
                </thead>
                <tbody>
                  {snapshot.macros.map((entry) => (
                    <tr key={entry.from} className="border-t border-slate-800">
                      <td className="px-4 py-2 font-mono text-slate-200">{entry.from}</td>
                      <td className="px-4 py-2 text-slate-200">{entry.to}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          className="rounded-lg border border-slate-600 px-3 py-1 text-xs text-slate-300 transition hover:border-red-500 hover:text-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                          onClick={() =>
                            handle(() => invoke<UiSnapshot>("delete_macro_command", { from: entry.from }), applySnapshot)
                          }
                          disabled={busy}
                        >
                          Xóa
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
