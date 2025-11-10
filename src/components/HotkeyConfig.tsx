import { memo } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Card } from "./card";

type Props = {
  hotkeyInput: string;
  currentHotkey: string;
  isSaving: boolean;
  onInputChange: (value: string) => void;
  onSave: () => void;
};

export const HotkeyConfig = memo(function HotkeyConfig({
  hotkeyInput,
  currentHotkey,
  isSaving,
  onInputChange,
  onSave,
}: Props) {
  return (
    <section className="mt-4">
      <Card className="border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center gap-3 px-4 py-3">
          <div className="flex-1">
            <p className="text-[13px] text-gray-900 dark:text-gray-100 mb-1">
              Phím tắt
            </p>
            <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1.5">
              Hiện tại:{" "}
              <span className="text-gray-900 dark:text-gray-100 font-medium">
                {currentHotkey || "Chưa đặt"}
              </span>
            </p>
            <div className="flex gap-2">
              <Input
                value={hotkeyInput}
                onChange={(event) => onInputChange(event.target.value)}
                placeholder="ctrl+space"
                className="flex-1 h-8 text-[11px] border-gray-300 dark:border-gray-600"
              />
              <Button
                onClick={onSave}
                disabled={isSaving}
                size="sm"
                className="h-8 px-3 text-[11px]"
              >
                Lưu
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  );
});
