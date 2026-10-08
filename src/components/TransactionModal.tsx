import React, { useState, useEffect, useMemo } from 'react'
import type { Ledger, Transaction, TransactionType, CategoryItem } from '../types'
import { loadRecentInputs, recordRecentInput } from '../utils/storage'
import {
  resolveCategoryGroupKey,
  loadCategories,
  saveCategories,
} from '../utils/categoryStorage'
import {
  loadLedgerAccounts,
  loadLedgerLastAccount,
  saveLedgerAccounts,
  recordLedgerAccountUsage,
  resetLedgerAccounts,
} from '../utils/accountStorage'
import { calculateFee, formatFeeConfigSummary } from '../utils/fee'
import { DynamicIcon } from './DynamicIcon'
import { CategoryManagerModal } from './CategoryManagerModal'
import { X, Calendar, Clock, Calculator, Trash2, Plus, Check, History, RotateCcw, Package, RefreshCw, SlidersHorizontal, Wallet } from 'lucide-react'

const AVAILABLE_ICONS = [
  'Tag', 'Coffee', 'Dog', 'Cat', 'Baby', 'Gamepad2', 'Film', 'Music', 
  'Shirt', 'Book', 'Smile', 'Sparkles', 'Plane', 'Car', 'Home', 'Gift', 
  'Heart', 'Zap', 'ShoppingBag', 'Utensils', 'DollarSign', 'Coins'
]

const AVAILABLE_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', 
  '#f97316', '#eab308', '#06b6d4', '#ef4444', '#64748b'
]

interface TransactionModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (transaction: Omit<Transaction, 'id'>, editId?: string) => void
  onDelete?: (id: string) => void
  activeLedger: Ledger
  editTransaction?: Transaction | null
  defaultDate?: string
  existingTransactions?: Transaction[]
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  activeLedger,
  editTransaction,
  defaultDate,
  existingTransactions = [],
}) => {
  const isStockLedger = activeLedger.type === 'stock'
  const isFuturesLedger = activeLedger.type === 'futures'

  // 表單狀態
  const [type, setType] = useState<TransactionType>(
    isStockLedger ? 'stock_buy' : isFuturesLedger ? 'income' : 'expense'
  )
  const [amount, setAmount] = useState<string>('')
  const [category, setCategory] = useState<string>('')
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0])
  const [time, setTime] = useState<string>(
    new Date().toTimeString().split(' ')[0].substring(0, 5)
  )
  const [account, setAccount] = useState<string>(() =>
    loadLedgerLastAccount(activeLedger.id, activeLedger.type)
  )
  const [notes, setNotes] = useState<string>('')

  // 帳本專屬常用錢包狀態 (各自獨立儲存於 localStorage)
  const [ledgerAccounts, setLedgerAccounts] = useState<string[]>(() =>
    loadLedgerAccounts(activeLedger.id, activeLedger.type)
  )
  const [isAddingCustomAccount, setIsAddingCustomAccount] = useState<boolean>(false)
  const [newAccountInput, setNewAccountInput] = useState<string>('')

  // 股票專用欄位
  const [stockSymbol, setStockSymbol] = useState<string>('')
  const [shares, setShares] = useState<string>('')
  const [pricePerShare, setPricePerShare] = useState<string>('')
  const [fee, setFee] = useState<string>('20')
  const [tax, setTax] = useState<string>('0')
  const [futuresMultiplier, setFuturesMultiplier] = useState<number>(1)

  // 自訂分類狀態
  const [isCatManagerOpen, setIsCatManagerOpen] = useState<boolean>(false)
  const [categoryRefreshKey, setCategoryRefreshKey] = useState<number>(0)
  const [isAddingCategory, setIsAddingCategory] = useState<boolean>(false)
  const [newCatName, setNewCatName] = useState<string>('')
  const [newCatIcon, setNewCatIcon] = useState<string>('Tag')
  const [newCatColor, setNewCatColor] = useState<string>('#10b981')

  // 記錄手續費與稅金是否已被使用者手動編輯
  const [isFeeUserModified, setIsFeeUserModified] = useState<boolean>(false)
  const [isTaxUserModified, setIsTaxUserModified] = useState<boolean>(false)

  // 智慧記憶：整合所有歷史輸入紀錄 (依帳本分開載入：備註、股票標的/期貨商品、常用金額、上一筆交易)
  const recentHistory = useMemo(() => {
    const stored = loadRecentInputs(activeLedger.id)
    const ledgerTx = existingTransactions.filter((t) => t.ledgerId === activeLedger.id)

    const sortedTx = [...ledgerTx].sort((a, b) =>
      `${b.date} ${b.time || ''}`.localeCompare(`${a.date} ${a.time || ''}`)
    )

    const txNotes: string[] = []
    const txSymbols: string[] = []
    const txAmounts: number[] = []

    sortedTx.forEach((t) => {
      if (t.notes && t.notes.trim() && !txNotes.includes(t.notes.trim())) {
        txNotes.push(t.notes.trim())
      }
      if (t.stockSymbol && t.stockSymbol.trim() && !txSymbols.includes(t.stockSymbol.trim())) {
        txSymbols.push(t.stockSymbol.trim())
      }
      if (t.amount > 0 && !txAmounts.includes(t.amount)) {
        txAmounts.push(t.amount)
      }
    })

    const combinedNotes = Array.from(
      new Set([...(stored.notes || []), ...txNotes])
    ).slice(0, 15)

    const combinedSymbols = Array.from(
      new Set([...(stored.symbols || []), ...txSymbols])
    ).slice(0, 10)

    return {
      notes: combinedNotes,
      symbols: combinedSymbols,
      amounts: txAmounts.slice(0, 6),
      lastTx: sortedTx[0] || null,
      storedLastAccount: stored.lastAccount,
    }
  }, [existingTransactions, activeLedger.id])

  // 當開啟或編輯時同步資料
  useEffect(() => {
    if (isOpen) {
      setIsAddingCategory(false)
      setNewCatName('')
      setIsAddingCustomAccount(false)
      setNewAccountInput('')
      setLedgerAccounts(loadLedgerAccounts(activeLedger.id, activeLedger.type))
    }

    if (editTransaction) {
      setType(editTransaction.type)
      setAmount(editTransaction.amount.toString())
      setCategory(editTransaction.category)
      setDate(editTransaction.date)
      setTime(editTransaction.time || '12:00')
      setAccount(editTransaction.account || loadLedgerLastAccount(activeLedger.id, activeLedger.type))
      setNotes(editTransaction.notes || '')
      setStockSymbol(editTransaction.stockSymbol || '')
      setShares(editTransaction.shares ? editTransaction.shares.toString() : '')
      setPricePerShare(editTransaction.pricePerShare ? editTransaction.pricePerShare.toString() : '')
      setFee(editTransaction.fee !== undefined ? editTransaction.fee.toString() : (isFuturesLedger ? '20' : '0'))
      setTax(editTransaction.tax ? editTransaction.tax.toString() : '0')
      setIsFeeUserModified(true)
      setIsTaxUserModified(true)
    } else {
      // 預設值
      const defaultType: TransactionType = isStockLedger
        ? 'stock_buy'
        : isFuturesLedger
        ? 'stock_buy'
        : 'expense'
      setType(defaultType)
      setAmount('')
      setDate(defaultDate || new Date().toISOString().split('T')[0])
      setTime(new Date().toTimeString().split(' ')[0].substring(0, 5))

      // 自動記住此帳本在 localStorage 分開記錄的上次使用錢包
      const ledgerLastAcc = loadLedgerLastAccount(activeLedger.id, activeLedger.type)
      setAccount(ledgerLastAcc)

      setNotes('')
      setStockSymbol('')
      setShares('')
      setPricePerShare('')
      // 根據帳本設定自動帶入手續費
      let defaultFee = '0'
      if (isFuturesLedger) {
        defaultFee = calculateFee(activeLedger.feeConfig, { ledgerType: 'futures', shares: 1 }).toString()
      } else if (isStockLedger && activeLedger.feeConfig?.calculationType === 'fixed') {
        defaultFee = calculateFee(activeLedger.feeConfig, { ledgerType: 'stock' }).toString()
      }
      setFee(defaultFee)
      setTax('0')
      setIsFeeUserModified(false)
      setIsTaxUserModified(false)
      const initialGroup = resolveCategoryGroupKey(activeLedger.type, defaultType)
      const initialOptions = loadCategories(initialGroup)
      setCategory(initialOptions[0]?.name || '')
    }
  }, [editTransaction, isOpen, isStockLedger, isFuturesLedger, defaultDate, activeLedger.feeConfig, activeLedger.id, activeLedger.type])

  // 快速帶入上一筆輸入
  const handleCopyLastTx = (lastTx: Transaction) => {
    if (!lastTx) return
    setType(lastTx.type)
    setCategory(lastTx.category)
    if (lastTx.amount) setAmount(lastTx.amount.toString())
    if (lastTx.account) setAccount(lastTx.account)
    if (lastTx.notes) setNotes(lastTx.notes)
    if (lastTx.stockSymbol) setStockSymbol(lastTx.stockSymbol)
    if (lastTx.shares) setShares(lastTx.shares.toString())
    if (lastTx.pricePerShare) setPricePerShare(lastTx.pricePerShare.toString())
    if (lastTx.fee !== undefined) {
      setFee(lastTx.fee.toString())
      setIsFeeUserModified(true)
    }
    if (lastTx.tax !== undefined) {
      setTax(lastTx.tax.toString())
      setIsTaxUserModified(true)
    }
  }

  // 計算投資帳本中尚未賣出 (持股庫存) 或尚未平倉的標的清單
  const openHoldings = useMemo(() => {
    const ledgerTx = existingTransactions.filter((t) => t.ledgerId === activeLedger.id)

    if (isStockLedger) {
      // 股票：依時間升序計算每檔標的當前真實未實現在庫股數與移動加權平均買進成本
      const sortedTx = [...ledgerTx].sort((a, b) => {
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

      const holdingsMap = new Map<
        string,
        {
          symbol: string
          shares: number
          totalCost: number
          lastPrice?: number
        }
      >()

      sortedTx.forEach((t) => {
        const sym = t.stockSymbol?.trim()
        if (!sym) return

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
          holdingsMap.set(sym, existing)
        } else if (t.type === 'stock_sell') {
          if (existing.shares > 0 && s > 0) {
            if (s >= existing.shares) {
              existing.shares = 0
              existing.totalCost = 0
            } else {
              const avgCost = existing.totalCost / existing.shares
              const costOfSold = s * avgCost
              existing.shares -= s
              existing.totalCost -= costOfSold
              if (existing.shares < 0.0001 || existing.totalCost < 0.01) {
                existing.shares = 0
                existing.totalCost = 0
              }
            }
          } else {
            existing.shares = 0
            existing.totalCost = 0
          }
          holdingsMap.set(sym, existing)
        }
      })

      const list: Array<{ symbol: string; remainingShares: number; avgPrice: number }> = []

      holdingsMap.forEach((data) => {
        if (data.shares > 0.0001 && data.totalCost > 0.01) {
          const avgPrice = data.totalCost / data.shares
          list.push({
            symbol: data.symbol,
            remainingShares: Math.round(data.shares * 1000) / 1000,
            avgPrice: Math.round(avgPrice * 100) / 100,
          })
        }
      })

      return list
    }

    if (isFuturesLedger) {
      // 期貨：統計各契約部位
      const contractsMap = new Map<
        string,
        { symbol: string; buyLots: number; sellLots: number; totalCost: number; lastPrice?: number }
      >()
      ledgerTx.forEach((t) => {
        const sym = t.stockSymbol?.trim()
        if (!sym) return
        const existing = contractsMap.get(sym) || {
          symbol: sym,
          buyLots: 0,
          sellLots: 0,
          totalCost: 0,
        }
        const lots = t.shares || 1
        const price = t.pricePerShare || 0
        const isBuy = t.type === 'stock_buy' || t.notes?.includes('買') || t.category.includes('買')
        const isSell = t.type === 'stock_sell' || t.notes?.includes('賣') || t.category.includes('賣')
        if (isBuy) {
          existing.buyLots += lots
          if (price > 0) {
            existing.lastPrice = price
            existing.totalCost += lots * price
          }
        } else if (isSell) {
          existing.sellLots += lots
        } else {
          existing.buyLots += lots
        }
        contractsMap.set(sym, existing)
      })

      const list: Array<{ symbol: string; remainingShares: number; avgPrice: number }> = []
      contractsMap.forEach((c) => {
        const netLots = c.buyLots - c.sellLots
        if (netLots > 0) {
          const avgPrice = c.buyLots > 0 && c.totalCost > 0
            ? Math.round((c.totalCost / c.buyLots) * 100) / 100
            : (c.lastPrice || 0)
          list.push({ symbol: c.symbol, remainingShares: netLots, avgPrice })
        }
      })

      if (list.length === 0) {
        // 若皆已平倉，列出常交易契約
        const allSyms = Array.from(
          new Set(ledgerTx.map((t) => t.stockSymbol?.trim()).filter(Boolean))
        ) as string[]
        allSyms.slice(0, 5).forEach((s) => {
          list.push({ symbol: s, remainingShares: 0, avgPrice: 0 })
        })
      }
      return list
    }

    return []
  }, [existingTransactions, activeLedger.id, isStockLedger, isFuturesLedger])

  // 選擇未平倉/未賣出標的時，自動帶入標的名稱與股數/單價
  const handleSelectHolding = (h: {
    symbol: string
    remainingShares: number
    avgPrice: number
  }) => {
    setStockSymbol(h.symbol)
    if (type === 'stock_sell' && h.remainingShares > 0) {
      setShares(h.remainingShares.toString())
      if (h.avgPrice > 0 && (!pricePerShare || parseFloat(pricePerShare) === 0)) {
        setPricePerShare(h.avgPrice.toString())
        handleStockSharesOrPriceChange(h.remainingShares.toString(), h.avgPrice.toString())
      } else {
        handleStockSharesOrPriceChange(h.remainingShares.toString(), pricePerShare)
      }
    }
  }

  // 恢復手續費為帳本預設設定
  const handleResetFeeToLedgerDefault = () => {
    setIsFeeUserModified(false)
    if (isStockLedger) {
      const s = parseFloat(shares) || 0
      const p = parseFloat(pricePerShare) || 0
      const f = calculateFee(activeLedger.feeConfig, {
        ledgerType: 'stock',
        shares: s,
        pricePerShare: p,
      })
      setFee(f.toString())
      handleStockSharesOrPriceChange(shares, pricePerShare, f.toString(), tax)
    } else if (isFuturesLedger) {
      const s = parseFloat(shares) || 1
      const p = parseFloat(pricePerShare) || 0
      const f = calculateFee(activeLedger.feeConfig, {
        ledgerType: 'futures',
        shares: s,
        pricePerShare: p,
      })
      setFee(f.toString())
      handleFuturesSharesOrPriceChange(shares, pricePerShare, f.toString())
    }
  }

  // 股票：依帳本手續費設定自動試算，並自動試算總金額填入 amount (使用者可自行修改)
  const handleStockSharesOrPriceChange = (
    newShares: string,
    newPrice: string,
    currentFee?: string,
    currentTax?: string
  ) => {
    const s = parseFloat(newShares) || 0
    const p = parseFloat(newPrice) || 0

    if (s > 0 && p > 0) {
      let f = currentFee !== undefined ? (parseFloat(currentFee) || 0) : (parseFloat(fee) || 0)
      let t = currentTax !== undefined ? (parseFloat(currentTax) || 0) : (parseFloat(tax) || 0)

      // 若手續費未手動修改過，自動依帳本手續費設定計算
      if (!isFeeUserModified && currentFee === undefined) {
        f = calculateFee(activeLedger.feeConfig, {
          ledgerType: 'stock',
          shares: s,
          pricePerShare: p,
        })
        setFee(f.toString())
      }

      // 若證交稅未手動修改過且為賣出，自動依 0.3% 計算
      if (!isTaxUserModified && type === 'stock_sell' && currentTax === undefined) {
        t = Math.round(s * p * 0.003)
        setTax(t.toString())
      }

      // 自動試算總金額
      let total = 0
      if (type === 'stock_buy') {
        total = Math.round(s * p + f)
      } else if (type === 'stock_sell') {
        total = Math.round(s * p - f - t)
      } else {
        total = Math.round(s * p)
      }

      if (total > 0) {
        setAmount(total.toString())
      }
    }
  }

  // 期貨：輸入口數與每口點數/單價時，自動依帳本手續費設定與乘數試算金額
  const handleFuturesSharesOrPriceChange = (
    newShares: string,
    newPrice: string,
    currentFee?: string,
    currentTax?: string,
    multiplierOverride?: number
  ) => {
    const s = parseFloat(newShares) || 0
    const p = parseFloat(newPrice) || 0
    let f = currentFee !== undefined ? (parseFloat(currentFee) || 0) : (parseFloat(fee) || 0)
    let t = currentTax !== undefined ? (parseFloat(currentTax) || 0) : (parseFloat(tax) || 0)
    const mult = multiplierOverride !== undefined ? multiplierOverride : futuresMultiplier

    // 若手續費未手動修改過，自動依帳本手續費設定計算口數手續費
    if (!isFeeUserModified && currentFee === undefined) {
      f = calculateFee(activeLedger.feeConfig, {
        ledgerType: 'futures',
        shares: s > 0 ? s : 1,
        pricePerShare: p,
      })
      setFee(f.toString())
    }

    // 若稅金未手動修改過，期交稅約為十萬分之二 (0.00002) 乘契約總值 (若 mult > 1)
    if (!isTaxUserModified && currentTax === undefined && type === 'stock_sell') {
      if (s > 0 && p > 0 && mult > 1) {
        t = Math.round(s * p * mult * 0.00002)
        setTax(t.toString())
      }
    }

    if (s > 0 && p > 0) {
      let total = 0
      if (type === 'stock_buy') {
        // 買進建倉
        total = Math.round(s * p * mult + f)
      } else if (type === 'stock_sell') {
        // 賣出平倉
        total = Math.round(s * p * mult - f - t)
      } else if (type === 'income') {
        // 獲利入帳扣除手續費
        total = Math.round(s * p * mult - f > 0 ? s * p * mult - f : s * p * mult)
      } else {
        // 虧損扣款加上手續費
        total = Math.round(s * p * mult + f)
      }

      if (total > 0) {
        setAmount(total.toString())
      }
    }
  }

  // 期貨手動觸發自動試算總額
  const handleCalculateFuturesTotal = () => {
    const s = parseFloat(shares) || 0
    const p = parseFloat(pricePerShare) || 0
    const f = parseFloat(fee) || 0
    const t = parseFloat(tax) || 0
    const mult = futuresMultiplier || 1

    if (s > 0 && p > 0) {
      let total = 0
      if (type === 'stock_buy') {
        total = Math.round(s * p * mult + f)
      } else if (type === 'stock_sell') {
        total = Math.round(s * p * mult - f - t)
      } else if (type === 'income') {
        total = Math.round(s * p * mult - f > 0 ? s * p * mult - f : s * p * mult)
      } else {
        total = Math.round(s * p * mult + f)
      }
      if (total > 0) {
        setAmount(total.toString())
      }
    }
  }

  // 當切換 type 時更新預設分類
  const handleTypeChange = (newType: TransactionType) => {
    setType(newType)
    const nextGroup = resolveCategoryGroupKey(activeLedger.type, newType)
    const options = loadCategories(nextGroup)
    if (options.length > 0) {
      setCategory(options[0].name)
    }
  }

  // 目前所屬分類群組 Key
  const currentCategoryGroupKey = useMemo(() => {
    return resolveCategoryGroupKey(activeLedger.type, type)
  }, [activeLedger.type, type])

  // 分類清單 (受 categoryRefreshKey 驅動即時更新)
  const categoryOptions = useMemo(() => {
    return loadCategories(currentCategoryGroupKey)
  }, [currentCategoryGroupKey, categoryRefreshKey])

  // 監聽外部分類更新事件
  useEffect(() => {
    const handleCategoryUpdated = () => {
      setCategoryRefreshKey((prev) => prev + 1)
    }
    window.addEventListener('ku_categories_updated', handleCategoryUpdated)
    return () => window.removeEventListener('ku_categories_updated', handleCategoryUpdated)
  }, [])

  // 若目前所選的 category 不在選項中，自動對齊至第一個
  useEffect(() => {
    if (categoryOptions.length > 0 && !categoryOptions.some((c) => c.name === category)) {
      setCategory(categoryOptions[0].name)
    }
  }, [categoryOptions, category])

  // 建立並儲存新的自訂分類 (快速面板)
  const handleAddNewCategory = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = newCatName.trim()
    if (!trimmed) {
      alert('請輸入分類名稱！')
      return
    }

    if (categoryOptions.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
      alert('此分類名稱已存在！')
      return
    }

    const currentCatType =
      type === 'income'
        ? 'income'
        : type === 'stock_buy' || type === 'stock_sell' || type === 'dividend'
        ? 'stock'
        : 'expense'

    const newCategoryItem: CategoryItem = {
      id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      name: trimmed,
      type: currentCatType,
      icon: newCatIcon,
      color: newCatColor,
    }

    const updated = [...categoryOptions, newCategoryItem]
    saveCategories(currentCategoryGroupKey, updated)
    setCategory(newCategoryItem.name)
    setNewCatName('')
    setIsAddingCategory(false)
    setCategoryRefreshKey((prev) => prev + 1)
  }

  // 處理新增自訂錢包至當前帳本 (分開記錄於 localStorage)
  const handleAddAccount = () => {
    const trimmed = newAccountInput.trim()
    if (!trimmed) return
    const updated = recordLedgerAccountUsage(activeLedger.id, activeLedger.type, trimmed)
    setLedgerAccounts(updated)
    setAccount(trimmed)
    setNewAccountInput('')
    setIsAddingCustomAccount(false)
  }

  // 處理重設當前帳本的常用錢包清單
  const handleResetAccounts = () => {
    if (window.confirm(`確定要將「${activeLedger.name}」的常用錢包清單恢復為系統預設值嗎？`)) {
      const defaults = resetLedgerAccounts(activeLedger.id, activeLedger.type)
      setLedgerAccounts(defaults)
      setAccount(defaults[0] || '')
    }
  }

  // 處理從此帳本常用清單移除錢包
  const handleRemoveAccount = (e: React.MouseEvent, accToRemove: string) => {
    e.stopPropagation()
    if (ledgerAccounts.length <= 1) {
      alert('請至少保留一個常用錢包！')
      return
    }
    const filtered = ledgerAccounts.filter((a) => a !== accToRemove)
    saveLedgerAccounts(activeLedger.id, filtered)
    setLedgerAccounts(filtered)
    if (account === accToRemove) {
      setAccount(filtered[0])
    }
  }

  // 股票自動計算總金額：股數 × 單價 + 手續費 (+ 稅)
  const handleCalculateStockTotal = () => {
    const s = parseFloat(shares) || 0
    const p = parseFloat(pricePerShare) || 0
    const f = parseFloat(fee) || 0
    const t = parseFloat(tax) || 0

    if (s > 0 && p > 0) {
      if (type === 'stock_buy') {
        // 買進支出 = 股數*單價 + 手續費
        const total = Math.round(s * p + f)
        setAmount(total.toString())
      } else if (type === 'stock_sell') {
        // 賣出收入 = 股數*單價 - 手續費 - 證交稅
        const total = Math.round(s * p - f - t)
        setAmount(total.toString())
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const numAmount = parseFloat(amount)
    if (isNaN(numAmount) || numAmount <= 0) {
      alert('請輸入有效的金額！')
      return
    }

    if (!category) {
      alert('請選擇或輸入分類！')
      return
    }

    const transactionData: Omit<Transaction, 'id'> = {
      ledgerId: activeLedger.id,
      type,
      amount: numAmount,
      category,
      date,
      time,
      account,
      notes: notes.trim(),
    }

    if (isStockLedger || isFuturesLedger || stockSymbol) {
      transactionData.stockSymbol = stockSymbol.trim()
      if (shares) transactionData.shares = parseFloat(shares)
      if (pricePerShare) transactionData.pricePerShare = parseFloat(pricePerShare)
      if (fee) transactionData.fee = parseFloat(fee)
      if (tax) transactionData.tax = parseFloat(tax)
    }

    // 記錄並強化該帳本專屬的常用錢包歷史 (獨立儲存至 localStorage)
    recordLedgerAccountUsage(activeLedger.id, activeLedger.type, account)

    // 記憶使用者輸入之偏好與歷史 (依帳本分開儲存至 localStorage)
    recordRecentInput({
      ledgerId: activeLedger.id,
      note: notes.trim(),
      symbol: stockSymbol.trim(),
      type,
    })

    onSave(transactionData, editTransaction?.id)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 彈窗標題列 */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: activeLedger.color }}
            />
            <h3 className="font-semibold text-white text-base">
              {editTransaction ? '編輯記帳記錄' : '新增一筆記錄'}
            </h3>
            <span className="text-xs text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              {activeLedger.name}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {!editTransaction && recentHistory.lastTx && (
              <button
                type="button"
                onClick={() => handleCopyLastTx(recentHistory.lastTx!)}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 border border-slate-700 rounded-lg transition-colors cursor-pointer shadow-sm"
                title="帶入上一筆記帳內容"
              >
                <RotateCcw size={12} />
                <span>帶入上一筆</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 表單主體：包含可捲動細項填寫區與固定常駐底部按鈕列 */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* 捲動表單細項內容區 */}
          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
            {/* 收支類型標籤切換 */}
          <div>
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-800/80 rounded-xl">
              {isStockLedger ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('stock_buy')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'stock_buy'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    股票買進
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('stock_sell')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'stock_sell'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    股票賣出
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('dividend')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'dividend'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    現金股息
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    其他費用
                  </button>
                </>
              ) : isFuturesLedger ? (
                <>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('stock_buy')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      type === 'stock_buy'
                        ? 'bg-blue-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📈 買進建倉
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('stock_sell')}
                    className={`py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                      type === 'stock_sell'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    📉 賣出平倉
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'income'
                        ? 'bg-amber-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ 其他收入
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ⚡ 其他費用
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('expense')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'expense'
                        ? 'bg-rose-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    支出
                  </button>
                  <button
                    type="button"
                    onClick={() => handleTypeChange('income')}
                    className={`py-2 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                      type === 'income'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    收入
                  </button>
                </>
              )}
            </div>
          </div>

          {/* 金額輸入 */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              {isFuturesLedger ? '金額 (平倉損益 / 收支, ' + activeLedger.currency + ')' : '金額 (' + activeLedger.currency + ')'}
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-xl font-bold text-slate-400">
                {activeLedger.currency}
              </span>
              <input
                type="number"
                step="any"
                required
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full pl-14 pr-4 py-3 bg-slate-800/80 border border-slate-700 focus:border-emerald-500 rounded-xl text-2xl font-bold text-white tracking-wide focus:outline-none transition-colors"
                autoFocus={!editTransaction}
              />
            </div>
            {/* 歷史常用金額標籤 */}
            {recentHistory.amounts.length > 0 && (
              <div className="mt-2 flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                  <History size={11} className="text-slate-400" /> 歷史常用:
                </span>
                {recentHistory.amounts.map((amt) => (
                  <button
                    key={amt}
                    type="button"
                    onClick={() => setAmount(amt.toString())}
                    className={`px-2 py-0.5 text-xs rounded-lg border transition-all cursor-pointer ${
                      amount === amt.toString()
                        ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium'
                        : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                    }`}
                  >
                    ${amt}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* 一般生活帳本：商品名稱 / 消費品項 / 店家 (選填) */}
          {!isStockLedger && !isFuturesLedger && (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-medium text-slate-400">
                  商品品項 / 消費店家 (選填)
                </label>
                {stockSymbol && (
                  <button
                    type="button"
                    onClick={() => setStockSymbol('')}
                    className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                  >
                    清除
                  </button>
                )}
              </div>
              <input
                type="text"
                list="recent-general-items-list"
                placeholder="例如：星巴克、全聯、加油、好市多、午餐便當、高鐵票..."
                value={stockSymbol}
                onChange={(e) => setStockSymbol(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
              <datalist id="recent-general-items-list">
                {recentHistory.symbols.map((item) => (
                  <option key={item} value={item} />
                ))}
              </datalist>

              {/* 歷史輸入項目快捷標籤 */}
              {recentHistory.symbols.length > 0 && (
                <div className="mt-2">
                  <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                    <div className="flex items-center gap-1">
                      <History size={11} className="text-emerald-400" />
                      <span>歷史品項 / 店家 (點選快速填入)：</span>
                    </div>
                    <span className="text-[10px] text-slate-500 font-normal">
                      (已依「{activeLedger.name}」分開記錄)
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto scrollbar-thin">
                    {recentHistory.symbols.slice(0, 8).map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => setStockSymbol(item)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer truncate max-w-[150px] ${
                          stockSymbol === item
                            ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title={item}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* 若為股票交易類型 (買進/賣出/股息)，提供股票專屬欄位 */}
          {!isFuturesLedger && (type === 'stock_buy' || type === 'stock_sell' || type === 'dividend') && (
            <div className="p-3 bg-slate-800/40 border border-slate-700/60 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5">
                  📈 投資標的細節
                </span>
                {(type === 'stock_buy' || type === 'stock_sell') && (
                  <button
                    type="button"
                    onClick={handleCalculateStockTotal}
                    className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20 cursor-pointer"
                  >
                    <Calculator size={12} />
                    自動試算總額
                  </button>
                )}
              </div>

              {/* 目前在庫持股 / 尚未賣出標的快速選擇 */}
              {openHoldings.length > 0 && (
                <div className="p-2.5 bg-blue-500/10 border border-blue-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-blue-300 flex items-center gap-1.5">
                      <Package size={13} className="text-blue-400" />
                      📦 在庫持股 / 未賣出標的 ({openHoldings.length}):
                    </span>
                    {type === 'stock_sell' && (
                      <span className="text-[10px] text-emerald-400 font-medium">點選帶入庫存股數與成本</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                    {openHoldings.map((h) => (
                      <button
                        key={h.symbol}
                        type="button"
                        onClick={() => handleSelectHolding(h)}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          stockSymbol === h.symbol
                            ? 'bg-blue-500/30 border-blue-400 text-white font-semibold shadow-sm'
                            : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 hover:text-white'
                        }`}
                      >
                        <span className="font-medium">{h.symbol}</span>
                        {h.remainingShares > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-blue-500/20 text-blue-300 font-mono">
                            {h.remainingShares.toLocaleString()}股
                            {h.avgPrice > 0 ? ` @${h.avgPrice}` : ''}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">股票代號 / 標的名稱</label>
                <input
                  type="text"
                  list="recent-stock-symbols-list"
                  placeholder="例如：2330 台積電 或 0050"
                  value={stockSymbol}
                  onChange={(e) => setStockSymbol(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                />
                <datalist id="recent-stock-symbols-list">
                  {recentHistory.symbols.map((sym) => (
                    <option key={sym} value={sym} />
                  ))}
                </datalist>

                {recentHistory.symbols.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <History size={11} className="text-blue-400" /> 歷史標的:
                    </span>
                    {recentHistory.symbols.slice(0, 6).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => setStockSymbol(sym)}
                        className={`px-2 py-0.5 text-[11px] rounded-lg border transition-all cursor-pointer truncate max-w-[140px] ${
                          stockSymbol === sym
                            ? 'bg-blue-500/20 border-blue-500 text-blue-300 font-medium'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title={sym}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {type !== 'dividend' && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">股數</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="如 1000 或 50"
                      value={shares}
                      onChange={(e) => {
                        setShares(e.target.value)
                        handleStockSharesOrPriceChange(e.target.value, pricePerShare)
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">成交單價</label>
                    <input
                      type="number"
                      step="any"
                      placeholder="如 950.0"
                      value={pricePerShare}
                      onChange={(e) => {
                        setPricePerShare(e.target.value)
                        handleStockSharesOrPriceChange(shares, e.target.value)
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-400">
                      券商手續費
                    </label>
                    {isFeeUserModified ? (
                      <button
                        type="button"
                        onClick={handleResetFeeToLedgerDefault}
                        className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-0.5 cursor-pointer"
                        title="恢復依帳本設定公式試算"
                      >
                        <RefreshCw size={10} />
                        恢復帳本預設
                      </button>
                    ) : (
                      <span className="text-[10px] text-blue-400 font-medium truncate max-w-[140px]" title={formatFeeConfigSummary(activeLedger.feeConfig, 'stock')}>
                        {formatFeeConfigSummary(activeLedger.feeConfig, 'stock')}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="可自行修改手續費"
                    value={fee}
                    onChange={(e) => {
                      setFee(e.target.value)
                      setIsFeeUserModified(true)
                      handleStockSharesOrPriceChange(shares, pricePerShare, e.target.value, tax)
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                  />
                  {isFeeUserModified && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ✎ 已自行修改手續費
                    </span>
                  )}
                </div>
                {type === 'stock_sell' && (
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-[11px] text-slate-400">
                        證券交易稅 <span className="text-emerald-400 font-medium">(0.3%)</span>
                      </label>
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="預設 0.3% (可自行修改)"
                      value={tax}
                      onChange={(e) => {
                        setTax(e.target.value)
                        setIsTaxUserModified(true)
                        handleStockSharesOrPriceChange(shares, pricePerShare, fee, e.target.value)
                      }}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 若為期貨帳本，提供期貨專屬契約與費用欄位 */}
          {isFuturesLedger && (
            <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  ⚡ 期貨契約交易明細
                </span>
                <div className="flex items-center gap-2">
                  {(type === 'stock_buy' || type === 'stock_sell') && (
                    <button
                      type="button"
                      onClick={handleCalculateFuturesTotal}
                      className="text-[11px] text-amber-300 hover:text-amber-200 flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20 cursor-pointer"
                    >
                      <Calculator size={12} />
                      自動試算總額
                    </button>
                  )}
                  <span className="text-[10px] text-amber-300/80 bg-amber-500/10 px-2 py-0.5 rounded" title={formatFeeConfigSummary(activeLedger.feeConfig, 'futures')}>
                    {formatFeeConfigSummary(activeLedger.feeConfig, 'futures')}
                  </span>
                </div>
              </div>

              {/* 未平倉部位 / 活躍契約快速選擇 */}
              {openHoldings.length > 0 && (
                <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <Package size={13} className="text-amber-400" />
                      ⚡ 未平倉部位 / 活躍契約 ({openHoldings.length}):
                    </span>
                    {type === 'stock_sell' && (
                      <span className="text-[10px] text-amber-300 font-medium">點選帶入未平倉口數與成本點位</span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto scrollbar-thin">
                    {openHoldings.map((h) => (
                      <button
                        key={h.symbol}
                        type="button"
                        onClick={() => {
                          setStockSymbol(h.symbol)
                          if (h.remainingShares > 0) {
                            setShares(h.remainingShares.toString())
                            if (h.avgPrice > 0) {
                              setPricePerShare(h.avgPrice.toString())
                            }
                            handleFuturesSharesOrPriceChange(
                              h.remainingShares.toString(),
                              h.avgPrice > 0 ? h.avgPrice.toString() : pricePerShare
                            )
                          }
                        }}
                        className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer flex items-center gap-1.5 ${
                          stockSymbol === h.symbol
                            ? 'bg-amber-500/30 border-amber-400 text-white font-semibold shadow-sm'
                            : 'bg-slate-800/90 hover:bg-slate-700/90 border-slate-700 text-slate-200 hover:text-white'
                        }`}
                      >
                        <span className="font-medium">{h.symbol}</span>
                        {h.remainingShares > 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                            {h.remainingShares}口未平倉
                            {h.avgPrice > 0 ? ` @${h.avgPrice}` : ''}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">期貨商品 / 契約名稱</label>
                <input
                  type="text"
                  list="recent-futures-symbols-list"
                  placeholder="例如：微型臺指期貨、小型臺指、臺指期貨 或 個股期"
                  value={stockSymbol}
                  onChange={(e) => {
                    setStockSymbol(e.target.value)
                    const val = e.target.value
                    if (val.includes('微')) {
                      setFuturesMultiplier(10)
                      handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, tax, 10)
                    } else if (val.includes('小台') || val.includes('小型')) {
                      setFuturesMultiplier(50)
                      handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, tax, 50)
                    } else if (val.includes('台指') || val.includes('大台')) {
                      setFuturesMultiplier(200)
                      handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, tax, 200)
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                />
                <datalist id="recent-futures-symbols-list">
                  {recentHistory.symbols.map((sym) => (
                    <option key={sym} value={sym} />
                  ))}
                  <option value="微型臺指期貨" />
                  <option value="小型臺指期貨" />
                  <option value="臺指期貨" />
                  <option value="電子期貨" />
                  <option value="金融期貨" />
                  <option value="小型電子期貨" />
                </datalist>

                {recentHistory.symbols.length > 0 && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-slate-400 flex items-center gap-1">
                      <History size={11} className="text-amber-400" /> 歷史契約:
                    </span>
                    {recentHistory.symbols.slice(0, 6).map((sym) => (
                      <button
                        key={sym}
                        type="button"
                        onClick={() => {
                          setStockSymbol(sym)
                          if (sym.includes('微')) {
                            setFuturesMultiplier(10)
                            handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, tax, 10)
                          } else if (sym.includes('小台') || sym.includes('小型')) {
                            setFuturesMultiplier(50)
                            handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, tax, 50)
                          } else if (sym.includes('台指') || sym.includes('大台')) {
                            setFuturesMultiplier(200)
                            handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, tax, 200)
                          }
                        }}
                        className={`px-2 py-0.5 text-[11px] rounded-lg border transition-all cursor-pointer truncate max-w-[140px] ${
                          stockSymbol === sym
                            ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-medium'
                            : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                        }`}
                        title={sym}
                      >
                        {sym}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 點數乘數選擇 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-[11px] text-slate-400">契約乘數 (每點點值 / 模式)</label>
                  <span className="text-[10px] text-amber-400 font-medium">
                    {futuresMultiplier === 1
                      ? '直接金額模式'
                      : `每點 ${futuresMultiplier} 元`}
                  </span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[
                    { label: '直接金額/保證金', mult: 1 },
                    { label: '微台 (10元/點)', mult: 10 },
                    { label: '小台 (50元/點)', mult: 50 },
                    { label: '大台 (200元/點)', mult: 200 },
                  ].map((m) => (
                    <button
                      key={m.mult}
                      type="button"
                      onClick={() => {
                        setFuturesMultiplier(m.mult)
                        handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, tax, m.mult)
                      }}
                      className={`py-1 px-1.5 text-[11px] rounded-lg border transition-all cursor-pointer truncate text-center ${
                        futuresMultiplier === m.mult
                          ? 'bg-amber-500/30 border-amber-400 text-amber-200 font-semibold shadow-sm'
                          : 'bg-slate-800/80 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                      title={m.label}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {type === 'stock_buy' ? '建倉口數' : type === 'stock_sell' ? '平倉口數' : '口數 (選填)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="如 1 或 2"
                    value={shares}
                    onChange={(e) => {
                      setShares(e.target.value)
                      handleFuturesSharesOrPriceChange(e.target.value, pricePerShare)
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {futuresMultiplier > 1 ? '成交點數 (點)' : '每口金額 / 單價 (NT$)'}
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder={futuresMultiplier > 1 ? '如 22500' : '如 1000 或 2500'}
                    value={pricePerShare}
                    onChange={(e) => {
                      setPricePerShare(e.target.value)
                      handleFuturesSharesOrPriceChange(shares, e.target.value)
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-400">
                      期貨手續費
                    </label>
                    {isFeeUserModified ? (
                      <button
                        type="button"
                        onClick={handleResetFeeToLedgerDefault}
                        className="text-[10px] text-amber-400 hover:text-amber-300 flex items-center gap-0.5 cursor-pointer"
                        title="恢復依帳本設定公式試算"
                      >
                        <RefreshCw size={10} />
                        恢復帳本預設
                      </button>
                    ) : (
                      <span className="text-[10px] text-amber-400 font-medium truncate max-w-[120px]" title={formatFeeConfigSummary(activeLedger.feeConfig, 'futures')}>
                        {formatFeeConfigSummary(activeLedger.feeConfig, 'futures')}
                      </span>
                    )}
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="可自行修改手續費"
                    value={fee}
                    onChange={(e) => {
                      setFee(e.target.value)
                      setIsFeeUserModified(true)
                      handleFuturesSharesOrPriceChange(shares, pricePerShare, e.target.value, tax)
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  {isFeeUserModified && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ✎ 已自行修改手續費
                    </span>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] text-slate-400">
                      期貨交易稅 (期交稅)
                    </label>
                  </div>
                  <input
                    type="number"
                    step="any"
                    placeholder="期交稅 (十萬分之二)"
                    value={tax}
                    onChange={(e) => {
                      setTax(e.target.value)
                      setIsTaxUserModified(true)
                      handleFuturesSharesOrPriceChange(shares, pricePerShare, fee, e.target.value)
                    }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  {isTaxUserModified && (
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      ✎ 已自行修改期交稅
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* 分類選擇器 */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-slate-400">選擇分類</label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsCatManagerOpen(true)}
                  className="text-xs text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-medium transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-slate-800 border border-slate-700/60 shadow-sm"
                  title="自訂名稱、色彩、圖示與排序順序"
                >
                  <SlidersHorizontal size={13} />
                  <span>管理分類 (排序/編輯)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsAddingCategory(!isAddingCategory)}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium transition-colors cursor-pointer px-2 py-0.5 rounded-lg hover:bg-slate-800"
                >
                  <Plus size={13} />
                  {isAddingCategory ? '收起' : '快速新增'}
                </button>
              </div>
            </div>

            {/* 新增分類面板 */}
            {isAddingCategory && (
              <div className="mb-3.5 p-3.5 bg-slate-800/80 border border-emerald-500/40 rounded-2xl space-y-3 shadow-lg animate-in fade-in slide-in-from-top-2 duration-150">
                <div className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
                  <Plus size={14} /> 建立新的
                  {isFuturesLedger
                    ? type === 'income'
                      ? '期貨獲利'
                      : '期貨虧損/支出'
                    : type === 'income'
                    ? '收入'
                    : type === 'stock_buy' || type === 'stock_sell' || type === 'dividend'
                    ? '股票'
                    : '支出'}
                  分類
                </div>

                {/* 名稱輸入 */}
                <div>
                  <input
                    type="text"
                    placeholder={
                      isFuturesLedger
                        ? '輸入分類名稱 (例如：夜盤平倉、微台當沖、選擇權權利金...)'
                        : '輸入分類名稱 (例如：寵物用品、下午茶、保險...)'
                    }
                    value={newCatName}
                    onChange={(e) => setNewCatName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddNewCategory()
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                    autoFocus
                  />
                </div>

                {/* 圖示選取 */}
                <div>
                  <div className="text-[11px] text-slate-400 mb-1.5">選擇代表圖示</div>
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                    {AVAILABLE_ICONS.map((iconName) => (
                      <button
                        key={iconName}
                        type="button"
                        onClick={() => setNewCatIcon(iconName)}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                          newCatIcon === iconName
                            ? 'border-emerald-500 bg-emerald-500/20 text-white'
                            : 'border-slate-700/80 bg-slate-900/80 text-slate-400 hover:text-white'
                        }`}
                      >
                        <DynamicIcon name={iconName} size={15} />
                      </button>
                    ))}
                  </div>
                </div>

                {/* 顏色選取 */}
                <div>
                  <div className="text-[11px] text-slate-400 mb-1.5">選擇主題色彩</div>
                  <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {AVAILABLE_COLORS.map((col) => (
                      <button
                        key={col}
                        type="button"
                        onClick={() => setNewCatColor(col)}
                        className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                          newCatColor === col
                            ? 'ring-2 ring-white scale-110 shadow-sm'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{ backgroundColor: col }}
                      >
                        {newCatColor === col && <Check size={12} className="text-white" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 按鈕組 */}
                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddingCategory(false)
                      setNewCatName('')
                    }}
                    className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                  >
                    取消
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAddNewCategory()}
                    disabled={!newCatName.trim()}
                    className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 transition-all cursor-pointer shadow-sm active:scale-95"
                  >
                    確定建立
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {categoryOptions.map((cat) => {
                const isSelected = category === cat.name
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategory(cat.name)}
                    className={`flex items-center gap-2 p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/15 text-white shadow-sm'
                        : 'border-slate-800 bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    <div
                      className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <DynamicIcon name={cat.icon} size={14} />
                    </div>
                    <span className="text-xs font-medium truncate">{cat.name}</span>
                  </button>
                )
              })}

              {/* 網格最後也放置「管理分類」捷徑按鈕 */}
              <button
                type="button"
                onClick={() => setIsCatManagerOpen(true)}
                className="flex items-center justify-center gap-1.5 p-2.5 rounded-xl border border-dashed border-slate-700 hover:border-emerald-500/60 bg-slate-800/30 hover:bg-slate-800/60 text-slate-400 hover:text-emerald-400 text-xs font-medium transition-all cursor-pointer"
                title="管理分類 (自訂/排序/編輯)"
              >
                <SlidersHorizontal size={14} />
                <span>管理分類</span>
              </button>
            </div>
          </div>

          {/* 日期與時間 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                <Calendar size={13} /> 日期
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5 flex items-center gap-1">
                <Clock size={13} /> 時間
              </label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 帳戶選擇 (依當前帳本獨立記錄於 localStorage) */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-1.5 text-xs font-medium text-slate-300">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>支付 / 收款帳戶</span>
                <span className="text-[10px] text-slate-500 font-normal hidden xs:inline">
                  (已依「{activeLedger.name}」分開記錄)
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingCustomAccount(!isAddingCustomAccount)}
                  className="text-[11px] text-emerald-400 hover:text-emerald-300 flex items-center gap-0.5 cursor-pointer font-medium"
                >
                  <Plus className="w-3 h-3" />
                  {isAddingCustomAccount ? '收起' : '自訂錢包'}
                </button>
                <button
                  type="button"
                  onClick={handleResetAccounts}
                  title="重設此帳本的預設錢包清單"
                  className="text-[11px] text-slate-500 hover:text-slate-300 flex items-center gap-0.5 cursor-pointer"
                >
                  <RotateCcw className="w-2.5 h-2.5" />
                  重設
                </button>
              </div>
            </div>

            {/* 新增自訂錢包輸入列 */}
            {isAddingCustomAccount && (
              <div className="flex items-center gap-2 p-2 bg-slate-800/90 border border-emerald-500/30 rounded-xl animate-in fade-in duration-150">
                <input
                  type="text"
                  value={newAccountInput}
                  onChange={(e) => setNewAccountInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleAddAccount()
                    }
                  }}
                  placeholder="輸入新錢包名稱 (如: 國泰世華、街口)..."
                  className="flex-1 px-2.5 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={handleAddAccount}
                  className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium shrink-0 cursor-pointer transition-colors"
                >
                  加入並使用
                </button>
              </div>
            )}

            {/* 常用錢包快捷標籤群 (單擊秒選) */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {ledgerAccounts.map((acc) => {
                const isSelected = account === acc
                return (
                  <div
                    key={acc}
                    onClick={() => setAccount(acc)}
                    className={`group inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer select-none ${
                      isSelected
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 shadow-sm shadow-emerald-500/10'
                        : 'bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 border border-slate-700/80'
                    }`}
                  >
                    {isSelected && <Check className="w-3 h-3 text-emerald-400 shrink-0" />}
                    <span>{acc}</span>
                    {ledgerAccounts.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveAccount(e, acc)}
                        title="從常用清單中移除"
                        className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-0.5 rounded transition-opacity ml-0.5"
                      >
                        <X className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                )
              })}
            </div>

            {/* 備用下拉選單 */}
            <select
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/80 border border-slate-700 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              {Array.from(new Set([account, ...ledgerAccounts])).filter(Boolean).map((acc) => (
                <option key={acc} value={acc}>
                  {acc}
                </option>
              ))}
            </select>
          </div>

          {/* 備註與標籤 */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-medium text-slate-400">備註說明 (選填)</label>
              {notes && (
                <button
                  type="button"
                  onClick={() => setNotes('')}
                  className="text-[11px] text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  清除
                </button>
              )}
            </div>
            <input
              type="text"
              list="recent-notes-list"
              placeholder={
                isFuturesLedger
                  ? '例如：微台多單 23300 平倉 23400、波段停損等'
                  : isStockLedger
                  ? '例如：定期定額、除權息、現股當沖等'
                  : '例如：朋友聚餐、年費、零股定期...'
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2.5 bg-slate-800/80 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            />
            <datalist id="recent-notes-list">
              {recentHistory.notes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>

            {/* 歷史輸入標籤群 */}
            {recentHistory.notes.length > 0 && (
              <div className="mt-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1">
                  <div className="flex items-center gap-1">
                    <History size={12} className="text-emerald-400" />
                    <span>歷史備註 (點選快速填入)：</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-normal">
                    (已依「{activeLedger.name}」分開記錄)
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto scrollbar-thin">
                  {recentHistory.notes.slice(0, 10).map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => setNotes(item)}
                      className={`px-2.5 py-1 text-xs rounded-lg border transition-all cursor-pointer truncate max-w-[160px] ${
                        notes === item
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 font-medium'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300 hover:text-white'
                      }`}
                      title={item}
                    >
                      {item}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          </div>

          {/* 固定底部按鈕區 (常駐可見，不隨表單細項捲動) */}
          <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-sm shrink-0 flex items-center gap-2 shadow-lg">
            {editTransaction && onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm('確定要刪除這筆記帳記錄嗎？')) {
                    onDelete(editTransaction.id)
                    onClose()
                  }
                }}
                className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 transition-colors flex items-center justify-center cursor-pointer"
                title="刪除"
              >
                <Trash2 size={18} />
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-center active:scale-[0.99]"
            >
              {editTransaction ? '儲存變更' : '確認記帳'}
            </button>
          </div>
        </form>
      </div>

      {/* 分類項目管理彈窗 (編輯/刪除/排序) */}
      <CategoryManagerModal
        isOpen={isCatManagerOpen}
        onClose={() => setIsCatManagerOpen(false)}
        initialGroupKey={currentCategoryGroupKey}
        onCategoriesChanged={() => setCategoryRefreshKey((prev) => prev + 1)}
      />
    </div>
  )
}
