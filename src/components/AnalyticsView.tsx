import React, { useState, useMemo } from 'react'
import type { Ledger, Transaction } from '../types'
import { formatMoney } from '../utils/format'
import { ChevronLeft, ChevronRight, PieChart, TrendingUp, DollarSign } from 'lucide-react'

interface AnalyticsViewProps {
  activeLedger: Ledger
  transactions: Transaction[]
  hideBalances: boolean
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  activeLedger,
  transactions,
  hideBalances,
}) => {
  const isFutures = activeLedger.type === 'futures'
  const isStock = activeLedger.type === 'stock'

  // 當前選取年份與月份 YYYY-MM
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const now = new Date()
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
  })

  // 上下個月切換
  const handlePrevMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const prevDate = new Date(year, month - 2, 1)
    setSelectedMonth(
      `${prevDate.getFullYear()}-${String(prevDate.getMonth() + 1).padStart(2, '0')}`
    )
  }

  const handleNextMonth = () => {
    const [year, month] = selectedMonth.split('-').map(Number)
    const nextDate = new Date(year, month, 1)
    setSelectedMonth(
      `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, '0')}`
    )
  }

  // 篩選當前帳本與當前月份的記錄
  const currentTxList = useMemo(() => {
    return transactions.filter(
      (t) => t.ledgerId === activeLedger.id && t.date.startsWith(selectedMonth)
    )
  }, [transactions, activeLedger.id, selectedMonth])

  // 彙整總收支數據
  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    let stockBuy = 0
    let stockSell = 0
    let dividend = 0

    currentTxList.forEach((t) => {
      if (t.type === 'income') income += t.amount
      else if (t.type === 'expense') expense += t.amount
      else if (t.type === 'stock_buy') stockBuy += t.amount
      else if (t.type === 'stock_sell') stockSell += t.amount
      else if (t.type === 'dividend') dividend += t.amount
    })

    return {
      income,
      expense,
      stockBuy,
      stockSell,
      dividend,
      netInvested: stockBuy - stockSell - dividend,
      netSavings: income - expense,
    }
  }, [currentTxList])

  // 一般帳本：分類支出分組分析
  const categoryBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    let totalExpense = 0

    currentTxList.forEach((t) => {
      if (t.type === 'expense') {
        const cat = t.category || '未分類'
        map.set(cat, (map.get(cat) || 0) + t.amount)
        totalExpense += t.amount
      }
    })

    const colors = [
      '#f97316', '#3b82f6', '#ec4899', '#8b5cf6',
      '#06b6d4', '#ef4444', '#10b981', '#f59e0b', '#64748b'
    ]

    const items = Array.from(map.entries())
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: totalExpense > 0 ? (amount / totalExpense) * 100 : 0,
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.amount - a.amount)

    return { items, totalExpense }
  }, [currentTxList])

  // 股票帳本：依標的 (stockSymbol) 分組買進統計
  const stockSymbolBreakdown = useMemo(() => {
    const map = new Map<string, number>()
    let totalBuy = 0

    currentTxList.forEach((t) => {
      if (t.type === 'stock_buy') {
        const sym = t.stockSymbol || t.category || '其他標的'
        map.set(sym, (map.get(sym) || 0) + t.amount)
        totalBuy += t.amount
      }
    })

    const colors = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4']

    const items = Array.from(map.entries())
      .map(([name, amount], idx) => ({
        name,
        amount,
        percentage: totalBuy > 0 ? (amount / totalBuy) * 100 : 0,
        color: colors[idx % colors.length],
      }))
      .sort((a, b) => b.amount - a.amount)

    return { items, totalBuy }
  }, [currentTxList])

  const maskValue = (val: string) => (hideBalances ? '••••••' : val)

  // 繪製 SVG 環形圖路徑 (Donut Chart)
  const renderDonutChart = (items: { name: string; percentage: number; color: string }[]) => {
    if (items.length === 0) return null

    let accumulatedAngle = 0
    const radius = 70
    const strokeWidth = 24
    const circumference = 2 * Math.PI * radius

    return (
      <svg className="w-48 h-48 transform -rotate-90 mx-auto" viewBox="0 0 200 200">
        <circle
          cx="100"
          cy="100"
          r={radius}
          fill="transparent"
          stroke="#1e293b"
          strokeWidth={strokeWidth}
        />
        {items.map((item, idx) => {
          const strokeDashoffset = circumference - (item.percentage / 100) * circumference
          const rotation = (accumulatedAngle / 100) * 360
          accumulatedAngle += item.percentage

          return (
            <circle
              key={idx}
              cx="100"
              cy="100"
              r={radius}
              fill="transparent"
              stroke={item.color}
              strokeWidth={strokeWidth}
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              transform={`rotate(${rotation} 100 100)`}
              className="transition-all duration-500 hover:opacity-80"
            />
          )
        })}
      </svg>
    )
  }

  return (
    <div className="space-y-6 pb-24 max-w-4xl mx-auto px-4 pt-3">
      {/* 月份切換列 */}
      <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-lg">
        <button
          onClick={handlePrevMonth}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronLeft size={20} />
        </button>

        <div className="text-center">
          <div className="font-bold text-base text-white">{selectedMonth}</div>
          <div className="text-[11px] text-slate-400">{activeLedger.name} 分析報表</div>
        </div>

        <button
          onClick={handleNextMonth}
          className="p-2 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* 核心總覽卡片 */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {isFutures ? (
          <>
            <div className="bg-slate-900/80 border border-emerald-500/30 rounded-2xl p-4 shadow-lg">
              <div className="text-xs text-emerald-400 font-medium mb-1">平倉獲利</div>
              <div className="text-xl font-bold text-emerald-400">
                +{maskValue(formatMoney(summary.income, activeLedger.currency))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-rose-500/30 rounded-2xl p-4 shadow-lg">
              <div className="text-xs text-rose-400 font-medium mb-1">平倉虧損</div>
              <div className="text-xl font-bold text-rose-400">
                -{maskValue(formatMoney(summary.expense, activeLedger.currency))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-amber-500/30 rounded-2xl p-4 shadow-lg col-span-2 sm:col-span-1">
              <div className="text-xs text-amber-400 font-medium mb-1">當月淨損益</div>
              <div
                className={`text-xl font-bold ${
                  summary.netSavings >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {summary.netSavings > 0 ? '+' : ''}
                {maskValue(formatMoney(summary.netSavings, activeLedger.currency))}
              </div>
            </div>
          </>
        ) : isStock ? (
          <>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="text-xs text-blue-400 font-medium mb-1">股票買進</div>
              <div className="text-xl font-bold text-white">
                {maskValue(formatMoney(summary.stockBuy, activeLedger.currency))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="text-xs text-amber-400 font-medium mb-1">現金股息</div>
              <div className="text-xl font-bold text-amber-300">
                {maskValue(formatMoney(summary.dividend, activeLedger.currency))}
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="text-xs text-emerald-400 font-medium mb-1">總收入</div>
              <div className="text-xl font-bold text-white">
                {maskValue(formatMoney(summary.income, activeLedger.currency))}
              </div>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-lg">
              <div className="text-xs text-rose-400 font-medium mb-1">總支出</div>
              <div className="text-xl font-bold text-white">
                {maskValue(formatMoney(summary.expense, activeLedger.currency))}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 環形圖與佔比排行榜 */}
      {isStock ? (
        // 股票投資分析
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <TrendingUp size={16} className="text-blue-400" />
              投資標的分佈 (買進總額)
            </h3>
            <span className="text-xs text-slate-400">
              合計 {maskValue(formatMoney(stockSymbolBreakdown.totalBuy, activeLedger.currency))}
            </span>
          </div>

          {stockSymbolBreakdown.items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              此月份尚無股票交易資料
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="relative flex items-center justify-center">
                {renderDonutChart(stockSymbolBreakdown.items)}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs text-slate-400">總買入金額</span>
                  <span className="text-base font-bold text-white">
                    {maskValue(formatMoney(stockSymbolBreakdown.totalBuy, activeLedger.currency))}
                  </span>
                </div>
              </div>

              {/* 標的分佈排行 */}
              <div className="space-y-3">
                {stockSymbolBreakdown.items.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-slate-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>{maskValue(formatMoney(item.amount, activeLedger.currency))}</span>
                        <span className="font-semibold text-white">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        // 一般帳本支出分析
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
              <PieChart size={16} className={isFutures ? 'text-amber-400' : 'text-emerald-400'} />
              {isFutures ? '期貨虧損與支出分類佔比' : '支出分類佔比分析'}
            </h3>
            <span className="text-xs text-slate-400">
              合計 {maskValue(formatMoney(categoryBreakdown.totalExpense, activeLedger.currency))}
            </span>
          </div>

          {categoryBreakdown.items.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              {isFutures ? '此月份尚無平倉虧損或費用記錄' : '此月份尚無支出記錄'}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
              <div className="relative flex items-center justify-center">
                {renderDonutChart(categoryBreakdown.items)}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                  <span className="text-xs text-slate-400">{isFutures ? '本月虧損/費用' : '本月支出'}</span>
                  <span className="text-base font-bold text-white">
                    {maskValue(formatMoney(categoryBreakdown.totalExpense, activeLedger.currency))}
                  </span>
                </div>
              </div>

              {/* 分類進度條排行清單 */}
              <div className="space-y-3">
                {categoryBreakdown.items.map((item, idx) => (
                  <div key={idx} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-medium text-slate-200">{item.name}</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-400">
                        <span>{maskValue(formatMoney(item.amount, activeLedger.currency))}</span>
                        <span className="font-semibold text-white">
                          {item.percentage.toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${item.percentage}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 收支長條對比圖 */}
      {!isStock && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
            <DollarSign size={16} className="text-teal-400" />
            收入 vs 支出對比
          </h3>

          <div className="space-y-3 pt-2">
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-emerald-400 font-medium">總收入</span>
                <span className="text-white font-bold">
                  {maskValue(formatMoney(summary.income, activeLedger.currency))}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      summary.income > 0 || summary.expense > 0
                        ? (summary.income / Math.max(summary.income, summary.expense)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-rose-400 font-medium">總支出</span>
                <span className="text-white font-bold">
                  {maskValue(formatMoney(summary.expense, activeLedger.currency))}
                </span>
              </div>
              <div className="w-full bg-slate-800 h-3 rounded-full overflow-hidden">
                <div
                  className="h-full bg-rose-500 rounded-full transition-all duration-500"
                  style={{
                    width: `${
                      summary.income > 0 || summary.expense > 0
                        ? (summary.expense / Math.max(summary.income, summary.expense)) * 100
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
