import React, { useState, useEffect } from 'react'
import type { Ledger } from '../types'
import { DynamicIcon } from './DynamicIcon'
import { X, ArrowUpDown, ChevronUp, ChevronDown, GripVertical, Check } from 'lucide-react'

interface LedgerOrderModalProps {
  isOpen: boolean
  onClose: () => void
  ledgers: Ledger[]
  onReorder: (newLedgers: Ledger[]) => void
}

export const LedgerOrderModal: React.FC<LedgerOrderModalProps> = ({
  isOpen,
  onClose,
  ledgers,
  onReorder,
}) => {
  const [items, setItems] = useState<Ledger[]>(ledgers)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  useEffect(() => {
    if (isOpen) {
      setItems(ledgers)
      setDraggedIndex(null)
    }
  }, [isOpen, ledgers])

  if (!isOpen) return null

  // 更新並回傳新順序
  const updateList = (newItems: Ledger[]) => {
    setItems(newItems)
    onReorder(newItems)
  }

  // 上移
  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    updateList(updated)
  }

  // 下移
  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return
    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    updateList(updated)
  }

  // 拖曳排序處理
  const handleDragStart = (index: number) => {
    setDraggedIndex(index)
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const updated = [...items]
    const draggedItem = updated[draggedIndex]
    updated.splice(draggedIndex, 1)
    updated.splice(index, 0, draggedItem)
    setDraggedIndex(index)
    updateList(updated)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 標題列 */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ArrowUpDown size={17} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">自訂帳本排序</h3>
              <p className="text-[11px] text-slate-400">排列順序將同步套用至帳本列表與切換選單</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="關閉"
          >
            <X size={18} />
          </button>
        </div>

        {/* 帳本列表 */}
        <div className="p-4 overflow-y-auto space-y-2 flex-1">
          {items.map((ledger, index) => {
            const isFirst = index === 0
            const isLast = index === items.length - 1
            const isDragging = draggedIndex === index

            return (
              <div
                key={ledger.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                  isDragging
                    ? 'bg-slate-800/90 border-emerald-500/60 shadow-lg scale-[1.01]'
                    : 'bg-slate-800/40 border-slate-800 hover:border-slate-700/80 hover:bg-slate-800/60'
                }`}
              >
                {/* 左側：序號、圖示與名稱 */}
                <div className="flex items-center gap-3 min-w-0 pr-2">
                  <span className="w-5 text-center text-xs font-mono font-medium text-slate-500 shrink-0">
                    #{index + 1}
                  </span>

                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0 shadow-sm"
                    style={{ backgroundColor: `${ledger.color}25`, color: ledger.color }}
                  >
                    <DynamicIcon name={ledger.icon} size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="font-medium text-slate-100 text-sm truncate flex items-center gap-2">
                      <span>{ledger.name}</span>
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded font-normal shrink-0">
                        {ledger.type === 'futures'
                          ? '期貨'
                          : ledger.type === 'stock'
                          ? '股票'
                          : '一般'}
                      </span>
                    </div>
                    {ledger.description && (
                      <p className="text-[11px] text-slate-400 truncate max-w-[170px] sm:max-w-[210px]">
                        {ledger.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 右側：上移/下移與拖曳把手 */}
                <div className="flex items-center gap-1 shrink-0">
                  <div className="flex flex-col gap-0.5">
                    <button
                      type="button"
                      onClick={() => handleMoveUp(index)}
                      disabled={isFirst}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="上移"
                      aria-label="上移"
                    >
                      <ChevronUp size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleMoveDown(index)}
                      disabled={isLast}
                      className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="下移"
                      aria-label="下移"
                    >
                      <ChevronDown size={15} />
                    </button>
                  </div>

                  <div
                    className="p-1.5 text-slate-500 hover:text-slate-300 cursor-grab active:cursor-grabbing transition-colors"
                    title="按住拖曳排序"
                  >
                    <GripVertical size={16} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 底部按鈕 */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/80 flex items-center justify-between shrink-0">
          <span className="text-xs text-slate-400">
            共 {items.length} 個帳本
          </span>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
          >
            <Check size={14} />
            完成
          </button>
        </div>
      </div>
    </div>
  )
}

