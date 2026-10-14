/**
 * 週與日期計算工具函式 (支援 ISO 8601 週次標準，一週以週一為起始日)
 */

export const parseDateString = (dateStr: string): Date => {
  const [y, m, d] = dateStr.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatDateToString = (d: Date): string => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * 取得指定日期所在週的週一 (YYYY-MM-DD)
 */
export const getMondayOfWeek = (input?: string | Date): string => {
  let dateObj: Date
  if (!input) {
    dateObj = new Date()
  } else if (typeof input === 'string') {
    dateObj = parseDateString(input)
  } else {
    dateObj = new Date(input.getFullYear(), input.getMonth(), input.getDate())
  }
  const day = dateObj.getDay() // 0 (Sun) - 6 (Sat)
  const diff = day === 0 ? -6 : 1 - day
  const monday = new Date(dateObj.getFullYear(), dateObj.getMonth(), dateObj.getDate() + diff)
  return formatDateToString(monday)
}

/**
 * 取得指定週一所對應的週日 (YYYY-MM-DD)
 */
export const getSundayOfWeek = (mondayStr: string): string => {
  const monday = parseDateString(mondayStr)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  return formatDateToString(sunday)
}

/**
 * 取得指定週一平移指定週數後的週一 (YYYY-MM-DD)
 */
export const getOffsetWeekMonday = (mondayStr: string, weekOffset: number): string => {
  const monday = parseDateString(mondayStr)
  const target = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + weekOffset * 7)
  return formatDateToString(target)
}

export interface WeekInfo {
  year: number // 該週核心歸屬年份 (以週四所在年份為準)
  weekNumber: number // 1 ~ 53 週
  startDate: string // YYYY-MM-DD (週一)
  endDate: string // YYYY-MM-DD (週日)
  rangeLabel: string // 例: "10/12 ~ 10/18"
  fullLabel: string // 例: "2026 年 第 42 週 (10/12 ~ 10/18)"
  fullRangeDetail: string // 例: "10月12日 (一) ~ 10月18日 (日)"
  isCurrentWeek: boolean
}

/**
 * 取得指定週一的詳細資訊 (包含週數、日期區間、格式化標籤)
 */
export const getWeekInfo = (mondayStr: string): WeekInfo => {
  const monday = parseDateString(mondayStr)
  const sunday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 6)
  const thursday = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + 3)
  const year = thursday.getFullYear()

  // ISO 8601 週號計算
  const firstDayOfYear = new Date(year, 0, 1)
  const daysDiff = Math.floor((thursday.getTime() - firstDayOfYear.getTime()) / (24 * 3600 * 1000))
  const weekNumber = Math.ceil((daysDiff + 1) / 7)

  const startM = monday.getMonth() + 1
  const startD = monday.getDate()
  const endM = sunday.getMonth() + 1
  const endD = sunday.getDate()

  const rangeLabel = `${startM}/${startD} ~ ${endM}/${endD}`
  const fullLabel = `${year} 年 第 ${weekNumber} 週 (${rangeLabel})`
  const fullRangeDetail = `${startM}月${startD}日 (一) ~ ${endM}月${endD}日 (日)`
  const isCurrentWeek = mondayStr === getMondayOfWeek(new Date())

  return {
    year,
    weekNumber,
    startDate: mondayStr,
    endDate: formatDateToString(sunday),
    rangeLabel,
    fullLabel,
    fullRangeDetail,
    isCurrentWeek,
  }
}

/**
 * 取得指定年份的所有週清單 (ISO 8601)
 */
export const getWeeksInYear = (year: number): Array<{
  weekNumber: number
  mondayStr: string
  sundayStr: string
  label: string
  rangeLabel: string
}> => {
  const weeks: Array<{
    weekNumber: number
    mondayStr: string
    sundayStr: string
    label: string
    rangeLabel: string
  }> = []

  // 1/4 必定落在 ISO 8601 的第一週
  const jan4 = new Date(year, 0, 4)
  let currMondayStr = getMondayOfWeek(jan4)

  while (true) {
    const info = getWeekInfo(currMondayStr)
    if (info.year > year) break
    if (info.year === year) {
      weeks.push({
        weekNumber: info.weekNumber,
        mondayStr: info.startDate,
        sundayStr: info.endDate,
        label: `第${info.weekNumber}週`,
        rangeLabel: info.rangeLabel,
      })
    }
    currMondayStr = getOffsetWeekMonday(currMondayStr, 1)
  }

  return weeks
}

