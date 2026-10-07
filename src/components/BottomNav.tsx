import React from 'react'
import type { ViewTab } from '../types'
import { LayoutDashboard, ReceiptText, Plus, PieChart, BookCopy } from 'lucide-react'

interface BottomNavProps {
  activeTab: ViewTab
  onSelectTab: (tab: ViewTab) => void
  onOpenNewTransaction: () => void
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenNewTransaction,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-30 bg-slate-900/90 backdrop-blur-xl border-t border-slate-800/80 px-4 py-2 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))]">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        {/* 總覽 */}
        <button
          onClick={() => onSelectTab('overview')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'overview'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutDashboard size={20} className={activeTab === 'overview' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">總覽</span>
        </button>

        {/* 明細 */}
        <button
          onClick={() => onSelectTab('transactions')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'transactions'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ReceiptText size={20} className={activeTab === 'transactions' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">明細</span>
        </button>

        {/* 中間大圓形按鈕：記一筆 */}
        <div className="relative -top-4 flex items-center justify-center">
          <button
            onClick={onOpenNewTransaction}
            className="w-13 h-13 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 hover:scale-105 active:scale-95 transition-all cursor-pointer ring-4 ring-slate-900"
            aria-label="新增記帳"
          >
            <Plus size={26} strokeWidth={2.5} />
          </button>
        </div>

        {/* 統計分析 */}
        <button
          onClick={() => onSelectTab('analytics')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'analytics'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <PieChart size={20} className={activeTab === 'analytics' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">分析</span>
        </button>

        {/* 多帳本與設定 */}
        <button
          onClick={() => onSelectTab('ledgers')}
          className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer ${
            activeTab === 'ledgers'
              ? 'text-emerald-400 font-semibold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <BookCopy size={20} className={activeTab === 'ledgers' ? 'scale-110 transition-transform' : ''} />
          <span className="text-[10px] mt-1">帳本</span>
        </button>
      </div>
    </nav>
  )
}
