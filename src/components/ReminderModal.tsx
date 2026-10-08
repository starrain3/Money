import React, { useState } from 'react'
import type { ReminderItem, ReminderFrequency } from '../types'
import {
  getDayOfWeekText,
  formatReminderSchedule,
} from '../utils/reminderStorage'
import { useNotification } from '../context/NotificationContext'
import {
  X,
  Bell,
  BellRing,
  Plus,
  Trash2,
  Edit2,
  Send,
  Clock,
  Check,
} from 'lucide-react'

interface ReminderModalProps {
  isOpen: boolean
  onClose: () => void
  reminders: ReminderItem[]
  permission: NotificationPermission
  onRequestPermission: () => Promise<NotificationPermission>
  onToggleReminder: (id: string, enabled: boolean) => void
  onDeleteReminder: (id: string) => void
  onSaveReminder: (reminderData: Omit<ReminderItem, 'id' | 'createdAt'>, id?: string) => void
  onTriggerTest: (reminder: ReminderItem) => Promise<boolean>
}

export const ReminderModal: React.FC<ReminderModalProps> = ({
  isOpen,
  onClose,
  reminders,
  permission,
  onRequestPermission,
  onToggleReminder,
  onDeleteReminder,
  onSaveReminder,
  onTriggerTest,
}) => {
  const { showToast, showConfirm } = useNotification()

  // 表單編輯狀態
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  // 表單欄位
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [frequency, setFrequency] = useState<ReminderFrequency>('daily')
  const [time, setTime] = useState('21:30')
  const [dayOfWeek, setDayOfWeek] = useState(0) // 0-6
  const [dayOfMonth, setDayOfMonth] = useState(1) // 1-31
  const [monthOfYear, setMonthOfYear] = useState(1) // 1-12
  const [enabled, setEnabled] = useState(true)

  if (!isOpen) return null

  // 開啟新增表單
  const handleOpenAddForm = () => {
    setEditingId(null)
    setTitle('')
    setMessage('')
    setFrequency('daily')
    setTime('21:30')
    setDayOfWeek(0)
    setDayOfMonth(1)
    setMonthOfYear(1)
    setEnabled(true)
    setIsFormOpen(true)
  }

  // 開啟編輯表單
  const handleOpenEditForm = (item: ReminderItem) => {
    setEditingId(item.id)
    setTitle(item.title)
    setMessage(item.message)
    setFrequency(item.frequency)
    setTime(item.time || '21:30')
    setDayOfWeek(item.dayOfWeek !== undefined ? item.dayOfWeek : 0)
    setDayOfMonth(item.dayOfMonth || 1)
    setMonthOfYear(item.monthOfYear || 1)
    setEnabled(item.enabled)
    setIsFormOpen(true)
  }

  // 取消表單
  const handleCancelForm = () => {
    setIsFormOpen(false)
    setEditingId(null)
  }

  // 儲存表單
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      showToast('請輸入提醒標題！', 'warning')
      return
    }
    if (!message.trim()) {
      showToast('請輸入提醒訊息內容！', 'warning')
      return
    }

    onSaveReminder(
      {
        title: title.trim(),
        message: message.trim(),
        frequency,
        time,
        dayOfWeek: frequency === 'weekly' ? dayOfWeek : undefined,
        dayOfMonth: frequency === 'monthly' || frequency === 'yearly' ? dayOfMonth : undefined,
        monthOfYear: frequency === 'yearly' ? monthOfYear : undefined,
        enabled,
      },
      editingId || undefined
    )

    showToast(editingId ? '已更新提醒設定！' : '已成功建立新提醒！', 'success')
    handleCancelForm()
  }

  // 刪除提醒
  const handleDelete = async (item: ReminderItem) => {
    const confirmed = await showConfirm(`確定要刪除「${item.title}」這項提醒嗎？`, {
      title: '刪除提醒確認',
      type: 'danger',
      confirmText: '確定刪除',
    })
    if (confirmed) {
      onDeleteReminder(item.id)
      showToast(`已刪除「${item.title}」提醒`, 'info')
      if (editingId === item.id) {
        handleCancelForm()
      }
    }
  }

  // 測試發送
  const handleTest = async (item: ReminderItem) => {
    await onTriggerTest(item)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-t-3xl sm:rounded-2xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden">
        {/* 頂部標題列 */}
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between shrink-0 bg-slate-900">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <BellRing size={18} />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">定時提醒設定</h3>
              <p className="text-xs text-slate-400">自訂每天、每週或每年週期之記帳與資產提醒</p>
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

        {/* 內容捲動區 */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* 系統推播通知權限狀態橫幅 */}
          <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                  permission === 'granted'
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : permission === 'denied'
                    ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}
              >
                <Bell size={18} />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200">
                  {permission === 'granted'
                    ? '系統推播權限已開啟'
                    : permission === 'denied'
                    ? '系統推播已被瀏覽器封鎖'
                    : '尚未開啟系統推播通知'}
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  {permission === 'granted'
                    ? '時間到達時將發送系統橫幅與應用程式通知'
                    : permission === 'denied'
                    ? '仍可在開啟網頁時收到 App 內部彈窗通知'
                    : '開啟後可在時間到達時於系統桌面上接收推播'}
                </div>
              </div>
            </div>

            {permission !== 'granted' && (
              <button
                type="button"
                onClick={onRequestPermission}
                className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 text-xs font-medium shrink-0 transition-colors cursor-pointer"
              >
                啟用推播
              </button>
            )}
          </div>

          {/* 新增 / 編輯表單 */}
          {isFormOpen ? (
            <form
              onSubmit={handleSubmitForm}
              className="p-4 rounded-2xl bg-slate-950/90 border border-emerald-500/30 space-y-3.5 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-sm font-semibold text-emerald-400">
                  {editingId ? '編輯提醒' : '新增提醒'}
                </span>
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  取消
                </button>
              </div>

              {/* 標題 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">提醒標題</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：每日記帳備忘、週末收支檢查"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* 訊息內容 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">訊息內容</label>
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="輸入提醒時顯示的內容..."
                  rows={2}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 resize-none"
                  required
                />
              </div>

              {/* 頻率切換按鈕群 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">提醒頻率</label>
                <div className="grid grid-cols-4 gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-xl">
                  {(
                    [
                      { key: 'daily', label: '每天' },
                      { key: 'weekly', label: '每週' },
                      { key: 'monthly', label: '每月' },
                      { key: 'yearly', label: '每年' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setFrequency(f.key)}
                      className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                        frequency === f.key
                          ? 'bg-emerald-500 text-slate-950 font-bold shadow'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 週幾選擇 (每週) */}
              {frequency === 'weekly' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    指定每週幾
                  </label>
                  <div className="grid grid-cols-7 gap-1">
                    {[1, 2, 3, 4, 5, 6, 0].map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDayOfWeek(d)}
                        className={`py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                          dayOfWeek === d
                            ? 'bg-teal-500 text-slate-950 font-bold'
                            : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        {getDayOfWeekText(d).replace('週', '')}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* 每月幾號 (每月) */}
              {frequency === 'monthly' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    指定每月日期
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">每月</span>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d} 號
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 每年幾月幾日 (每年) */}
              {frequency === 'yearly' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    指定每年日期
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">每年</span>
                    <select
                      value={monthOfYear}
                      onChange={(e) => setMonthOfYear(parseInt(e.target.value, 10))}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          {m} 月
                        </option>
                      ))}
                    </select>
                    <select
                      value={dayOfMonth}
                      onChange={(e) => setDayOfMonth(parseInt(e.target.value, 10))}
                      className="px-3 py-1.5 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                    >
                      {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                        <option key={d} value={d}>
                          {d} 日
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              {/* 時間選擇 */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center gap-1.5">
                  <Clock size={13} className="text-emerald-400" />
                  提醒時間 (24 小時制)
                </label>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="px-3 py-2 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              {/* 是否啟用 */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-300">儲存後立即啟用此提醒</span>
                <button
                  type="button"
                  onClick={() => setEnabled(!enabled)}
                  className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                    enabled ? 'bg-emerald-500' : 'bg-slate-700'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform absolute top-0.5 ${
                      enabled ? 'right-0.5' : 'left-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* 儲存按鈕 */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleCancelForm}
                  className="px-3.5 py-2 rounded-xl text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-emerald-500 hover:bg-emerald-400 transition-colors shadow-lg shadow-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                >
                  <Check size={14} />
                  {editingId ? '儲存變更' : '建立提醒'}
                </button>
              </div>
            </form>
          ) : (
            <button
              type="button"
              onClick={handleOpenAddForm}
              className="w-full py-2.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus size={15} />
              新增自訂定時提醒
            </button>
          )}

          {/* 提醒項目清單 */}
          <div className="space-y-2.5">
            <div className="text-xs font-semibold text-slate-400 px-1">
              現有提醒列表 ({reminders.length})
            </div>

            {reminders.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 rounded-2xl border border-slate-800/80">
                <Bell size={28} className="mx-auto text-slate-600 mb-2" />
                <p className="text-xs text-slate-400">目前尚未設定任何提醒</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  點擊上方按鈕新增每天、每週或每年提醒吧！
                </p>
              </div>
            ) : (
              reminders.map((r) => {
                const scheduleText = formatReminderSchedule(r)
                return (
                  <div
                    key={r.id}
                    className={`p-3.5 rounded-2xl border transition-all ${
                      r.enabled
                        ? 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        : 'bg-slate-950/40 border-slate-800/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-sm font-bold text-white tracking-wide">
                            {r.title}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                              r.frequency === 'daily'
                                ? 'bg-blue-500/15 border-blue-500/30 text-blue-400'
                                : r.frequency === 'weekly'
                                ? 'bg-teal-500/15 border-teal-500/30 text-teal-400'
                                : r.frequency === 'monthly'
                                ? 'bg-purple-500/15 border-purple-500/30 text-purple-400'
                                : 'bg-amber-500/15 border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {scheduleText}
                          </span>
                        </div>

                        <p className="text-xs text-slate-300 mt-1.5 leading-relaxed break-words">
                          {r.message}
                        </p>
                      </div>

                      {/* 啟用開關 */}
                      <button
                        type="button"
                        onClick={() => onToggleReminder(r.id, !r.enabled)}
                        className={`w-9 h-5 rounded-full transition-colors relative shrink-0 cursor-pointer ${
                          r.enabled ? 'bg-emerald-500' : 'bg-slate-700'
                        }`}
                        title={r.enabled ? '點擊停用' : '點擊啟用'}
                      >
                        <div
                          className={`w-4 h-4 rounded-full bg-white transition-transform absolute top-0.5 ${
                            r.enabled ? 'right-0.5' : 'left-0.5'
                          }`}
                        />
                      </button>
                    </div>

                    {/* 操作區 */}
                    <div className="flex items-center justify-end gap-1.5 mt-3 pt-2 border-t border-slate-800/60">
                      <button
                        type="button"
                        onClick={() => handleTest(r)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
                        title="立即測試此通知"
                      >
                        <Send size={11} className="text-emerald-400" />
                        測試通知
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenEditForm(r)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors cursor-pointer"
                        title="編輯"
                      >
                        <Edit2 size={12} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                        title="刪除"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* 底部關閉按鈕 */}
        <div className="px-5 py-3 border-t border-slate-800 bg-slate-900 shrink-0 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            關閉
          </button>
        </div>
      </div>
    </div>
  )
}
