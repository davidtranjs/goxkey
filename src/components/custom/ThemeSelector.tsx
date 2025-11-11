import { memo } from "react"
import { Button } from "../button"
import { useI18n } from "../../lib/i18n"

type Props = {
  theme: string
  onThemeChange: (theme: string) => void
}

export const ThemeSelector = memo(function ThemeSelector({ theme, onThemeChange }: Props) {
  const { t } = useI18n()
  
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-900 dark:text-gray-100 flex-1">
          {t.settings.theme}
        </p>
        <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-[#2c2c2e] p-0.5">
          <Button
            variant={theme === "system" ? "default" : "ghost"}
            size="sm"
            onClick={() => onThemeChange("system")}
            className="h-7 px-3 text-[11px] rounded"
          >
            {t.settings.themeAuto}
          </Button>
          <Button
            variant={theme === "light" ? "default" : "ghost"}
            size="sm"
            onClick={() => onThemeChange("light")}
            className="h-7 px-3 text-[11px] rounded"
          >
            {t.settings.themeLight}
          </Button>
          <Button
            variant={theme === "dark" ? "default" : "ghost"}
            size="sm"
            onClick={() => onThemeChange("dark")}
            className="h-7 px-3 text-[11px] rounded"
          >
            {t.settings.themeDark}
          </Button>
        </div>
      </div>
    </div>
  )
})

