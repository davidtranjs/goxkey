import { memo } from "react"
import { Alert, AlertTitle, AlertDescription } from "../alert"
import { AlertTriangle } from "lucide-react"
import { useI18n } from "../../lib/i18n"

export const AccessibilityAlert = memo(function AccessibilityAlert() {
  const { t } = useI18n()
  
  return (
    <Alert variant="destructive" className="border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">{t.accessibility.title}</AlertTitle>
      <AlertDescription className="mt-2 text-amber-800 dark:text-amber-200/90">
        <p className="mb-2">
          {t.accessibility.description}
        </p>
        <ol className="space-y-1 ml-4 list-decimal">
          <li>
            {t.accessibility.step1}
          </li>
          <li>{t.accessibility.step2}</li>
          <li>{t.accessibility.step3}</li>
        </ol>
        <p className="mt-2.5 text-[10px] text-amber-700 dark:text-amber-300/70">
          {t.accessibility.note}
        </p>
      </AlertDescription>
    </Alert>
  );
})

