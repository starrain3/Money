import React, { useState } from 'react'
import { Sparkles, RefreshCw, X } from 'lucide-react'

interface UpdateNotificationBannerProps {
  hasUpdate: boolean
  remoteVersion: string
  isUpdating: boolean
  onForceUpdate: () => void
}

export const UpdateNotificationBanner: React.FC<UpdateNotificationBannerProps> = ({
  hasUpdate,
  remoteVersion,
  isUpdating,
  onForceUpdate,
}) => {
  const [dismissed, setDismissed] = useState(false)

  if (!hasUpdate || dismissed) return null

  return (
    <aside
      aria-label="版本更新通知"
      className="fixed bottom-20 sm:bottom-6 right-4 left-4 sm:left-auto sm:max-w-md z-40 animate-in fade-in slide-in-from-bottom-4 duration-300"
    >
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/90 border border-emerald-500/40 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center shrink-0 text-emerald-400">
            <Sparkles size={20} />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-white flex items-center gap-1.5">
              發現新版本
              <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-1.5 py-0.5 rounded border border-emerald-500/30">
                v{remoteVersion}
              </span>
            </h4>
            <p className="text-xs text-slate-300">系統已有新版本可用，點選立即強制更新！</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onForceUpdate}
            disabled={isUpdating}
            className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl transition-all flex items-center gap-1.5 shadow-lg shadow-emerald-500/25 active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
            {isUpdating ? '更新中' : '立即更新'}
          </button>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="關閉通知"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </aside>
  )
}

