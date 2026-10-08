import type { CategoryItem, TransactionType } from '../types'
import {
  EXPENSE_CATEGORIES,
  INCOME_CATEGORIES,
  STOCK_CATEGORIES,
  STOCK_EXPENSE_CATEGORIES,
  STOCK_INCOME_CATEGORIES,
  FUTURES_TRADE_CATEGORIES,
  FUTURES_EXPENSE_CATEGORIES,
  FUTURES_INCOME_CATEGORIES,
} from '../constants/categories'
import { loadCustomCategories } from './storage'

export type CategoryGroupKey =
  | 'expense'
  | 'income'
  | 'stock_trade'
  | 'stock_expense'
  | 'stock_income'
  | 'futures_trade'
  | 'futures_expense'
  | 'futures_income'

export const DEFAULT_CATEGORY_GROUPS: Record<CategoryGroupKey, CategoryItem[]> = {
  expense: EXPENSE_CATEGORIES,
  income: INCOME_CATEGORIES,
  stock_trade: STOCK_CATEGORIES,
  stock_expense: STOCK_EXPENSE_CATEGORIES,
  stock_income: STOCK_INCOME_CATEGORIES,
  futures_trade: FUTURES_TRADE_CATEGORIES,
  futures_expense: FUTURES_EXPENSE_CATEGORIES,
  futures_income: FUTURES_INCOME_CATEGORIES,
}

export interface CategoryGroupInfo {
  key: CategoryGroupKey
  label: string
  subLabel: string
  categoryType: 'expense' | 'income' | 'stock'
  parentType: 'standard' | 'stock' | 'futures'
}

export const CATEGORY_GROUP_OPTIONS: CategoryGroupInfo[] = [
  { key: 'expense', label: '日常支出', subLabel: '餐飲、交通、日常購物等', categoryType: 'expense', parentType: 'standard' },
  { key: 'income', label: '日常收入', subLabel: '薪資、獎金、投資回報等', categoryType: 'income', parentType: 'standard' },
  { key: 'stock_trade', label: '股票買賣/股息', subLabel: '股票買進、賣出、現金股息', categoryType: 'stock', parentType: 'stock' },
  { key: 'stock_expense', label: '股票投資支出', subLabel: '交易稅費、融資利息、借券費', categoryType: 'expense', parentType: 'stock' },
  { key: 'stock_income', label: '股票投資收入', subLabel: '手續費折讓、出借利息', categoryType: 'income', parentType: 'stock' },
  { key: 'futures_trade', label: '期貨交易', subLabel: '買進/賣出 建倉與平倉', categoryType: 'stock', parentType: 'futures' },
  { key: 'futures_expense', label: '期貨支出/稅費', subLabel: '手續費、交易稅、保證金出金', categoryType: 'expense', parentType: 'futures' },
  { key: 'futures_income', label: '期貨獲利/入金', subLabel: '平倉獲利、保證金入金', categoryType: 'income', parentType: 'futures' },
]

const CATEGORIES_STORAGE_KEY_PREFIX = 'ku_money_categories_v2_'

/**
 * 載入指定群組的分類列表
 */
export const loadCategories = (groupKey: CategoryGroupKey): CategoryItem[] => {
  try {
    const raw = localStorage.getItem(CATEGORIES_STORAGE_KEY_PREFIX + groupKey)
    if (raw) {
      const parsed = JSON.parse(raw) as CategoryItem[]
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
      }
    }
  } catch (err) {
    console.error(`Failed to load categories for ${groupKey}:`, err)
  }

  // 首次載入或無自訂儲存：以系統預設值為基底，並向下相容舊版 customCategories
  const defaultList = [...(DEFAULT_CATEGORY_GROUPS[groupKey] || [])]
  try {
    const legacyCustom = loadCustomCategories()
    const targetType = CATEGORY_GROUP_OPTIONS.find((g) => g.key === groupKey)?.categoryType
    if (legacyCustom.length > 0 && targetType) {
      const matched = legacyCustom.filter((c) => c.type === targetType)
      matched.forEach((c) => {
        if (!defaultList.some((item) => item.name === c.name)) {
          defaultList.push(c)
        }
      })
    }
  } catch {
    // 忽略舊版讀取失敗
  }

  // 儲存一次確保未來可修改
  saveCategories(groupKey, defaultList)
  return defaultList
}

/**
 * 儲存指定群組的分類清單
 */
export const saveCategories = (groupKey: CategoryGroupKey, categories: CategoryItem[]): void => {
  try {
    localStorage.setItem(CATEGORIES_STORAGE_KEY_PREFIX + groupKey, JSON.stringify(categories))
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('ku_categories_updated', { detail: { groupKey } }))
    }
  } catch (err) {
    console.error(`Failed to save categories for ${groupKey}:`, err)
  }
}

/**
 * 重設指定群組為系統預設值
 */
export const resetCategories = (groupKey: CategoryGroupKey): CategoryItem[] => {
  const defaultList = [...(DEFAULT_CATEGORY_GROUPS[groupKey] || [])]
  saveCategories(groupKey, defaultList)
  return defaultList
}

/**
 * 根據帳本類型與記帳交易型態，自動解析出對應的分類群組 Key
 */
export const resolveCategoryGroupKey = (
  ledgerType: 'standard' | 'stock' | 'futures',
  txType: TransactionType
): CategoryGroupKey => {
  if (ledgerType === 'futures') {
    if (txType === 'stock_buy' || txType === 'stock_sell') return 'futures_trade'
    if (txType === 'income') return 'futures_income'
    return 'futures_expense'
  }
  if (ledgerType === 'stock') {
    if (txType === 'income') return 'stock_income'
    if (txType === 'expense') return 'stock_expense'
    return 'stock_trade'
  }
  if (txType === 'income') return 'income'
  if (txType === 'stock_buy' || txType === 'stock_sell' || txType === 'dividend') return 'stock_trade'
  return 'expense'
}

