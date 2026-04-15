import { useState } from 'react'
import Layout from './Layout'
import UserManagement from './admin/UserManagement'
import BusinessManagement from './admin/BusinessManagement'
import QuestionManagement from './admin/QuestionManagement'
import ProgramManagement from './admin/ProgramManagement'
import SystemSettings from './admin/SystemSettings'
import AnnouncementManagement from './admin/AnnouncementManagement'
import FlowMasterManagement from './admin/FlowMasterManagement'

type TabType = 'users' | 'businesses' | 'questions' | 'programs' | 'settings' | 'announcements' | 'flow-master'

const TABS: { id: TabType; name: string; icon: string; color: string }[] = [
  { id: 'users',         name: 'ユーザー管理',  icon: '👤', color: '#3b82f6' },
  { id: 'businesses',    name: '業務マスタ',     icon: '📋', color: '#06b6d4' },
  { id: 'questions',     name: '質問マスタ',     icon: '❓', color: '#8b5cf6' },
  { id: 'programs',      name: 'プログラム',     icon: '💻', color: '#10b981' },
  { id: 'announcements', name: 'お知らせ',       icon: '📢', color: '#f59e0b' },
  { id: 'settings',      name: 'システム設定',   icon: '⚙️', color: '#64748b' },
  { id: 'flow-master',   name: 'フローマスタ',   icon: '🔀', color: '#ec4899' },
]

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users')
  const activeTabMeta = TABS.find(t => t.id === activeTab)!

  return (
    <Layout>
      <div style={{ padding: '1.5rem 2rem', maxWidth: 1600, margin: '0 auto', fontFamily: '"Noto Sans JP", sans-serif' }}>

        {/* ページヘッダー */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          borderRadius: 12, padding: '1.25rem 1.75rem', marginBottom: '1.25rem',
          border: '1px solid #1e3a5f',
          display: 'flex', alignItems: 'center', gap: '1rem',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 10,
            background: `${activeTabMeta.color}25`,
            border: `1px solid ${activeTabMeta.color}50`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 22, flexShrink: 0, transition: 'all 0.2s',
          }}>
            {activeTabMeta.icon}
          </div>
          <div>
            <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '1.3rem', fontWeight: 700 }}>
              管理画面
            </h1>
            <p style={{ margin: '0.15rem 0 0', color: '#94a3b8', fontSize: '0.82rem' }}>
              {activeTabMeta.name}　─　システムの各種設定を管理します
            </p>
          </div>
        </div>

        {/* タブ + コンテンツ */}
        <div style={{ background: '#0f172a', borderRadius: 12, border: '1px solid #1e3a5f', overflow: 'hidden' }}>

          {/* タブバー */}
          <div style={{
            display: 'flex', background: '#0a1628',
            borderBottom: '1px solid #1e3a5f',
            overflowX: 'auto', padding: '0.5rem 0.75rem 0', gap: '0.2rem',
          }}>
            {TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                  padding: '0.65rem 1.1rem', border: 'none',
                  borderRadius: '8px 8px 0 0',
                  background: isActive ? '#0f172a' : 'transparent',
                  color: isActive ? tab.color : '#ffffff',
                  fontWeight: isActive ? 700 : 500,
                  fontSize: '0.86rem', cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  display: 'flex', alignItems: 'center', gap: '0.45rem',
                  borderBottom: isActive ? `2px solid ${tab.color}` : '2px solid transparent',
                  marginBottom: -1, outline: 'none', transition: 'all 0.15s',
                  fontFamily: 'inherit',
                }}>
                  <span style={{ fontSize: '1rem' }}>{tab.icon}</span>
                  {tab.name}
                </button>
              )
            })}
          </div>

          {/* コンテンツ（flow-master以外は白コンテナで包む） */}
          {activeTab === 'flow-master' ? (
            <div style={{ padding: '1.5rem' }}>
              <FlowMasterManagement />
            </div>
          ) : (
            <div style={{ background: 'white', margin: '1.25rem', borderRadius: 10, padding: '1.75rem' }}>
              {activeTab === 'users'         && <UserManagement />}
              {activeTab === 'businesses'    && <BusinessManagement />}
              {activeTab === 'questions'     && <QuestionManagement />}
              {activeTab === 'programs'      && <ProgramManagement />}
              {activeTab === 'settings'      && <SystemSettings />}
              {activeTab === 'announcements' && <AnnouncementManagement />}
            </div>
          )}
        </div>
      </div>
      <style>{`button:focus{outline:none;}`}</style>
    </Layout>
  )
}

export default AdminDashboard
