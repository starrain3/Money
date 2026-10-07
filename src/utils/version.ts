/**
 * 應用程式版本控制與更新管理工具
 */

export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '1.0.0'
export const BUILD_TIME = typeof __BUILD_TIME__ !== 'undefined' ? __BUILD_TIME__ : '2026-10-08 01:00'

export interface VersionInfo {
  version: string
  buildTime: string
}

export interface CheckUpdateResult {
  hasUpdate: boolean
  currentVersion: string
  remoteVersion: string
  currentBuildTime: string
  remoteBuildTime: string
  error?: string
}

/**
 * 向伺服器檢查是否有新版本發布
 */
export async function checkForUpdates(): Promise<CheckUpdateResult> {
  const defaultResult: CheckUpdateResult = {
    hasUpdate: false,
    currentVersion: APP_VERSION,
    remoteVersion: APP_VERSION,
    currentBuildTime: BUILD_TIME,
    remoteBuildTime: BUILD_TIME,
  }

  try {
    // 透過隨機 timestamp 避免被任何 HTTP 快取攔截
    const response = await fetch(`./version.json?_t=${Date.now()}`, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
      },
    })

    if (!response.ok) {
      throw new Error(`無法取得伺服器版本資訊 (${response.status})`)
    }

    const data: VersionInfo = await response.json()
    const remoteVersion = data.version || APP_VERSION
    const remoteBuildTime = data.buildTime || BUILD_TIME

    // 比對版號或建置時間是否有更新
    const hasUpdate =
      remoteVersion !== APP_VERSION ||
      (remoteBuildTime !== BUILD_TIME && Boolean(remoteBuildTime))

    return {
      hasUpdate,
      currentVersion: APP_VERSION,
      remoteVersion,
      currentBuildTime: BUILD_TIME,
      remoteBuildTime,
    }
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : '檢查更新失敗'
    console.warn('[Version] 檢查更新異常:', errorMsg)
    return {
      ...defaultResult,
      error: errorMsg,
    }
  }
}

/**
 * 執行強制更新：
 * 1. 取消註冊所有 Service Worker
 * 2. 清除所有 Cache Storage
 * 3. 嚴格保留 localStorage 中的記帳資料（絕不刪除記帳資料）
 * 4. 繞過瀏覽器快取重新載入最新頁面
 */
export async function forceUpdateApp(): Promise<void> {
  try {
    // 1. 取消註冊所有 Service Worker
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations()
      for (const registration of registrations) {
        await registration.unregister()
      }
    }

    // 2. 清除瀏覽器 Cache Storage 快取
    if ('caches' in window) {
      const cacheNames = await caches.keys()
      for (const cacheName of cacheNames) {
        await caches.delete(cacheName)
      }
    }
  } catch (error) {
    console.error('[Version] 清除快取時發生錯誤:', error)
  } finally {
    // 3. 附帶 timestamp 參數重新載入網頁，徹底避開快取
    const url = new URL(window.location.href)
    url.searchParams.set('reload_ts', Date.now().toString())
    window.location.replace(url.toString())
  }
}

