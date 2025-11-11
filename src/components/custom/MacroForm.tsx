import type { FormEvent } from "react"
import { memo } from "react"
import { Input } from "../input"
import { Button } from "../button"

type Props = {
  source: string
  target: string
  macroEnabled: boolean
  onSourceChange: (value: string) => void
  onTargetChange: (value: string) => void
  onSubmit: (event: FormEvent) => void
}

export const MacroForm = memo(function MacroForm({
  source,
  target,
  macroEnabled,
  onSourceChange,
  onTargetChange,
  onSubmit,
}: Props) {
  return (
    <form className="flex gap-2 mb-3" onSubmit={onSubmit}>
      <Input
        placeholder="từ"
        value={source}
        onChange={(e) => onSourceChange(e.target.value)}
        disabled={!macroEnabled}
        className="flex-1 h-8 text-[11px] border-gray-300 dark:border-gray-600"
      />
      <Input
        placeholder="thay thế"
        value={target}
        onChange={(e) => onTargetChange(e.target.value)}
        disabled={!macroEnabled}
        className="flex-1 h-8 text-[11px] border-gray-300 dark:border-gray-600"
      />
      <Button
        type="submit"
        disabled={!macroEnabled}
        size="sm"
        className="h-8 px-3 text-[11px]"
      >
        Thêm
      </Button>
    </form>
  )
})

