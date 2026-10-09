import React, { useState, useRef, useEffect } from 'react'
import type { Ledger } from '../types'
import { DynamicIcon } from './DynamicIcon'
import { ChevronDown, Plus, Eye, EyeOff, WifiOff, Bell } from 'lucide-react'

interface NavbarProps {
  ledgers: Ledger[]
  activeLedger: Ledger
  onSelectLedger: (id: string) => void
  onOpenNewLedgerModal: () => void
  hideBalances: boolean
  onToggleHideBalances: () => void
  currentVersion?: string
  hasUpdate?: boolean
  onOpenVersionModal?: () => void
  onOpenReminderModal?: () => void
  hasActiveReminders?: boolean
}

export const Navbar: React.FC<NavbarProps> = ({
  ledgers,
  activeLedger,
  onSelectLedger,
  onOpenNewLedgerModal,
  hideBalances,
  onToggleHideBalances,
  currentVersion,
  hasUpdate,
  onOpenVersionModal,
  onOpenReminderModal,
  hasActiveReminders = false,
}) => {
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [isOnline, setIsOnline] = useState(navigator.onLine)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // 點選外部關閉選單
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <header className="sticky top-0 z-30 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* 左側：帳本切換下拉選單 */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 transition-all text-left group cursor-pointer"
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 shadow-sm"
              style={{ backgroundColor: `${activeLedger.color}20`, color: activeLedger.color }}
            >
              <DynamicIcon name={activeLedger.icon} size={18} />
            </div>

            <div className="flex flex-col pr-1">
              <span className="text-[10px] text-slate-400 leading-tight">目前帳本</span>
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm text-slate-100">{activeLedger.name}</span>
                {activeLedger.type === 'stock' && (
                  <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded-md font-medium border border-blue-500/30">
                    股票
                  </span>
                )}
              </div>
            </div>

            <ChevronDown
              size={16}
              className={`text-slate-400 transition-transform duration-200 ${
                dropdownOpen ? 'rotate-180 text-emerald-400' : 'group-hover:text-slate-300'
              }`}
            />
          </button>

          {/* 下拉選單浮動面板 */}
          {dropdownOpen && (
            <div className="absolute top-full left-0 mt-2 w-64 bg-slate-900/95 border border-slate-700/80 rounded-2xl shadow-2xl backdrop-blur-xl p-2 z-50 animate-in fade-in zoom-in-95 duration-150">
              <div className="flex items-center gap-2 px-2 py-1.5 mb-1 border-b border-slate-800">
                <img
                  src="pwa-192x192.png"
                  alt="Ku Money"
                  className="w-5 h-5 rounded-md object-cover shadow-sm"
                />
                <span className="text-xs font-semibold text-slate-200">Ku Money</span>
                <span className="text-[10px] text-slate-400 ml-auto">切換帳本</span>
              </div>

              <div className="space-y-1 max-h-60 overflow-y-auto">
                {ledgers.map((ledger) => {
                  const isSelected = ledger.id === activeLedger.id
                  return (
                    <button
                      key={ledger.id}
                      onClick={() => {
                        onSelectLedger(ledger.id)
                        setDropdownOpen(false)
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded-xl transition-all text-left cursor-pointer ${
                        isSelected
                          ? 'bg-slate-800 border border-emerald-500/40 text-emerald-300'
                          : 'hover:bg-slate-800/60 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                          style={{ backgroundColor: `${ledger.color}20`, color: ledger.color }}
                        >
                          <DynamicIcon name={ledger.icon} size={15} />
                        </div>
                        <div>
                          <div className="text-xs font-medium flex items-center gap-1.5">
                            {ledger.name}
                            {ledger.type === 'stock' && (
                              <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1 py-0.2 rounded font-normal">
                                股票
                              </span>
                            )}
                          </div>
                          {ledger.description && (
                            <div className="text-[10px] text-slate-400 truncate max-w-[120px]">
                              {ledger.description}
                            </div>
                          )}
                        </div>
                      </div>

                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" />
                      )}
                    </button>
                  )
                })}
              </div>

              <div className="border-t border-slate-800 mt-2 pt-2">
                <button
                  onClick={() => {
                    setDropdownOpen(false)
                    onOpenNewLedgerModal()
                  }}
                  className="w-full flex items-center justify-center gap-1.5 p-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-medium border border-emerald-500/30 transition-all cursor-pointer"
                >
                  <Plus size={14} />
                  新增帳本
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 右側操作按鈕 */}
        <div className="flex items-center gap-2">
          {currentVersion && onOpenVersionModal && (
            <button
              onClick={onOpenVersionModal}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-300 hover:text-white transition-all text-xs font-mono cursor-pointer active:scale-95"
              title={`版本: v${currentVersion}（點擊查看更新）`}
            >
              <span>v{currentVersion}</span>
              {hasUpdate && (
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-sm shadow-emerald-400" />
              )}
            </button>
          )}

          {!isOnline && (
            <div
              className="flex items-center gap-1 px-2 py-1 bg-amber-500/15 border border-amber-500/30 text-amber-300 rounded-lg text-xs"
              title="目前處於離線狀態，PWA 仍可照常使用並儲存於本地"
            >
              <WifiOff size={13} />
              <span className="text-[10px] hidden sm:inline">離線模式</span>
            </div>
          )}

          {onOpenReminderModal && (
            <button
              onClick={onOpenReminderModal}
              className="relative p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-amber-300 transition-colors cursor-pointer"
              title="定時提醒設定"
              aria-label="定時提醒設定"
            >
              <Bell size={18} />
              {hasActiveReminders && (
                <span className="w-2 h-2 rounded-full bg-amber-400 absolute top-1.5 right-1.5 shadow-sm shadow-amber-400" />
              )}
            </button>
          )}

          <button
            onClick={onToggleHideBalances}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title={hideBalances ? '顯示金額' : '隱藏金額 (防窺模式)'}
            aria-label="防窺模式開關"
          >
            {hideBalances ? <EyeOff size={18} /> : <Eye size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
