import React, { useEffect, useState } from 'react'
import { Download, X } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export const InstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [isIOS, setIsIOS] = useState(false)
  const [showPrompt, setShowPrompt] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // 檢查是否已在 standalone 模式
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      // @ts-expect-error iOS Safari standalone check
      window.navigator.standalone === true

    if (isStandalone) {
      return
    }

    // 檢查是否為 iOS
    const userAgent = window.navigator.userAgent.toLowerCase()
    const iosDevice = /iphone|ipad|ipod/.test(userAgent)
    setIsIOS(iosDevice)

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)

    // 如果是 iOS 且尚未儲存過關閉，延遲 2 秒提示
    if (iosDevice && !sessionStorage.getItem('ios_pwa_dismissed')) {
      const timer = setTimeout(() => {
        setShowPrompt(true)
      }, 2000)
      return () => clearTimeout(timer)
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  const handleInstallClick = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const handleDismiss = () => {
    setShowPrompt(false)
    setDismissed(true)
    if (isIOS) {
      sessionStorage.setItem('ios_pwa_dismissed', 'true')
    }
  }

  if (!showPrompt || dismissed) return null

  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 max-w-md mx-auto animate-in fade-in slide-in-from-bottom duration-300">
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950/90 border border-emerald-500/30 rounded-2xl p-4 shadow-2xl backdrop-blur-md flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <img
            src="pwa-192x192.png"
            alt="Ku Money"
            className="w-11 h-11 rounded-xl shadow-md border border-emerald-500/30 object-cover shrink-0"
          />
          <div>
            <h4 className="text-sm font-semibold text-white">安裝為手機 App (PWA)</h4>
            <p className="text-xs text-slate-300">
              {isIOS
                ? '點擊下方分享按鈕並選擇「加入主畫面」'
                : '離線可用、快速記帳、無廣告純淨體驗'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {!isIOS && deferredPrompt && (
            <button
              onClick={handleInstallClick}
              className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-xs rounded-lg transition-colors flex items-center gap-1 shadow-lg shadow-emerald-500/20 active:scale-95 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              安裝
            </button>
          )}
          <button
            onClick={handleDismiss}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  )
}

