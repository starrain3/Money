import type { LedgerType } from '../types'

// 依據帳本類型提供專屬預設錢包/帳戶清單
export const getLedgerDefaultAccounts = (ledgerType: LedgerType): string[] => {
  switch (ledgerType) {
    case 'stock':
      return [
        '證券交割戶',
        '銀行帳戶',
        '數位帳戶 (Richart/大戶)',
        '現金錢包',
      ]
    case 'futures':
      return [
        '期貨保證金專戶',
        '銀行帳戶',
        '證券交割戶',
        '現金錢包',
      ]
    case 'standard':
    default:
      return [
        '現金錢包',
        '信用卡',
        '銀行帳戶',
        '數位帳戶 (Richart/大戶)',
        '行動支付 (LINE Pay/街口)',
      ]
  }
}

// 依據帳本類型提供專屬預設上次使用錢包
export const getLedgerDefaultLastAccount = (ledgerType: LedgerType): string => {
  switch (ledgerType) {
    case 'stock':
      return '證券交割戶'
    case 'futures':
      return '期貨保證金專戶'
    case 'standard':
    default:
      return '現金錢包'
  }
}

const STORAGE_KEY_PREFIX_ACCOUNTS = 'ku_money_ledger_accounts_v1_'
const STORAGE_KEY_PREFIX_LAST = 'ku_money_ledger_last_account_v1_'

/**
 * 載入指定帳本的常用錢包清單
 */
export const loadLedgerAccounts = (ledgerId: string, ledgerType: LedgerType): string[] => {
  if (!ledgerId) return getLedgerDefaultAccounts(ledgerType)
  try {
    const raw = localStorage.getItem(`${STORAGE_KEY_PREFIX_ACCOUNTS}${ledgerId}`)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error(`Failed to load accounts for ledger ${ledgerId}:`, err)
  }
  return getLedgerDefaultAccounts(ledgerType)
}

/**
 * 儲存指定帳本的常用錢包清單
 */
export const saveLedgerAccounts = (ledgerId: string, accounts: string[]): void => {
  if (!ledgerId) return
  try {
    const cleanAccounts = Array.from(new Set(accounts.map((a) => a.trim()).filter(Boolean)))
    localStorage.setItem(`${STORAGE_KEY_PREFIX_ACCOUNTS}${ledgerId}`, JSON.stringify(cleanAccounts))
  } catch (err) {
    console.error(`Failed to save accounts for ledger ${ledgerId}:`, err)
  }
}

/**
 * 載入指定帳本上次使用的錢包
 */
export const loadLedgerLastAccount = (ledgerId: string, ledgerType: LedgerType): string => {
  if (!ledgerId) return getLedgerDefaultLastAccount(ledgerType)
  try {
    const last = localStorage.getItem(`${STORAGE_KEY_PREFIX_LAST}${ledgerId}`)
    if (last && last.trim()) {
      return last.trim()
    }
  } catch (err) {
    console.error(`Failed to load last account for ledger ${ledgerId}:`, err)
  }
  return getLedgerDefaultLastAccount(ledgerType)
}

/**
 * 儲存指定帳本上次使用的錢包
 */
export const saveLedgerLastAccount = (ledgerId: string, account: string): void => {
  if (!ledgerId || !account) return
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX_LAST}${ledgerId}`, account.trim())
  } catch (err) {
    console.error(`Failed to save last account for ledger ${ledgerId}:`, err)
  }
}

/**
 * 當使用者完成一筆交易時，記錄並強化該帳本的常用錢包順序與上次使用錢包
 */
export const recordLedgerAccountUsage = (
  ledgerId: string,
  ledgerType: LedgerType,
  account: string
): string[] => {
  const trimmed = account.trim()
  if (!ledgerId || !trimmed) return loadLedgerAccounts(ledgerId, ledgerType)

  // 1. 儲存為該帳本的上次使用錢包
  saveLedgerLastAccount(ledgerId, trimmed)

  // 2. 獲取現有清單，將本次使用的錢包拉到最前面 (LRU 順序)
  const current = loadLedgerAccounts(ledgerId, ledgerType)
  const filtered = current.filter((a) => a !== trimmed)
  const updated = [trimmed, ...filtered].slice(0, 15) // 最多保留 15 個常用錢包

  saveLedgerAccounts(ledgerId, updated)
  return updated
}

/**
 * 重設指定帳本的錢包清單為預設值
 */
export const resetLedgerAccounts = (ledgerId: string, ledgerType: LedgerType): string[] => {
  const defaults = getLedgerDefaultAccounts(ledgerType)
  saveLedgerAccounts(ledgerId, defaults)
  saveLedgerLastAccount(ledgerId, defaults[0] || getLedgerDefaultLastAccount(ledgerType))
  return defaults
}

