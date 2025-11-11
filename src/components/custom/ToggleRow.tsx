import { memo } from "react";
import { Switch } from "../switch";

export const ToggleRow = memo(function ToggleRow({
  title,
  description,
  checked,
  onClick,
}: {
  title: string;
  description?: string;
  checked: boolean;
  onClick: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5">
      <div className="flex-1">
        <p className="text-[13px] text-gray-900 dark:text-gray-100">{title}</p>
        {description && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
            {description}
          </p>
        )}
      </div>
      <Switch checked={checked} onCheckedChange={onClick} />
    </div>
  );
});
