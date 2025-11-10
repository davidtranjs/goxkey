import { memo } from "react"
import type { TypingMethod } from "../lib"
import { Switch } from "./switch"
import { Button } from "./button"
import { Card } from "./card"

type Props = {
  isEnabled: boolean
  activeApp: string
  onToggle: () => void
  typingMethod: TypingMethod
  onTypingMethodChange: (method: TypingMethod) => void
}

export const MainToggle = memo(function MainToggle({
  isEnabled,
  activeApp,
  onToggle,
  typingMethod,
  onTypingMethodChange,
}: Props) {
  return (
    <section>
      <Card className="border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex-1">
            <p className="text-[13px] text-gray-900 dark:text-gray-100">
              Bật gõ tiếng Việt
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Ứng dụng: {activeApp.split("/").pop()}
            </p>
          </div>
          <Switch checked={isEnabled} onCheckedChange={onToggle} />
        </div>
        
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] text-gray-900 dark:text-gray-100 flex-1">
              Kiểu gõ
            </p>
            <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-[#2c2c2e] p-0.5">
              <Button
                variant={typingMethod === "telex" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTypingMethodChange("telex")}
                className="h-7 px-3 text-[11px] rounded"
              >
                Telex
              </Button>
              <Button
                variant={typingMethod === "vni" ? "default" : "ghost"}
                size="sm"
                onClick={() => onTypingMethodChange("vni")}
                className="h-7 px-3 text-[11px] rounded"
              >
                VNI
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </section>
  )
})
