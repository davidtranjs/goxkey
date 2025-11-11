import { memo } from "react"
import { Alert, AlertTitle, AlertDescription } from "../alert"
import { AlertTriangle } from "lucide-react"

export const AccessibilityAlert = memo(function AccessibilityAlert() {
  return (
    <Alert variant="destructive" className="border-amber-200 dark:border-amber-700/50 bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100">
      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
      <AlertTitle className="text-amber-900 dark:text-amber-100">Cần cấp quyền Accessibility</AlertTitle>
      <AlertDescription className="mt-2 text-amber-800 dark:text-amber-200/90">
        <p className="mb-2">
          macOS yêu cầu bạn cấp quyền Accessibility để Gõ Key có thể
          lắng nghe bàn phím và nhập văn bản.
        </p>
        <ol className="space-y-1 ml-4 list-decimal">
          <li>
            Mở System Settings → Privacy &amp; Security →
            Accessibility.
          </li>
          <li>Thêm Gõ Key vào danh sách và bật công tắc.</li>
          <li>Khởi động lại ứng dụng sau khi đã bật quyền.</li>
        </ol>
        <p className="mt-2.5 text-[10px] text-amber-700 dark:text-amber-300/70">
          Đã bật nhưng vẫn thấy thông báo? Thử thoát ứng dụng hoàn toàn
          rồi mở lại.
        </p>
      </AlertDescription>
    </Alert>
  );
})

