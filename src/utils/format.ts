export const formatMoney = (amount: number, currency: string = 'NT$'): string => {
  return `${currency} ${amount.toLocaleString('zh-TW', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`
}

export const formatDateTaiwan = (dateStr: string): string => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  const weekDays = ['週日', '週一', '週二', '週三', '週四', '週五', '週六']
  const weekDay = weekDays[dateObj.getDay()] || ''
  return `${month}月${day}日 ${weekDay}`
}

export const formatFullDate = (dateStr: string): string => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${year}/${month}/${day}`
}

/**
 * 取得指定 Date 或當前時間在台灣時區 (UTC+8) 的日期字串 (YYYY-MM-DD)
 */
export const getTodayDateString = (d: Date = new Date()): string => {
  return d.toLocaleDateString('sv-SE', { timeZone: 'Asia/Taipei' })
}

/**
 * 取得指定 Date 或當前時間在台灣時區 (UTC+8) 的月份字串 (YYYY-MM)
 */
export const getCurrentMonthString = (d: Date = new Date()): string => {
  return getTodayDateString(d).substring(0, 7)
}

/**
 * 取得指定 Date 或當前時間在台灣時區 (UTC+8) 的時間字串 (HH:mm)
 */
export const getCurrentTimeString = (d: Date = new Date()): string => {
  return new Intl.DateTimeFormat('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'Asia/Taipei',
  }).format(d)
}

