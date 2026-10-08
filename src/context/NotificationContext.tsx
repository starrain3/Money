import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import {
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Info,
  X,
  HelpCircle,
} from 'lucide-react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'
export type DialogType = 'info' | 'warning' | 'danger' | 'error' | 'success'

export interface ToastItem {
  id: string
  message: string
  type: ToastType
  duration?: number
}

export interface AlertDialogOptions {
  title?: string
  type?: DialogType
  confirmText?: string
}

export interface ConfirmDialogOptions {
  title?: string
  type?: DialogType
  confirmText?: string
  cancelText?: string
}

interface DialogState {
  isOpen: boolean
  mode: 'alert' | 'confirm'
  title: string
  message: string
  type: DialogType
  confirmText: string
  cancelText: string
  resolve?: (value: boolean) => void
}

interface NotificationContextType {
  showToast: (message: string, type?: ToastType, duration?: number) => void
  showAlert: (message: string, options?: AlertDialogOptions) => Promise<void>
  showConfirm: (message: string, options?: ConfirmDialogOptions) => Promise<boolean>
}

const NotificationContext = createContext<NotificationContextType | null>(null)

export const useNotification = (): NotificationContextType => {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotification 必須在 NotificationProvider 內部使用')
  }
  return context
}

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Toast 清單狀態
  const [toasts, setToasts] = useState<ToastItem[]>([])

  // 模態對話框狀態
  const [dialog, setDialog] = useState<DialogState>({
    isOpen: false,
    mode: 'alert',
    title: '',
    message: '',
    type: 'info',
    confirmText: '確定',
    cancelText: '取消',
  })

  // 產生唯一 ID
  const idCounterRef = useRef<number>(0)

  // 移除特定 Toast
  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  // 顯示 Toast
  const showToast = useCallback(
    (message: string, type: ToastType = 'info', duration: number = 3200) => {
      idCounterRef.current += 1
      const id = `toast-${idCounterRef.current}-${Date.now()}`
      const newToast: ToastItem = { id, message, type, duration }

      setToasts((prev) => [...prev.slice(-4), newToast]) // 最多同時保留 5 個

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  // 顯示 Alert (替代原生 alert)
  const showAlert = useCallback(
    (message: string, options?: AlertDialogOptions): Promise<void> => {
      return new Promise<void>((resolve) => {
        setDialog({
          isOpen: true,
          mode: 'alert',
          title: options?.title || (options?.type === 'error' ? '提示' : '系統通知'),
          message,
          type: options?.type || 'info',
          confirmText: options?.confirmText || '我知道了',
          cancelText: '',
          resolve: () => resolve(),
        })
      })
    },
    []
  )

  // 顯示 Confirm (替代原生 confirm)
  const showConfirm = useCallback(
    (message: string, options?: ConfirmDialogOptions): Promise<boolean> => {
      return new Promise<boolean>((resolve) => {
        setDialog({
          isOpen: true,
          mode: 'confirm',
          title: options?.title || (options?.type === 'danger' ? '危險確認' : '確認操作'),
          message,
          type: options?.type || 'warning',
          confirmText: options?.confirmText || '確認',
          cancelText: options?.cancelText || '取消',
          resolve,
        })
      })
    },
    []
  )

  // 關閉對話框
  const handleDialogClose = (result: boolean) => {
    const resolver = dialog.resolve
    setDialog((prev) => ({ ...prev, isOpen: false, resolve: undefined }))
    if (resolver) {
      resolver(result)
    }
  }

  return (
    <NotificationContext.Provider value={{ showToast, showAlert, showConfirm }}>
      {children}

      {/* --- 全域 Toast 浮動通知容器 (固定於上方中央) --- */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none w-[92%] max-w-md">
        {toasts.map((t) => {
          const isSuccess = t.type === 'success'
          const isError = t.type === 'error'
          const isWarning = t.type === 'warning'

          const borderColor = isSuccess
            ? 'border-emerald-500/40 shadow-emerald-500/10'
            : isError
            ? 'border-rose-500/40 shadow-rose-500/10'
            : isWarning
            ? 'border-amber-500/40 shadow-amber-500/10'
            : 'border-blue-500/40 shadow-blue-500/10'

          const iconColor = isSuccess
            ? 'text-emerald-400'
            : isError
            ? 'text-rose-400'
            : isWarning
            ? 'text-amber-400'
            : 'text-blue-400'

          return (
            <div
              key={t.id}
              className={`pointer-events-auto flex items-start justify-between gap-3 p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-md border ${borderColor} shadow-xl text-white text-xs sm:text-sm animate-in fade-in slide-in-from-top-4 duration-200 transition-all`}
            >
              <div className="flex items-start gap-2.5 min-w-0">
                <span className={`shrink-0 mt-0.5 ${iconColor}`}>
                  {isSuccess && <CheckCircle2 size={17} />}
                  {isError && <AlertCircle size={17} />}
                  {isWarning && <AlertTriangle size={17} />}
                  {!isSuccess && !isError && !isWarning && <Info size={17} />}
                </span>
                <span className="font-medium text-slate-100 break-words leading-relaxed whitespace-pre-line">
                  {t.message}
                </span>
              </div>
              <button
                type="button"
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-1 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          )
        })}
      </div>

      {/* --- 全域自訂 Alert / Confirm 模態彈窗 --- */}
      {dialog.isOpen && (
        <div className="fixed inset-0 z-[9998] bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl animate-in zoom-in-95 duration-150 relative overflow-hidden">
            {/* 裝飾背景微光 */}
            <div
              className={`absolute -top-16 -right-16 w-36 h-36 rounded-full blur-3xl opacity-20 pointer-events-none ${
                dialog.type === 'danger' || dialog.type === 'error'
                  ? 'bg-rose-500'
                  : dialog.type === 'warning'
                  ? 'bg-amber-500'
                  : dialog.type === 'success'
                  ? 'bg-emerald-500'
                  : 'bg-blue-500'
              }`}
            />

            <div className="flex items-start gap-3.5 mb-4 relative z-10">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${
                  dialog.type === 'danger' || dialog.type === 'error'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : dialog.type === 'warning'
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : dialog.type === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                }`}
              >
                {dialog.type === 'danger' || dialog.type === 'error' ? (
                  <AlertCircle size={22} />
                ) : dialog.type === 'warning' ? (
                  <AlertTriangle size={22} />
                ) : dialog.type === 'success' ? (
                  <CheckCircle2 size={22} />
                ) : (
                  <HelpCircle size={22} />
                )}
              </div>

              <div className="min-w-0 flex-1 pt-0.5">
                <h4 className="text-base font-bold text-white tracking-wide">
                  {dialog.title}
                </h4>
                <div className="text-xs sm:text-sm text-slate-300 mt-2 whitespace-pre-line leading-relaxed break-words">
                  {dialog.message}
                </div>
              </div>
            </div>

            {/* 按鈕操作區 */}
            <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-800/80 relative z-10">
              {dialog.mode === 'confirm' && (
                <button
                  type="button"
                  onClick={() => handleDialogClose(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700/80 text-slate-300 hover:text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer border border-slate-700/60 active:scale-95"
                >
                  {dialog.cancelText}
                </button>
              )}

              <button
                type="button"
                onClick={() => handleDialogClose(true)}
                className={`px-5 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer shadow-lg active:scale-95 ${
                  dialog.type === 'danger' || dialog.type === 'error'
                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/25'
                    : dialog.type === 'warning'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/25'
                    : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-emerald-500/25'
                }`}
                autoFocus
              >
                {dialog.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </NotificationContext.Provider>
  )
}
