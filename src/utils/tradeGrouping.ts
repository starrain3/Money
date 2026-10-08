import type { Transaction } from '../types'

export interface ClosedTradeGroup {
  id: string
  symbol: string
  closeDate: string
  closeTime?: string
  startDate: string
  buys: Transaction[]
  sells: Transaction[]
  totalShares: number
  totalBuyCost: number
  totalSellRevenue: number
  totalFee: number
  totalTax: number
  realizedPnL: number
  returnRate: number
  lastSellTransaction: Transaction
}

export type DisplayTradeItem =
  | { type: 'single'; transaction: Transaction }
  | { type: 'closed_bundle'; closedTrade: ClosedTradeGroup }

/**
 * 依時間升序排序交易 (同時間優先讓買進排在賣出前面)
 */
const sortTransactionsChronologically = (txList: Transaction[]): Transaction[] => {
  return [...txList].sort((a, b) => {
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
}

/**
 * 分析帳本中所有交易，找出所有「買進到完全賣出」的回合平倉
 * @param allLedgerTx 該帳本的全體交易 (用於追蹤完整歷史持股與出清狀態)
 */
export const identifyClosedTradeCycles = (
  allLedgerTx: Transaction[]
): {
  closedCycles: ClosedTradeGroup[]
  bundledTransactionIdSet: Set<string>
  cycleByLastSellId: Map<string, ClosedTradeGroup>
} => {
  const sorted = sortTransactionsChronologically(allLedgerTx)

  // 每個標的維護當前未結清的回合
  const pendingMap = new Map<
    string,
    {
      buys: Transaction[]
      sells: Transaction[]
      remainingShares: number
      totalBuyCost: number
    }
  >()

  const closedCycles: ClosedTradeGroup[] = []
  const bundledTransactionIdSet = new Set<string>()
  const cycleByLastSellId = new Map<string, ClosedTradeGroup>()

  sorted.forEach((tx) => {
    // 只有 stock_buy 和 stock_sell 參與股票/標的回合計算
    if (tx.type !== 'stock_buy' && tx.type !== 'stock_sell') {
      return
    }

    const symbol = (tx.stockSymbol || tx.category || '').trim()
    if (!symbol) return

    const pending = pendingMap.get(symbol) || {
      buys: [],
      sells: [],
      remainingShares: 0,
      totalBuyCost: 0,
    }

    const s = tx.shares || 0

    if (tx.type === 'stock_buy') {
      pending.buys.push(tx)
      pending.remainingShares += s
      pending.totalBuyCost += tx.amount
      pendingMap.set(symbol, pending)
    } else if (tx.type === 'stock_sell') {
      // 只有在當前有持股/買進記錄時才進行匹配
      if (pending.buys.length > 0 && pending.remainingShares > 0) {
        pending.sells.push(tx)
        pending.remainingShares -= s

        // 若庫存歸零或全部賣出 (允許微小浮點數誤差)
        if (pending.remainingShares <= 0.0001) {
          const totalShares = pending.buys.reduce((sum, b) => sum + (b.shares || 0), 0)
          const totalBuyCost = pending.buys.reduce((sum, b) => sum + b.amount, 0)
          const totalSellRevenue = pending.sells.reduce((sum, sTx) => sum + sTx.amount, 0)
          const totalFee =
            pending.buys.reduce((sum, b) => sum + (b.fee || 0), 0) +
            pending.sells.reduce((sum, sTx) => sum + (sTx.fee || 0), 0)
          const totalTax = pending.sells.reduce((sum, sTx) => sum + (sTx.tax || 0), 0)

          const realizedPnL = totalSellRevenue - totalBuyCost
          const returnRate =
            totalBuyCost > 0 ? (realizedPnL / totalBuyCost) * 100 : 0

          const startDate = pending.buys[0]?.date || tx.date
          const cycleId = `closed-trade-${tx.id}`

          const closedGroup: ClosedTradeGroup = {
            id: cycleId,
            symbol,
            closeDate: tx.date,
            closeTime: tx.time,
            startDate,
            buys: [...pending.buys],
            sells: [...pending.sells],
            totalShares,
            totalBuyCost,
            totalSellRevenue,
            totalFee,
            totalTax,
            realizedPnL,
            returnRate,
            lastSellTransaction: tx,
          }

          closedCycles.push(closedGroup)
          cycleByLastSellId.set(tx.id, closedGroup)

          // 標記該回合所有交易 ID 為已打包
          pending.buys.forEach((b) => bundledTransactionIdSet.add(b.id))
          pending.sells.forEach((sTx) => bundledTransactionIdSet.add(sTx.id))

          // 庫存結清，重設為新回合
          pendingMap.delete(symbol)
        } else {
          // 部分賣出，尚未完全歸零，繼續保留
          pendingMap.set(symbol, pending)
        }
      }
    }
  })

  return { closedCycles, bundledTransactionIdSet, cycleByLastSellId }
}

/**
 * 將當前畫面過濾後的交易清單轉換為顯示清單 (整合大明細包裝)
 * @param filteredTx 當前篩選條件 (如月份/關鍵字) 下的交易
 * @param allLedgerTx 該帳本全部交易 (用於判斷出清邏輯)
 */
export const groupTransactionsForDisplay = (
  filteredTx: Transaction[],
  allLedgerTx: Transaction[]
): DisplayTradeItem[] => {
  const { bundledTransactionIdSet, cycleByLastSellId } =
    identifyClosedTradeCycles(allLedgerTx)

  const result: DisplayTradeItem[] = []

  filteredTx.forEach((tx) => {
    // 檢查此筆交易是否為某個完全出清回合的「最後一筆出清賣出」
    const closedCycle = cycleByLastSellId.get(tx.id)
    if (closedCycle) {
      // 在最後一筆賣出這個位置，替換為一個包覆買賣的大明細
      result.push({
        type: 'closed_bundle',
        closedTrade: closedCycle,
      })
      return
    }

    // 若這筆交易已經被包入某個結清大明細中 (且不是最後那筆觸發點)，則不在列表單獨分散出現
    if (bundledTransactionIdSet.has(tx.id)) {
      return
    }

    // 尚未結清、或一般收支/股息/手續費等交易，作為單筆獨立顯示
    result.push({
      type: 'single',
      transaction: tx,
    })
  })

  return result
}

