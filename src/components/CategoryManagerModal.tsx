import React, { useState, useEffect } from 'react'
import type { CategoryItem } from '../types'
import {
  type CategoryGroupKey,
  CATEGORY_GROUP_OPTIONS,
  loadCategories,
  saveCategories,
  resetCategories,
} from '../utils/categoryStorage'
import { CATEGORY_ICONS, CATEGORY_COLORS } from '../constants/categories'
import { DynamicIcon } from './DynamicIcon'
import {
  X,
  Plus,
  Edit2,
  Trash2,
  ChevronUp,
  ChevronDown,
  RotateCcw,
  Check,
  Sparkles,
  GripVertical,
} from 'lucide-react'

interface CategoryManagerModalProps {
  isOpen: boolean
  onClose: () => void
  initialGroupKey?: CategoryGroupKey
  onCategoriesChanged?: () => void
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  isOpen,
  onClose,
  initialGroupKey = 'expense',
  onCategoriesChanged,
}) => {
  // 目前選取的分類大類（一般收支 / 股票投資 / 期貨交易）
  const [parentType, setParentType] = useState<'standard' | 'stock' | 'futures'>('standard')
  // 目前選取的子群組
  const [activeGroupKey, setActiveGroupKey] = useState<CategoryGroupKey>(initialGroupKey)
  // 當前群組下的分類清單
  const [items, setItems] = useState<CategoryItem[]>([])

  // 新增 / 編輯狀態
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null) // null 代表新增，字串代表編輯特定 ID
  const [formName, setFormName] = useState('')
  const [formIcon, setFormIcon] = useState('Tag')
  const [formColor, setFormColor] = useState(CATEGORY_COLORS[0])
  const [formError, setFormError] = useState('')

  // 拖曳狀態
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)

  // 當打開彈窗或 initialGroupKey 改變時同步
  useEffect(() => {
    if (isOpen) {
      const matched = CATEGORY_GROUP_OPTIONS.find((g) => g.key === initialGroupKey)
      if (matched) {
        setParentType(matched.parentType)
        setActiveGroupKey(matched.key)
      }
      setIsFormOpen(false)
      setEditingId(null)
    }
  }, [isOpen, initialGroupKey])

  // 當 activeGroupKey 改變時載入清單
  useEffect(() => {
    if (isOpen) {
      const list = loadCategories(activeGroupKey)
      setItems(list)
    }
  }, [isOpen, activeGroupKey])

  if (!isOpen) return null

  // 目前大類下的可選子群組
  const availableSubGroups = CATEGORY_GROUP_OPTIONS.filter((g) => g.parentType === parentType)
  const currentGroupInfo = CATEGORY_GROUP_OPTIONS.find((g) => g.key === activeGroupKey)

  // 切換大類別
  const handleSelectParentType = (pt: 'standard' | 'stock' | 'futures') => {
    setParentType(pt)
    const firstSub = CATEGORY_GROUP_OPTIONS.find((g) => g.parentType === pt)
    if (firstSub) {
      setActiveGroupKey(firstSub.key)
    }
    setIsFormOpen(false)
    setEditingId(null)
  }

  // 儲存目前清單變更並通知外部
  const persistItems = (newItems: CategoryItem[]) => {
    setItems(newItems)
    saveCategories(activeGroupKey, newItems)
    onCategoriesChanged?.()
  }

  // 開啟新增表單
  const handleOpenAddForm = () => {
    setEditingId(null)
    setFormName('')
    setFormIcon('Tag')
    setFormColor(CATEGORY_COLORS[0])
    setFormError('')
    setIsFormOpen(true)
  }

  // 開啟編輯表單
  const handleOpenEditForm = (item: CategoryItem) => {
    setEditingId(item.id)
    setFormName(item.name)
    setFormIcon(item.icon)
    setFormColor(item.color)
    setFormError('')
    setIsFormOpen(true)
  }

  // 取消表單
  const handleCancelForm = () => {
    setIsFormOpen(false)
    setEditingId(null)
    setFormName('')
    setFormError('')
  }

  // 送出新增或編輯
  const handleSaveForm = (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    const trimmed = formName.trim()
    if (!trimmed) {
      setFormError('請輸入分類名稱')
      return
    }

    // 檢查是否有同名衝突（排除自己）
    const isDuplicate = items.some(
      (item) => item.name.toLowerCase() === trimmed.toLowerCase() && item.id !== editingId
    )
    if (isDuplicate) {
      setFormError('此分類名稱已存在！')
      return
    }

    const currentCatType = currentGroupInfo?.categoryType || 'expense'

    if (editingId) {
      // 編輯模式
      const updated = items.map((item) => {
        if (item.id === editingId) {
          return {
            ...item,
            name: trimmed,
            icon: formIcon,
            color: formColor,
          }
        }
        return item
      })
      persistItems(updated)
    } else {
      // 新增模式
      const newItem: CategoryItem = {
        id: `cat-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        name: trimmed,
        type: currentCatType,
        icon: formIcon,
        color: formColor,
      }
      persistItems([...items, newItem])
    }

    handleCancelForm()
  }

  // 刪除分類
  const handleDeleteItem = (item: CategoryItem) => {
    if (items.length <= 1) {
      alert('請至少保留一個分類項目！')
      return
    }
    const confirmed = confirm(
      `確定要刪除「${item.name}」分類嗎？\n\n注意：此操作僅會從選項中移除，既有的歷史記帳記錄不會受到影響。`
    )
    if (!confirmed) return

    const filtered = items.filter((i) => i.id !== item.id)
    persistItems(filtered)

    if (editingId === item.id) {
      handleCancelForm()
    }
  }

  // 上移
  const handleMoveUp = (index: number) => {
    if (index <= 0) return
    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[index - 1]
    updated[index - 1] = temp
    persistItems(updated)
  }

  // 下移
  const handleMoveDown = (index: number) => {
    if (index >= items.length - 1) return
    const updated = [...items]
    const temp = updated[index]
    updated[index] = updated[index + 1]
    updated[index + 1] = temp
    persistItems(updated)
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
    persistItems(updated)
  }

  const handleDragEnd = () => {
    setDraggedIndex(null)
  }

  // 重設為系統預設值
  const handleResetToDefault = () => {
    const confirmed = confirm(
      `確定要將「${currentGroupInfo?.label || ''}」恢復為系統預設分類嗎？\n\n自訂的排列與項目將會被重設。`
    )
    if (!confirmed) return
    const restored = resetCategories(activeGroupKey)
    setItems(restored)
    onCategoriesChanged?.()
    handleCancelForm()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 頂部標題列 */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <Sparkles size={16} />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">分類項目管理</h3>
              <p className="text-[11px] text-slate-400">自訂名稱、色彩、圖示與排序順序</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* 帳本類型大分頁 (一般 / 股票 / 期貨) */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-800/80 bg-slate-900/60 shrink-0">
          <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-800/80 rounded-xl">
            <button
              type="button"
              onClick={() => handleSelectParentType('standard')}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                parentType === 'standard'
                  ? 'bg-emerald-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              💰 一般收支
            </button>
            <button
              type="button"
              onClick={() => handleSelectParentType('stock')}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                parentType === 'stock'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              📈 股票投資
            </button>
            <button
              type="button"
              onClick={() => handleSelectParentType('futures')}
              className={`py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                parentType === 'futures'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              ⚡ 期貨交易
            </button>
          </div>

          {/* 子群組切換 (如：日常支出 / 日常收入) */}
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 scrollbar-none">
            {availableSubGroups.map((g) => {
              const isActive = activeGroupKey === g.key
              return (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => {
                    setActiveGroupKey(g.key)
                    setIsFormOpen(false)
                    setEditingId(null)
                  }}
                  className={`px-3 py-1 text-xs rounded-lg border whitespace-nowrap transition-all cursor-pointer ${
                    isActive
                      ? 'border-emerald-500/80 bg-emerald-500/15 text-emerald-300 font-medium shadow-sm'
                      : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {g.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* 捲動內容區 */}
        <div className="overflow-y-auto px-5 py-4 space-y-3.5 flex-1 min-h-0">
          {/* 新增/編輯表單展開卡片 */}
          {isFormOpen && (
            <div className="p-3.5 bg-slate-850 border border-slate-750 rounded-2xl space-y-3 shadow-lg animate-in fade-in duration-150">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Sparkles size={13} className="text-emerald-400" />
                  {editingId ? '編輯分類' : '新增自訂分類'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-slate-400 hover:text-white p-1 rounded-md"
                >
                  <X size={14} />
                </button>
              </div>

              {/* 分類名稱 */}
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">分類名稱</label>
                <input
                  type="text"
                  maxLength={16}
                  placeholder="例如：毛小孩、外送平台、零食飲品..."
                  value={formName}
                  onChange={(e) => {
                    setFormName(e.target.value)
                    setFormError('')
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      handleSaveForm()
                    }
                  }}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500"
                  autoFocus
                />
                {formError && <p className="text-[11px] text-rose-400 mt-1">{formError}</p>}
              </div>

              {/* 圖示選取 */}
              <div>
                <div className="text-[11px] text-slate-400 mb-1.5">選擇圖示</div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
                  {CATEGORY_ICONS.map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => setFormIcon(iconName)}
                      className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border transition-all cursor-pointer ${
                        formIcon === iconName
                          ? 'border-emerald-500 bg-emerald-500/20 text-white ring-1 ring-emerald-500'
                          : 'border-slate-750 bg-slate-900/80 text-slate-400 hover:text-white'
                      }`}
                      title={iconName}
                    >
                      <DynamicIcon name={iconName} size={15} />
                    </button>
                  ))}
                </div>
              </div>

              {/* 顏色選取 */}
              <div>
                <div className="text-[11px] text-slate-400 mb-1.5">選擇色彩</div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {CATEGORY_COLORS.map((col) => (
                    <button
                      key={col}
                      type="button"
                      onClick={() => setFormColor(col)}
                      className={`w-6 h-6 rounded-full flex items-center justify-center transition-all cursor-pointer shrink-0 ${
                        formColor === col
                          ? 'ring-2 ring-white scale-110 shadow-sm'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                      style={{ backgroundColor: col }}
                    >
                      {formColor === col && <Check size={12} className="text-white" />}
                    </button>
                  ))}
                </div>
              </div>

              {/* 表單操作按鈕 */}
              <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveForm()}
                  disabled={!formName.trim()}
                  className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-slate-950 transition-all cursor-pointer shadow-sm active:scale-95"
                >
                  {editingId ? '儲存變更' : '確定新增'}
                </button>
              </div>
            </div>
          )}

          {/* 清單提示列與新增按鈕 */}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              共 <strong className="text-slate-200">{items.length}</strong> 個分類項目
              <span className="text-[11px] text-slate-500 ml-1.5">(拖曳或點箭頭調整順序)</span>
            </span>
            {!isFormOpen && (
              <button
                type="button"
                onClick={handleOpenAddForm}
                className="flex items-center gap-1 px-2.5 py-1 text-xs bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 rounded-lg transition-colors cursor-pointer font-medium"
              >
                <Plus size={13} />
                <span>新增分類</span>
              </button>
            )}
          </div>

          {/* 分類條列清單 */}
          <div className="space-y-1.5">
            {items.map((cat, idx) => {
              const isBeingEdited = editingId === cat.id

              return (
                <div
                  key={cat.id}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`p-2.5 bg-slate-850/80 hover:bg-slate-800/80 border rounded-xl flex items-center justify-between transition-all group ${
                    isBeingEdited
                      ? 'border-emerald-500 ring-1 ring-emerald-500/40'
                      : draggedIndex === idx
                      ? 'border-emerald-400 bg-emerald-500/10 opacity-70'
                      : 'border-slate-800/80 hover:border-slate-750'
                  }`}
                >
                  {/* 左側把手、圖示與名稱 */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    {/* 拖曳把手 */}
                    <div
                      className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5 -ml-1 transition-colors"
                      title="拖曳排序"
                    >
                      <GripVertical size={16} />
                    </div>

                    {/* 圖示 */}
                    <div
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${cat.color}25`, color: cat.color }}
                    >
                      <DynamicIcon name={cat.icon} size={15} />
                    </div>

                    {/* 名稱 */}
                    <span className="text-xs font-semibold text-slate-200 truncate">
                      {cat.name}
                    </span>
                  </div>

                  {/* 右側操作群：上下移動、編輯、刪除 */}
                  <div className="flex items-center gap-1 shrink-0">
                    {/* 上移按鈕 */}
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveUp(idx)}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title="上移"
                    >
                      <ChevronUp size={15} />
                    </button>

                    {/* 下移按鈕 */}
                    <button
                      type="button"
                      disabled={idx === items.length - 1}
                      onClick={() => handleMoveDown(idx)}
                      className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20 disabled:hover:text-slate-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title="下移"
                    >
                      <ChevronDown size={15} />
                    </button>

                    <div className="w-px h-3.5 bg-slate-750 mx-0.5" />

                    {/* 編輯按鈕 */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditForm(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-slate-700/60 transition-colors cursor-pointer"
                      title="編輯名稱或圖示"
                    >
                      <Edit2 size={13} />
                    </button>

                    {/* 刪除按鈕 */}
                    <button
                      type="button"
                      onClick={() => handleDeleteItem(cat)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer"
                      title="刪除分類"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 固定底部列 */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900/95 backdrop-blur-sm shrink-0 flex items-center justify-between gap-3 shadow-lg">
          <button
            type="button"
            onClick={handleResetToDefault}
            className="flex items-center gap-1 px-3 py-2 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer border border-slate-800"
            title="將此群組還原為初始設定"
          >
            <RotateCcw size={13} />
            <span>恢復預設值</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md transition-all cursor-pointer active:scale-95"
          >
            完成設定
          </button>
        </div>
      </div>
    </div>
  )
}
