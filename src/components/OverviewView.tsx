import React, { useMemo, useState, useCallback } from 'react'
import type { Ledger, Transaction } from '../types'
import { formatMoney, formatDateTaiwan } from '../utils/format'
import { DynamicIcon } from './DynamicIcon'
import {
  TrendingUp,
  TrendingDown,
  Coins,
  ArrowRight,
  PlusCircle,
  PiggyBank,
  AlertCircle,
  FileText,
  Percent,
  Package,
  ChevronLeft,
  ChevronRight,
  Calendar,
} from 'lucide-react'

interface OverviewViewProps {
  activeLedger: Ledger
  transactions: Transaction[]
  onOpenNewTransaction: () => void
  onSelectTransaction: (tx: Transaction) => void
  onViewAllTransactions: () => void
  hideBalances: boolean
}

type TimeRange = 'all' | 'month' | 'year'

export const OverviewView: React.FC<OverviewViewProps> = ({
  activeLedger,
  transactions,
  onOpenNewTransaction,
  onSelectTransaction,
  onViewAllTransactions,
  hideBalances,
}) => {
  const isFutures = activeLedger.type === 'futures'
  const isStock = activeLedger.type === 'stock'

  // 時間範圍選擇：期貨與股票帳本預設看「全部累計」，一般帳本預設看「按月」
  const [timeRange, setTimeRange] = useState<TimeRange>(
    isFutures || isStock ? 'all' : 'month'
  )

  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1

  const [selectedYear, setSelectedYear] = useState<number>(currentYear)
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth)

  // 當前帳本所有交易
  const ledgerTxList = useMemo(() => {
    return transactions.filter((t) => t.ledgerId === activeLedger.id)
  }, [transactions, activeLedger.id])

  // 從交易資料中提取所有有資料的年份
  const availableYears = useMemo(() => {
    const yearsSet = new Set<number>()
    yearsSet.add(currentYear)
    ledgerTxList.forEach((t) => {
      if (t.date) {
        const y = parseInt(t.date.slice(0, 4), 10)
        if (!isNaN(y)) yearsSet.add(y)
      }
    })
    return Array.from(yearsSet).sort((a, b) => b - a)
  }, [ledgerTxList, currentYear])

  // 計算選定年份中各月份是否有記帳紀錄
  const monthsWithData = useMemo(() => {
    const set = new Set<number>()
    const prefix = `${selectedYear}-`
    ledgerTxList.forEach((t) => {
      if (t.date?.startsWith(prefix)) {
        const m = parseInt(t.date.slice(5, 7), 10)
        if (!isNaN(m)) set.add(m)
      }
    })
    return set
  }, [ledgerTxList, selectedYear])

  const selectedMonthPrefix = `${selectedYear}-${String(selectedMonth).padStart(2, '0')}`
  const selectedYearPrefix = `${selectedYear}`

  // 判斷某筆交易日期是否符合目前選擇的時間範圍
  const isDateInFilter = useCallback((dateStr: string) => {
    if (timeRange === 'all') return true
    if (timeRange === 'month') return dateStr.startsWith(selectedMonthPrefix)
    if (timeRange === 'year') return dateStr.startsWith(selectedYearPrefix)
    return true
  }, [timeRange, selectedMonthPrefix, selectedYearPrefix])

  // 依時間範圍篩選後的交易清單
  const filteredTxList = useMemo(() => {
    return ledgerTxList.filter((t) => isDateInFilter(t.date))
  }, [ledgerTxList, isDateInFilter])

  // 財務與投資統計數值
  const stats = useMemo(() => {
    let income = 0
    let expense = 0
    let stockBuy = 0
    let stockSell = 0
    let dividend = 0

    let profitCount = 0
    let lossCount = 0

    for (const t of filteredTxList) {
      if (t.type === 'income') {
        income += t.amount
        profitCount++
      } else if (t.type === 'expense') {
        expense += t.amount
        lossCount++
      } else if (t.type === 'stock_buy') {
        stockBuy += t.amount
      } else if (t.type === 'stock_sell') {
        stockSell += t.amount
      } else if (t.type === 'dividend') {
        dividend += t.amount
      }
    }

    const netSavings = income - expense
    const netFuturesPnL = income - expense // 期貨：獲利入帳 - 虧損扣款
    const netStockInvested = stockBuy - stockSell - dividend
    const totalClosed = profitCount + lossCount
    const winRate = totalClosed > 0 ? Math.round((profitCount / totalClosed) * 100) : 0

    return {
      income,
      expense,
      netSavings,
      netFuturesPnL,
      profitCount,
      lossCount,
      totalClosed,
      winRate,
      stockBuy,
      stockSell,
      dividend,
      netStockInvested,
    }
  }, [filteredTxList])

  // 股票專屬：精準計算已實現損益 (賣出獲利 + 股息) 與當前持有的標的 (未實現持股部位)
  const stockPortfolio = useMemo(() => {
    if (!isStock) {
      return {
        realizedTradingPnL: 0,
        dividendTotal: 0,
        otherExpenseTotal: 0,
        otherIncomeTotal: 0,
        totalRealizedPnL: 0,
        holdings: [],
        totalHoldingCost: 0,
      }
    }

    // 依時間升序以進行持股庫存與已實現損益結算
    // 同日同時間若為同一標的，優先讓買進排在賣出前面 (以正確沖銷當沖部位)
    const sortedTx = [...ledgerTxList].sort((a, b) => {
      const dateDiff = (a.date || '').localeCompare(b.date || '')
      if (dateDiff !== 0) return dateDiff
      const timeDiff = (a.time || '').localeCompare(b.time || '')
      if (timeDiff !== 0) return timeDiff
      if (a.stockSymbol === b.stockSymbol && a.type !== b.type) {
        if (a.type === 'stock_buy') return -1
        if (b.type === 'stock_buy') return 1
      }
      return 0
    })

    let dividendTotal = 0
    let realizedTradingPnL = 0
    let otherExpenseTotal = 0
    let otherIncomeTotal = 0

    const holdingsMap = new Map<
      string,
      {
        symbol: string
        shares: number
        totalCost: number
        lastPrice?: number
        lastDate?: string
      }
    >()

    sortedTx.forEach((t) => {
      const inCurrentFilter = isDateInFilter(t.date)

      if (t.type === 'dividend') {
        if (inCurrentFilter) {
          dividendTotal += t.amount
        }
        return
      }

      if (t.type === 'expense') {
        if (inCurrentFilter) {
          otherExpenseTotal += t.amount
        }
        return
      }

      if (t.type === 'income') {
        if (inCurrentFilter) {
          otherIncomeTotal += t.amount
        }
        return
      }

      const sym = (t.stockSymbol || t.category || '投資標的').trim()
      const existing = holdingsMap.get(sym) || {
        symbol: sym,
        shares: 0,
        totalCost: 0,
      }

      const s = t.shares || 0
      const p = t.pricePerShare || 0

      if (t.type === 'stock_buy') {
        const cost = t.amount || s * p + (t.fee || 0)
        existing.shares += s
        existing.totalCost += cost
        if (p > 0) existing.lastPrice = p
        existing.lastDate = t.date
        holdingsMap.set(sym, existing)
      } else if (t.type === 'stock_sell') {
        const revenue = t.amount || s * p - (t.fee || 0) - (t.tax || 0)
        if (existing.shares > 0 && s > 0) {
          if (s >= existing.shares) {
            // 全部賣出或超賣：直接全額結清庫存成本，杜絕浮點數精度殘留
            const costOfSold = existing.totalCost
            const pnl = revenue - costOfSold

            if (inCurrentFilter) {
              realizedTradingPnL += pnl
            }

            existing.shares = 0
            existing.totalCost = 0
          } else {
            // 部分賣出：按加權平均單位成本扣減
            const avgCostPerShare = existing.totalCost / existing.shares
            const costOfSold = s * avgCostPerShare
            const pnl = revenue - costOfSold

            if (inCurrentFilter) {
              realizedTradingPnL += pnl
            }

            existing.shares -= s
            existing.totalCost -= costOfSold

            // 浮點數精度保護
            if (existing.shares < 0.0001 || existing.totalCost < 0.01) {
              existing.shares = 0
              existing.totalCost = 0
            }
          }
        } else {
          // 無現有庫存賣出（例如在匯入對帳單之前已持有之期初股票）
          if (inCurrentFilter) {
            realizedTradingPnL += revenue
          }
          existing.shares = 0
          existing.totalCost = 0
        }
        existing.lastDate = t.date
        holdingsMap.set(sym, existing)
      }
    })

    const holdingsList: Array<{
      symbol: string
      shares: number
      avgPrice: number
      totalCost: number
      lastDate?: string
    }> = []

    let totalHoldingCost = 0

    holdingsMap.forEach((item) => {
      // 只有在實質在庫股數大於 0.0001 且成本大於 0 時才視為當前持股
      if (item.shares > 0.0001 && item.totalCost > 0.01) {
        const avg = Math.round((item.totalCost / item.shares) * 100) / 100
        holdingsList.push({
          symbol: item.symbol,
          shares: Math.round(item.shares * 1000) / 1000,
          avgPrice: avg,
          totalCost: Math.round(item.totalCost),
          lastDate: item.lastDate,
        })
        totalHoldingCost += item.totalCost
      }
    })

    const totalRealizedPnL = Math.round(
      realizedTradingPnL + dividendTotal - otherExpenseTotal + otherIncomeTotal
    )

    return {
      realizedTradingPnL: Math.round(realizedTradingPnL),
      dividendTotal: Math.round(dividendTotal),
      otherExpenseTotal: Math.round(otherExpenseTotal),
      otherIncomeTotal: Math.round(otherIncomeTotal),
      totalRealizedPnL,
      holdings: holdingsList,
      totalHoldingCost: Math.round(totalHoldingCost),
    }
  }, [ledgerTxList, isStock, isDateInFilter])

  // 期貨專屬：已實現平倉損益與未平倉契約部位
  const futuresPortfolio = useMemo(() => {
    if (!isFutures) {
      return {
        realizedPnL: 0,
        profitTotal: 0,
        lossTotal: 0,
        profitCount: 0,
        lossCount: 0,
        winRate: 0,
        openPositions: [],
      }
    }

    let profitTotal = 0
    let lossTotal = 0
    let profitCount = 0
    let lossCount = 0

    // 依時間升序排列所有交易以計算未平倉合約部位撮合
    const sortedTx = [...ledgerTxList].sort((a, b) => {
      const dateDiff = (a.date || '').localeCompare(b.date || '')
      if (dateDiff !== 0) return dateDiff
      const timeDiff = (a.time || '').localeCompare(b.time || '')
      if (timeDiff !== 0) return timeDiff
      if (a.stockSymbol === b.stockSymbol && a.type !== b.type) {
        if (a.type === 'stock_buy') return -1
        if (b.type === 'stock_buy') return 1
      }
      return 0
    })

    const positionsMap = new Map<
      string,
      {
        symbol: string
        openLots: number
        totalCost: number
        lastPrice?: number
        lastDate?: string
      }
    >()

    sortedTx.forEach((t) => {
      const inCurrentFilter = isDateInFilter(t.date)
      const sym = (t.stockSymbol || t.category || '期貨契約').trim()
      const existing = positionsMap.get(sym) || {
        symbol: sym,
        openLots: 0,
        totalCost: 0,
      }

      const s = t.shares || 1
      const p = t.pricePerShare || 0

      if (t.type === 'stock_buy') {
        const cost = t.amount || (s * p + (t.fee || 0))
        existing.openLots += s
        existing.totalCost += cost
        if (p > 0) existing.lastPrice = p
        existing.lastDate = t.date
        positionsMap.set(sym, existing)
      } else if (t.type === 'stock_sell') {
        const revenue = t.amount || (s * p - (t.fee || 0) - (t.tax || 0))
        let pnl = 0

        if (existing.openLots > 0 && s > 0) {
          if (s >= existing.openLots) {
            // 全數平倉
            const costOfSold = existing.totalCost
            pnl = revenue - costOfSold
            existing.openLots = 0
            existing.totalCost = 0
          } else {
            // 部分平倉
            const avgCostPerLot = existing.totalCost / existing.openLots
            const costOfSold = s * avgCostPerLot
            pnl = revenue - costOfSold
            existing.openLots -= s
            existing.totalCost -= costOfSold
            if (existing.openLots < 0.0001 || existing.totalCost < 0.01) {
              existing.openLots = 0
              existing.totalCost = 0
            }
          }
        } else {
          // 無歷史建倉直接賣出平倉
          pnl = revenue
          existing.openLots = 0
          existing.totalCost = 0
        }

        if (inCurrentFilter) {
          if (pnl >= 0) {
            profitTotal += pnl
            profitCount++
          } else {
            lossTotal += Math.abs(pnl)
            lossCount++
          }
        }

        if (p > 0) existing.lastPrice = p
        existing.lastDate = t.date
        positionsMap.set(sym, existing)
      } else if (t.type === 'income') {
        // 向下相容：直接記錄平倉獲利或收入
        if (inCurrentFilter) {
          profitTotal += t.amount
          profitCount++
        }
      } else if (t.type === 'expense') {
        // 向下相容：直接記錄平倉虧損或費用
        if (inCurrentFilter) {
          lossTotal += t.amount
          lossCount++
        }
      }
    })

    const realizedPnL = Math.round(profitTotal - lossTotal)
    const totalTrades = profitCount + lossCount
    const winRate = totalTrades > 0 ? Math.round((profitCount / totalTrades) * 100) : 0

    const openPositions: Array<{
      symbol: string
      openLots: number
      avgPrice: number
      totalCost: number
      lastDate?: string
    }> = []

    positionsMap.forEach((pos) => {
      if (pos.openLots > 0.0001) {
        const avg = pos.openLots > 0 && pos.totalCost > 0 ? Math.round((pos.totalCost / pos.openLots) * 100) / 100 : (pos.lastPrice || 0)
        openPositions.push({
          symbol: pos.symbol,
          openLots: Math.round(pos.openLots * 100) / 100,
          avgPrice: avg,
          totalCost: Math.round(pos.totalCost),
          lastDate: pos.lastDate,
        })
      }
    })

    return {
      realizedPnL,
      profitTotal: Math.round(profitTotal),
      lossTotal: Math.round(lossTotal),
      profitCount,
      lossCount,
      winRate,
      openPositions,
    }
  }, [ledgerTxList, isFutures, isDateInFilter])

  // 預算計算 (一般收支帳本適用)
  const budget = activeLedger.budgetMonthly || 0
  const budgetSpentPercent = budget > 0 ? Math.min(100, Math.round((stats.expense / budget) * 100)) : 0
  const isBudgetOver = budget > 0 && stats.expense > budget

  // 切換月份
  const handlePrevMonth = () => {
    if (selectedMonth === 1) {
      setSelectedYear((prev) => prev - 1)
      setSelectedMonth(12)
    } else {
      setSelectedMonth((prev) => prev - 1)
    }
  }

  const handleNextMonth = () => {
    if (selectedMonth === 12) {
      setSelectedYear((prev) => prev + 1)
      setSelectedMonth(1)
    } else {
      setSelectedMonth((prev) => prev + 1)
    }
  }

  // 切換年份
  const handlePrevYear = () => {
    setSelectedYear((prev) => prev - 1)
  }

  const handleNextYear = () => {
    setSelectedYear((prev) => prev + 1)
  }

  // 重置回當前月/今年
  const handleResetToCurrentMonth = () => {
    const today = new Date()
    setSelectedYear(today.getFullYear())
    setSelectedMonth(today.getMonth() + 1)
  }

  const handleResetToCurrentYear = () => {
    setSelectedYear(new Date().getFullYear())
  }

  const isCurrentMonthSelected =
    selectedYear === currentYear && selectedMonth === currentMonth
  const isCurrentYearSelected = selectedYear === currentYear

  const months = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

  const timeRangeLabel = useMemo(() => {
    if (timeRange === 'all') return '全部累計'
    if (timeRange === 'month') return `${selectedYear} 年 ${selectedMonth} 月`
    return `${selectedYear} 年度`
  }, [timeRange, selectedYear, selectedMonth])

  // 當前篩選範圍下的所有交易排序清單
  const displayedTransactions = useMemo(() => {
    return [...filteredTxList].sort((a, b) => {
      const dateDiff = new Date(b.date).getTime() - new Date(a.date).getTime()
      if (dateDiff !== 0) return dateDiff
      return (b.time || '').localeCompare(a.time || '')
    })
  }, [filteredTxList])

  // 首頁卡片顯示前 8 筆交易
  const recentTransactions = useMemo(() => {
    return displayedTransactions.slice(0, 8)
  }, [displayedTransactions])

  const maskValue = (val: string) => (hideBalances ? '••••••' : val)

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto px-4 pt-3">
      {/* 頂部主卡片：核心收支 / 股票資產 / 期貨損益概況 */}
      <div
        className="rounded-3xl p-6 relative overflow-hidden shadow-2xl border transition-all"
        style={{
          background: isFutures
            ? 'linear-gradient(135deg, #271704 0%, #451a03 50%, #0f172a 100%)'
            : isStock
            ? 'linear-gradient(135deg, #091e3a 0%, #172554 50%, #0f172a 100%)'
            : 'linear-gradient(135deg, #062f27 0%, #064e3b 50%, #0f172a 100%)',
          borderColor: isFutures
            ? 'rgba(245, 158, 11, 0.35)'
            : isStock
            ? 'rgba(59, 130, 246, 0.3)'
            : 'rgba(16, 185, 129, 0.3)',
        }}
      >
        {/* 背景裝飾光暈 */}
        <div
          className="absolute -right-16 -top-16 w-56 h-56 rounded-full blur-3xl opacity-30 pointer-events-none"
          style={{ backgroundColor: activeLedger.color }}
        />

        {/* 頂部資訊列與記一筆按鈕 */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-4 relative z-10">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 backdrop-blur-md text-white/90 border border-white/10 flex items-center gap-1.5">
              <DynamicIcon name={activeLedger.icon} size={13} />
              {activeLedger.name}
            </span>
            <span className="text-xs text-white/60">{timeRangeLabel}</span>
          </div>

          <div className="flex items-center gap-2">
            {/* 時間範圍切換開關 */}
            <div className="flex bg-black/40 backdrop-blur-md p-0.5 rounded-xl border border-white/10 text-[11px]">
              <button
                onClick={() => setTimeRange('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  timeRange === 'all'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setTimeRange('month')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  timeRange === 'month'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                按月
              </button>
              <button
                onClick={() => setTimeRange('year')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer ${
                  timeRange === 'year'
                    ? 'bg-white/20 text-white shadow-sm'
                    : 'text-white/60 hover:text-white'
                }`}
              >
                按年
              </button>
            </div>

            <button
              onClick={onOpenNewTransaction}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-medium backdrop-blur-md border border-white/20 transition-all cursor-pointer shadow-sm active:scale-95"
            >
              <PlusCircle size={15} />
              記一筆
            </button>
          </div>
        </div>

        {/* 月份模式：導航控制器與 1~12 月分頁列 */}
        {timeRange === 'month' && (
          <div className="mb-4 bg-black/25 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 sm:p-3 relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="上個月"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">上個月</span>
              </button>

              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-emerald-400" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="bg-white/10 text-white font-bold text-xs sm:text-sm rounded-lg px-2 py-0.5 border border-white/10 focus:outline-none cursor-pointer"
                >
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">
                      {yr} 年
                    </option>
                  ))}
                </select>

                <span className="font-bold text-white text-sm sm:text-base tracking-wide">
                  {selectedMonth} 月
                </span>

                {isCurrentMonthSelected ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    當月
                  </span>
                ) : (
                  <button
                    onClick={handleResetToCurrentMonth}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 transition-colors cursor-pointer"
                  >
                    回到當月
                  </button>
                )}
              </div>

              <button
                onClick={handleNextMonth}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="下個月"
              >
                <span className="hidden sm:inline">下個月</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 1~12 月橫向分頁膠囊列 */}
            <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-white/5">
              {months.map((m) => {
                const isSelected = m === selectedMonth
                const hasData = monthsWithData.has(m)
                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`flex-1 min-w-[34px] py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer relative text-center ${
                      isSelected
                        ? 'bg-white text-slate-900 font-bold shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {m}月
                    {hasData && !isSelected && (
                      <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-emerald-400" />
                    )}
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 年度模式：導航控制器與歷年分頁列 */}
        {timeRange === 'year' && (
          <div className="mb-4 bg-black/25 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 sm:p-3 relative z-10 space-y-2.5">
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevYear}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="上一年"
              >
                <ChevronLeft size={16} />
                <span className="hidden sm:inline">上一年</span>
              </button>

              <div className="flex items-center gap-2">
                <Calendar size={15} className="text-emerald-400" />
                <span className="font-bold text-white text-sm sm:text-base tracking-wide">
                  {selectedYear} 年度
                </span>
                {isCurrentYearSelected ? (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    今年
                  </span>
                ) : (
                  <button
                    onClick={handleResetToCurrentYear}
                    className="text-[10px] px-1.5 py-0.5 rounded bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border border-white/15 transition-colors cursor-pointer"
                  >
                    回到今年
                  </button>
                )}
              </div>

              <button
                onClick={handleNextYear}
                className="p-1.5 rounded-xl hover:bg-white/10 text-white/80 hover:text-white transition-colors cursor-pointer flex items-center gap-1 text-xs"
                title="下一年"
              >
                <span className="hidden sm:inline">下一年</span>
                <ChevronRight size={16} />
              </button>
            </div>

            {/* 歷年分頁膠囊列 */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 scrollbar-none pt-1 border-t border-white/5">
              {availableYears.map((yr) => {
                const isSelected = yr === selectedYear
                return (
                  <button
                    key={yr}
                    onClick={() => setSelectedYear(yr)}
                    className={`px-3 py-1 rounded-lg text-xs font-medium shrink-0 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-white text-slate-900 font-bold shadow-md'
                        : 'text-white/70 hover:text-white hover:bg-white/10'
                    }`}
                  >
                    {yr} 年
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* 核心主數值 */}
        <div className="mb-6 relative z-10">
          <div className="text-xs font-medium text-white/70 mb-1">
            {isFutures
              ? '已實現平倉淨損益 (獲利 - 虧損)'
              : isStock
              ? stockPortfolio.otherExpenseTotal > 0
                ? '已實現總損益 (交易損益 + 股息 - 其他費用)'
                : '已實現總損益 (交易損益 + 現金股息)'
              : '收支結餘'}
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold tracking-tight flex items-baseline gap-1">
            <span
              className={
                isFutures
                  ? futuresPortfolio.realizedPnL >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                  : isStock
                  ? stockPortfolio.totalRealizedPnL >= 0
                    ? 'text-emerald-400'
                    : 'text-rose-400'
                  : 'text-white'
              }
            >
              {(isFutures
                ? futuresPortfolio.realizedPnL
                : isStock
                ? stockPortfolio.totalRealizedPnL
                : stats.netSavings) > 0
                ? '+'
                : ''}
              {maskValue(
                formatMoney(
                  isFutures
                    ? futuresPortfolio.realizedPnL
                    : isStock
                    ? stockPortfolio.totalRealizedPnL
                    : stats.netSavings,
                  activeLedger.currency
                )
              )}
            </span>
          </div>
        </div>

        {/* 核心子卡片網格 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 relative z-10">
          {isFutures ? (
            <>
              {/* 期貨：平倉獲利 */}
              <div className="bg-slate-900/60 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1 font-medium text-emerald-400">
                  <span className="flex items-center gap-1.5">
                    <TrendingUp size={14} /> 平倉獲利
                  </span>
                  <span className="text-[10px] text-emerald-300/80 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                    {futuresPortfolio.profitCount} 筆
                  </span>
                </div>
                <div className="text-lg font-bold text-emerald-400">
                  +{maskValue(formatMoney(futuresPortfolio.profitTotal, activeLedger.currency))}
                </div>
              </div>

              {/* 期貨：平倉虧損 */}
              <div className="bg-slate-900/60 backdrop-blur-md border border-rose-500/20 rounded-2xl p-3.5">
                <div className="flex items-center justify-between text-xs mb-1 font-medium text-rose-400">
                  <span className="flex items-center gap-1.5">
                    <TrendingDown size={14} /> 平倉虧損
                  </span>
                  <span className="text-[10px] text-rose-300/80 bg-rose-500/10 px-1.5 py-0.5 rounded">
                    {futuresPortfolio.lossCount} 筆
                  </span>
                </div>
                <div className="text-lg font-bold text-rose-400">
                  -{maskValue(formatMoney(futuresPortfolio.lossTotal, activeLedger.currency))}
                </div>
              </div>

              {/* 期貨：勝率 */}
              <div className="bg-slate-900/60 backdrop-blur-md border border-amber-500/20 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-xs mb-1 font-medium text-amber-400">
                  <span className="flex items-center gap-1.5">
                    <Percent size={14} /> 平倉勝率
                  </span>
                  <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-1.5 py-0.5 rounded">
                    共 {futuresPortfolio.profitCount + futuresPortfolio.lossCount} 筆
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {futuresPortfolio.winRate}%
                </div>
              </div>
            </>
          ) : isStock ? (
            <>
              {/* 股票：已實現交易損益 */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 text-blue-400 text-xs mb-1 font-medium">
                  <TrendingUp size={14} /> 已實現交易損益
                </div>
                <div
                  className={`text-lg font-bold ${
                    stockPortfolio.realizedTradingPnL >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {stockPortfolio.realizedTradingPnL > 0 ? '+' : ''}
                  {maskValue(
                    formatMoney(stockPortfolio.realizedTradingPnL, activeLedger.currency)
                  )}
                </div>
              </div>

              {/* 股票：累積股息 */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs mb-1 font-medium">
                  <Coins size={14} /> 累積股息收益
                </div>
                <div className="text-lg font-bold text-amber-300">
                  +{maskValue(
                    formatMoney(stockPortfolio.dividendTotal, activeLedger.currency)
                  )}
                </div>
              </div>

              {/* 股票：其他費用支出 */}
              {stockPortfolio.otherExpenseTotal > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-md border border-rose-500/20 rounded-2xl p-3.5">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-1 font-medium">
                    <TrendingDown size={14} /> 其他費用支出
                  </div>
                  <div className="text-lg font-bold text-rose-400">
                    -{maskValue(
                      formatMoney(stockPortfolio.otherExpenseTotal, activeLedger.currency)
                    )}
                  </div>
                </div>
              )}

              {/* 股票：其他投資收入 */}
              {stockPortfolio.otherIncomeTotal > 0 && (
                <div className="bg-slate-900/50 backdrop-blur-md border border-emerald-500/20 rounded-2xl p-3.5">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1 font-medium">
                    <TrendingUp size={14} /> 其他投資收入
                  </div>
                  <div className="text-lg font-bold text-emerald-400">
                    +{maskValue(
                      formatMoney(stockPortfolio.otherIncomeTotal, activeLedger.currency)
                    )}
                  </div>
                </div>
              )}

              {/* 股票：當前持股成本 (未實現) */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
                <div className="flex items-center justify-between text-xs mb-1 font-medium text-blue-300">
                  <span className="flex items-center gap-1.5">
                    <Package size={14} /> 持股成本 (未實現)
                  </span>
                  <span className="text-[10px] text-blue-300/80 bg-blue-500/10 px-1.5 py-0.5 rounded">
                    {stockPortfolio.holdings.length} 檔在庫
                  </span>
                </div>
                <div className="text-lg font-bold text-white">
                  {maskValue(
                    formatMoney(stockPortfolio.totalHoldingCost, activeLedger.currency)
                  )}
                </div>
              </div>
            </>
          ) : (
            <>
              {/* 一般：收入 */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 text-emerald-400 text-xs mb-1 font-medium">
                  <TrendingUp size={14} /> 收入
                </div>
                <div className="text-lg font-bold text-white">
                  {maskValue(formatMoney(stats.income, activeLedger.currency))}
                </div>
              </div>

              {/* 一般：支出 */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-3.5">
                <div className="flex items-center gap-1.5 text-rose-400 text-xs mb-1 font-medium">
                  <TrendingDown size={14} /> 支出
                </div>
                <div className="text-lg font-bold text-white">
                  {maskValue(formatMoney(stats.expense, activeLedger.currency))}
                </div>
              </div>

              {/* 一般：儲蓄率 */}
              <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-3.5 col-span-2 sm:col-span-1">
                <div className="flex items-center gap-1.5 text-teal-300 text-xs mb-1 font-medium">
                  <PiggyBank size={14} /> 儲蓄率
                </div>
                <div className="text-lg font-bold text-white">
                  {stats.income > 0
                    ? `${Math.max(0, Math.round((stats.netSavings / stats.income) * 100))}%`
                    : '0%'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* 預算進度條 (若有設定月預算且為一般帳本) */}
        {!isStock && !isFutures && budget > 0 && timeRange === 'month' && (
          <div className="mt-5 pt-4 border-t border-white/10 relative z-10">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-white/80 flex items-center gap-1">
                {isBudgetOver ? (
                  <AlertCircle size={13} className="text-rose-400" />
                ) : (
                  <span>📊</span>
                )}
                月預算達成率 ({budgetSpentPercent}%)
              </span>
              <span className={isBudgetOver ? 'text-rose-400 font-semibold' : 'text-white/70'}>
                {maskValue(formatMoney(stats.expense, activeLedger.currency))} /{' '}
                {maskValue(formatMoney(budget, activeLedger.currency))}
              </span>
            </div>
            <div className="w-full h-2.5 bg-black/30 rounded-full overflow-hidden p-0.5">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  isBudgetOver ? 'bg-rose-500' : 'bg-emerald-400'
                }`}
                style={{ width: `${Math.min(100, (stats.expense / budget) * 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 股票專屬：當前持有標的 (未實現持倉部位) */}
      {isStock && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Package size={16} className="text-amber-400" />
              當前持有的標的 (未實現部位)
            </h3>
            <span className="text-xs text-slate-400">
              共 {stockPortfolio.holdings.length} 檔持股 · 庫存成本 {maskValue(formatMoney(stockPortfolio.totalHoldingCost, activeLedger.currency))}
            </span>
          </div>

          {stockPortfolio.holdings.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl">
              目前無在庫持股部位（已全部賣出或尚無買入交易）
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {stockPortfolio.holdings.map((h) => (
                <div
                  key={h.symbol}
                  className="bg-white/5 hover:bg-white/[0.08] transition-colors border border-white/10 rounded-2xl p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm tracking-wide">{h.symbol}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/20 font-medium">
                      庫存 {h.shares.toLocaleString()} 股
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                    <span>平均成本</span>
                    <span className="text-slate-200 font-medium">${h.avgPrice.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-400">
                    <span>持倉總成本</span>
                    <span className="text-slate-200 font-semibold">
                      {maskValue(formatMoney(h.totalCost, activeLedger.currency))}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 期貨專屬：當前持有標的 (未平倉契約部位) */}
      {isFutures && (
        <div className="bg-slate-900/60 backdrop-blur-xl border border-white/10 rounded-3xl p-5 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
              <Package size={16} className="text-indigo-400" />
              當前持有的標的 (未平倉部位)
            </h3>
            <span className="text-xs text-slate-400">
              共 {futuresPortfolio.openPositions.length} 項商品
            </span>
          </div>

          {futuresPortfolio.openPositions.length === 0 ? (
            <div className="py-6 text-center text-xs text-slate-500 bg-white/[0.02] border border-dashed border-white/5 rounded-2xl">
              目前無未平倉部位（已全部平倉或尚無新進契約）
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {futuresPortfolio.openPositions.map((p) => (
                <div
                  key={p.symbol}
                  className="bg-white/5 hover:bg-white/[0.08] transition-colors border border-white/10 rounded-2xl p-3.5 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm tracking-wide">{p.symbol}</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-medium">
                      未平倉 {p.openLots.toLocaleString()} 口
                    </span>
                  </div>
                  {p.avgPrice > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-white/5">
                      <span>平均建倉點位</span>
                      <span className="text-slate-200 font-medium">{p.avgPrice.toLocaleString()} 點</span>
                    </div>
                  )}
                  {p.totalCost > 0 && (
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>持倉總成本</span>
                      <span className="text-slate-200 font-medium">{maskValue(formatMoney(p.totalCost, activeLedger.currency))}</span>
                    </div>
                  )}
                  <div className="text-[11px] text-slate-400 pt-1 border-t border-white/5">
                    請至交易明細或記帳彈窗記錄「賣出平倉」
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 記帳明細清單 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-200 flex items-center gap-2">
            <FileText size={16} className="text-emerald-400" />
            {timeRange === 'month'
              ? `${selectedYear} 年 ${selectedMonth} 月 記帳明細`
              : timeRange === 'year'
              ? `${selectedYear} 年度 記帳明細`
              : '最近記帳明細'}
            <span className="text-xs font-normal text-slate-400">
              ({displayedTransactions.length} 筆)
            </span>
          </h3>
          <button
            onClick={onViewAllTransactions}
            className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors cursor-pointer"
          >
            查看全部 ({ledgerTxList.length})
            <ArrowRight size={13} />
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-8 text-center">
            <p className="text-sm text-slate-400 mb-3">
              {timeRange === 'month'
                ? `${selectedYear} 年 ${selectedMonth} 月 尚無記帳紀錄`
                : timeRange === 'year'
                ? `${selectedYear} 年度 尚無記帳紀錄`
                : '此帳本目前尚無記錄'}
            </p>
            <button
              onClick={onOpenNewTransaction}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-medium text-xs rounded-xl shadow transition-colors cursor-pointer"
            >
              馬上開始第一筆記帳
            </button>
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-slate-800/80 rounded-2xl divide-y divide-slate-800/60 overflow-hidden shadow-lg">
            {recentTransactions.map((tx) => {
              const isIncome = tx.type === 'income' || tx.type === 'stock_sell' || tx.type === 'dividend'
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
                      {tx.type === 'stock_buy' ? (
                        <TrendingUp size={18} />
                      ) : tx.type === 'stock_sell' ? (
                        <TrendingDown size={18} />
                      ) : tx.type === 'dividend' ? (
                        <Coins size={18} />
                      ) : tx.type === 'income' ? (
                        <TrendingUp size={18} />
                      ) : (
                        <TrendingDown size={18} />
                      )}
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm text-slate-100 group-hover:text-emerald-400 transition-colors">
                          {tx.category}
                        </span>
                        {tx.stockSymbol && (
                          <span
                            className={`text-[11px] font-medium border px-1.5 py-0.2 rounded ${
                              isFutures
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                            }`}
                          >
                            {tx.stockSymbol}
                          </span>
                        )}
                        {tx.shares && (
                          <span className="text-[10px] text-slate-400">
                            {tx.shares} {isFutures ? '口' : '股'} @ {tx.pricePerShare || ''}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                        <span>{formatDateTaiwan(tx.date)}</span>
                        {tx.time && <span>{tx.time}</span>}
                        <span>• {tx.account}</span>
                        {tx.notes && <span className="truncate max-w-[120px]">({tx.notes})</span>}
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
  )
}
