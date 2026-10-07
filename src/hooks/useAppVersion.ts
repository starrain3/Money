import { useState, useEffect, useCallback } from 'react'
import {
  APP_VERSION,
  BUILD_TIME,
  checkForUpdates,
  forceUpdateApp,
} from '../utils/version'

export function useAppVersion() {
  const [isChecking, setIsChecking] = useState(false)
  const [hasUpdate, setHasUpdate] = useState(false)
  const [remoteVersion, setRemoteVersion] = useState<string>(APP_VERSION)
  const [remoteBuildTime, setRemoteBuildTime] = useState<string>(BUILD_TIME)
  const [lastCheckMessage, setLastCheckMessage] = useState<string | null>(null)
  const [isUpdating, setIsUpdating] = useState(false)

  // 檢查更新函式
  const checkUpdate = useCallback(async (manual = false) => {
    setIsChecking(true)
    try {
      const res = await checkForUpdates()
      setHasUpdate(res.hasUpdate)
      setRemoteVersion(res.remoteVersion)
      setRemoteBuildTime(res.remoteBuildTime)

      if (manual) {
        if (res.hasUpdate) {
          setLastCheckMessage(`發現新版本 v${res.remoteVersion}！可點選強制更新。`)
        } else {
          setLastCheckMessage('目前已是最新版本！')
        }
      }
      return res
    } catch {
      if (manual) {
        setLastCheckMessage('檢查更新時發生連線錯誤，請稍後再試。')
      }
      return null
    } finally {
      setIsChecking(false)
    }
  }, [])

  // 強制更新函式
  const forceUpdate = useCallback(async () => {
    setIsUpdating(true)
    await forceUpdateApp()
  }, [])

  // 應用程式載入時自動檢查更新一次（延遲 3 秒避免影響初次載入體驗）
  useEffect(() => {
    const timer = setTimeout(() => {
      checkUpdate(false)
    }, 3000)

    // 當頁面切換回前台時自動檢查
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkUpdate(false)
      }
    }

    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [checkUpdate])

  return {
    currentVersion: APP_VERSION,
    buildTime: BUILD_TIME,
    isChecking,
    hasUpdate,
    remoteVersion,
    remoteBuildTime,
    lastCheckMessage,
    isUpdating,
    checkUpdate: () => checkUpdate(true),
    forceUpdate,
  }
}

