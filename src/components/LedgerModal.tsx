import React, { useState, useEffect } from 'react'
import type { Ledger, LedgerType, LedgerFeeConfig, FeeCalculationType } from '../types'
import { LEDGER_COLORS, LEDGER_ICONS } from '../constants/categories'
import { DynamicIcon } from './DynamicIcon'
import { X, Trash2, Percent, Coins, Sparkles } from 'lucide-react'

interface LedgerModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (ledger: Omit<Ledger, 'id' | 'createdAt'>, editId?: string) => void
  onDelete?: (id: string) => void
  editLedger?: Ledger | null
  totalLedgersCount: number
}

export const LedgerModal: React.FC<LedgerModalProps> = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  editLedger,
  totalLedgersCount,
}) => {
  const [name, setName] = useState('')
  const [type, setType] = useState<LedgerType>('standard')
  const [icon, setIcon] = useState('Wallet')
  const [color, setColor] = useState('#10b981')
  const [currency, setCurrency] = useState('NT$')
  const [description, setDescription] = useState('')
  const [budgetMonthly, setBudgetMonthly] = useState('')

  // 手續費與折扣設定
  const [feeCalcType, setFeeCalcType] = useState<FeeCalculationType>('percentage')
  const [feeRate, setFeeRate] = useState('0.1425')
  const [feeFixedAmount, setFeeFixedAmount] = useState('20')
  const [feeDiscount, setFeeDiscount] = useState('100')
  const [feeMinFee, setFeeMinFee] = useState('20')

  useEffect(() => {
    if (editLedger) {
      setName(editLedger.name)
      setType(editLedger.type)
      setIcon(editLedger.icon)
      setColor(editLedger.color)
      setCurrency(editLedger.currency)
      setDescription(editLedger.description || '')
      setBudgetMonthly(editLedger.budgetMonthly ? editLedger.budgetMonthly.toString() : '')

      // 載入手續費設定
      if (editLedger.feeConfig) {
        setFeeCalcType(editLedger.feeConfig.calculationType)
        setFeeRate(editLedger.feeConfig.rate !== undefined ? editLedger.feeConfig.rate.toString() : '0.1425')
        setFeeFixedAmount(editLedger.feeConfig.fixedAmount !== undefined ? editLedger.feeConfig.fixedAmount.toString() : '20')
        setFeeDiscount(editLedger.feeConfig.discount !== undefined ? editLedger.feeConfig.discount.toString() : '100')
        setFeeMinFee(editLedger.feeConfig.minFee !== undefined ? editLedger.feeConfig.minFee.toString() : '0')
      } else {
        if (editLedger.type === 'stock') {
          setFeeCalcType('percentage')
          setFeeRate('0.1425')
          setFeeFixedAmount('20')
          setFeeDiscount('100')
          setFeeMinFee('20')
        } else if (editLedger.type === 'futures') {
          setFeeCalcType('fixed')
          setFeeRate('0.1425')
          setFeeFixedAmount('20')
          setFeeDiscount('100')
          setFeeMinFee('0')
        }
      }
    } else {
      setName('')
      setType('standard')
      setIcon('Wallet')
      setColor('#10b981')
      setCurrency('NT$')
      setDescription('')
      setBudgetMonthly('')
      setFeeCalcType('percentage')
      setFeeRate('0.1425')
      setFeeFixedAmount('20')
      setFeeDiscount('100')
      setFeeMinFee('20')
    }
  }, [editLedger, isOpen])

  // 當手動切換帳本類型時，自動設定合理的預設值
  const handleTypeChange = (newType: LedgerType) => {
    setType(newType)
    if (newType === 'stock') {
      setIcon('TrendingUp')
      if (!editLedger?.feeConfig) {
        setFeeCalcType('percentage')
        setFeeRate('0.1425')
        setFeeDiscount('100')
        setFeeMinFee('20')
      }
    } else if (newType === 'futures') {
      setIcon('Zap')
      if (!editLedger?.feeConfig) {
        setFeeCalcType('fixed')
        setFeeFixedAmount('20')
        setFeeDiscount('100')
        setFeeMinFee('0')
      }
    } else {
      if (icon === 'TrendingUp' || icon === 'Zap') setIcon('Wallet')
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      alert('請輸入帳本名稱！')
      return
    }

    let feeConfig: LedgerFeeConfig | undefined = undefined
    if (type === 'stock' || type === 'futures') {
      const discountVal = parseFloat(feeDiscount)
      const validDiscount = isNaN(discountVal) || discountVal < 0 ? 100 : discountVal

      feeConfig = {
        calculationType: feeCalcType,
        rate: feeCalcType === 'percentage' ? (parseFloat(feeRate) || 0) : undefined,
        fixedAmount: feeCalcType === 'fixed' ? (parseFloat(feeFixedAmount) || 0) : undefined,
        discount: validDiscount,
        minFee: feeMinFee ? (parseFloat(feeMinFee) || 0) : 0,
      }
    }

    onSave(
      {
        name: name.trim(),
        type,
        icon,
        color,
        currency: currency.trim() || 'NT$',
        description: description.trim(),
        budgetMonthly: budgetMonthly ? parseFloat(budgetMonthly) : undefined,
        feeConfig,
      },
      editLedger?.id
    )
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 標題 */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <h3 className="font-semibold text-white text-base">
            {editLedger ? '編輯帳本' : '新增帳本'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 表單主體：包含可捲動細項填寫區與固定常駐底部按鈕列 */}
        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0 overflow-hidden">
          {/* 捲動表單細項內容區 */}
          <div className="overflow-y-auto px-5 py-4 space-y-4 flex-1">
            {/* 帳本類型選擇 */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">帳本類型</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('standard')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'standard'
                    ? 'border-emerald-500 bg-emerald-500/15 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                <div className="text-xs font-semibold mb-0.5">💰 一般收支</div>
                <div className="text-[10px] text-slate-400">日常、飲食、休閒</div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('stock')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'stock'
                    ? 'border-blue-500 bg-blue-500/15 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                <div className="text-xs font-semibold mb-0.5">📈 股票投資</div>
                <div className="text-[10px] text-slate-400">買賣、股息配息</div>
              </button>

              <button
                type="button"
                onClick={() => handleTypeChange('futures')}
                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                  type === 'futures'
                    ? 'border-amber-500 bg-amber-500/15 text-white'
                    : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:bg-slate-800/80'
                }`}
              >
                <div className="text-xs font-semibold mb-0.5">⚡ 期貨交易</div>
                <div className="text-[10px] text-slate-400">平倉損益、保證金</div>
              </button>
            </div>
          </div>

          {/* 帳本名稱 */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">帳本名稱</label>
            <input
              type="text"
              required
              placeholder="例如：生活開銷、股票投資、日本旅遊..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 圖示選擇 */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">代表圖示</label>
            <div className="grid grid-cols-4 gap-2">
              {LEDGER_ICONS.map((ic) => {
                const isSelected = icon === ic.name
                return (
                  <button
                    key={ic.name}
                    type="button"
                    onClick={() => setIcon(ic.name)}
                    className={`flex flex-col items-center justify-center p-2.5 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-500 bg-emerald-500/20 text-emerald-400'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-800'
                    }`}
                  >
                    <DynamicIcon name={ic.name} size={20} />
                    <span className="text-[10px] mt-1">{ic.label}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* 顏色選擇 */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">色彩標記</label>
            <div className="flex items-center gap-3">
              {LEDGER_COLORS.map((c) => {
                const isSelected = color === c.value
                return (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => setColor(c.value)}
                    className={`w-8 h-8 rounded-full transition-transform cursor-pointer ${
                      isSelected ? 'ring-2 ring-white scale-110 shadow-lg' : 'opacity-70 hover:opacity-100'
                    }`}
                    style={{ backgroundColor: c.value }}
                    title={c.name}
                  />
                )
              })}
            </div>
          </div>

          {/* 幣別與月預算 */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">幣別代號</label>
              <input
                type="text"
                placeholder="NT$"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">每月預算 (選填)</label>
              <input
                type="number"
                placeholder="無限制"
                value={budgetMonthly}
                onChange={(e) => setBudgetMonthly(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          {/* 簡短說明 */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">說明備註 (選填)</label>
            <input
              type="text"
              placeholder="例如：專門紀錄台股與美股投資"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 股票與期貨手續費與折扣設定 */}
          {(type === 'stock' || type === 'futures') && (
            <div className={`p-4 rounded-2xl border space-y-3.5 ${
              type === 'stock'
                ? 'bg-blue-950/20 border-blue-500/30'
                : 'bg-amber-950/20 border-amber-500/30'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles size={15} className={type === 'stock' ? 'text-blue-400' : 'text-amber-400'} />
                  <span className="text-xs font-semibold text-white">手續費與折扣設定 (選填)</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  type === 'stock'
                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/20'
                    : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                }`}>
                  記帳時自動帶入
                </span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                新增此帳本的記帳記錄時會自動試算並帶入，每筆記帳仍可隨時手動修改。
              </p>

              {/* 計費方式選擇 */}
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1.5">計算方式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFeeCalcType('percentage')
                      if (!feeRate || feeRate === '0') setFeeRate('0.1425')
                    }}
                    className={`py-2 px-3 text-xs rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      feeCalcType === 'percentage'
                        ? type === 'stock'
                          ? 'border-blue-500 bg-blue-500/20 text-blue-200 font-semibold'
                          : 'border-amber-500 bg-amber-500/20 text-amber-200 font-semibold'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Percent size={13} />
                    依成交金額百分比 (%)
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setFeeCalcType('fixed')
                      if (!feeFixedAmount || feeFixedAmount === '0') setFeeFixedAmount('20')
                    }}
                    className={`py-2 px-3 text-xs rounded-xl border flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                      feeCalcType === 'fixed'
                        ? type === 'stock'
                          ? 'border-blue-500 bg-blue-500/20 text-blue-200 font-semibold'
                          : 'border-amber-500 bg-amber-500/20 text-amber-200 font-semibold'
                        : 'border-slate-800 bg-slate-800/50 text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    <Coins size={13} />
                    固定金額 (元{type === 'futures' ? '/口' : '/筆'})
                  </button>
                </div>
              </div>

              {/* 百分比模式參數 */}
              {feeCalcType === 'percentage' && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-2.5">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        基準費率 (%)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          placeholder="0.1425"
                          value={feeRate}
                          onChange={(e) => setFeeRate(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 pr-7"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                          %
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">
                        最低手續費 (低消)
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="1"
                          placeholder="20 (無低消請填 0)"
                          value={feeMinFee}
                          onChange={(e) => setFeeMinFee(e.target.value)}
                          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-blue-500 pr-8"
                        />
                        <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                          元
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 固定金額模式參數 */}
              {feeCalcType === 'fixed' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">
                    {type === 'futures' ? '單口固定手續費 (NT$/口)' : '每筆固定手續費 (NT$/筆)'}
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="any"
                      placeholder="20"
                      value={feeFixedAmount}
                      onChange={(e) => setFeeFixedAmount(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-amber-500 pr-12"
                    />
                    <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                      {type === 'futures' ? '元/口' : '元/筆'}
                    </span>
                  </div>
                </div>
              )}

              {/* 手續費折扣 */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-[11px] font-medium text-slate-300">
                    手續費折扣 (折數 / %)
                  </label>
                  <span className="text-[11px] font-mono text-emerald-400">
                    {parseFloat(feeDiscount) >= 100 || !feeDiscount
                      ? '無折扣 (100%)'
                      : parseFloat(feeDiscount) <= 0
                      ? '免手續費 (0%)'
                      : `${(parseFloat(feeDiscount) / 10).toFixed(parseFloat(feeDiscount) % 10 === 0 ? 0 : 1)} 折 (${feeDiscount}%)`}
                  </span>
                </div>

                {/* 常見折扣快捷鈕 */}
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {[
                    { label: '無折扣', val: '100' },
                    { label: '6 折', val: '60' },
                    { label: '5 折', val: '50' },
                    { label: '3 折', val: '30' },
                    { label: '2.8 折', val: '28' },
                    { label: '2 折', val: '20' },
                  ].map((preset) => (
                    <button
                      key={preset.val}
                      type="button"
                      onClick={() => setFeeDiscount(preset.val)}
                      className={`px-2.5 py-1 text-[11px] rounded-lg border transition-all cursor-pointer ${
                        feeDiscount === preset.val
                          ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300 font-medium'
                          : 'border-slate-800 bg-slate-850 hover:bg-slate-800 text-slate-300'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>

                <div className="relative">
                  <input
                    type="number"
                    step="any"
                    placeholder="例如 28 代表 2.8 折、60 代表 6 折、100 代表無折扣"
                    value={feeDiscount}
                    onChange={(e) => setFeeDiscount(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 pr-8"
                  />
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs">
                    %
                  </span>
                </div>
              </div>

              {/* 即時試算範例展示 */}
              <div className="p-2.5 bg-slate-900/80 rounded-xl border border-slate-800 text-[11px] space-y-1">
                <span className="text-slate-400 block font-medium">💡 即時試算預覽：</span>
                {feeCalcType === 'percentage' ? (
                  (() => {
                    const r = parseFloat(feeRate) || 0.1425
                    const d = (parseFloat(feeDiscount) || 100) / 100
                    const m = parseFloat(feeMinFee) || 0
                    const effectiveRate = (r * d).toFixed(4)
                    const sampleAmount = 100000
                    const sampleFee = Math.max(m, Math.round(sampleAmount * (r / 100) * d))
                    return (
                      <p className="text-slate-300">
                        折後有效費率約 <strong className="text-emerald-400">{effectiveRate}%</strong>。
                        買進 10 萬元時手續費約 <strong className="text-white">NT$ {sampleFee} 元</strong>
                        {m > 0 ? ` (低消 ${m} 元)` : ''}
                      </p>
                    )
                  })()
                ) : (
                  (() => {
                    const f = parseFloat(feeFixedAmount) || 20
                    const d = (parseFloat(feeDiscount) || 100) / 100
                    const discountedPerUnit = Math.round(f * d)
                    return (
                      <p className="text-slate-300">
                        折後手續費約 <strong className="text-emerald-400">NT$ {discountedPerUnit} 元</strong>
                        {type === 'futures' ? ' / 口' : ' / 筆'}
                        {type === 'futures' && (
                          <span className="text-slate-400">
                            （若平倉 2 口則自動帶入 {discountedPerUnit * 2} 元）
                          </span>
                        )}
                      </p>
                    )
                  })()
                )}
              </div>
            </div>
          )}

          </div>

          {/* 固定底部按鈕區 (常駐可見，不隨表單細項捲動) */}
          <div className="px-5 py-3.5 border-t border-slate-800/80 bg-slate-900/95 backdrop-blur-sm shrink-0 flex items-center gap-2 shadow-lg">
            {editLedger && onDelete && (
              <button
                type="button"
                onClick={() => {
                  const confirmMsg =
                    totalLedgersCount <= 1
                      ? `「${editLedger.name}」是您目前唯一的帳本。刪除後將清除所有記錄，並自動為您建立一個全新的空白「日常開銷」帳本，確定要刪除嗎？`
                      : `確定要刪除「${editLedger.name}」帳本及其所有帳目記錄嗎？此動作無法復原。`
                  if (confirm(confirmMsg)) {
                    onDelete(editLedger.id)
                    onClose()
                  }
                }}
                className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl border border-rose-500/30 transition-colors flex items-center justify-center cursor-pointer"
                title="刪除帳本"
              >
                <Trash2 size={18} />
              </button>
            )}

            <button
              type="submit"
              className="flex-1 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-semibold text-sm rounded-xl shadow-lg shadow-emerald-500/20 transition-all cursor-pointer text-center active:scale-[0.99]"
            >
              {editLedger ? '儲存帳本變更' : '建立帳本'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
