import type { ReminderItem } from '../types'

const STORAGE_KEY = 'harvest_user_reminders'

export const DEFAULT_REMINDERS: ReminderItem[] = [
  {
    id: 'reminder-daily-default',
    title: '每日記帳提醒',
    message: '今天有新的花費或投資進出嗎？花 10 秒記錄一下吧！',
    frequency: 'daily',
    time: '21:30',
    enabled: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'reminder-weekly-default',
    title: '每週財務回顧',
    message: '新的一週即將開始，回顧一下本週預算與支出狀況吧！',
    frequency: 'weekly',
    time: '20:00',
    dayOfWeek: 0, // 週日
    enabled: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'reminder-yearly-default',
    title: '年度資產檢視與保費備忘',
    message: '年度總整理！檢查各項年度定期開銷、保費與投資績效。',
    frequency: 'yearly',
    time: '10:00',
    monthOfYear: 12,
    dayOfMonth: 31,
    enabled: false,
    createdAt: new Date().toISOString(),
  },
]

// 載入所有提醒
export const loadReminders = (): ReminderItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      // 首次初始化預設提醒
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_REMINDERS))
      return DEFAULT_REMINDERS
    }
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed
    }
  } catch (e) {
    console.error('載入提醒設定失敗，使用預設值', e)
  }
  return DEFAULT_REMINDERS
}

// 儲存提醒列表
export const saveReminders = (reminders: ReminderItem[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders))
  } catch (e) {
    console.error('儲存提醒設定失敗', e)
  }
}

// 產生週幾文字
export const getDayOfWeekText = (day?: number): string => {
  const days = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  if (day === undefined || day < 0 || day > 6) return '週日'
  return days[day]
}

// 格式化頻率描述
export const formatReminderSchedule = (r: ReminderItem): string => {
  const timeStr = r.time || '12:00'
  switch (r.frequency) {
    case 'daily':
      return `每天 ${timeStr}`
    case 'weekly':
      return `每${getDayOfWeekText(r.dayOfWeek)} ${timeStr}`
    case 'monthly':
      return `每月 ${r.dayOfMonth || 1} 號 ${timeStr}`
    case 'yearly':
      return `每年 ${r.monthOfYear || 1}月${r.dayOfMonth || 1}日 ${timeStr}`
    default:
      return `${r.frequency} ${timeStr}`
  }
}
