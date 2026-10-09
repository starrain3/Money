import type { Ledger, StorageData } from '../types'
import { getTodayDateString } from './format'

const STORAGE_KEY = 'harvest_money_pwa_data_v1'

export const INITIAL_LEDGERS: Ledger[] = [
  {
    id: 'ledger-daily',
    name: '日常開銷',
    type: 'standard',
    icon: 'Wallet',
    color: '#10b981',
    currency: 'NT$',
    description: '生活飲食、居家雜支、休閒娛樂等收支',
    budgetMonthly: 30000,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'ledger-stock',
    name: '股票投資',
    type: 'stock',
    icon: 'TrendingUp',
    color: '#3b82f6',
    currency: 'NT$',
    description: '台美股交易、定期定額、現金股利與配息',
    feeConfig: {
      calculationType: 'percentage',
      rate: 0.1425,
      discount: 100,
      minFee: 20,
    },
    createdAt: new Date().toISOString(),
  },
]

export const loadStorageData = (): StorageData => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      const initialData: StorageData = {
        version: 1,
        ledgers: INITIAL_LEDGERS,
        transactions: [], // 預設完全空白
        activeLedgerId: 'ledger-daily',
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(initialData))
      return initialData
    }
    const parsed = JSON.parse(raw) as StorageData
    if (!parsed.activeLedgerId && parsed.ledgers.length > 0) {
      parsed.activeLedgerId = parsed.ledgers[0].id
    }
    return parsed
  } catch (err) {
    console.error('Failed to load storage data, falling back to empty initial data:', err)
    return {
      version: 1,
      ledgers: INITIAL_LEDGERS,
      transactions: [],
      activeLedgerId: 'ledger-daily',
    }
  }
}

export const saveStorageData = (data: StorageData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  } catch (err) {
    console.error('Failed to save data to localStorage:', err)
  }
}

const CUSTOM_CATEGORIES_KEY = 'harvest_money_custom_categories_v1'

export const loadCustomCategories = (): import('../types').CategoryItem[] => {
  try {
    const raw = localStorage.getItem(CUSTOM_CATEGORIES_KEY)
    if (!raw) return []
    return JSON.parse(raw) as import('../types').CategoryItem[]
  } catch (err) {
    console.error('Failed to load custom categories:', err)
    return []
  }
}

export const saveCustomCategories = (categories: import('../types').CategoryItem[]): void => {
  try {
    localStorage.setItem(CUSTOM_CATEGORIES_KEY, JSON.stringify(categories))
  } catch (err) {
    console.error('Failed to save custom categories:', err)
  }
}

export const addCustomCategory = (category: import('../types').CategoryItem): import('../types').CategoryItem[] => {
  const current = loadCustomCategories()
  const exists = current.some((c) => c.name === category.name && c.type === category.type)
  if (exists) return current
  const updated = [...current, category]
  saveCustomCategories(updated)
  return updated
}

// 匯出 JSON 備份檔
export const exportDataAsJSON = (data: StorageData): void => {
  const jsonStr = JSON.stringify(data, null, 2)
  const blob = new Blob([jsonStr], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = getTodayDateString()
  a.href = url
  a.download = `harvest_money_backup_${dateStr}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 匯入 JSON 備份檔
export const importDataFromJSON = (file: File): Promise<StorageData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const content = e.target?.result as string
        if (!content) {
          throw new Error('檔案內容為空')
        }
        const parsed = JSON.parse(content) as StorageData
        if (!parsed.ledgers || !Array.isArray(parsed.ledgers) || !Array.isArray(parsed.transactions)) {
          throw new Error('匯入的備份檔案格式不正確，缺少帳本或交易資訊')
        }
        resolve(parsed)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(new Error('讀取檔案失敗'))
    reader.readAsText(file)
  })
}

// 記住使用者歷史輸入紀錄 (依帳本分開儲存：常用備註/品項、股票/商品代號、帳戶、類型)
const RECENT_INPUTS_KEY_PREFIX = 'ku_money_recent_inputs_v2_'
const LEGACY_RECENT_INPUTS_KEY = 'harvest_money_recent_inputs_v1'

export interface RecentInputs {
  notes: string[]
  symbols: string[]
  lastAccount?: string
  lastType?: string
}

export const loadRecentInputs = (ledgerId?: string): RecentInputs => {
  try {
    if (ledgerId) {
      const raw = localStorage.getItem(`${RECENT_INPUTS_KEY_PREFIX}${ledgerId}`)
      if (raw) {
        return JSON.parse(raw) as RecentInputs
      }
    } else {
      const raw = localStorage.getItem(LEGACY_RECENT_INPUTS_KEY)
      if (raw) return JSON.parse(raw) as RecentInputs
    }
  } catch {
    // 忽略錯誤並返回預設值
  }
  return { notes: [], symbols: [] }
}

export const recordRecentInput = (data: {
  ledgerId?: string
  note?: string
  symbol?: string
  account?: string
  type?: string
}): void => {
  try {
    const targetKey = data.ledgerId
      ? `${RECENT_INPUTS_KEY_PREFIX}${data.ledgerId}`
      : LEGACY_RECENT_INPUTS_KEY

    const current = loadRecentInputs(data.ledgerId)
    const nextNotes = Array.isArray(current.notes) ? [...current.notes] : []
    const nextSymbols = Array.isArray(current.symbols) ? [...current.symbols] : []

    if (data.note && data.note.trim()) {
      const trimmed = data.note.trim()
      const filtered = nextNotes.filter((n) => n !== trimmed)
      nextNotes.length = 0
      nextNotes.push(...[trimmed, ...filtered].slice(0, 30))
    }

    if (data.symbol && data.symbol.trim()) {
      const trimmed = data.symbol.trim()
      const filtered = nextSymbols.filter((s) => s !== trimmed)
      nextSymbols.length = 0
      nextSymbols.push(...[trimmed, ...filtered].slice(0, 30))
    }

    const updated: RecentInputs = {
      notes: nextNotes,
      symbols: nextSymbols,
      lastAccount: data.account || current.lastAccount,
      lastType: data.type || current.lastType,
    }

    localStorage.setItem(targetKey, JSON.stringify(updated))
  } catch (err) {
    console.error('Failed to record recent input:', err)
  }
}

// 清除特定帳本的歷史品項與標的輸入紀錄
export const clearLedgerRecentInputs = (ledgerId: string): void => {
  if (!ledgerId) return
  try {
    localStorage.removeItem(`${RECENT_INPUTS_KEY_PREFIX}${ledgerId}`)
  } catch (err) {
    console.error('Failed to clear recent inputs for ledger:', err)
  }
}

