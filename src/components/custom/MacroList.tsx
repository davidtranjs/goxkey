import { memo } from "react"
import { Button } from "../button"
import { X } from "lucide-react"

type MacroEntry = {
  source: string
  target: string
}

type Props = {
  macros: MacroEntry[]
  onDelete: (source: string) => void
}

export const MacroList = memo(function MacroList({ macros, onDelete }: Props) {
  if (macros.length === 0) {
    return null
  }

  return (
    <div className="space-y-1.5 max-h-48 overflow-y-auto border-t border-gray-200 dark:border-gray-700/50 pt-3 mt-1">
      {macros.map((entry) => (
        <MacroItem key={`${entry.source}-${entry.target}`} entry={entry} onDelete={onDelete} />
      ))}
    </div>
  )
})

const MacroItem = memo(function MacroItem({ 
  entry, 
  onDelete 
}: { 
  entry: MacroEntry
  onDelete: (source: string) => void
}) {
  return (
    <div className="flex items-center justify-between rounded bg-gray-50 dark:bg-[#2c2c2e] px-2.5 py-2 border border-gray-200 dark:border-gray-600">
      <div>
        <p className="text-[11px] font-medium text-gray-900 dark:text-gray-100">
          {entry.source}
        </p>
        <p className="text-[10px] text-gray-500 dark:text-gray-400">
          → {entry.target}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="h-5 w-5 ml-2"
        onClick={() => onDelete(entry.source)}
      >
        <X className="h-4 w-4 text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300" />
      </Button>
    </div>
  )
})

