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

