import * as XLSX from 'xlsx'
import type { Ledger, Transaction, TransactionType } from '../types'

// 標準化日期字串為 YYYY-MM-DD
export const normalizeDate = (rawDate: string): string => {
  if (!rawDate) return new Date().toISOString().split('T')[0]
  const clean = rawDate.replace(/\//g, '-').trim()
  const parts = clean.split('-')

  if (parts.length === 3) {
    let year = parts[0]
    let month = parts[1]
    let day = parts[2]

    // 處理 MM-DD-YYYY 格式
    if (year.length <= 2 && day.length === 4) {
      const temp = year
      year = day
      day = temp
    }

    if (year.length === 2) {
      year = `20${year}`
    }
    month = month.padStart(2, '0')
    day = day.padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  return clean
}

// 映射一般文字類型為 TransactionType
export const mapTransactionType = (rawType: string): TransactionType => {
  const lower = (rawType || '').toLowerCase().trim()
  if (lower.includes('收') || lower === 'income') return 'income'
  if (lower.includes('買') || lower.includes('buy') || lower === 'stock_buy') return 'stock_buy'
  if (lower.includes('賣') || lower.includes('sell') || lower === 'stock_sell') return 'stock_sell'
  if (lower.includes('股息') || lower.includes('股利') || lower.includes('dividend')) return 'dividend'
  return 'expense'
}

// 標準 RFC 4180 CSV 狀態機解析器 (支援引號內跨行換行、雙引號跳脫)
export const parseCSVToRows = (csvText: string): string[][] => {
  const clean = csvText.replace(/^\uFEFF/, '')
  const rows: string[][] = []
  let currentRow: string[] = []
  let currentCell = ''
  let inQuotes = false

  for (let i = 0; i < clean.length; i++) {
    const char = clean[i]
    const nextChar = clean[i + 1]

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentCell += '"'
        i++ // 跳過跳脫的連續雙引號
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      currentRow.push(currentCell.trim())
      currentCell = ''
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++
      }
      currentRow.push(currentCell.trim())
      if (currentRow.some((c) => c.length > 0)) {
        rows.push(currentRow)
      }
      currentRow = []
      currentCell = ''
    } else {
      currentCell += char
    }
  }

  if (currentCell.length > 0 || currentRow.length > 0) {
    currentRow.push(currentCell.trim())
    if (currentRow.some((c) => c.length > 0)) {
      rows.push(currentRow)
    }
  }

  return rows
}

// 簡易單行 CSV 解析器 (保留向下相容)
export const parseCSVLine = (text: string): string[] => {
  const rows = parseCSVToRows(text)
  return rows[0] || []
}

// 匯出單一帳本 CSV
export const exportLedgerToCSV = (ledger: Ledger, transactions: Transaction[]): void => {
  const filtered = transactions.filter((t) => t.ledgerId === ledger.id)

  const headers = [
    '日期',
    '時間',
    '收支類型',
    '分類',
    '金額',
    '帳戶',
    '標的代號',
    '股數',
    '每股單價',
    '手續費',
    '證券稅',
    '備註',
  ]

  const typeNameMap: Record<string, string> = {
    expense: '支出',
    income: '收入',
    stock_buy: '股票買進',
    stock_sell: '股票賣出',
    dividend: '現金股息',
  }

  const rows = filtered.map((t) => [
    t.date,
    t.time || '',
    typeNameMap[t.type] || t.type,
    t.category,
    t.amount.toString(),
    `"${(t.account || '').replace(/"/g, '""')}"`,
    `"${(t.stockSymbol || '').replace(/"/g, '""')}"`,
    t.shares ? t.shares.toString() : '',
    t.pricePerShare ? t.pricePerShare.toString() : '',
    t.fee ? t.fee.toString() : '',
    t.tax ? t.tax.toString() : '',
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `${ledger.name}_帳目明細_${dateStr}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// 匯出全部帳本所有明細 CSV
export const exportAllLedgersToCSV = (ledgers: Ledger[], transactions: Transaction[]): void => {
  const ledgerMap = new Map<string, string>()
  ledgers.forEach((l) => ledgerMap.set(l.id, l.name))

  const headers = [
    '帳本名稱',
    '日期',
    '時間',
    '收支類型',
    '分類',
    '金額',
    '帳戶',
    '標的代號',
    '股數',
    '每股單價',
    '手續費',
    '證券稅',
    '備註',
  ]

  const typeNameMap: Record<string, string> = {
    expense: '支出',
    income: '收入',
    stock_buy: '股票買進',
    stock_sell: '股票賣出',
    dividend: '現金股息',
  }

  const rows = transactions.map((t) => [
    `"${(ledgerMap.get(t.ledgerId) || '未知帳本').replace(/"/g, '""')}"`,
    t.date,
    t.time || '',
    typeNameMap[t.type] || t.type,
    t.category,
    t.amount.toString(),
    `"${(t.account || '').replace(/"/g, '""')}"`,
    `"${(t.stockSymbol || '').replace(/"/g, '""')}"`,
    t.shares ? t.shares.toString() : '',
    t.pricePerShare ? t.pricePerShare.toString() : '',
    t.fee ? t.fee.toString() : '',
    t.tax ? t.tax.toString() : '',
    `"${(t.notes || '').replace(/"/g, '""')}"`,
  ])

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const dateStr = new Date().toISOString().split('T')[0]
  a.href = url
  a.download = `豐收記帳_全部明細備份_${dateStr}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface ImportResult {
  formatType: 'stock_statement' | 'futures_statement' | 'standard'
  targetLedgerName: string
  suggestedLedgerType: 'standard' | 'stock' | 'futures'
  transactions: Transaction[]
  totalRows: number
  successCount: number
  failedCount: number
  buyCount?: number
  sellCount?: number
  profitCount?: number
  lossCount?: number
  totalNet?: number
}

// 智慧解析二維資料陣列 (無論來自 Excel 或 CSV)
export const parseRawTableData = (
  rows: (string | number | null | undefined)[][],
  activeLedgerId: string,
  ledgers: Ledger[],
  fileName?: string
): ImportResult => {
  if (!rows || rows.length < 2) {
    throw new Error('試算表內容為空或無足夠資料列')
  }

  // 取得表頭
  const header = (rows[0] || []).map((c) => String(c || '').trim())
  const headerLower = header.map((c) => c.toLowerCase())

  // 1. 檢查是否為「券商期貨平倉對帳單」格式 (包含 平倉日, 商品, 淨損益/平倉損益)
  const isFuturesStatement =
    header.some((h) => h.includes('平倉日')) &&
    header.some((h) => h.includes('商品')) &&
    header.some((h) => h.includes('損益'))

  if (isFuturesStatement) {
    // 優先尋找名稱包含期貨的帳本，次之尋找股票投資帳本
    const futuresLedger =
      ledgers.find((l) => l.name.includes('期貨')) ||
      ledgers.find((l) => l.type === 'stock') ||
      ledgers.find((l) => l.id === activeLedgerId) ||
      ledgers[0]

    const idxDate = header.findIndex((h) => h.includes('平倉日'))
    const idxSymbol = header.findIndex((h) => h.includes('商品'))
    const idxShares = header.findIndex((h) => h.includes('平倉數') || h.includes('口數'))
    const idxGross = header.findIndex((h) => h.includes('平倉損益'))
    const idxNet = header.findIndex((h) => h.includes('淨損益'))
    const idxFee = header.findIndex((h) => h.includes('手續費'))
    const idxTax = header.findIndex((h) => h.includes('交易稅'))

    const parsedTx: Transaction[] = []
    let failedCount = 0
    let profitCount = 0
    let lossCount = 0
    let totalNet = 0

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const firstCell = String(row[0] || '').trim()
      if (!firstCell || firstCell === '合計' || firstCell.includes('總計')) {
        continue
      }

      try {
        const rawDate = String(row[idxDate] || '').trim()
        const date = normalizeDate(rawDate)
        const symbol = String(row[idxSymbol] || '').trim()

        const shares = parseFloat(String(row[idxShares] || '1').replace(/,/g, '')) || 1
        const gross = parseFloat(String(row[idxGross] || '0').replace(/,/g, '')) || 0
        const fee = parseFloat(String(row[idxFee] || '0').replace(/,/g, '')) || 0
        const tax = parseFloat(String(row[idxTax] || '0').replace(/,/g, '')) || 0

        // 淨損益（若無淨損益欄則以毛損益 - 費用）
        let net = idxNet !== -1 ? parseFloat(String(row[idxNet] || '0').replace(/,/g, '')) : gross - fee - tax
        if (isNaN(net)) net = gross - fee - tax

        totalNet += net
        const isProfit = net >= 0
        if (isProfit) profitCount++
        else lossCount++

        const tx: Transaction = {
          id: `tx-fut-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ledgerId: futuresLedger.id,
          type: isProfit ? 'income' : 'expense',
          amount: Math.round(Math.abs(net)),
          category: isProfit ? '平倉獲利' : '平倉虧損',
          date,
          time: '13:45',
          account: '期貨保證金專戶',
          stockSymbol: symbol,
          shares,
          fee,
          tax,
          notes: `期貨平倉 ${isProfit ? '獲利' : '虧損'} (毛利: ${gross.toLocaleString()})`,
        }

        parsedTx.push(tx)
      } catch {
        failedCount++
      }
    }

    const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '').trim() : ''

    return {
      formatType: 'futures_statement',
      targetLedgerName: baseName || futuresLedger.name,
      suggestedLedgerType: 'futures',
      transactions: parsedTx,
      totalRows: rows.length - 1,
      successCount: parsedTx.length,
      failedCount,
      profitCount,
      lossCount,
      totalNet,
    }
  }

  // 2. 檢查是否為「券商期貨成交回報/成交明細」格式 (例如包含 成交日期, 商品, 買賣, 倉別)
  const isFuturesTradeReport =
    (header.some((h) => h.includes('成交日')) || header.some((h) => h.includes('日期'))) &&
    header.some((h) => h.includes('商品')) &&
    header.some((h) => h.includes('買賣')) &&
    (header.some((h) => h.includes('倉別')) ||
      (fileName && fileName.includes('期貨')) ||
      rows.slice(1, 5).some((r) => String(r[2] || '').includes('期貨') || String(r[2] || '').includes('小型')))

  if (isFuturesTradeReport) {
    const futuresLedger =
      ledgers.find((l) => l.type === 'futures') ||
      ledgers.find((l) => l.name.includes('期貨')) ||
      ledgers.find((l) => l.id === activeLedgerId) ||
      ledgers[0]

    const idxDate = header.findIndex((h) => h.includes('成交日') || h.includes('日期'))
    const idxTime = header.findIndex((h) => h.includes('時間'))
    const idxSymbol = header.findIndex((h) => h.includes('商品'))
    const idxAction = header.findIndex((h) => h.includes('買賣'))
    const idxPosition = header.findIndex((h) => h.includes('倉別'))
    const idxPrice = header.findIndex((h) => h.includes('成交均價') || h.includes('均價') || h.includes('成交價') || h.includes('價格'))
    const idxShares = header.findIndex((h) => h.includes('成交數量') || h.includes('數量') || h.includes('口數'))
    const idxOrder = header.findIndex((h) => h.includes('委託書號') || h.includes('委託') || h.includes('單號'))

    const getMultiplier = (sym: string): number => {
      const s = sym.toLowerCase()
      if (s.includes('微台') || s.includes('微型台指')) return 10
      if (s.includes('小台') || s.includes('小型台指')) return 50
      if (s.includes('台指') || s.includes('大台')) return 200
      if (s.includes('小型') || s.includes('小')) return 100
      if (s.includes('期貨') || s.includes('期')) return 2000
      return 1
    }

    const parsedTx: Transaction[] = []
    let failedCount = 0
    let buyCount = 0
    let sellCount = 0
    let totalNet = 0

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const firstCell = String(row[0] || '').trim()
      if (!firstCell || firstCell === '合計' || firstCell.includes('總計')) {
        continue
      }

      try {
        const rawDate = String(row[idxDate] || '').trim()
        const date = normalizeDate(rawDate)
        const time = idxTime !== -1 && row[idxTime] ? String(row[idxTime]).trim().substring(0, 5) : '13:30'
        const symbol = String(row[idxSymbol] || '').trim()
        const action = String(row[idxAction] || '').trim()
        const position = idxPosition !== -1 ? String(row[idxPosition] || '').trim() : ''
        const price = parseFloat(String(row[idxPrice] || '0').replace(/,/g, '')) || 0
        const shares = parseFloat(String(row[idxShares] || '1').replace(/,/g, '')) || 1
        const orderNo = idxOrder !== -1 ? String(row[idxOrder] || '').trim() : ''

        const isBuy = action.includes('買')
        const mult = getMultiplier(symbol)
        const amount = Math.round(price * shares * mult)
        const fee = 20 * shares

        if (isBuy) {
          buyCount++
          totalNet -= amount
        } else {
          sellCount++
          totalNet += amount
        }

        const category = position ? `${position}${isBuy ? '買進' : '賣出'}` : isBuy ? '期貨買進' : '期貨賣出'
        const notes = `${position ? position + ' ' : ''}@ ${price} (單號: ${orderNo || ''})`

        const tx: Transaction = {
          id: `tx-fut-rep-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
          ledgerId: futuresLedger.id,
          type: isBuy ? 'expense' : 'income',
          amount,
          category,
          date,
          time,
          account: '期貨保證金專戶',
          stockSymbol: symbol,
          shares,
          pricePerShare: price,
          fee,
          notes,
        }

        parsedTx.push(tx)
      } catch {
        failedCount++
      }
    }

    const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '').trim() : ''

    return {
      formatType: 'futures_statement',
      targetLedgerName: baseName || futuresLedger.name,
      suggestedLedgerType: 'futures',
      transactions: parsedTx,
      totalRows: rows.length - 1,
      successCount: parsedTx.length,
      failedCount,
      buyCount,
      sellCount,
      totalNet,
      profitCount: totalNet >= 0 ? sellCount : 0,
      lossCount: totalNet < 0 ? buyCount : 0,
    }
  }

  // 3. 檢查是否為「券商證券股票對帳單」格式 (如包含 成交日, 商品, 買賣)
  const isStockStatement =
    header.some((h) => h.includes('成交日')) &&
    header.some((h) => h.includes('商品')) &&
    header.some((h) => h.includes('買賣'))

  if (isStockStatement) {
    // 優先尋找股票帳本
    const stockLedger = ledgers.find((l) => l.type === 'stock') || ledgers.find((l) => l.id === activeLedgerId) || ledgers[0]

    const idxDate = header.findIndex((h) => h.includes('成交日'))
    const idxSymbol = header.findIndex((h) => h.includes('商品'))
    const idxAction = header.findIndex((h) => h.includes('買賣'))
    const idxShares = header.findIndex((h) => h.includes('數量'))
    const idxPrice = header.findIndex((h) => h.includes('成交價'))
    const idxPay = header.findIndex((h) => h.includes('應付金額'))
    const idxReceive = header.findIndex((h) => h.includes('應收金額'))
    const idxPriceTotal = header.findIndex((h) => h.includes('價金'))
    const idxFee = header.findIndex((h) => h.includes('手續費'))
    const idxTax = header.findIndex((h) => h.includes('交易稅'))
    const idxOrder = header.findIndex((h) => h.includes('委託單號'))

    const parsedTx: Transaction[] = []
    let failedCount = 0
    let buyCount = 0
    let sellCount = 0

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i]
      if (!row || row.length === 0) continue

      const firstCell = String(row[0] || '').trim()
      // 略過「合計」等摘要列或空列
      if (!firstCell || firstCell === '合計' || firstCell.includes('總計')) {
        continue
      }

      try {
        const rawDate = String(row[idxDate] || '').trim()
        const date = normalizeDate(rawDate)
        const symbol = String(row[idxSymbol] || '').trim()
        const action = String(row[idxAction] || '').trim()

        const isBuy = action.includes('買')
        const isSell = action.includes('賣')

        if (!isBuy && !isSell) {
          failedCount++
          continue
        }

        const shares = parseFloat(String(row[idxShares] || '0').replace(/,/g, '')) || 0
        const price = parseFloat(String(row[idxPrice] || '0').replace(/,/g, '')) || 0
        const fee = parseFloat(String(row[idxFee] || '0').replace(/,/g, '')) || 0
        const tax = parseFloat(String(row[idxTax] || '0').replace(/,/g, '')) || 0
        const payAmount = parseFloat(String(row[idxPay] || '0').replace(/,/g, '')) || 0
        const recvAmount = parseFloat(String(row[idxReceive] || '0').replace(/,/g, '')) || 0
        const priceTotal = parseFloat(String(row[idxPriceTotal] || '0').replace(/,/g, '')) || 0

        let amount = 0
        if (isBuy) {
          amount = payAmount > 0 ? payAmount : priceTotal + fee
          buyCount++
        } else {
          amount = recvAmount > 0 ? recvAmount : priceTotal - fee - tax
          sellCount++
        }

        if (amount <= 0 && shares > 0 && price > 0) {
          amount = shares * price
        }

        const orderNum = idxOrder !== -1 && row[idxOrder] ? ` (委託單: ${row[idxOrder]})` : ''
        const notes = `${action} ${symbol}${orderNum}`

        const tx: Transaction = {
          id: `tx-stk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          ledgerId: stockLedger.id,
          type: isBuy ? 'stock_buy' : 'stock_sell',
          amount: Math.round(amount),
          category: isBuy ? '股票買進' : '股票賣出',
          date,
          time: '09:00',
          account: '證券交割戶',
          stockSymbol: symbol,
          shares,
          pricePerShare: price,
          fee,
          tax,
          notes,
        }

        parsedTx.push(tx)
      } catch {
        failedCount++
      }
    }

    const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '').trim() : ''

    return {
      formatType: 'stock_statement',
      targetLedgerName: baseName || stockLedger.name,
      suggestedLedgerType: 'stock',
      transactions: parsedTx,
      totalRows: rows.length - 1,
      successCount: parsedTx.length,
      failedCount,
      buyCount,
      sellCount,
    }
  }

  // 2. 一般記帳表格格式解析
  const baseName = fileName ? fileName.replace(/\.[^/.]+$/, '').trim() : ''
  const cleanLedgerName = (name: string): string => {
    return (
      name
        .replace(/entry\d+/i, '')
        .replace(/_\d{8,}(?:_\d+)?$/, '')
        .replace(/\d{8,}(?:_\d+)?$/, '')
        .trim() || name
    )
  }

  const targetLedger = ledgers.find((l) => l.id === activeLedgerId) || ledgers[0]
  const ledgerNameToId = new Map<string, string>()
  ledgers.forEach((l) => ledgerNameToId.set(l.name.toLowerCase().trim(), l.id))

  const findIdx = (...keywords: string[]): number => {
    for (const kw of keywords) {
      const idx = headerLower.findIndex((h) => h.includes(kw))
      if (idx !== -1) return idx
    }
    return -1
  }

  const idxLedger = findIdx('帳本', 'ledger')
  const idxDate = findIdx('日期', 'date')
  const idxTime = findIdx('時間', 'time', '更新', 'updated', '建立時間', '修改時間')
  const idxType = findIdx('收支', '類型', 'type')

  // 優先精確尋找「類別」或「次類別」，次之尋找「大類別」，最後找包含「分類」
  let idxCategory = headerLower.findIndex(
    (h) => h === '類別' || h === '次類別' || h === '細項' || h.includes('子類')
  )
  if (idxCategory === -1) {
    idxCategory = findIdx('類別', '分類', 'category', '項目')
  }
  const idxMajorCategory = findIdx('大類別', '主類別', '主分類', 'main_category')

  const idxAmount = findIdx('金額', 'amount', '價格')
  const idxAccount = findIdx('帳戶', 'account', '支付', '付款方式', '錢包')
  const idxSymbol = findIdx('標的', '股票', 'symbol')
  const idxShares = findIdx('股數', 'shares')
  const idxPrice = findIdx('單價', 'price')
  const idxFee = findIdx('手續費', 'fee')
  const idxTax = findIdx('稅', 'tax')
  const idxNotes = findIdx('備註', '說明', 'note', '描述', '備注')
  const idxTag = findIdx('標籤', 'tag', '標記')

  const parsedTx: Transaction[] = []
  let failedCount = 0

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i]
    if (!row || row.length === 0) continue

    try {
      const rawAmountStr = idxAmount !== -1 ? String(row[idxAmount] || '') : ''
      const cleanAmount = parseFloat(rawAmountStr.replace(/[^\d.-]/g, ''))
      if (isNaN(cleanAmount) || cleanAmount < 0) {
        failedCount++
        continue
      }

      const rawDate = idxDate !== -1 ? String(row[idxDate] || '') : ''
      const date = normalizeDate(rawDate)

      // 解析時間 (支援 2026-10-07 18:31:15 或 18:31)
      let time = '12:00'
      if (idxTime !== -1 && row[idxTime]) {
        const rawTime = String(row[idxTime]).trim()
        const timeMatch = rawTime.match(/\b(\d{1,2}:\d{2})(?::\d{2})?\b/)
        if (timeMatch) {
          time = timeMatch[1].padStart(5, '0')
        } else if (/^\d{1,2}:\d{2}/.test(rawTime)) {
          time = rawTime.slice(0, 5)
        }
      }

      const rawType = idxType !== -1 ? String(row[idxType] || '') : ''
      const type = mapTransactionType(rawType)

      // 解析分類：優先取子類別/類別，若無則取大類別
      let category = ''
      if (idxCategory !== -1 && row[idxCategory]) {
        category = String(row[idxCategory]).trim()
      }
      if (!category && idxMajorCategory !== -1 && row[idxMajorCategory]) {
        category = String(row[idxMajorCategory]).trim()
      }
      if (!category) {
        category = type === 'income' ? '其他收入' : '日常開銷'
      }

      let ledgerId = targetLedger.id
      if (idxLedger !== -1 && row[idxLedger]) {
        const found = ledgerNameToId.get(String(row[idxLedger]).toLowerCase().trim())
        if (found) ledgerId = found
      }

      const account =
        idxAccount !== -1 && row[idxAccount] ? String(row[idxAccount]).trim() : '現金'

      // 解析備註與標籤
      let notes = idxNotes !== -1 && row[idxNotes] ? String(row[idxNotes]).trim() : ''
      if (idxTag !== -1 && row[idxTag]) {
        const tagVal = String(row[idxTag]).trim()
        if (tagVal) {
          notes = notes ? `${notes} #${tagVal}` : `#${tagVal}`
        }
      }

      const tx: Transaction = {
        id: `tx-std-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        ledgerId,
        type,
        amount: cleanAmount,
        category,
        date,
        time,
        account,
        notes,
      }

      if (idxSymbol !== -1 && row[idxSymbol]) tx.stockSymbol = String(row[idxSymbol]).trim()
      if (idxShares !== -1 && row[idxShares]) tx.shares = parseFloat(String(row[idxShares])) || undefined
      if (idxPrice !== -1 && row[idxPrice]) tx.pricePerShare = parseFloat(String(row[idxPrice])) || undefined
      if (idxFee !== -1 && row[idxFee]) tx.fee = parseFloat(String(row[idxFee])) || undefined
      if (idxTax !== -1 && row[idxTax]) tx.tax = parseFloat(String(row[idxTax])) || undefined

      parsedTx.push(tx)
    } catch {
      failedCount++
    }
  }

  const cleanedTargetName = cleanLedgerName(baseName) || targetLedger.name

  return {
    formatType: 'standard',
    targetLedgerName: cleanedTargetName,
    suggestedLedgerType: 'standard',
    transactions: parsedTx,
    totalRows: rows.length - 1,
    successCount: parsedTx.length,
    failedCount,
  }
}

// 支援讀取 File (無論是 .xlsx, .xls 還是 .csv)
export const parseExcelOrCSVFile = async (
  file: File,
  activeLedgerId: string,
  ledgers: Ledger[]
): Promise<ImportResult> => {
  const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls')

  if (isExcel) {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(ws, {
      header: 1,
    })
    return parseRawTableData(rows, activeLedgerId, ledgers, file.name)
  }

  // 若為 CSV：使用支援 RFC 4180 標準 (支援跨行換行、引號跳脫) 的 parseCSVToRows
  const text = await file.text()
  const rows = parseCSVToRows(text)
  if (rows && rows.length >= 2) {
    return parseRawTableData(rows, activeLedgerId, ledgers, file.name)
  }

  // 後備方案：嘗試使用 XLSX 解析
  try {
    const buffer = await file.arrayBuffer()
    const wb = XLSX.read(buffer, { type: 'array' })
    const sheetName = wb.SheetNames[0]
    const ws = wb.Sheets[sheetName]
    const fallbackRows = XLSX.utils.sheet_to_json<(string | number | null | undefined)[]>(ws, {
      header: 1,
    })
    return parseRawTableData(fallbackRows, activeLedgerId, ledgers, file.name)
  } catch {
    return parseRawTableData(rows, activeLedgerId, ledgers, file.name)
  }
}
