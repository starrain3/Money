export type LedgerType = 'standard' | 'stock' | 'futures'

export type FeeCalculationType = 'percentage' | 'fixed'

export interface LedgerFeeConfig {
  calculationType: FeeCalculationType // 'percentage' 百分比 (%) 還是 'fixed' 固定金額
  rate?: number // 費率百分比，例如 0.1425 代表 0.1425%
  fixedAmount?: number // 固定金額，例如 20 代表 20 元
  discount?: number // 折扣折數百分比，例如 100 代表 100% (不打折)，60 代表 6 折，28 代表 2.8 折
  minFee?: number // 最低手續費 (低消)，例如 1 元或 20 元 (選填)
}

export interface Ledger {
  id: string
  name: string
  type: LedgerType
  icon: string
  color: string
  currency: string
  description?: string
  budgetMonthly?: number
  feeConfig?: LedgerFeeConfig
  createdAt: string
}

export type TransactionType = 'expense' | 'income' | 'stock_buy' | 'stock_sell' | 'dividend'

export interface Transaction {
  id: string
  ledgerId: string
  type: TransactionType
  amount: number
  category: string
  date: string // YYYY-MM-DD
  time: string // HH:mm
  account: string // e.g. '現金', '信用卡', '銀行帳戶', '證券交割戶'
  notes?: string
  tags?: string[]
  // 股票專屬欄位 (可選)
  stockSymbol?: string // 例如 "2330 台積電"
  shares?: number // 股數
  pricePerShare?: number // 每股單價
  fee?: number // 手續費
  tax?: number // 證券交易稅
}

export interface CategoryItem {
  id: string
  name: string
  type: 'expense' | 'income' | 'stock'
  icon: string
  color: string
}

export type ViewTab = 'overview' | 'transactions' | 'analytics' | 'ledgers' | 'settings'

export interface StorageData {
  version: number
  ledgers: Ledger[]
  transactions: Transaction[]
  activeLedgerId: string
}

