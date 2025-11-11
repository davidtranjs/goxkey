import { memo } from "react"
import { Button } from "../button"
import { useI18n } from "@/lib/i18n"

type Props = {
  language: string
  onLanguageChange: (language: string) => void
}

export const LanguageSelector = memo(function LanguageSelector({ language, onLanguageChange }: Props) {
  const { t } = useI18n()
  
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-900 dark:text-gray-100 flex-1">
          {t.settings.language}
        </p>
        <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-[#2c2c2e] p-0.5">
          <Button
            variant={language === "en" ? "default" : "ghost"}
            size="sm"
            onClick={() => onLanguageChange("en")}
            className="h-7 px-3 text-[11px] rounded"
          >
            {t.settings.languageEnglish}
          </Button>
          <Button
            variant={language === "vi" ? "default" : "ghost"}
            size="sm"
            onClick={() => onLanguageChange("vi")}
            className="h-7 px-3 text-[11px] rounded"
          >
            {t.settings.languageVietnamese}
          </Button>
        </div>
      </div>
    </div>
  )
})

