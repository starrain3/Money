import type { CategoryItem } from '../types'

export const EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'exp_food', name: '餐飲美食', type: 'expense', icon: 'Utensils', color: '#f97316' },
  { id: 'exp_transport', name: '交通通勤', type: 'expense', icon: 'Car', color: '#3b82f6' },
  { id: 'exp_shopping', name: '日常購物', type: 'expense', icon: 'ShoppingBag', color: '#ec4899' },
  { id: 'exp_housing', name: '居家水電', type: 'expense', icon: 'Home', color: '#8b5cf6' },
  { id: 'exp_entertainment', name: '休閒娛樂', type: 'expense', icon: 'Gamepad2', color: '#06b6d4' },
  { id: 'exp_medical', name: '醫療保健', type: 'expense', icon: 'HeartPulse', color: '#ef4444' },
  { id: 'exp_education', name: '學習進修', type: 'expense', icon: 'GraduationCap', color: '#10b981' },
  { id: 'exp_social', name: '社交送禮', type: 'expense', icon: 'Gift', color: '#f59e0b' },
  { id: 'exp_other', name: '其他支出', type: 'expense', icon: 'MoreHorizontal', color: '#64748b' },
]

export const INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'inc_salary', name: '正職薪資', type: 'income', icon: 'Briefcase', color: '#10b981' },
  { id: 'inc_bonus', name: '獎金紅利', type: 'income', icon: 'Award', color: '#eab308' },
  { id: 'inc_side', name: '副業接案', type: 'income', icon: 'Laptop', color: '#06b6d4' },
  { id: 'inc_invest', name: '投資回報', type: 'income', icon: 'TrendingUp', color: '#3b82f6' },
  { id: 'inc_interest', name: '銀行利息', type: 'income', icon: 'PiggyBank', color: '#8b5cf6' },
  { id: 'inc_other', name: '其他收入', type: 'income', icon: 'DollarSign', color: '#64748b' },
]

export const STOCK_CATEGORIES: CategoryItem[] = [
  { id: 'stk_buy', name: '股票買進', type: 'stock', icon: 'ArrowDownRight', color: '#3b82f6' },
  { id: 'stk_sell', name: '股票賣出', type: 'stock', icon: 'ArrowUpRight', color: '#10b981' },
  { id: 'stk_dividend', name: '現金股息', type: 'stock', icon: 'Coins', color: '#eab308' },
  { id: 'stk_fee', name: '交易稅費', type: 'stock', icon: 'Receipt', color: '#ef4444' },
]

export const STOCK_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'stk_exp_fee', name: '交易稅費', type: 'expense', icon: 'Receipt', color: '#ef4444' },
  { id: 'stk_exp_interest', name: '融資利息', type: 'expense', icon: 'Percent', color: '#f97316' },
  { id: 'stk_exp_borrow', name: '借券費用', type: 'expense', icon: 'Coins', color: '#f59e0b' },
  { id: 'stk_exp_software', name: '看盤軟體費', type: 'expense', icon: 'Laptop', color: '#8b5cf6' },
  { id: 'stk_exp_other', name: '其他投資支出', type: 'expense', icon: 'MoreHorizontal', color: '#64748b' },
]

export const STOCK_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'stk_inc_rebate', name: '手續費折讓/退佣', type: 'income', icon: 'PiggyBank', color: '#10b981' },
  { id: 'stk_inc_lending', name: '出借股票利息', type: 'income', icon: 'Coins', color: '#eab308' },
  { id: 'stk_inc_other', name: '其他投資收入', type: 'income', icon: 'MoreHorizontal', color: '#06b6d4' },
]

export const FUTURES_TRADE_CATEGORIES: CategoryItem[] = [
  { id: 'fut_buy_open', name: '買進建倉', type: 'stock', icon: 'ArrowDownRight', color: '#3b82f6' },
  { id: 'fut_sell_close', name: '賣出平倉', type: 'stock', icon: 'ArrowUpRight', color: '#10b981' },
  { id: 'fut_sell_open', name: '賣出建倉', type: 'stock', icon: 'ArrowUpRight', color: '#f59e0b' },
  { id: 'fut_buy_close', name: '買進平倉', type: 'stock', icon: 'ArrowDownRight', color: '#06b6d4' },
]

export const FUTURES_EXPENSE_CATEGORIES: CategoryItem[] = [
  { id: 'fut_loss', name: '平倉虧損', type: 'expense', icon: 'TrendingDown', color: '#ef4444' },
  { id: 'fut_fee', name: '期貨手續費', type: 'expense', icon: 'Receipt', color: '#f59e0b' },
  { id: 'fut_tax', name: '期貨交易稅', type: 'expense', icon: 'FileText', color: '#ec4899' },
  { id: 'fut_withdraw', name: '保證金出金', type: 'expense', icon: 'ArrowUpRight', color: '#64748b' },
  { id: 'fut_call', name: '追繳保證金', type: 'expense', icon: 'AlertTriangle', color: '#dc2626' },
  { id: 'fut_exp_other', name: '其他期貨支出', type: 'expense', icon: 'MoreHorizontal', color: '#94a3b8' },
]

export const FUTURES_INCOME_CATEGORIES: CategoryItem[] = [
  { id: 'fut_profit', name: '平倉獲利', type: 'income', icon: 'TrendingUp', color: '#10b981' },
  { id: 'fut_deposit', name: '保證金入金', type: 'income', icon: 'ArrowDownRight', color: '#06b6d4' },
  { id: 'fut_settle', name: '期權結算獲利', type: 'income', icon: 'Coins', color: '#eab308' },
  { id: 'fut_interest', name: '利息補貼', type: 'income', icon: 'PiggyBank', color: '#8b5cf6' },
  { id: 'fut_inc_other', name: '其他期貨收入', type: 'income', icon: 'MoreHorizontal', color: '#94a3b8' },
]

export const DEFAULT_ACCOUNTS = [
  '期貨保證金專戶',
  '現金錢包',
  '銀行帳戶',
  '信用卡',
  '證券交割戶',
  '數位帳戶 (Richart/大戶)',
  '行動支付 (LINE Pay/街口)'
]

export const LEDGER_COLORS = [
  { name: '翡翠綠', value: '#10b981', ring: 'ring-emerald-500', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { name: '海洋藍', value: '#3b82f6', ring: 'ring-blue-500', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/30' },
  { name: '活力紫', value: '#8b5cf6', ring: 'ring-purple-500', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  { name: '金黃色', value: '#f59e0b', ring: 'ring-amber-500', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  { name: '玫瑰紅', value: '#f43f5e', ring: 'ring-rose-500', bg: 'bg-rose-500/10', text: 'text-rose-400', border: 'border-rose-500/30' },
  { name: '湖水綠', value: '#06b6d4', ring: 'ring-cyan-500', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
]

export const LEDGER_ICONS = [
  { name: 'Wallet', label: '皮夾錢包' },
  { name: 'TrendingUp', label: '股票投資' },
  { name: 'Home', label: '家庭生活' },
  { name: 'Plane', label: '旅行度假' },
  { name: 'ShoppingBag', label: '日常購物' },
  { name: 'Briefcase', label: '工作商務' },
  { name: 'Car', label: '車輛交通' },
  { name: 'GraduationCap', label: '進修學習' },
]

export const CATEGORY_ICONS = [
  'Tag', 'Coffee', 'Dog', 'Cat', 'Baby', 'Gamepad2', 'Film', 'Music', 
  'Shirt', 'Book', 'Smile', 'Sparkles', 'Plane', 'Car', 'Home', 'Gift', 
  'Heart', 'Zap', 'ShoppingBag', 'Utensils', 'DollarSign', 'Coins',
  'Briefcase', 'GraduationCap', 'HeartPulse', 'Laptop', 'TrendingUp',
  'TrendingDown', 'PiggyBank', 'Receipt', 'Percent', 'Award', 'Building',
  'Fuel', 'Bus', 'Train', 'Apple', 'Beer', 'Smartphone', 'CreditCard'
]

export const CATEGORY_COLORS = [
  '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', 
  '#f97316', '#eab308', '#06b6d4', '#ef4444', 
  '#64748b', '#14b8a6', '#6366f1', '#a855f7'
]
