import { Button } from "../button"

type TypingMethod = "telex" | "vni"

type Props = {
  typingMethod: TypingMethod
  onMethodChange: (method: TypingMethod) => void
}

export function TypingMethodSelector({ typingMethod, onMethodChange }: Props) {
  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between">
        <p className="text-[13px] text-gray-900 dark:text-gray-100 flex-1">
          Kiểu gõ
        </p>
        <div className="inline-flex rounded-md border border-gray-200 dark:border-gray-700/50 bg-gray-100 dark:bg-[#2c2c2e] p-0.5">
          <Button
            variant={typingMethod === "telex" ? "default" : "ghost"}
            size="sm"
            onClick={() => onMethodChange("telex")}
            className="h-7 px-4 text-[11px] rounded"
          >
            Telex
          </Button>
          <Button
            variant={typingMethod === "vni" ? "default" : "ghost"}
            size="sm"
            onClick={() => onMethodChange("vni")}
            className="h-7 px-4 text-[11px] rounded"
          >
            VNI
          </Button>
        </div>
      </div>
    </div>
  )
}
