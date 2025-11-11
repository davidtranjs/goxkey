import { memo, useCallback, useEffect, useMemo, useState } from "react"
import { Switch } from "../switch"
import { Card } from "../card"
import { Input } from "../input"
import { Button } from "../button"
import { X } from "lucide-react"
import { ipc, type AppInfo } from "../../lib"

type Props = {
  excludeAppsEnabled: boolean
  excludedApps: AppInfo[]
  onToggle: () => void
  onAdd: (app: AppInfo) => void
  onRemove: (path: string) => void
}

export const ExcludedAppsSection = memo(function ExcludedAppsSection({
  excludeAppsEnabled,
  excludedApps,
  onToggle,
  onAdd,
  onRemove,
}: Props) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AppInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchApps = useCallback(async (term: string) => {
    setLoading(true)
    try {
      const data = await ipc.searchApps(term)
      setResults(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchApps("")
  }, [fetchApps])

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchApps(query)
    }, 200)
    return () => clearTimeout(handler)
  }, [query, fetchApps])

  const availableResults = useMemo(() => {
    return results.filter(
      (item) => !excludedApps.some((entry) => entry.path === item.path)
    )
  }, [results, excludedApps])

  const handleSelect = useCallback(
    (app: AppInfo) => {
      if (!excludeAppsEnabled) {
        return
      }
      onAdd(app)
      setQuery("")
      setOpen(false)
    },
    [excludeAppsEnabled, onAdd]
  )

  const handleBlur = useCallback(() => {
    setTimeout(() => setOpen(false), 120)
  }, [])

  return (
    <section className="mt-4">
      <Card className="border-gray-200 dark:border-gray-700/50">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700/50">
          <div className="flex-1">
            <p className="text-[13px] text-gray-900 dark:text-gray-100">
              Bỏ qua ứng dụng
            </p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-0.5">
              Không đổi kiểu gõ cho app đã chọn
            </p>
          </div>
          <Switch checked={excludeAppsEnabled} onCheckedChange={onToggle} />
        </div>
        <div className="px-4 py-3 space-y-3">
          <div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">
              Chọn ứng dụng
            </p>
            <div className="relative mt-1">
              <Input
                placeholder="Nhập tên app hoặc bundle id"
                value={query}
                disabled={!excludeAppsEnabled}
                onChange={(event) => setQuery(event.target.value)}
                onFocus={() => setOpen(true)}
                onBlur={handleBlur}
                className="h-9 text-[12px] border-gray-300 dark:border-gray-600 pr-10"
              />
              {excludeAppsEnabled && open && (
                <div className="absolute left-0 right-0 mt-1 rounded-md border border-gray-200 dark:border-gray-700/50 bg-white dark:bg-[#1e1e1e] shadow-lg max-h-56 overflow-y-auto z-20">
                  {loading ? (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 px-3 py-2">
                      Đang tìm ứng dụng...
                    </p>
                  ) : availableResults.length === 0 ? (
                    <p className="text-[11px] text-gray-500 dark:text-gray-400 px-3 py-2">
                      Không tìm thấy ứng dụng phù hợp
                    </p>
                  ) : (
                    availableResults.map((app) => (
                      <button
                        key={app.path}
                        type="button"
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 dark:hover:bg-[#2c2c2e]"
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => handleSelect(app)}
                      >
                        <p className="text-[12px] text-gray-900 dark:text-gray-100">
                          {app.name}
                        </p>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400">
                          {app.identifier}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 mb-1">
              Đang bỏ qua
            </p>
            {excludedApps.length === 0 ? (
              <p className="text-[11px] text-gray-500 dark:text-gray-400">
                Chưa có ứng dụng nào
              </p>
            ) : (
              <div className="space-y-1.5 max-h-48 overflow-y-auto">
                {excludedApps.map((app) => (
                  <div
                    key={app.path}
                    className="flex items-center justify-between rounded border border-gray-200 dark:border-gray-700/50 bg-gray-50 dark:bg-[#2c2c2e] px-2.5 py-2"
                  >
                    <div className="overflow-hidden">
                      <p className="text-[12px] text-gray-900 dark:text-gray-100 truncate">
                        {app.name}
                      </p>
                      <p className="text-[10px] text-gray-500 dark:text-gray-400 truncate">
                        {app.identifier}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 ml-2"
                      onClick={() => onRemove(app.path)}
                    >
                      <X className="h-4 w-4 text-red-500 dark:text-red-400" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Card>
    </section>
  )
})
