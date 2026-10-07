import React, { useRef, useState } from 'react'
import type { Ledger, Transaction, StorageData } from '../types'
import { DynamicIcon } from './DynamicIcon'
import { formatMoney } from '../utils/format'
import {
  exportDataAsJSON,
  importDataFromJSON,
} from '../utils/storage'
import {
  exportLedgerToCSV,
  exportAllLedgersToCSV,
  parseExcelOrCSVFile,
} from '../utils/csv'
import { formatFeeConfigSummary, getDefaultFeeConfig } from '../utils/fee'
import {
  Plus,
  Edit2,
  FileSpreadsheet,
  Download,
  Upload,
  ShieldCheck,
  Check,
  Sparkles,
  Trash2,
  FileUp,
  FileDown,
  Merge,
  RefreshCw,
  Zap,
  Clock,
  CheckCircle2,
} from 'lucide-react'
import { MergeLedgersModal } from './MergeLedgersModal'

interface LedgersViewProps {
  ledgers: Ledger[]
  activeLedgerId: string
  transactions: Transaction[]
  onSelectLedger: (id: string) => void
  onOpenNewLedgerModal: () => void
  onOpenEditLedgerModal: (ledger: Ledger) => void
  onDeleteLedger: (id: string) => void
  onRestoreData: (data: StorageData) => void
  hideBalances: boolean
  currentVersion?: string
  buildTime?: string
  isCheckingVersion?: boolean
  hasVersionUpdate?: boolean
  remoteVersion?: string
  remoteBuildTime?: string
  lastCheckMessage?: string | null
  isUpdatingVersion?: boolean
  onCheckUpdate?: () => void
  onForceUpdate?: () => void
}

export const LedgersView: React.FC<LedgersViewProps> = ({
  ledgers,
  activeLedgerId,
  transactions,
  onSelectLedger,
  onOpenNewLedgerModal,
  onOpenEditLedgerModal,
  onDeleteLedger,
  onRestoreData,
  hideBalances,
  currentVersion,
  buildTime,
  isCheckingVersion = false,
  hasVersionUpdate = false,
  remoteVersion,
  remoteBuildTime,
  lastCheckMessage,
  isUpdatingVersion = false,
  onCheckUpdate,
  onForceUpdate,
}) => {
  const jsonFileInputRef = useRef<HTMLInputElement>(null)
  const csvFileInputRef = useRef<HTMLInputElement>(null)
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false)

  // 取得當前作用中的帳本
  const activeLedger = ledgers.find((l) => l.id === activeLedgerId) || ledgers[0]

  // 匯入 JSON 檔案
  const handleJsonFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const data = await importDataFromJSON(file)
      if (confirm(`確認匯入？這將會覆蓋現有資料（包含 ${data.ledgers.length} 個帳本與 ${data.transactions.length} 筆明細）。`)) {
        onRestoreData(data)
        alert('備份資料匯入成功！')
      }
    } catch (err: unknown) {
      alert(`匯入失敗：${err instanceof Error ? err.message : '未知錯誤'}`)
    } finally {
      if (jsonFileInputRef.current) {
        jsonFileInputRef.current.value = ''
      }
    }
  }

  // 匯入 Excel (.xlsx / .xls) 或 CSV 檔案 (預設自動建立專屬帳本)
  const handleExcelOrCsvFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      const result = await parseExcelOrCSVFile(file, activeLedgerId, ledgers)

      if (result.successCount === 0) {
        alert('無法從檔案中讀取到有效的記帳資料，請檢查檔案內容或格式。')
        return
      }

      // 自動產生新帳本
      const newLedgerId = `ledger-${Date.now()}`
      const ledgerColor =
        result.formatType === 'futures_statement'
          ? '#f59e0b'
          : result.formatType === 'stock_statement'
          ? '#3b82f6'
          : '#10b981'

      let typeDesc = '一般收支'
      if (result.formatType === 'futures_statement') typeDesc = '期貨損益'
      else if (result.formatType === 'stock_statement') typeDesc = '股票投資'

      let detailsMsg = ''
      if (result.formatType === 'futures_statement') {
        const netStr = (result.totalNet || 0) >= 0 ? `+${(result.totalNet || 0).toLocaleString()}` : `${(result.totalNet || 0).toLocaleString()}`
        if (result.buyCount !== undefined && result.sellCount !== undefined) {
          detailsMsg = `\n- 成交統計：買進 ${result.buyCount} 筆、賣出 ${result.sellCount} 筆\n- 累計名目差額：${netStr} 元`
        } else {
          detailsMsg = `\n- 損益統計：獲利 ${result.profitCount || 0} 筆、虧損 ${result.lossCount || 0} 筆\n- 累積總淨損益：${netStr} 元`
        }
      } else if (result.formatType === 'stock_statement') {
        detailsMsg = `\n- 包含：買進 ${result.buyCount || 0} 筆、賣出 ${result.sellCount || 0} 筆`
      }

      const confirmMsg = `🎉 成功解析出 ${result.successCount} 筆明細 (${typeDesc})！${detailsMsg}\n\n系統已預設為您建立新專屬帳本：【${result.targetLedgerName}】。\n\n點擊「確定」立即建立帳本並匯入資料；\n點擊「取消」則中止匯入。`

      const shouldCreateAndImport = confirm(confirmMsg)

      if (shouldCreateAndImport) {
        const newLedger: Ledger = {
          id: newLedgerId,
          name: result.targetLedgerName,
          type: result.suggestedLedgerType,
          icon: result.suggestedLedgerType === 'futures' ? 'Zap' : result.suggestedLedgerType === 'stock' ? 'TrendingUp' : 'Wallet',
          color: ledgerColor,
          currency: 'NT$',
          description: `由 ${file.name} 自動匯入建立`,
          feeConfig: getDefaultFeeConfig(result.suggestedLedgerType),
          createdAt: new Date().toISOString(),
        }

        // 將這批明細全部歸屬至新建立的帳本
        const importedTransactions = result.transactions.map((t) => ({
          ...t,
          ledgerId: newLedgerId,
        }))

        onRestoreData({
          version: 1,
          ledgers: [...ledgers, newLedger],
          transactions: [...importedTransactions, ...transactions],
          activeLedgerId: newLedgerId, // 自動切換至新建立的帳本
        })

        alert(`🎉 已成功為您建立帳本【${result.targetLedgerName}】，並匯入 ${result.successCount} 筆明細！`)
      }
    } catch (err: unknown) {
      alert(`檔案匯入失敗：${err instanceof Error ? err.message : '未知錯誤'}`)
    } finally {
      if (csvFileInputRef.current) {
        csvFileInputRef.current.value = ''
      }
    }
  }

  // 合併帳本處理常式
  const handleMergeLedgers = (sourceId: string, targetId: string, deleteSource: boolean) => {
    const sourceLedger = ledgers.find((l) => l.id === sourceId)
    const targetLedger = ledgers.find((l) => l.id === targetId)
    const count = transactions.filter((t) => t.ledgerId === sourceId).length

    // 將所有來源帳本的交易 ID 轉換為目標帳本 ID
    const updatedTransactions = transactions.map((t) =>
      t.ledgerId === sourceId ? { ...t, ledgerId: targetId } : t
    )

    let updatedLedgers = ledgers
    let nextActiveId = activeLedgerId

    if (deleteSource) {
      updatedLedgers = ledgers.filter((l) => l.id !== sourceId)
      if (activeLedgerId === sourceId) {
        nextActiveId = targetId
      }
    }

    onRestoreData({
      version: 1,
      ledgers: updatedLedgers,
      transactions: updatedTransactions,
      activeLedgerId: nextActiveId,
    })

    alert(`🎉 成功將【${sourceLedger?.name}】的 ${count} 筆明細全部合併至【${targetLedger?.name}】！`)
  }

  // 清空所有明細資料 (清空所有記帳，保留帳本設定)
  const handleClearAllTransactions = () => {
    if (confirm('確定要清空所有記帳記錄嗎？\n您的帳本設定將會完整保留，帳目清空後即可開始全新的個人記帳！')) {
      onRestoreData({
        version: 1,
        ledgers,
        transactions: [],
        activeLedgerId,
      })
      alert('已成功清空所有記帳資料！')
    }
  }

  const maskValue = (val: string) => (hideBalances ? '••••••' : val)

  return (
    <div className="space-y-6 pb-28 max-w-4xl mx-auto px-4 pt-3">
      {/* 隱藏的 JSON 檔案上傳輸入 */}
      <input
        type="file"
        ref={jsonFileInputRef}
        onChange={handleJsonFileChange}
        accept=".json"
        className="hidden"
      />

      {/* 隱藏的 Excel / CSV 檔案上傳輸入 */}
      <input
        type="file"
        ref={csvFileInputRef}
        onChange={handleExcelOrCsvFileChange}
        accept=".xlsx,.xls,.csv,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        className="hidden"
      />

      {/* 帳本列表區塊 */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-slate-100 text-base">我的帳本列表</h3>
            <p className="text-xs text-slate-400">分開管理日常開銷、股票投資或各類專項預算</p>
          </div>
          <div className="flex items-center gap-2">
            {ledgers.length >= 2 && (
              <button
                onClick={() => setIsMergeModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-teal-300 font-medium text-xs border border-teal-500/30 transition-all cursor-pointer shadow-sm"
                title="將兩個帳本的明細合併"
              >
                <Merge size={13} />
                合併帳本
              </button>
            )}
            <button
              onClick={onOpenNewLedgerModal}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs shadow-md shadow-emerald-500/20 transition-all cursor-pointer"
            >
              <Plus size={15} />
              新增帳本
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {ledgers.map((ledger) => {
            const isSelected = ledger.id === activeLedgerId
            const ledgerTransactions = transactions.filter((t) => t.ledgerId === ledger.id)

            // 計算該帳本累計結餘或淨投入
            let totalIncome = 0
            let totalExpense = 0
            let stockBuy = 0
            let stockSell = 0
            let dividend = 0

            ledgerTransactions.forEach((t) => {
              if (t.type === 'income') totalIncome += t.amount
              else if (t.type === 'expense') totalExpense += t.amount
              else if (t.type === 'stock_buy') stockBuy += t.amount
              else if (t.type === 'stock_sell') stockSell += t.amount
              else if (t.type === 'dividend') dividend += t.amount
            })

            const netBalance = totalIncome - totalExpense
            const netStockInvested = stockBuy - stockSell - dividend

            return (
              <div
                key={ledger.id}
                onClick={() => onSelectLedger(ledger.id)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer relative overflow-hidden group ${
                  isSelected
                    ? 'bg-slate-900 border-emerald-500/60 shadow-lg shadow-emerald-500/5'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* 選取狀態指示角標 */}
                {isSelected && (
                  <div className="absolute top-3 right-3 flex items-center gap-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full text-[10px] font-medium">
                    <Check size={11} /> 目前使用中
                  </div>
                )}

                <div className="flex items-start gap-3.5 mb-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md"
                    style={{ backgroundColor: `${ledger.color}25`, color: ledger.color }}
                  >
                    <DynamicIcon name={ledger.icon} size={24} />
                  </div>

                  <div className="flex-1 pr-14">
                    <h4 className="font-bold text-white text-base">{ledger.name}</h4>
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-medium">
                        {ledger.type === 'futures'
                          ? '⚡ 期貨損益'
                          : ledger.type === 'stock'
                          ? '📈 股票投資'
                          : '💰 一般收支'}
                      </span>
                      {(ledger.type === 'stock' || ledger.type === 'futures') && (
                        <span
                          className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                            ledger.type === 'stock'
                              ? 'bg-blue-500/10 text-blue-300 border-blue-500/20'
                              : 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                          }`}
                          title="預設手續費規則"
                        >
                          手續費: {formatFeeConfigSummary(ledger.feeConfig, ledger.type)}
                        </span>
                      )}
                    </div>
                    {ledger.description && (
                      <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                        {ledger.description}
                      </p>
                    )}
                  </div>
                </div>

                {/* 數據概況 */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-400">
                      {ledger.type === 'futures'
                        ? '累計淨損益'
                        : ledger.type === 'stock'
                        ? '累計淨投入'
                        : '累計結餘'}
                    </span>
                    <div
                      className={`text-sm font-bold ${
                        ledger.type === 'futures'
                          ? netBalance >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                          : 'text-slate-100'
                      }`}
                    >
                      {ledger.type === 'futures' && netBalance > 0 ? '+' : ''}
                      {maskValue(
                        formatMoney(
                          ledger.type === 'stock' ? netStockInvested : netBalance,
                          ledger.currency
                        )
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 text-[11px]">
                      {ledgerTransactions.length} 筆記帳
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenEditLedgerModal(ledger)
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors cursor-pointer"
                      title="編輯帳本"
                    >
                      <Edit2 size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        exportLedgerToCSV(ledger, transactions)
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 rounded-lg transition-colors cursor-pointer"
                      title="匯出此帳本 CSV (Excel)"
                    >
                      <FileSpreadsheet size={13} />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        const confirmMsg =
                          ledgers.length <= 1
                            ? `「${ledger.name}」是您目前唯一的帳本。刪除後將清除所有記錄，並自動為您建立一個全新的空白「日常開銷」帳本，確定要刪除嗎？`
                            : `確定要刪除「${ledger.name}」帳本及其所有 ${ledgerTransactions.length} 筆記帳記錄嗎？此動作無法復原。`
                        if (confirm(confirmMsg)) {
                          onDeleteLedger(ledger.id)
                        }
                      }}
                      className="p-1.5 bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 rounded-lg transition-colors cursor-pointer"
                      title="刪除此帳本"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* CSV / Excel 試算表匯出與匯入專區 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
            <FileSpreadsheet size={17} className="text-emerald-400" />
            Excel / CSV 試算表匯出與匯入 (支援券商對帳單)
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            支援將帳目匯出為標準 UTF-8 繁體中文 CSV 檔案；並完美支援直接匯入【台灣券商證券交易對帳單.xlsx】或一般 Excel / CSV 記帳明細！
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={() => exportLedgerToCSV(activeLedger, transactions)}
            className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            title={`匯出「${activeLedger.name}」的所有記帳明細為 CSV`}
          >
            <FileDown size={15} className="text-emerald-400" />
            匯出【{activeLedger.name}】CSV
          </button>

          <button
            onClick={() => exportAllLedgersToCSV(ledgers, transactions)}
            className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 transition-colors cursor-pointer"
            title="匯出所有帳本的合併明細為 CSV"
          >
            <FileSpreadsheet size={15} className="text-teal-400" />
            匯出【全部帳本】CSV
          </button>

          <button
            onClick={() => csvFileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-emerald-500/20 to-teal-500/20 hover:from-emerald-500/30 hover:to-teal-500/30 border border-emerald-500/40 rounded-xl text-xs font-medium text-emerald-300 transition-colors cursor-pointer shadow-sm"
            title="選擇 Excel (.xlsx) 或 CSV 檔案並匯入記帳明細"
          >
            <FileUp size={15} className="text-emerald-400" />
            匯入 Excel / CSV 明細
          </button>
        </div>
      </div>

      {/* 資料備份與 JSON 完整還原 */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div>
          <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
            <ShieldCheck size={17} className="text-emerald-400" />
            系統備份與資料重置
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            本系統為純前端離線 PWA，所有帳本與記帳資料 100% 存放於您手機或電腦的本地瀏覽器，不會上傳至任何伺服器。建議定期匯出 JSON 備份。
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
          <button
            onClick={() => exportDataAsJSON({ version: 1, ledgers, transactions, activeLedgerId })}
            className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <Download size={15} className="text-emerald-400" />
            匯出 JSON 備份
          </button>

          <button
            onClick={() => jsonFileInputRef.current?.click()}
            className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 transition-colors cursor-pointer"
          >
            <Upload size={15} className="text-blue-400" />
            匯入 JSON 備份
          </button>

          <button
            onClick={handleClearAllTransactions}
            className="flex items-center justify-center gap-2 p-3 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-xl text-xs font-medium text-rose-400 transition-colors cursor-pointer"
            title="清空所有記帳記錄（保留日常開銷與股票投資帳本設定）"
          >
            <Trash2 size={15} />
            清空所有記帳記錄
          </button>
        </div>
      </div>

      {/* 系統版本與更新機制 */}
      {currentVersion && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-100 text-sm flex items-center gap-2">
                <Sparkles size={17} className="text-emerald-400" />
                系統版本與更新機制
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                專為 GitHub Pages 與 PWA 快取設計，若發布新版可隨時一鍵強制更新。
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20 font-mono">
                v{currentVersion}
              </span>
            </div>
          </div>

          <div className="bg-slate-800/50 border border-slate-700/60 rounded-xl p-3.5 space-y-2.5 text-xs">
            <div className="flex items-center justify-between text-slate-300">
              <span className="flex items-center gap-1.5 text-slate-400">
                <Clock size={13} className="text-slate-500" />
                當前建置時間
              </span>
              <span className="font-mono text-slate-300">{buildTime || '未知'}</span>
            </div>

            {hasVersionUpdate && (
              <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-amber-300 font-medium">
                <span>發現新版本發布：</span>
                <span className="font-mono font-bold bg-amber-500/20 px-2 py-0.5 rounded border border-amber-500/40">
                  v{remoteVersion} ({remoteBuildTime})
                </span>
              </div>
            )}

            {lastCheckMessage && !hasVersionUpdate && (
              <div className="pt-2 border-t border-slate-700/60 flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{lastCheckMessage}</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
            {onCheckUpdate && (
              <button
                onClick={onCheckUpdate}
                disabled={isCheckingVersion || isUpdatingVersion}
                className="flex items-center justify-center gap-2 p-3 bg-slate-800 hover:bg-slate-750 border border-slate-700/80 rounded-xl text-xs font-medium text-slate-200 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw
                  size={14}
                  className={isCheckingVersion ? 'animate-spin text-emerald-400' : 'text-slate-400'}
                />
                {isCheckingVersion ? '正在檢查更新...' : '檢查新版本'}
              </button>
            )}

            {onForceUpdate && (
              <button
                onClick={onForceUpdate}
                disabled={isUpdatingVersion}
                className="flex items-center justify-center gap-2 p-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl text-xs font-semibold text-white shadow-lg shadow-emerald-500/20 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                title="清除瀏覽器快取與 Service Worker 並重新獲取最新版本"
              >
                <Zap size={14} className={isUpdatingVersion ? 'animate-bounce' : ''} />
                {isUpdatingVersion ? '正在清除快取重整中...' : '⚡ 強制更新 (清除快取)'}
              </button>
            )}
          </div>

          <div className="flex items-start gap-2 text-[11px] text-slate-400 bg-slate-800/30 border border-slate-800 rounded-xl p-2.5">
            <ShieldCheck size={15} className="text-emerald-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>安全保證</strong>：點擊「強制更新」僅會清除 Service Worker 與網頁靜態快取，<strong>絕不會刪除您的本地記帳與帳本資料</strong>。
            </p>
          </div>
        </div>
      )}

      {/* PWA 離線與安裝指引 */}
      <div className="bg-gradient-to-br from-slate-900 to-emerald-950/40 border border-emerald-500/20 rounded-2xl p-5 shadow-lg space-y-3">
        <h4 className="font-semibold text-white text-sm flex items-center gap-2">
          <Sparkles size={16} className="text-emerald-400" />
          PWA 手機桌面安裝指南
        </h4>
        <div className="text-xs text-slate-300 space-y-1.5 leading-relaxed">
          <p>
            • <strong>iPhone / iPad (Safari)</strong>：點選瀏覽器底部的「分享」按鈕 ➔ 滑動找到「加入主畫面 (Add to Home Screen)」，即可像原生 App 一樣全螢幕使用。
          </p>
          <p>
            • <strong>Android (Chrome)</strong>：點選右上角三點選單 ➔ 點選「安裝應用程式」或「加到主畫面」。
          </p>
          <p>
            • <strong>離線能力</strong>：已配置 Service Worker 快取，在沒有網路或飛航模式下依然能完整記帳與瀏覽數據。
          </p>
        </div>
      </div>

      {/* 合併帳本彈窗 */}
      <MergeLedgersModal
        isOpen={isMergeModalOpen}
        onClose={() => setIsMergeModalOpen(false)}
        ledgers={ledgers}
        transactions={transactions}
        onMerge={handleMergeLedgers}
      />
    </div>
  )
}
