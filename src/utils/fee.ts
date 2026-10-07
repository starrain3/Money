import type { LedgerFeeConfig, LedgerType } from '../types'

/**
 * 取得指定帳本類型的預設手續費設定
 */
export const getDefaultFeeConfig = (type: LedgerType): LedgerFeeConfig | undefined => {
  if (type === 'stock') {
    return {
      calculationType: 'percentage',
      rate: 0.1425, // 0.1425% (台股法規牌價)
      discount: 100, // 100% (無折扣，即10折)
      minFee: 20, // 台股常見低消 20 元
    }
  }
  if (type === 'futures') {
    return {
      calculationType: 'fixed',
      fixedAmount: 20, // 台指期/微台等常見每口約 20 元
      discount: 100, // 100% (無折扣)
      minFee: 0,
    }
  }
  return undefined
}

/**
 * 計算手續費金額
 */
export const calculateFee = (
  config: LedgerFeeConfig | undefined,
  params: {
    ledgerType: LedgerType
    shares?: number
    pricePerShare?: number
  }
): number => {
  const { ledgerType, shares = 0, pricePerShare = 0 } = params

  // 若未設定 config，回傳預設預估值
  if (!config) {
    if (ledgerType === 'stock') {
      const tradeAmount = shares * pricePerShare
      if (tradeAmount <= 0) return 0
      return Math.max(1, Math.round(tradeAmount * 0.001425))
    }
    if (ledgerType === 'futures') {
      const lots = shares > 0 ? shares : 1
      return Math.round(20 * lots)
    }
    return 0
  }

  const discountRatio = (config.discount !== undefined ? config.discount : 100) / 100

  if (config.calculationType === 'percentage') {
    const tradeAmount = shares * pricePerShare
    if (tradeAmount <= 0) return 0

    const ratePercent = config.rate !== undefined ? config.rate : 0.1425
    const rawFee = tradeAmount * (ratePercent / 100) * discountRatio
    const roundedFee = Math.round(rawFee)

    if (config.minFee && config.minFee > 0) {
      return Math.max(config.minFee, roundedFee)
    }
    return Math.max(1, roundedFee)
  }

  if (config.calculationType === 'fixed') {
    const baseAmount = config.fixedAmount !== undefined ? config.fixedAmount : 20
    const feePerUnit = Math.round(baseAmount * discountRatio)

    if (ledgerType === 'futures') {
      // 期貨通常按口數計算
      const lots = shares > 0 ? shares : 1
      return feePerUnit * lots
    }

    // 股票或其他按筆計算
    return feePerUnit
  }

  return 0
}

/**
 * 取得格式化折扣描述文字 (如 "2.8折", "6折", "無折扣")
 */
export const formatDiscountText = (discount?: number): string => {
  if (discount === undefined || discount >= 100) {
    return '無折扣'
  }
  if (discount <= 0) {
    return '免手續費'
  }
  // 折數例如 28 -> 2.8折；60 -> 6折；55 -> 5.5折
  const fold = discount / 10
  // 去除尾數無效 0
  const formatted = parseFloat(fold.toFixed(2))
  return `${formatted}折`
}

/**
 * 取得手續費設定的簡短摘要說明 (供介面標籤或提示使用)
 */
export const formatFeeConfigSummary = (
  config: LedgerFeeConfig | undefined,
  ledgerType: LedgerType
): string => {
  if (!config) {
    if (ledgerType === 'stock') return '手續費預設 0.1425%'
    if (ledgerType === 'futures') return '手續費預設 20元/口'
    return ''
  }

  const discountText = formatDiscountText(config.discount)

  if (config.calculationType === 'percentage') {
    const rateStr = `${config.rate ?? 0.1425}%`
    const parts = [rateStr]
    if (config.discount && config.discount < 100) {
      parts.push(discountText)
    }
    if (config.minFee && config.minFee > 0) {
      parts.push(`低消${config.minFee}元`)
    }
    return parts.join(' · ')
  }

  if (config.calculationType === 'fixed') {
    const amountStr = `${config.fixedAmount ?? 20}元${ledgerType === 'futures' ? '/口' : '/筆'}`
    if (config.discount && config.discount < 100) {
      const discounted = Math.round((config.fixedAmount ?? 20) * ((config.discount ?? 100) / 100))
      return `${amountStr} (${discountText}約${discounted}元)`
    }
    return amountStr
  }

  return ''
}

