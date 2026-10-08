import React, { useState } from 'react'
import type { Transaction } from '../types'
import type { ClosedTradeGroup } from '../utils/tradeGrouping'
import { formatMoney } from '../utils/format'
import {
  TrendingUp,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  ShoppingCart,
  DollarSign,
  Calendar,
  Layers,
  Edit2,
  CheckCircle2,
} from 'lucide-react'

interface ClosedTradeBundleCardProps {
  closedTrade: ClosedTradeGroup
  currency?: string
  hideBalances: boolean
  onSelectTransaction: (tx: Transaction) => void
}

export const ClosedTradeBundleCard: React.FC<ClosedTradeBundleCardProps> = ({
  closedTrade,
  currency = 'TWD',
  hideBalances,
  onSelectTransaction,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true)

  const isProfit = closedTrade.realizedPnL >= 0
  const maskValue = (val: string) => (hideBalances ? '••••••' : val)

  const sign = isProfit ? '+' : ''
  const pnlColorClass = isProfit ? 'text-emerald-400' : 'text-rose-400'

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 overflow-hidden shadow-lg ${
        isProfit
          ? 'bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-emerald-500/40 shadow-emerald-500/5'
          : 'bg-gradient-to-b from-slate-900 via-slate-900/95 to-slate-950 border-rose-500/40 shadow-rose-500/5'
      }`}
    >
      {/* 頂部主標頭 (點擊切換折疊/展開) */}
      <div
        onClick={() => setIsExpanded(!isExpanded)}
        className="p-4 sm:p-4.5 cursor-pointer select-none hover:bg-slate-800/40 transition-colors"
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* 左側：標的名稱、結清徽章與日期區間 */}
          <div className="flex items-start gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 shadow-md ${
                isProfit ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }`}
            >
              <Layers size={20} />
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h4 className="text-base font-bold text-white tracking-wide">
                  {closedTrade.symbol}
                </h4>
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  <CheckCircle2 size={12} />
                  已完全出清
                </span>
                <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  共 {closedTrade.totalShares.toLocaleString()} 股
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-1">
                <span className="flex items-center gap-1">
                  <Calendar size={12} className="text-slate-500" />
                  {closedTrade.startDate} ~ {closedTrade.closeDate}
                </span>
                <span className="text-slate-600">•</span>
                <span>
                  {closedTrade.buys.length} 筆買進 / {closedTrade.sells.length} 筆賣出
                </span>
              </div>
            </div>
          </div>

          {/* 右側：已實現總損益與展開切換 */}
          <div className="flex items-center justify-between sm:justify-end gap-3 self-end sm:self-center w-full sm:w-auto pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/80">
            <div className="text-right">
              <div className="text-[11px] text-slate-400 font-medium">已實現總損益</div>
              <div className={`text-base sm:text-lg font-extrabold ${pnlColorClass} flex items-center gap-1 justify-end`}>
                {isProfit ? <TrendingUp size={16} /> : <TrendingDown size={16} />}
                <span>
                  {sign}
                  {maskValue(formatMoney(closedTrade.realizedPnL, currency))}
                </span>
                <span className="text-xs font-semibold opacity-90">
                  ({sign}
                  {closedTrade.returnRate.toFixed(2)}%)
                </span>
              </div>
            </div>

            <button
              type="button"
              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition-colors"
              title={isExpanded ? '收合明細' : '展開明細'}
            >
              {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
          </div>
        </div>

        {/* 財務摘要橫條 */}
        <div className="mt-3 pt-3 border-t border-slate-800/80 grid grid-cols-3 gap-2 text-center text-xs">
          <div className="p-2 rounded-xl bg-slate-800/50">
            <div className="text-[10px] text-slate-400 mb-0.5">總買進成本</div>
            <div className="font-bold text-slate-200">
              {maskValue(formatMoney(closedTrade.totalBuyCost, currency))}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/50">
            <div className="text-[10px] text-slate-400 mb-0.5">總賣出實收</div>
            <div className="font-bold text-slate-200">
              {maskValue(formatMoney(closedTrade.totalSellRevenue, currency))}
            </div>
          </div>
          <div className="p-2 rounded-xl bg-slate-800/50">
            <div className="text-[10px] text-slate-400 mb-0.5">總稅費 (手續費+稅)</div>
            <div className="font-bold text-slate-300">
              {maskValue(formatMoney(closedTrade.totalFee + closedTrade.totalTax, currency))}
            </div>
          </div>
        </div>
      </div>

      {/* 展開之買賣內部明細 */}
      {isExpanded && (
        <div className="border-t border-slate-800/90 bg-slate-950/60 p-4 space-y-4 animate-in fade-in duration-150">
          {/* 買進記錄清單 */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-blue-400 mb-2">
              <ShoppingCart size={13} />
              <span>買進記錄 ({closedTrade.buys.length} 筆)</span>
            </div>
            <div className="space-y-1.5">
              {closedTrade.buys.map((buy) => (
                <div
                  key={buy.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectTransaction(buy)
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800/80 hover:border-blue-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-white font-medium">
                          {buy.shares ? `${buy.shares.toLocaleString()} 股` : '買進'}
                        </span>
                        {buy.pricePerShare && (
                          <span className="text-slate-400 text-[11px]">
                            @ {buy.pricePerShare}
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px]">
                          {buy.date} {buy.time || ''}
                        </span>
                      </div>
                      {buy.notes && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {buy.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-200">
                        {maskValue(formatMoney(buy.amount, currency))}
                      </div>
                      {buy.fee !== undefined && buy.fee > 0 && (
                        <div className="text-[10px] text-slate-500">
                          手續費: NT$ {buy.fee}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity"
                      title="編輯此筆買進"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 賣出記錄清單 */}
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mb-2">
              <DollarSign size={13} />
              <span>賣出平倉記錄 ({closedTrade.sells.length} 筆)</span>
            </div>
            <div className="space-y-1.5">
              {closedTrade.sells.map((sell) => (
                <div
                  key={sell.id}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectTransaction(sell)
                  }}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 hover:bg-slate-800/80 border border-slate-800/80 hover:border-amber-500/40 transition-all cursor-pointer group"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="text-white font-medium">
                          {sell.shares ? `${sell.shares.toLocaleString()} 股` : '賣出'}
                        </span>
                        {sell.pricePerShare && (
                          <span className="text-slate-400 text-[11px]">
                            @ {sell.pricePerShare}
                          </span>
                        )}
                        <span className="text-slate-500 text-[11px]">
                          {sell.date} {sell.time || ''}
                        </span>
                      </div>
                      {sell.notes && (
                        <div className="text-[11px] text-slate-400 truncate mt-0.5">
                          {sell.notes}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-emerald-400">
                        +{maskValue(formatMoney(sell.amount, currency))}
                      </div>
                      {(sell.fee || sell.tax) ? (
                        <div className="text-[10px] text-slate-500">
                          {sell.fee ? `費:${sell.fee} ` : ''}
                          {sell.tax ? `稅:${sell.tax}` : ''}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white transition-opacity"
                      title="編輯此筆賣出"
                    >
                      <Edit2 size={12} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
