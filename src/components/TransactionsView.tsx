import React, { useState, useMemo, useEffect } from 'react'
import type { Ledger, Transaction } from '../types'
import { formatMoney, formatDateTaiwan, formatFullDate } from '../utils/format'
import {
  Search,
  SlidersHorizontal,
  TrendingUp,
  TrendingDown,
  Coins,
  Inbox,
  Calendar as CalendarIcon,
  List as ListIcon,
  ChevronLeft,
  ChevronRight,
  PlusCircle,
} from 'lucide-react'

interface TransactionsViewProps {
  activeLedger: Ledger
  transactions: Transaction[]
  onSelectTransaction: (tx: Transaction) => void
  onOpenNewTransactionWithDate?: (date: string) => void
  hideBalances: boolean
}

type ViewMode = 'list' | 'calendar'

export const TransactionsView: React.FC<TransactionsViewProps> = ({
  activeLedger,
  transactions,
  onSelectTransaction,
  onOpenNewTransactionWithDate,
  hideBalances,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('list')
  const [searchQuery, setSearchQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  // 目前年月份字串 (YYYY-MM)
  const currentMonthStr = useMemo(() => new Date().toISOString().substring(0, 7), [])

  // 取得此帳本內所有記錄
  const ledgerTxList = useMemo(() => {
    return transactions.filter((t) => t.ledgerId === activeLedger.id)
  }, [transactions, activeLedger.id])

  // 取得所有存在的月份清單 (保證包含當前月份)
  const availableMonths = useMemo(() => {
    const set = new Set<string>()
    set.add(currentMonthStr)
    ledgerTxList.forEach((t) => {
      if (t.date && t.date.length >= 7) {
        set.add(t.date.substring(0, 7))
      }
    })
    return Array.from(set).sort().reverse()
  }, [ledgerTxList, currentMonthStr])

  // 明細列表預設依當前月份 (YYYY-MM) 進行過濾
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().substring(0, 7)
  })

  // 快速切換上一月 / 下一月
  const handlePrevMonth = () => {
    const baseMonth = selectedMonth || currentMonthStr
    const [year, month] = baseMonth.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 1)
    const prevStr = `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(prevStr)
  }

  const handleNextMonth = () => {
    const baseMonth = selectedMonth || currentMonthStr
    const [year, month] = baseMonth.split('-').map(Number)
    const nextDate = new Date(year, month, 1)
    const nextStr = `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    setSelectedMonth(nextStr)
  }

  // 切換帳本時，智慧調整預設選中月份
  useEffect(() => {
    // 檢查此帳本是否有當前選中的月份
    const hasCurrentSelected = ledgerTxList.some(
      (t) => t.date && t.date.startsWith(selectedMonth)
    )
    if (!hasCurrentSelected && ledgerTxList.length > 0) {
      // 若當前所選月份在該帳本無資料，但該帳本有其他記錄，自動對齊至最新有記錄的月份
      const latestMonth = availableMonths.find(
        (m) => m !== currentMonthStr && ledgerTxList.some((t) => t.date.startsWith(m))
      )
      if (latestMonth) {
        setSelectedMonth(latestMonth)
      }
    }
  }, [activeLedger.id])

  // 月曆專用狀態：目前瀏覽的年與月 (YYYY-MM)，以及點選的特定日期 (YYYY-MM-DD)
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], [])
  const [calendarMonth, setCalendarMonth] = useState<string>(() => todayStr.substring(0, 7))
  const [selectedDate, setSelectedDate] = useState<string>(todayStr)

  // --- 列表模式：篩選後資料 ---
  const filteredTransactions = useMemo(() => {
    return ledgerTxList.filter((tx) => {
      // 月份篩選
      if (selectedMonth && !tx.date.startsWith(selectedMonth)) {
        return false
      }

      // 類型篩選
      if (typeFilter !== 'all') {
        if (typeFilter === 'expense' && tx.type !== 'expense') return false
        if (typeFilter === 'income' && tx.type !== 'income') return false
        if (typeFilter === 'stock' && !['stock_buy', 'stock_sell', 'dividend'].includes(tx.type)) {
          return false
        }
      }

      // 搜尋字串
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const matchCategory = tx.category.toLowerCase().includes(query)
        const matchNotes = (tx.notes || '').toLowerCase().includes(query)
        const matchSymbol = (tx.stockSymbol || '').toLowerCase().includes(query)
        const matchAccount = (tx.account || '').toLowerCase().includes(query)
        return matchCategory || matchNotes || matchSymbol || matchAccount
      }

      return true
    })
  }, [ledgerTxList, selectedMonth, typeFilter, searchQuery])

  // 列表模式：依日期排序並分組
  const groupedByDate = useMemo(() => {
    const sorted = [...filteredTransactions].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateDiff !== 0) return dateDiff
      return (b.time || '').localeCompare(a.time || '')
    })

    const groups: { [date: string]: Transaction[] } = {}
    sorted.forEach((tx) => {
      if (!groups[tx.date]) {
        groups[tx.date] = []
      }
      groups[tx.date].push(tx)
    })
    return groups
  }, [filteredTransactions])

  // 篩選後交易的總計統計 (正的跟負的加起來)
  const filterSummary = useMemo(() => {
    let totalIncome = 0
    let totalExpense = 0
    filteredTransactions.forEach((t) => {
      if (t.type === 'income' || t.type === 'stock_sell' || t.type === 'dividend') {
        totalIncome += t.amount
      } else {
        totalExpense += t.amount
      }
    })
    const netTotal = totalIncome - totalExpense
    return {
      totalIncome,
      totalExpense,
      netTotal,
      count: filteredTransactions.length,
    }
  }, [filteredTransactions])

  // --- 月曆模式：產生當月份的網格資料 ---
  const calendarDays = useMemo(() => {
    const [year, month] = calendarMonth.split('-').map(Number)
    // 當月第一天
    const firstDay = new Date(year, month - 1, 1)
    // 星期幾 (0: 日 ~ 6: 六)
    const startingDayOfWeek = firstDay.getDay()
    // 當月總天數
    const daysInMonth = new Date(year, month, 0).getDate()
    // 上月總天數
    const daysInPrevMonth = new Date(year, month - 1, 0).getDate()

    const days = []

    // 上個月補齊的日子
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const prevDateNum = daysInPrevMonth - i
      const prevMonthNum = month === 1 ? 12 : month - 1
      const prevYearNum = month === 1 ? year - 1 : year
      const dateStr = `${prevYearNum}-${String(prevMonthNum).padStart(2, '0')}-${String(prevDateNum).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: prevDateNum,
        isCurrentMonth: false,
      })
    }

    // 當月日子
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
      })
    }

    // 下個月補齊的日子 (保持總數為 35 或 42)
    const remainingDays = (7 - (days.length % 7)) % 7
    for (let i = 1; i <= remainingDays; i++) {
      const nextMonthNum = month === 12 ? 1 : month + 1
      const nextYearNum = month === 12 ? year + 1 : year
      const dateStr = `${nextYearNum}-${String(nextMonthNum).padStart(2, '0')}-${String(i).padStart(2, '0')}`
      days.push({
        dateStr,
        dayNum: i,
        isCurrentMonth: false,
      })
    }

    return days
  }, [calendarMonth])

  // 月曆中每一天的財務匯總 Map (包含當日總損益金額)
  const dailySummaryMap = useMemo(() => {
    const map = new Map<
      string,
      {
        income: number
        expense: number
        stockBuy: number
        net: number
        count: number
      }
    >()

    ledgerTxList.forEach((t) => {
      const existing = map.get(t.date) || {
        income: 0,
        expense: 0,
        stockBuy: 0,
        net: 0,
        count: 0,
      }
      existing.count += 1
      if (t.type === 'income' || t.type === 'stock_sell' || t.type === 'dividend') {
        existing.income += t.amount
      } else if (t.type === 'stock_buy') {
        existing.stockBuy += t.amount
      } else {
        existing.expense += t.amount
      }
      existing.net = existing.income - (existing.expense + existing.stockBuy)
      map.set(t.date, existing)
    })

    return map
  }, [ledgerTxList])

  // 月曆當月總損益金額
  const calendarMonthNet = useMemo(() => {
    let income = 0
    let outlay = 0
    ledgerTxList.forEach((t) => {
      if (t.date && t.date.startsWith(calendarMonth)) {
        if (t.type === 'income' || t.type === 'stock_sell' || t.type === 'dividend') {
          income += t.amount
        } else {
          outlay += t.amount
        }
      }
    })
    return income - outlay
  }, [ledgerTxList, calendarMonth])

  // 當前選取日期的所有明細記錄
  const selectedDateTransactions = useMemo(() => {
    return ledgerTxList
      .filter((t) => t.date === selectedDate)
      .sort((a, b) => (b.time || '').localeCompare(a.time || ''))
  }, [ledgerTxList, selectedDate])

  // 當前選取日期的正負相加總金額
  const selectedDayNet = useMemo(() => {
    let income = 0
    let expense = 0
    selectedDateTransactions.forEach((t) => {
      if (t.type === 'income' || t.type === 'stock_sell' || t.type === 'dividend') {
        income += t.amount
      } else {
        expense += t.amount
      }
    })
    return income - expense
  }, [selectedDateTransactions])

  // 月曆切換月份
  const handlePrevCalendarMonth = () => {
    const [year, month] = calendarMonth.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 1)
    setCalendarMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const handleNextCalendarMonth = () => {
    const [year, month] = calendarMonth.split('-').map(Number)
    const nextDate = new Date(year, month, 1)
    setCalendarMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const handleGoToToday = () => {
    setCalendarMonth(todayStr.substring(0, 7))
    setSelectedDate(todayStr)
  }

  const maskValue = (val: string) => (hideBalances ? '••••••' : val)

  // 格式化簡短金額 (如 1.2k, 5.8w)
  const formatCompactAmount = (amt: number): string => {
    if (hideBalances) return '••'
    if (amt >= 10000) {
      return `${(amt / 10000).toFixed(1)}萬`
    }
    if (amt >= 1000) {
      return `${Math.round(amt)}`
    }
    return `${Math.round(amt)}`
  }

  return (
    <div className="space-y-4 pb-28 max-w-4xl mx-auto px-4 pt-3">
      {/* 頂部切換列：列表檢視 vs 月曆檢視 */}
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          {viewMode === 'list' ? <ListIcon size={18} className="text-emerald-400" /> : <CalendarIcon size={18} className="text-emerald-400" />}
          {viewMode === 'list' ? '明細列表' : '月曆檢視'}
        </h2>

        <div className="flex items-center p-1 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'list'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListIcon size={14} />
            列表
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              viewMode === 'calendar'
                ? 'bg-emerald-500 text-slate-950 shadow-md font-semibold'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CalendarIcon size={14} />
            月曆
          </button>
        </div>
      </div>

      {/* ======================= 月曆模式 ======================= */}
      {viewMode === 'calendar' ? (
        <div className="space-y-4">
          {/* 月份切換列 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-lg flex items-center justify-between">
            <div className="flex items-center gap-1">
              <button
                onClick={handlePrevCalendarMonth}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="上個月"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNextCalendarMonth}
                className="p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
                title="下個月"
              >
                <ChevronRight size={18} />
              </button>
              <button
                onClick={handleGoToToday}
                className="ml-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer border border-slate-700/60"
              >
                今天
              </button>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-base text-white tracking-wide">
                {calendarMonth.replace('-', ' 年 ')} 月
              </span>
              <span
                className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                  calendarMonthNet > 0
                    ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                    : calendarMonthNet < 0
                    ? 'bg-rose-500/15 text-rose-400 border-rose-500/30'
                    : 'bg-slate-800 text-slate-400 border-slate-700'
                }`}
                title="當月累積總損益"
              >
                總損益: {calendarMonthNet > 0 ? '+' : ''}
                {maskValue(formatMoney(calendarMonthNet, activeLedger.currency))}
              </span>
            </div>

            <span className="text-xs text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-lg">
              {activeLedger.name}
            </span>
          </div>

          {/* 月曆網格面板 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 shadow-xl overflow-hidden">
            {/* 星期表頭 */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['日', '一', '二', '三', '四', '五', '六'].map((day, idx) => (
                <div
                  key={day}
                  className={`text-xs font-semibold py-1.5 ${
                    idx === 0 || idx === 6 ? 'text-amber-400/80' : 'text-slate-400'
                  }`}
                >
                  週{day}
                </div>
              ))}
            </div>

            {/* 日曆日期格 */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((item) => {
                const isSelected = item.dateStr === selectedDate
                const isToday = item.dateStr === todayStr
                const summary = dailySummaryMap.get(item.dateStr)

                return (
                  <button
                    key={item.dateStr}
                    type="button"
                    onClick={() => setSelectedDate(item.dateStr)}
                    className={`min-h-[64px] sm:min-h-[72px] p-1 rounded-xl flex flex-col justify-between items-center transition-all cursor-pointer relative border ${
                      isSelected
                        ? 'border-emerald-400 bg-emerald-500/15 shadow-md shadow-emerald-500/10 ring-1 ring-emerald-400'
                        : isToday
                        ? 'border-emerald-500/40 bg-slate-850 hover:bg-slate-800'
                        : item.isCurrentMonth
                        ? 'border-slate-800/60 bg-slate-850/40 hover:bg-slate-800/60'
                        : 'border-transparent bg-slate-900/30 opacity-40 hover:opacity-70'
                    }`}
                  >
                    {/* 日期數字與今天小標 */}
                    <div className="w-full flex items-center justify-between px-1">
                      <span
                        className={`text-xs font-semibold ${
                          isSelected
                            ? 'text-emerald-300 font-bold'
                            : isToday
                            ? 'text-emerald-400 font-bold'
                            : item.isCurrentMonth
                            ? 'text-slate-200'
                            : 'text-slate-500'
                        }`}
                      >
                        {item.dayNum}
                      </span>
                      {isToday && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
                      )}
                    </div>

                    {/* 當日總損益金額 */}
                    {summary && summary.count > 0 ? (
                      <div className="w-full flex flex-col items-center justify-end gap-0.5 mt-auto pt-1 overflow-hidden">
                        <div
                          className={`w-full text-center text-[10px] sm:text-xs font-bold font-mono px-1 py-0.5 rounded-md truncate leading-tight ${
                            summary.net > 0
                              ? 'text-emerald-400 bg-emerald-500/15 border border-emerald-500/25'
                              : summary.net < 0
                              ? 'text-rose-400 bg-rose-500/15 border border-rose-500/25'
                              : 'text-slate-400 bg-slate-800/60'
                          }`}
                          title={`總損益金額: ${summary.net >= 0 ? '+' : ''}${maskValue(formatMoney(summary.net, activeLedger.currency))} (${summary.count} 筆記錄)`}
                        >
                          {summary.net > 0 ? '+' : summary.net < 0 ? '-' : ''}
                          {formatCompactAmount(Math.abs(summary.net))}
                        </div>
                        <span className="text-[9px] text-slate-500 scale-90 -mt-0.5">
                          {summary.count}筆
                        </span>
                      </div>
                    ) : (
                      <div className="mt-auto h-4" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* 下方：所選日期的明細卡片清單 */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-bold text-sm text-white">
                  {formatFullDate(selectedDate)} ({formatDateTaiwan(selectedDate).split(' ')[1] || ''})
                </div>
                <span className="text-xs text-slate-400">
                  {selectedDateTransactions.length} 筆明細
                </span>
                {selectedDateTransactions.length > 0 && (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      selectedDayNet >= 0
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                    }`}
                  >
                    總金額: {selectedDayNet >= 0 ? '+' : '-'}NT$
                    {maskValue(Math.abs(selectedDayNet).toLocaleString('zh-TW'))}
                  </span>
                )}
              </div>

              {onOpenNewTransactionWithDate && (
                <button
                  onClick={() => onOpenNewTransactionWithDate(selectedDate)}
                  className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer"
                >
                  <PlusCircle size={13} />
                  補記此日
                </button>
              )}
            </div>

            {selectedDateTransactions.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-xs text-slate-500 mb-2">當日尚無任何記帳記錄</p>
                {onOpenNewTransactionWithDate && (
                  <button
                    onClick={() => onOpenNewTransactionWithDate(selectedDate)}
                    className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition-colors cursor-pointer border border-slate-700"
                  >
                    + 為 {selectedDate} 記一筆
                  </button>
                )}
              </div>
            ) : (
              <div className="divide-y divide-slate-800/60">
                {selectedDateTransactions.map((tx) => {
                  const isIncome =
                    tx.type === 'income' || tx.type === 'stock_sell' || tx.type === 'dividend'
                  return (
                    <div
                      key={tx.id}
                      onClick={() => onSelectTransaction(tx)}
                      className="py-3 px-1 hover:bg-slate-800/40 rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${
                            tx.type === 'stock_buy'
                              ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                              : tx.type === 'stock_sell'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : tx.type === 'dividend'
                              ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                              : tx.type === 'income'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                              : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          }`}
                        >
                          {tx.type === 'stock_buy' && <TrendingUp size={16} />}
                          {tx.type === 'stock_sell' && <TrendingDown size={16} />}
                          {tx.type === 'dividend' && <Coins size={16} />}
                          {tx.type === 'income' && <TrendingUp size={16} />}
                          {tx.type === 'expense' && <TrendingDown size={16} />}
                        </div>

                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors">
                              {tx.category}
                            </span>
                            {tx.stockSymbol && (
                              <span
                                className={`text-[11px] font-medium border px-1.5 py-0.2 rounded ${
                                  activeLedger.type === 'futures'
                                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                    : activeLedger.type === 'stock'
                                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                }`}
                              >
                                {tx.stockSymbol}
                              </span>
                            )}
                            {tx.shares && (
                              <span className="text-[10px] text-slate-400">
                                {tx.shares} 股
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                            {tx.time && <span>{tx.time}</span>}
                            <span>• {tx.account}</span>
                            {tx.notes && (
                              <span className="truncate max-w-[130px] text-slate-300">
                                ({tx.notes})
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div
                          className={`text-sm font-bold tracking-tight ${
                            isIncome ? 'text-emerald-400' : 'text-rose-400'
                          }`}
                        >
                          {isIncome ? '+' : '-'} {maskValue(formatMoney(tx.amount, activeLedger.currency))}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ======================= 列表模式 ======================= */
        <div className="space-y-4">
          {/* 搜尋與篩選列 */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="搜尋分類、股票代碼、備註或帳戶..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* 篩選標籤列 */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none text-xs">
              <div className="flex items-center gap-1 text-slate-400 shrink-0">
                <SlidersHorizontal size={13} />
                <span>篩選:</span>
              </div>

              <button
                onClick={() => setTypeFilter('all')}
                className={`px-3 py-1.5 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                  typeFilter === 'all'
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                全部類型
              </button>

              <button
                onClick={() => setTypeFilter('expense')}
                className={`px-3 py-1.5 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                  typeFilter === 'expense'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                支出
              </button>

              <button
                onClick={() => setTypeFilter('income')}
                className={`px-3 py-1.5 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                  typeFilter === 'income'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                收入
              </button>

              <button
                onClick={() => setTypeFilter('stock')}
                className={`px-3 py-1.5 rounded-lg shrink-0 font-medium transition-colors cursor-pointer ${
                  typeFilter === 'stock'
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                股票/投資
              </button>

              {/* 月份選擇與切換 */}
              <div className="flex items-center gap-0.5 shrink-0 bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="上個月"
                >
                  <ChevronLeft size={14} />
                </button>
                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-transparent text-slate-200 border-none px-1.5 py-1 focus:outline-none text-xs cursor-pointer font-medium"
                >
                  <option value="" className="bg-slate-900 text-slate-300">
                    所有月份
                  </option>
                  {availableMonths.map((m) => (
                    <option key={m} value={m} className="bg-slate-900 text-slate-200">
                      {m === currentMonthStr ? `${m} (本月)` : m}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="下個月"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          </div>

          {/* 明細統計總金額卡片 (正負相加總金額) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400 font-medium mb-1">
                {selectedMonth ? `${selectedMonth} ` : '全部'}
                {activeLedger.type === 'futures'
                  ? '淨損益 (總金額)'
                  : activeLedger.type === 'stock'
                  ? '淨額 (總金額)'
                  : '收支總金額 (結餘)'}
              </div>
              <div className="text-2xl font-extrabold tracking-tight flex items-baseline gap-1">
                <span
                  className={
                    filterSummary.netTotal > 0
                      ? 'text-emerald-400'
                      : filterSummary.netTotal < 0
                      ? 'text-rose-400'
                      : 'text-white'
                  }
                >
                  {filterSummary.netTotal > 0 ? '+' : ''}
                  {maskValue(formatMoney(filterSummary.netTotal, activeLedger.currency))}
                </span>
              </div>
            </div>

            <div className="text-right text-xs space-y-0.5">
              <div className="text-emerald-400 font-medium">
                +{maskValue(formatMoney(filterSummary.totalIncome, activeLedger.currency))}
              </div>
              <div className="text-rose-400 font-medium">
                -{maskValue(formatMoney(filterSummary.totalExpense, activeLedger.currency))}
              </div>
              <div className="text-[11px] text-slate-500">
                共 {filterSummary.count} 筆記錄
              </div>
            </div>
          </div>

          {/* 明細分組清單 */}
          {Object.keys(groupedByDate).length === 0 ? (
            <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-10 text-center space-y-2.5">
              <Inbox size={36} className="mx-auto text-slate-600 mb-2" />
              <p className="text-sm text-slate-400">
                {selectedMonth ? `查無 ${selectedMonth} 的記帳記錄` : '查無符合條件的記錄'}
              </p>
              {selectedMonth && (
                <button
                  type="button"
                  onClick={() => setSelectedMonth('')}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 rounded-xl transition-colors cursor-pointer border border-slate-700 font-medium"
                >
                  查看所有月份記錄
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedByDate).map(([dateStr, items]) => {
                let dayIncome = 0
                let dayExpense = 0
                items.forEach((item) => {
                  if (item.type === 'income' || item.type === 'stock_sell' || item.type === 'dividend') {
                    dayIncome += item.amount
                  } else {
                    dayExpense += item.amount
                  }
                })
                const dayNet = dayIncome - dayExpense

                return (
                  <div
                    key={dateStr}
                    className="bg-slate-900/70 border border-slate-800/80 rounded-2xl overflow-hidden shadow-lg"
                  >
                    {/* 日期標題列與當日總金額 (正的跟負的加起來) */}
                    <div className="px-4 py-2.5 bg-slate-850 border-b border-slate-800/80 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200">
                        {formatDateTaiwan(dateStr)}
                      </span>
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="flex items-center gap-1 font-semibold">
                          <span className="text-[11px] text-slate-400 font-normal">總金額:</span>
                          <span
                            className={
                              dayNet > 0
                                ? 'text-emerald-400'
                                : dayNet < 0
                                ? 'text-rose-400'
                                : 'text-slate-300'
                            }
                          >
                            {dayNet > 0 ? '+' : ''}
                            {maskValue(formatMoney(dayNet, activeLedger.currency))}
                          </span>
                        </div>
                        {dayIncome > 0 && dayExpense > 0 && (
                          <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
                            <span className="text-emerald-400/80">+{formatCompactAmount(dayIncome)}</span>
                            <span>/</span>
                            <span className="text-rose-400/80">-{formatCompactAmount(dayExpense)}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* 當日記錄明細 */}
                    <div className="divide-y divide-slate-800/50">
                      {items.map((tx) => {
                        const isIncome =
                          tx.type === 'income' || tx.type === 'stock_sell' || tx.type === 'dividend'

                        return (
                          <div
                            key={tx.id}
                            onClick={() => onSelectTransaction(tx)}
                            className="p-3.5 hover:bg-slate-800/40 transition-colors flex items-center justify-between cursor-pointer group"
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                                  tx.type === 'stock_buy'
                                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-400'
                                    : tx.type === 'stock_sell'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : tx.type === 'dividend'
                                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                    : tx.type === 'income'
                                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                    : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                                }`}
                              >
                                {tx.type === 'stock_buy' && <TrendingUp size={18} />}
                                {tx.type === 'stock_sell' && <TrendingDown size={18} />}
                                {tx.type === 'dividend' && <Coins size={18} />}
                                {tx.type === 'income' && <TrendingUp size={18} />}
                                {tx.type === 'expense' && <TrendingDown size={18} />}
                              </div>

                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-sm text-slate-100 group-hover:text-emerald-400 transition-colors">
                                    {tx.category}
                                  </span>
                                  {tx.stockSymbol && (
                                    <span
                                      className={`text-[11px] font-medium border px-1.5 py-0.2 rounded ${
                                        activeLedger.type === 'futures'
                                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                          : activeLedger.type === 'stock'
                                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                      }`}
                                    >
                                      {tx.stockSymbol}
                                    </span>
                                  )}
                                  {tx.shares && (
                                    <span className="text-[10px] text-slate-400">
                                      {tx.shares} 股 @ {tx.pricePerShare || ''}
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                                  {tx.time && <span>{tx.time}</span>}
                                  <span>• {tx.account}</span>
                                  {tx.notes && (
                                    <span className="truncate max-w-[140px] text-slate-300">
                                      ({tx.notes})
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="text-right">
                              <div
                                className={`text-sm font-bold tracking-tight ${
                              isIncome ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                              >
                                {isIncome ? '+' : '-'} {maskValue(formatMoney(tx.amount, activeLedger.currency))}
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
