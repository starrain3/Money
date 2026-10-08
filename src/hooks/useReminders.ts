import { useState, useEffect, useCallback, useRef } from 'react'
import type { ReminderItem } from '../types'
import {
  loadReminders,
  saveReminders,
} from '../utils/reminderStorage'
import { useNotification } from '../context/NotificationContext'

export interface UseRemindersReturn {
  reminders: ReminderItem[]
  permission: NotificationPermission
  requestPermission: () => Promise<NotificationPermission>
  updateReminders: (newReminders: ReminderItem[]) => void
  toggleReminder: (id: string, enabled: boolean) => void
  deleteReminder: (id: string) => void
  saveOrUpdateReminder: (reminderData: Omit<ReminderItem, 'id' | 'createdAt'>, id?: string) => void
  triggerTestNotification: (reminder: ReminderItem) => Promise<boolean>
}

export function useReminders(): UseRemindersReturn {
  const [reminders, setReminders] = useState<ReminderItem[]>(() => loadReminders())
  const [permission, setPermission] = useState<NotificationPermission>(() => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      return Notification.permission
    }
    return 'default'
  })

  const { showToast } = useNotification()
  const remindersRef = useRef<ReminderItem[]>(reminders)

  useEffect(() => {
    remindersRef.current = reminders
  }, [reminders])

  // 請求瀏覽器通知權限
  const requestPermission = useCallback(async (): Promise<NotificationPermission> => {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      showToast('此瀏覽器不支援 Web Notification 通知功能', 'warning')
      return 'denied'
    }

    try {
      const res = await Notification.requestPermission()
      setPermission(res)
      if (res === 'granted') {
        showToast('已成功開啟系統推播通知權限！', 'success')
      } else if (res === 'denied') {
        showToast('您已封鎖通知權限，若需接收系統推播請至瀏覽器設定中開啟', 'warning')
      }
      return res
    } catch (e) {
      console.error('請求通知權限失敗', e)
      return 'denied'
    }
  }, [showToast])

  // 發送單一通知（系統推播 + 內部 Toast）
  const dispatchNotification = useCallback(
    async (title: string, message: string) => {
      // 1. 若有系統推播權限，嘗試送出系統 Notification
      if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
        try {
          // 如果有 serviceWorker 優先用 showNotification
          if ('serviceWorker' in navigator) {
            const reg = await navigator.serviceWorker.getRegistration()
            if (reg) {
              reg.showNotification(title, {
                body: message,
                icon: './pwa-192x192.png',
                badge: './pwa-192x192.png',
                tag: `reminder-${Date.now()}`,
              })
            } else {
              new Notification(title, {
                body: message,
                icon: './pwa-192x192.png',
              })
            }
          } else {
            new Notification(title, {
              body: message,
              icon: './pwa-192x192.png',
            })
          }
        } catch (e) {
          console.warn('系統推播發送失敗，使用應用程式內通知', e)
        }
      }

      // 2. 應用程式內部彈出精美 Toast
      showToast(`⏰ 【${title}】\n${message}`, 'info', 6000)
    },
    [showToast]
  )

  // 測試通知
  const triggerTestNotification = useCallback(
    async (reminder: ReminderItem): Promise<boolean> => {
      await dispatchNotification(`測試通知：${reminder.title}`, reminder.message)
      return true
    },
    [dispatchNotification]
  )

  // 儲存並更新狀態
  const updateReminders = useCallback((newReminders: ReminderItem[]) => {
    setReminders(newReminders)
    saveReminders(newReminders)
  }, [])

  // 開關特定提醒
  const toggleReminder = useCallback(
    (id: string, enabled: boolean) => {
      const updated = remindersRef.current.map((r) => (r.id === id ? { ...r, enabled } : r))
      updateReminders(updated)
    },
    [updateReminders]
  )

  // 刪除特定提醒
  const deleteReminder = useCallback(
    (id: string) => {
      const updated = remindersRef.current.filter((r) => r.id !== id)
      updateReminders(updated)
    },
    [updateReminders]
  )

  // 新增或修改提醒
  const saveOrUpdateReminder = useCallback(
    (reminderData: Omit<ReminderItem, 'id' | 'createdAt'>, id?: string) => {
      if (id) {
        const updated = remindersRef.current.map((r) =>
          r.id === id ? { ...r, ...reminderData } : r
        )
        updateReminders(updated)
      } else {
        const newReminder: ReminderItem = {
          ...reminderData,
          id: `reminder-${Date.now()}`,
          createdAt: new Date().toISOString(),
        }
        updateReminders([...remindersRef.current, newReminder])
      }
    },
    [updateReminders]
  )

  // 定期檢查是否觸發提醒
  const checkReminders = useCallback(() => {
    const now = new Date()
    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth() + 1 // 1 - 12
    const currentDate = now.getDate() // 1 - 31
    const currentDayOfWeek = now.getDay() // 0 - 6

    const currentHours = String(now.getHours()).padStart(2, '0')
    const currentMinutes = String(now.getMinutes()).padStart(2, '0')
    const currentTimeStr = `${currentHours}:${currentMinutes}` // 'HH:mm'

    const todayDateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(currentDate).padStart(2, '0')}`

    let hasUpdates = false
    const updatedList = remindersRef.current.map((r) => {
      if (!r.enabled) return r

      const [rHour, rMin] = (r.time || '12:00').split(':')
      const targetTimeStr = `${(rHour || '12').padStart(2, '0')}:${(rMin || '00').padStart(2, '0')}`

      // 時間未到不觸發
      if (currentTimeStr < targetTimeStr) return r

      let shouldTrigger = false
      let triggerPeriodKey = ''

      if (r.frequency === 'daily') {
        triggerPeriodKey = todayDateStr
        if (r.lastTriggeredDate !== triggerPeriodKey) {
          shouldTrigger = true
        }
      } else if (r.frequency === 'weekly') {
        const targetDay = r.dayOfWeek !== undefined ? r.dayOfWeek : 0
        if (currentDayOfWeek === targetDay) {
          triggerPeriodKey = todayDateStr
          if (r.lastTriggeredDate !== triggerPeriodKey) {
            shouldTrigger = true
          }
        }
      } else if (r.frequency === 'monthly') {
        const targetDayOfMonth = r.dayOfMonth || 1
        if (currentDate === targetDayOfMonth) {
          triggerPeriodKey = `${currentYear}-${String(currentMonth).padStart(2, '0')}`
          if (r.lastTriggeredDate !== triggerPeriodKey) {
            shouldTrigger = true
          }
        }
      } else if (r.frequency === 'yearly') {
        const targetMonth = r.monthOfYear || 1
        const targetDay = r.dayOfMonth || 1
        if (currentMonth === targetMonth && currentDate === targetDay) {
          triggerPeriodKey = String(currentYear)
          if (r.lastTriggeredDate !== triggerPeriodKey) {
            shouldTrigger = true
          }
        }
      }

      if (shouldTrigger) {
        hasUpdates = true
        dispatchNotification(r.title, r.message)
        return {
          ...r,
          lastTriggeredDate: triggerPeriodKey,
        }
      }

      return r
    })

    if (hasUpdates) {
      setReminders(updatedList)
      saveReminders(updatedList)
    }
  }, [dispatchNotification])

  // 啟動定時輪詢（每 30 秒檢查一次，以及視窗回焦時檢查）
  useEffect(() => {
    // 首次掛載立即檢查一次
    checkReminders()

    const interval = setInterval(() => {
      checkReminders()
    }, 30000)

    const handleFocus = () => {
      checkReminders()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleFocus)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleFocus)
    }
  }, [checkReminders])

  return {
    reminders,
    permission,
    requestPermission,
    updateReminders,
    toggleReminder,
    deleteReminder,
    saveOrUpdateReminder,
    triggerTestNotification,
  }
}
