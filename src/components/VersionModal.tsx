import React from 'react'
import {
  X,
  RefreshCw,
  CheckCircle2,
  Info,
  Clock,
  ShieldCheck,
  Zap,
} from 'lucide-react'

interface VersionModalProps {
  isOpen: boolean
  onClose: () => void
  currentVersion: string
  buildTime: string
  isChecking: boolean
  hasUpdate: boolean
  remoteVersion: string
  remoteBuildTime: string
  lastCheckMessage: string | null
  isUpdating: boolean
  onCheckUpdate: () => void
  onForceUpdate: () => void
}

export const VersionModal: React.FC<VersionModalProps> = ({
  isOpen,
  onClose,
  currentVersion,
  buildTime,
  isChecking,
  hasUpdate,
  remoteVersion,
  remoteBuildTime,
  lastCheckMessage,
  isUpdating,
  onCheckUpdate,
  onForceUpdate,
}) => {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl w-full max-w-md shadow-2xl p-5 space-y-4">
        {/* 標題列 */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src="pwa-192x192.png"
              alt="Ku Money"
              className="w-10 h-10 rounded-xl shadow-md border border-slate-700/80 object-cover shrink-0"
            />
            <div>
              <h3 className="font-semibold text-slate-100 text-base">版本與更新管理</h3>
              <p className="text-xs text-slate-400">管理應用程式快取與取得最新版本</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X size={18} />
          </button>
        </div>

        {/* 版本卡片資訊 */}
        <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">目前版本</span>
            <span className="text-sm font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20 font-mono">
              v{currentVersion}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 flex items-center gap-1.5">
              <Clock size={13} className="text-slate-500" />
              建置時間
            </span>
            <span className="text-xs text-slate-300 font-mono">{buildTime}</span>
          </div>

          {hasUpdate && (
            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-amber-300 bg-amber-500/10 -mx-4 -mb-4 p-3 rounded-b-xl border-amber-500/30">
              <div className="flex items-center gap-1.5 text-xs font-medium">
                <Info size={14} />
                <span>伺服器有新版本：</span>
              </div>
              <span className="text-xs font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                v{remoteVersion} ({remoteBuildTime})
              </span>
            </div>
          )}
        </div>

        {/* 提示訊息 */}
        {lastCheckMessage && !hasUpdate && (
          <div className="text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-3 flex items-center gap-2">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{lastCheckMessage}</span>
          </div>
        )}

        {/* 安全提示說明 */}
        <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-800/40 border border-slate-700/40 rounded-xl p-3">
          <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            強制更新將清除瀏覽器快取與 Service Worker 並載入最新程式碼。<strong>您的所有本機記帳明細均安全保留於瀏覽器儲存區中，絕不會遺失。</strong>
          </p>
        </div>

        {/* 操作按鈕 */}
        <div className="grid grid-cols-2 gap-2.5 pt-1">
          <button
            onClick={onCheckUpdate}
            disabled={isChecking || isUpdating}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-medium transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw size={14} className={isChecking ? 'animate-spin text-emerald-400' : ''} />
            {isChecking ? '檢查中...' : '檢查更新'}
          </button>

          <button
            onClick={onForceUpdate}
            disabled={isUpdating}
            className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Zap size={14} className={isUpdating ? 'animate-bounce' : ''} />
            {isUpdating ? '更新重整中...' : '強制更新'}
          </button>
        </div>
      </div>
    </div>
  )
}

