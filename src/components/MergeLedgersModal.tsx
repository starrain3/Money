import React, { useState, useEffect } from 'react'
import type { Ledger, Transaction } from '../types'
import { DynamicIcon } from './DynamicIcon'
import { useNotification } from '../context/NotificationContext'
import { X, ArrowRight, Merge, AlertTriangle } from 'lucide-react'

interface MergeLedgersModalProps {
  isOpen: boolean
  onClose: () => void
  ledgers: Ledger[]
  transactions: Transaction[]
  onMerge: (sourceLedgerId: string, targetLedgerId: string, deleteSource: boolean) => void
}

export const MergeLedgersModal: React.FC<MergeLedgersModalProps> = ({
  isOpen,
  onClose,
  ledgers,
  transactions,
  onMerge,
}) => {
  const { showToast, showConfirm } = useNotification()
  const [sourceId, setSourceId] = useState<string>('')
  const [targetId, setTargetId] = useState<string>('')
  const [deleteSource, setDeleteSource] = useState<boolean>(true)

  useEffect(() => {
    if (ledgers.length >= 2) {
      setSourceId(ledgers[0].id)
      setTargetId(ledgers[1].id)
    } else if (ledgers.length === 1) {
      setSourceId(ledgers[0].id)
      setTargetId('')
    }
  }, [ledgers, isOpen])

  if (!isOpen) return null

  // 取得來源與目標帳本物件
  const sourceLedger = ledgers.find((l) => l.id === sourceId)
  const targetLedger = ledgers.find((l) => l.id === targetId)

  // 計算來源帳本的記帳筆數
  const sourceTxCount = transactions.filter((t) => t.ledgerId === sourceId).length
  const targetTxCount = transactions.filter((t) => t.ledgerId === targetId).length

  // 目標帳本可選清單（排除來源帳本）
  const availableTargetLedgers = ledgers.filter((l) => l.id !== sourceId)

  const handleSourceChange = (newSourceId: string) => {
    setSourceId(newSourceId)
    if (targetId === newSourceId) {
      const other = ledgers.find((l) => l.id !== newSourceId)
      setTargetId(other ? other.id : '')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!sourceId || !targetId) {
      showToast('請選擇來源帳本與目標帳本！', 'warning')
      return
    }
    if (sourceId === targetId) {
      showToast('來源帳本與目標帳本不能相同！', 'warning')
      return
    }

    const confirmMsg = `確認將【${sourceLedger?.name}】的 ${sourceTxCount} 筆記錄合併到【${targetLedger?.name}】嗎？${
      deleteSource ? '\n\n注意：合併完成後將會刪除來源帳本【' + sourceLedger?.name + '】。' : ''
    }`

    const confirmed = await showConfirm(confirmMsg, {
      title: '確認合併帳本',
      type: deleteSource ? 'danger' : 'warning',
      confirmText: '確定合併',
    })

    if (confirmed) {
      onMerge(sourceId, targetId, deleteSource)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 標題列 */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
              <Merge size={18} />
            </div>
            <h3 className="font-semibold text-white text-base">合併帳本</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 表單內容 */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {ledgers.length < 2 ? (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-300 text-xs flex items-center gap-2">
              <AlertTriangle size={18} className="shrink-0" />
              <span>目前帳本數量不足 2 個，無法執行合併操作。請先建立或匯入其他帳本。</span>
            </div>
          ) : (
            <>
              {/* 來源與目標帳本選擇 */}
              <div className="space-y-3">
                {/* 來源帳本 */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    1. 選擇來源帳本 (將移出明細)
                  </label>
                  <select
                    value={sourceId}
                    onChange={(e) => handleSourceChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    {ledgers.map((l) => {
                      const count = transactions.filter((t) => t.ledgerId === l.id).length
                      return (
                        <option key={l.id} value={l.id}>
                          {l.name} ({count} 筆記錄) - {l.type === 'stock' ? '股票投資' : '一般收支'}
                        </option>
                      )
                    })}
                  </select>
                </div>

                {/* 箭頭指示 */}
                <div className="flex items-center justify-center text-teal-400 py-1">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center">
                    <ArrowRight size={16} />
                  </div>
                </div>

                {/* 目標帳本 */}
                <div>
                  <label className="block text-xs font-medium text-slate-400 mb-1.5">
                    2. 選擇目標帳本 (接收合併明細)
                  </label>
                  <select
                    value={targetId}
                    onChange={(e) => setTargetId(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white focus:outline-none focus:border-teal-500"
                  >
                    {availableTargetLedgers.map((l) => {
                      const count = transactions.filter((t) => t.ledgerId === l.id).length
                      return (
                        <option key={l.id} value={l.id}>
                          {l.name} (現有 {count} 筆記錄) - {l.type === 'stock' ? '股票投資' : '一般收支'}
                        </option>
                      )
                    })}
                  </select>
                </div>
              </div>

              {/* 預覽摘要卡片 */}
              {sourceLedger && targetLedger && (
                <div className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-xl space-y-2 text-xs">
                  <div className="font-semibold text-slate-200">合併預覽：</div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <DynamicIcon name={sourceLedger.icon} size={14} className="text-teal-400" />
                      <span>{sourceLedger.name}</span>
                    </div>
                    <span className="text-slate-400">{sourceTxCount} 筆記錄 ➔ 遷移</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <DynamicIcon name={targetLedger.icon} size={14} className="text-emerald-400" />
                      <span>{targetLedger.name}</span>
                    </div>
                    <span className="text-emerald-400 font-semibold">
                      合併後共 {sourceTxCount + targetTxCount} 筆記錄
                    </span>
                  </div>
                </div>
              )}

              {/* 核取方塊：合併後刪除來源帳本 */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={deleteSource}
                  onChange={(e) => setDeleteSource(e.target.checked)}
                  className="w-4 h-4 rounded text-teal-500 focus:ring-teal-400 bg-slate-900 border-slate-700 cursor-pointer"
                />
                <span className="text-xs text-slate-300">
                  合併完成後自動刪除來源帳本【{sourceLedger?.name || ''}】
                </span>
              </label>

              {/* 確認按鈕 */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={!sourceId || !targetId || sourceId === targetId}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-slate-950 font-bold text-sm rounded-xl shadow-lg shadow-teal-500/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  確認合併帳本
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  )
}

