import { useState } from 'react'
import Layout from './Layout'
import UserManagement from './admin/UserManagement'
import BusinessManagement from './admin/BusinessManagement'
import QuestionManagement from './admin/QuestionManagement'
import ProgramManagement from './admin/ProgramManagement'
import SystemSettings from './admin/SystemSettings'
import AnnouncementManagement from './admin/AnnouncementManagement'

// ✅ flow-master を追加
type TabType = 'users' | 'businesses' | 'questions' | 'programs' | 'settings' | 'announcements' | 'flow-master'

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<TabType>('users')

  const tabs = [
    { id: 'users' as TabType, name: 'ユーザー管理', icon: '👤' },
    { id: 'businesses' as TabType, name: '業務マスタ', icon: '📋' },
    { id: 'questions' as TabType, name: '質問マスタ', icon: '❓' },
    { id: 'programs' as TabType, name: 'プログラムマスタ', icon: '💻' },
    { id: 'announcements' as TabType, name: 'お知らせ管理', icon: '📢' },
    { id: 'settings' as TabType, name: 'システム設定', icon: '⚙️' },
    { id: 'flow-master' as TabType, name: 'フローマスタ', icon: '🔀' },  // ✅ label → name に修正、as TabType 追加
  ]

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <h1 style={{ margin: 0, color: '#2c3e50', fontSize: '1.8rem' }}>
            ⚙️ 管理画面
          </h1>
          <p style={{ margin: '0.5rem 0 0 0', color: '#7f8c8d' }}>
            システムの各種設定を管理します
          </p>
        </div>

        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '2px solid #ecf0f1'
          }}>
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '1.2rem 1.5rem',
                  border: 'none',
                  backgroundColor: activeTab === tab.id ? '#3498db' : 'transparent',
                  color: activeTab === tab.id ? 'white' : '#2c3e50',
                  cursor: 'pointer',
                  fontWeight: activeTab === tab.id ? 'bold' : 'normal',
                  fontSize: '1rem',
                  transition: 'all 0.2s',
                  borderBottom: activeTab === tab.id ? '3px solid #2980b9' : 'none'
                }}
              >
                <span style={{ fontSize: '1.2rem', marginRight: '0.5rem' }}>{tab.icon}</span>
                {tab.name}
              </button>
            ))}
          </div>

          <div style={{ padding: '2rem' }}>
            {activeTab === 'users' && <UserManagement />}
            {activeTab === 'businesses' && <BusinessManagement />}
            {activeTab === 'questions' && <QuestionManagement />}
            {activeTab === 'programs' && <ProgramManagement />}
            {activeTab === 'settings' && <SystemSettings />}
            {activeTab === 'announcements' && <AnnouncementManagement />}
            {/* ✅ フローマスタの表示を追加 */}
            {activeTab === 'flow-master' && (
              <div style={{
                padding: '2rem',
                backgroundColor: '#f8f9fa',
                borderRadius: '8px',
                textAlign: 'center'
              }}>
                <h2 style={{ color: '#2c3e50', marginBottom: '1rem' }}>🔀 フローマスタ</h2>
                <p style={{ color: '#7f8c8d', marginBottom: '2rem' }}>
                  業務フロー・システムフローの設定を管理します
                </p>
                <div style={{
                  backgroundColor: 'white',
                  padding: '3rem',
                  borderRadius: '8px',
                  border: '2px dashed #bdc3c7'
                }}>
                  <p style={{ fontSize: '1.2rem', color: '#95a5a6', marginBottom: '1rem' }}>
                    📋 フローマスタ管理機能
                  </p>
                  <p style={{ color: '#7f8c8d' }}>
                    業務フロー設定、システムフロー設定、質問紐づけ、プログラム紐づけ機能は<br />
                    今後のバージョンで実装予定です
                  </p>
                  <div style={{ marginTop: '2rem' }}>
                    <p style={{ fontSize: '0.9rem', color: '#95a5a6' }}>
                      ※ 現在は判定結果画面でフローを確認できます
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  )
}

export default AdminDashboard
