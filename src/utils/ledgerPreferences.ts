import type { LedgerType } from '../types'

export type OverviewTimeRange = 'all' | 'month' | 'year'
export type TransactionsViewMode = 'calendar' | 'list'

export interface LedgerPreferences {
  // 總覽偏好
  overviewTimeRange?: OverviewTimeRange
  overviewYear?: number
  overviewMonth?: number
  // 明細偏好
  transactionsViewMode?: TransactionsViewMode
  transactionsTypeFilter?: string
}

const STORAGE_KEY_PREFIX = 'ku_money_ledger_pref_v1_'

/**
 * 依帳本類型提供預設總覽時間維度
 * 股票與期貨預設注重整體累計 ('all')，一般收支預設注重單月收支 ('month')
 */
export const getDefaultTimeRangeForLedger = (ledgerType: LedgerType): OverviewTimeRange => {
  if (ledgerType === 'stock' || ledgerType === 'futures') {
    return 'all'
  }
  return 'month'
}

/**
 * 載入指定帳本的偏好設定
 */
export const loadLedgerPreferences = (
  ledgerId: string,
  ledgerType: LedgerType
): LedgerPreferences => {
  const defaults: LedgerPreferences = {
    overviewTimeRange: getDefaultTimeRangeForLedger(ledgerType),
    transactionsViewMode: 'calendar',
    transactionsTypeFilter: 'all',
  }
  if (!ledgerId) return defaults

  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${ledgerId}`)
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LedgerPreferences>
      return {
        ...defaults,
        ...parsed,
      }
    }
  } catch (err) {
    console.error(`Failed to load preferences for ledger ${ledgerId}:`, err)
  }
  return defaults
}

/**
 * 儲存指定帳本的偏好設定至 LocalStorage
 */
export const saveLedgerPreferences = (
  ledgerId: string,
  prefs: Partial<LedgerPreferences>
): void => {
  if (!ledgerId) return
  try {
    const existingRaw = localStorage.getItem(`${STORAGE_KEY_PREFIX}${ledgerId}`)
    const existing = existingRaw ? JSON.parse(existingRaw) : {}
    const updated = {
      ...existing,
      ...prefs,
    }
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${ledgerId}`, JSON.stringify(updated))
  } catch (err) {
    console.error(`Failed to save preferences for ledger ${ledgerId}:`, err)
  }
}

