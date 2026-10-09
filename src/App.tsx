import { useState, useEffect, useMemo } from 'react'
import type { Ledger, Transaction, ViewTab, StorageData } from './types'
import { loadStorageData, saveStorageData } from './utils/storage'
import { getTodayDateString } from './utils/format'
import { Navbar } from './components/Navbar'
import { BottomNav } from './components/BottomNav'
import { OverviewView } from './components/OverviewView'
import { TransactionsView } from './components/TransactionsView'
import { AnalyticsView } from './components/AnalyticsView'
import { LedgersView } from './components/LedgersView'
import { TransactionModal } from './components/TransactionModal'
import { LedgerModal } from './components/LedgerModal'
import { InstallPrompt } from './components/InstallPrompt'
import { VersionModal } from './components/VersionModal'
import { UpdateNotificationBanner } from './components/UpdateNotificationBanner'
import { ReminderModal } from './components/ReminderModal'
import { useAppVersion } from './hooks/useAppVersion'
import { useReminders } from './hooks/useReminders'

export function App() {
  // 核心資料狀態
  const [data, setData] = useState<StorageData>(() => loadStorageData())
  const [activeTab, setActiveTab] = useState<ViewTab>('overview')
  const [hideBalances, setHideBalances] = useState<boolean>(() => {
    return localStorage.getItem('harvest_hide_balances') === 'true'
  })

  // 版本與更新管理
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false)
  const {
    currentVersion,
    buildTime,
    isChecking,
    hasUpdate,
    remoteVersion,
    remoteBuildTime,
    lastCheckMessage,
    isUpdating,
    checkUpdate,
    forceUpdate,
  } = useAppVersion()

  // 彈窗狀態
  const [isTxModalOpen, setIsTxModalOpen] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [defaultTxDate, setDefaultTxDate] = useState<string>('')

  const [isLedgerModalOpen, setIsLedgerModalOpen] = useState(false)
  const [editingLedger, setEditingLedger] = useState<Ledger | null>(null)

  // 定時提醒管理
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false)
  const {
    reminders,
    permission,
    requestPermission,
    toggleReminder,
    deleteReminder,
    saveOrUpdateReminder,
    triggerTestNotification,
  } = useReminders()

  // 當資料更動時，持久化到 localStorage
  useEffect(() => {
    saveStorageData(data)
  }, [data])

  // 切換防窺模式
  const handleToggleHideBalances = () => {
    const nextVal = !hideBalances
    setHideBalances(nextVal)
    localStorage.setItem('harvest_hide_balances', String(nextVal))
  }

  // 取得目前作用中的帳本
  const activeLedger = useMemo(() => {
    const found = data.ledgers.find((l) => l.id === data.activeLedgerId)
    return found || data.ledgers[0]
  }, [data.ledgers, data.activeLedgerId])

  // 切換帳本
  const handleSelectLedger = (ledgerId: string) => {
    setData((prev) => ({
      ...prev,
      activeLedgerId: ledgerId,
    }))
  }

  // --- 交易記錄 CRUD ---
  const handleSaveTransaction = (
    txData: Omit<Transaction, 'id'>,
    editId?: string
  ) => {
    setData((prev) => {
      let updatedTransactions: Transaction[]
      if (editId) {
        // 編輯
        updatedTransactions = prev.transactions.map((t) =>
          t.id === editId ? { ...txData, id: editId } : t
        )
      } else {
        // 新增
        const newTx: Transaction = {
          ...txData,
          id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        }
        updatedTransactions = [newTx, ...prev.transactions]
      }
      return {
        ...prev,
        transactions: updatedTransactions,
      }
    })
  }

  const handleDeleteTransaction = (id: string) => {
    setData((prev) => ({
      ...prev,
      transactions: prev.transactions.filter((t) => t.id !== id),
    }))
  }

  // 打開新增交易彈窗
  const handleOpenNewTransaction = (specificDate?: string) => {
    setEditingTransaction(null)
    setDefaultTxDate(specificDate || getTodayDateString())
    setIsTxModalOpen(true)
  }

  // 打開編輯交易彈窗
  const handleSelectTransactionForEdit = (tx: Transaction) => {
    setEditingTransaction(tx)
    setIsTxModalOpen(true)
  }

  // --- 帳本 CRUD ---
  const handleSaveLedger = (
    ledgerData: Omit<Ledger, 'id' | 'createdAt'>,
    editId?: string
  ) => {
    setData((prev) => {
      let updatedLedgers: Ledger[]
      let activeId = prev.activeLedgerId

      if (editId) {
        // 編輯
        updatedLedgers = prev.ledgers.map((l) =>
          l.id === editId ? { ...l, ...ledgerData } : l
        )
      } else {
        // 新增
        const newId = `ledger-${Date.now()}`
        const newLedger: Ledger = {
          ...ledgerData,
          id: newId,
          createdAt: new Date().toISOString(),
        }
        updatedLedgers = [...prev.ledgers, newLedger]
        activeId = newId // 建立後自動切換至新帳本
      }

      return {
        ...prev,
        ledgers: updatedLedgers,
        activeLedgerId: activeId,
      }
    })
  }

  const handleDeleteLedger = (id: string) => {
    setData((prev) => {
      if (prev.ledgers.length <= 1) {
        // 刪除唯一帳本時，自動為使用者建立全新的空白日常帳本
        const newDefaultLedger: Ledger = {
          id: `ledger-default-${Date.now()}`,
          name: '日常開銷',
          type: 'standard',
          icon: 'Wallet',
          color: '#10b981',
          currency: 'NT$',
          description: '生活飲食、居家雜支、休閒娛樂等收支',
          createdAt: new Date().toISOString(),
        }
        return {
          ...prev,
          ledgers: [newDefaultLedger],
          activeLedgerId: newDefaultLedger.id,
          transactions: [],
        }
      }

      const nextLedgers = prev.ledgers.filter((l) => l.id !== id)
      const nextActiveId =
        prev.activeLedgerId === id ? nextLedgers[0].id : prev.activeLedgerId
      // 同時刪除該帳本的所有交易記錄
      const nextTransactions = prev.transactions.filter((t) => t.ledgerId !== id)

      return {
        ...prev,
        ledgers: nextLedgers,
        activeLedgerId: nextActiveId,
        transactions: nextTransactions,
      }
    })
  }

  // 還原或匯入備份資料
  const handleRestoreData = (restoredData: StorageData) => {
    setData(restoredData)
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-300">
      {/* 頂部導航與帳本切換 */}
      <Navbar
        ledgers={data.ledgers}
        activeLedger={activeLedger}
        onSelectLedger={handleSelectLedger}
        onOpenNewLedgerModal={() => {
          setEditingLedger(null)
          setIsLedgerModalOpen(true)
        }}
        hideBalances={hideBalances}
        onToggleHideBalances={handleToggleHideBalances}
        currentVersion={currentVersion}
        hasUpdate={hasUpdate}
        onOpenVersionModal={() => setIsVersionModalOpen(true)}
        onOpenReminderModal={() => setIsReminderModalOpen(true)}
        hasActiveReminders={reminders.some((r) => r.enabled)}
      />

      {/* 核心內容視圖 */}
      <main className="flex-1">
        {activeTab === 'overview' && (
          <OverviewView
            activeLedger={activeLedger}
            transactions={data.transactions}
            onOpenNewTransaction={() => handleOpenNewTransaction()}
            onSelectTransaction={handleSelectTransactionForEdit}
            onViewAllTransactions={() => setActiveTab('transactions')}
            hideBalances={hideBalances}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionsView
            activeLedger={activeLedger}
            transactions={data.transactions}
            onSelectTransaction={handleSelectTransactionForEdit}
            onOpenNewTransactionWithDate={handleOpenNewTransaction}
            hideBalances={hideBalances}
          />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView
            activeLedger={activeLedger}
            transactions={data.transactions}
            hideBalances={hideBalances}
          />
        )}

        {activeTab === 'ledgers' && (
          <LedgersView
            ledgers={data.ledgers}
            activeLedgerId={data.activeLedgerId}
            transactions={data.transactions}
            onSelectLedger={handleSelectLedger}
            onOpenNewLedgerModal={() => {
              setEditingLedger(null)
              setIsLedgerModalOpen(true)
            }}
            onOpenEditLedgerModal={(ledger) => {
              setEditingLedger(ledger)
              setIsLedgerModalOpen(true)
            }}
            onDeleteLedger={handleDeleteLedger}
            onRestoreData={handleRestoreData}
            hideBalances={hideBalances}
            currentVersion={currentVersion}
            buildTime={buildTime}
            isCheckingVersion={isChecking}
            hasVersionUpdate={hasUpdate}
            remoteVersion={remoteVersion}
            remoteBuildTime={remoteBuildTime}
            lastCheckMessage={lastCheckMessage}
            isUpdatingVersion={isUpdating}
            onCheckUpdate={checkUpdate}
            onForceUpdate={forceUpdate}
            onOpenReminderModal={() => setIsReminderModalOpen(true)}
          />
        )}
      </main>

      {/* 底部導航列 */}
      <BottomNav
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenNewTransaction={() => handleOpenNewTransaction()}
      />

      {/* 記帳彈窗 */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false)
          setEditingTransaction(null)
        }}
        onSave={handleSaveTransaction}
        onDelete={handleDeleteTransaction}
        activeLedger={activeLedger}
        editTransaction={editingTransaction}
        defaultDate={defaultTxDate}
        existingTransactions={data.transactions}
      />

      {/* 帳本彈窗 */}
      <LedgerModal
        isOpen={isLedgerModalOpen}
        onClose={() => {
          setIsLedgerModalOpen(false)
          setEditingLedger(null)
        }}
        onSave={handleSaveLedger}
        onDelete={handleDeleteLedger}
        editLedger={editingLedger}
        totalLedgersCount={data.ledgers.length}
      />

      {/* PWA 安裝提示橫幅 */}
      <InstallPrompt />

      {/* 版本與更新彈窗 */}
      <VersionModal
        isOpen={isVersionModalOpen}
        onClose={() => setIsVersionModalOpen(false)}
        currentVersion={currentVersion}
        buildTime={buildTime}
        isChecking={isChecking}
        hasUpdate={hasUpdate}
        remoteVersion={remoteVersion}
        remoteBuildTime={remoteBuildTime}
        lastCheckMessage={lastCheckMessage}
        isUpdating={isUpdating}
        onCheckUpdate={checkUpdate}
        onForceUpdate={forceUpdate}
      />

      {/* 發現新版本時的浮動提示橫幅 */}
      <UpdateNotificationBanner
        hasUpdate={hasUpdate}
        remoteVersion={remoteVersion}
        isUpdating={isUpdating}
        onForceUpdate={forceUpdate}
      />

      {/* 定時提醒設定彈窗 */}
      <ReminderModal
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        reminders={reminders}
        permission={permission}
        onRequestPermission={requestPermission}
        onToggleReminder={toggleReminder}
        onDeleteReminder={deleteReminder}
        onSaveReminder={saveOrUpdateReminder}
        onTriggerTest={triggerTestNotification}
      />
    </div>
  )
}

export default App
