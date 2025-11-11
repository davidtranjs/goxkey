import { memo, useState, useEffect, useCallback, useRef } from "react";
import { Button } from "../button";
import { Card } from "../card";
import { ipc, type HotkeyValidation } from "../../lib";
import { useI18n } from "../../lib/i18n";

type Props = {
  currentHotkey: string;
  onSave: (hotkey: string) => Promise<void>;
};

export const HotkeyConfig = memo(function HotkeyConfig({
  currentHotkey,
  onSave,
}: Props) {
  const { t } = useI18n();
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [hotkeyString, setHotkeyString] = useState("");
  const [validation, setValidation] = useState<HotkeyValidation | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const recordingRef = useRef(false);

  // Reset validation when recording starts
  useEffect(() => {
    if (isRecording) {
      setValidation(null);
      setHasChanges(false);
    }
  }, [isRecording]);

  // Validate hotkey whenever it changes
  useEffect(() => {
    if (hotkeyString && !isRecording && hotkeyString !== currentHotkey) {
      const validateHotkey = async () => {
        try {
          const result = await ipc.checkHotkey(hotkeyString);
          setValidation(result);
        } catch (error) {
          console.error("Failed to validate hotkey:", error);
          setValidation({
            isValid: false,
            hasConflict: false,
            message: t.hotkey.invalid,
          });
        }
      };
      validateHotkey();
    }
  }, [hotkeyString, isRecording, currentHotkey]);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (!recordingRef.current) return;

    event.preventDefault();
    event.stopPropagation();

    const keys: string[] = [];

    // Add modifiers in consistent order
    if (event.metaKey || event.key === "Meta") keys.push("super");
    if (event.ctrlKey || event.key === "Control") keys.push("ctrl");
    if (event.altKey || event.key === "Alt") keys.push("alt");
    if (event.shiftKey || event.key === "Shift") keys.push("shift");

    // Add the main key (not a modifier)
    if (
      event.key !== "Meta" &&
      event.key !== "Control" &&
      event.key !== "Alt" &&
      event.key !== "Shift"
    ) {
      let key = event.key.toLowerCase();

      // Map special keys
      if (key === " ") key = "space";
      else if (key === "enter") key = "enter";
      else if (key === "tab") key = "tab";
      else if (key === "escape") key = "esc";
      else if (key === "backspace") key = "delete";
      else if (key === "delete") key = "delete";
      else if (key.length > 1) return; // Ignore other special keys

      keys.push(key);
    }

    // Only update if we have at least a modifier + key, or a special key
    if (keys.length > 1 || (keys.length === 1 && ["space", "enter", "tab", "esc", "delete"].includes(keys[0]))) {
      setRecordedKeys(keys);
      const hotkeyStr = keys.join("+");
      setHotkeyString(hotkeyStr);
      setHasChanges(true);
    }
  }, []);

  const startRecording = () => {
    setIsRecording(true);
    recordingRef.current = true;
    setRecordedKeys([]);
    setHotkeyString("");
    setValidation(null);
    setHasChanges(false);
  };

  const stopRecording = () => {
    setIsRecording(false);
    recordingRef.current = false;
  };

  const handleSave = async () => {
    if (!hotkeyString || !validation || !validation.isValid || validation.hasConflict) {
      return;
    }

    setIsSaving(true);
    try {
      await onSave(hotkeyString);
      setHasChanges(false);
      setValidation(null);
    } catch (error) {
      console.error("Failed to save hotkey:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancel = () => {
    setHotkeyString("");
    setRecordedKeys([]);
    setValidation(null);
    setHasChanges(false);
    stopRecording();
  };

  useEffect(() => {
    if (isRecording) {
      window.addEventListener("keydown", handleKeyDown, true);
      return () => {
        window.removeEventListener("keydown", handleKeyDown, true);
      };
    }
  }, [isRecording, handleKeyDown]);

  // Format key display
  const formatKey = (key: string) => {
    const keyMap: Record<string, string> = {
      super: "⌘",
      ctrl: "⌃",
      alt: "⌥",
      shift: "⇧",
      space: "Space",
      enter: "↵",
      tab: "⇥",
      esc: "⎋",
      delete: "⌫",
    };
    return keyMap[key] || key.toUpperCase();
  };

  return (
    <section className="mt-4">
      <Card className="border-gray-200 dark:border-gray-700/50">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[13px] text-gray-900 dark:text-gray-100 font-medium">
              {t.hotkey.title}
            </p>
          </div>

          <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3">
            {t.hotkey.current}:{" "}
            <span className="text-gray-900 dark:text-gray-100 font-medium">
              {currentHotkey || t.hotkey.notSet}
            </span>
          </p>

          {/* Recording area */}
          <div
            className={`
              relative border-2 rounded-lg p-4 mb-3 min-h-[80px] flex items-center justify-center
              transition-all duration-200
              ${
                isRecording
                  ? "border-blue-500 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800/50"
              }
            `}
          >
            {isRecording ? (
              <div className="text-center">
                <p className="text-[11px] text-gray-600 dark:text-gray-300 mb-2">
                  {t.hotkey.recording}
                </p>
                {recordedKeys.length > 0 ? (
                  <div className="flex gap-1 items-center justify-center flex-wrap">
                    {recordedKeys.map((key, index) => (
                      <span key={index}>
                        <kbd className="px-3 py-1.5 text-[13px] font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded shadow-sm">
                          {formatKey(key)}
                        </kbd>
                        {index < recordedKeys.length - 1 && (
                          <span className="text-gray-400 mx-1">+</span>
                        )}
                      </span>
                    ))}
                  </div>
                ) : (
                  <div className="text-[12px] text-gray-400 dark:text-gray-500 animate-pulse">
                    {t.hotkey.waiting}
                  </div>
                )}
              </div>
            ) : hotkeyString && hasChanges ? (
              <div className="text-center w-full">
                <div className="flex gap-1 items-center justify-center flex-wrap mb-2">
                  {recordedKeys.map((key, index) => (
                    <span key={index}>
                      <kbd className="px-3 py-1.5 text-[13px] font-semibold text-gray-900 dark:text-gray-100 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-500 rounded shadow-sm">
                        {formatKey(key)}
                      </kbd>
                      {index < recordedKeys.length - 1 && (
                        <span className="text-gray-400 mx-1">+</span>
                      )}
                    </span>
                  ))}
                </div>

                {validation && (
                  <div className="mt-2">
                    {validation.hasConflict ? (
                      <p className="text-[11px] text-red-600 dark:text-red-400">
                        ⚠️ {t.hotkey.conflict}
                        {validation.message && ` (${validation.message})`}
                      </p>
                    ) : !validation.isValid ? (
                      <p className="text-[11px] text-orange-600 dark:text-orange-400">
                        ⚠️ {validation.message || t.hotkey.invalid}
                      </p>
                    ) : (
                      <p className="text-[11px] text-green-600 dark:text-green-400">
                        ✓ {t.hotkey.available}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                {t.hotkey.pressRecord}
              </p>
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-2">
            {!isRecording && !hasChanges && (
              <Button
                onClick={startRecording}
                size="sm"
                className="flex-1 h-8 text-[11px]"
              >
                🎙️ {t.hotkey.recordButton}
              </Button>
            )}

            {isRecording && (
              <Button
                onClick={stopRecording}
                size="sm"
                variant="outline"
                className="flex-1 h-8 text-[11px]"
              >
                {t.hotkey.stopRecording}
              </Button>
            )}

            {!isRecording && hasChanges && (
              <>
                <Button
                  onClick={handleCancel}
                  size="sm"
                  variant="outline"
                  className="flex-1 h-8 text-[11px]"
                >
                  {t.hotkey.cancel}
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={
                    isSaving ||
                    !validation ||
                    !validation.isValid ||
                    validation.hasConflict
                  }
                  size="sm"
                  className="flex-1 h-8 text-[11px]"
                >
                  {isSaving ? t.hotkey.saving : `💾 ${t.hotkey.save}`}
                </Button>
              </>
            )}
          </div>

          {/* Help text */}
          <p className="text-[9px] text-gray-400 dark:text-gray-500 mt-3 leading-relaxed">
            {t.hotkey.help}
          </p>
        </div>
      </Card>
    </section>
  );
});
