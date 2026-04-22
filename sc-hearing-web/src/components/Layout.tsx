import { ReactNode, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAdmin, logout } = useAuth()
  
  const [sideMenuOpen, setSideMenuOpen] = useState(false)
  
  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      logout()
      navigate('/login')
    }
  }

  // 階層化された戻る処理
  const handleBack = () => {
    const path = location.pathname
    
    // 判定結果 → ヒアリングシート
    if (path.startsWith('/results/')) {
      const projectId = path.split('/')[2]
      navigate(`/hearing/${projectId}`)
    }
    // ヒアリングシート → 案件一覧
    else if (path.startsWith('/hearing/')) {
      navigate('/projects')
    }
    // 新規案件作成 → 案件一覧
    else if (path === '/projects/new') {
      navigate('/projects')
    }
    // 案件一覧・管理画面 → メニュー
    else if (path === '/projects' || path === '/admin') {
      navigate('/menu')
    }
    // それ以外 → メニュー
    else {
      navigate('/menu')
    }
  }

  const menuItems = [
    { path: '/menu', label: 'メニュー', icon: '🏠' },
    { path: '/projects', label: '案件一覧', icon: '📋' },
    { path: '/projects/new', label: '新規案件作成', icon: '➕' },
    { path: '/program-estimate', label: 'プログラム工数見積', icon: '🧮' },
  ]

  if (isAdmin) {
    menuItems.push({ path: '/admin', label: '管理画面', icon: '⚙️' })
  }

  const isActive = (path: string) => location.pathname === path

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#ecf0f1' }}>
      {/* 左サイドバー */}
      <div style={{
        width: sideMenuOpen ? '250px' : '0',
        backgroundColor: '#2c3e50',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: '2px 0 10px rgba(0,0,0,0.1)',
        position: 'fixed',
        height: '100vh',
        overflowY: 'auto',
        overflow: 'hidden',
        transition: 'width 0.3s ease',
        zIndex: 1000
      }}>
        {sideMenuOpen && (
        <> 
        <div style={{
          padding: '1.5rem',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          textAlign: 'center'
        }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 'bold' }}>
            SCヒアリングシステム
          </h2>
          <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: '#bdc3c7' }}>
            {user?.username}
          </p>
        </div>

        <nav style={{ flex: 1, padding: '1rem 0' }}>
          {menuItems.map((item) => (
            <button
              key={item.path}
              onClick={() => navigate(item.path)}
              style={{
                width: '100%',
                padding: '1rem 1.5rem',
                border: 'none',
                backgroundColor: isActive(item.path) ? '#34495e' : 'transparent',
                color: 'white',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                transition: 'background-color 0.2s',
                borderLeft: isActive(item.path) ? '4px solid #3498db' : '4px solid transparent'
              }}
              onMouseEnter={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive(item.path)) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                }
              }}
            >
              <span style={{ fontSize: '1.2rem' }}>{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div style={{
          padding: '1rem',
          borderTop: '1px solid rgba(255,255,255,0.1)',
          fontSize: '0.75rem',
          color: '#95a5a6',
          textAlign: 'center'
        }}>
          ©2026 Techno Culture System
        </div>
        </>
        )}
      </div>

      {/* メインコンテンツエリア */}
      <div style={{ marginLeft: sideMenuOpen ? '250px' : '0', flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 0.3s ease', height: '100vh', overflow: 'hidden' }}>
        {/* ヘッダー */}
        <header style={{
          backgroundColor: 'white',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          padding: '1rem 2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100
        }}>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={() => setSideMenuOpen(!sideMenuOpen)}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: '#95a5a6',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '1.2rem',
                minWidth: '50px'
              }}
            >
              {sideMenuOpen ? '←' : '→'}
            </button>
            {location.pathname !== '/menu' && (
              <button
                onClick={handleBack}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  fontSize: '0.9rem'
                }}
              >
                ← 戻る
              </button>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '0.5rem 1.5rem',
              backgroundColor: '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 'bold',
              fontSize: '0.9rem'
            }}
          >
            ログアウト
          </button>
        </header>

        {/* メインコンテンツ */}
        <main style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
