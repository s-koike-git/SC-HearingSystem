export interface MenuItem {
  path: string
  label: string
  icon: string
  description?: string
  adminOnly?: boolean
  showInMenuPage?: boolean
  showInSidebar?: boolean
  category?: 'main' | 'tools' | 'admin'
  accent?: string
  bgGradient?: string
  tag?: string
}

export const MENU_ITEMS: MenuItem[] = [
  {
    path: '/menu',
    label: 'ホーム',
    icon: '🏠',
    description: 'メニュー画面',
    showInMenuPage: false,
    showInSidebar: true,
    category: 'main',
  },
  {
    path: '/projects/new',
    label: '新規案件作成',
    icon: '➕',
    description: '会社情報を入力してヒアリングを開始します',
    showInMenuPage: true,
    showInSidebar: true,
    category: 'main',
    accent: '#059669',
    bgGradient: 'linear-gradient(135deg,#064e3b,#059669)',
    tag: 'はじめる',
  },
  {
    path: '/projects',
    label: '案件一覧',
    icon: '📋',
    description: '進行中・過去の案件を検索・管理します',
    showInMenuPage: true,
    showInSidebar: true,
    category: 'main',
    accent: '#1e40af',
    bgGradient: 'linear-gradient(135deg,#1e3a8a,#1e40af)',
    tag: '案件管理',
  },
  {
    path: '/program-estimate',
    label: '工数見積もり',
    icon: '🧮',
    description: 'プログラム単位で概算工数を算出します',
    showInMenuPage: true,
    showInSidebar: true,
    category: 'tools',
    accent: '#0284c7',
    bgGradient: 'linear-gradient(135deg,#0c4a6e,#0284c7)',
    tag: '見積',
  },
  {
    path: '/cost-simulation',
    label: '原価シミュレーション',
    icon: '💰',
    description: '顧客指定単価での利益率を試算します',
    showInMenuPage: true,
    showInSidebar: true,
    category: 'tools',
    accent: '#d97706',
    bgGradient: 'linear-gradient(135deg,#78350f,#d97706)',
    tag: '分析',
  },
  {
    path: '/customers',
    label: '顧客管理',
    icon: '🏢',
    description: 'サーバー・SC保守期限・案件状況をツリーで管理します',
    showInMenuPage: true,
    showInSidebar: true,
    category: 'tools',
    accent: '#7c3aed',
    bgGradient: 'linear-gradient(135deg,#4c1d95,#7c3aed)',
    tag: '顧客管理',
  },
  {
  path: '/work-tasks',
  label: '作業管理',
  icon: '📋',
  category: 'main',
  description: '担当タスク・スケジュール管理',
  gradient: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
  },
  {
    path: '/admin',
    label: '管理画面',
    icon: '⚙️',
    description: 'マスタデータの管理',
    adminOnly: true,
    showInMenuPage: false,
    showInSidebar: true,
    category: 'admin',
  },
]

export const getVisibleMenuItems = (
  isAdmin: boolean,
  context: 'sidebar' | 'menu-page'
): MenuItem[] => {
  return MENU_ITEMS.filter(item => {
    if (item.adminOnly && !isAdmin) return false
    if (context === 'sidebar' && item.showInSidebar === false) return false
    if (context === 'menu-page' && item.showInMenuPage === false) return false
    return true
  })
}