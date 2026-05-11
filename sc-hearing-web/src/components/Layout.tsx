import { ReactNode, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getVisibleMenuItems } from '../config/menuConfig'

interface LayoutProps {
  children: ReactNode
}

function Layout({ children }: LayoutProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isAdmin, logout } = useAuth()

  const [collapsed, setCollapsed] = useState(false)

  const visibleMenu = getVisibleMenuItems(isAdmin, 'sidebar')

  const currentMenu = visibleMenu.find(m =>
    location.pathname === m.path
    || (m.path !== '/menu' && location.pathname.startsWith(m.path + '/'))
  )

  const handleLogout = () => {
    if (confirm('ログアウトしますか？')) {
      logout()
      navigate('/login')
    }
  }

  const handleBack = () => {
    const path = location.pathname
    if (path.startsWith('/results/')) {
      const projectId = path.split('/')[2]
      navigate(`/hearing/${projectId}`)
    } else if (path.startsWith('/hearing/')) {
      navigate('/projects')
    } else if (path === '/projects/new') {
      navigate('/projects')
    } else {
      navigate('/menu')
    }
  }

  const SIDEBAR_WIDTH = collapsed ? 72 : 240

  return (
    <div style={{ display: 'flex', minHeight: '100vh', backgroundColor: '#f8fafc', fontFamily: '"Noto Sans JP", sans-serif' }}>

      <aside style={{
        width: SIDEBAR_WIDTH,
        background: 'linear-gradient(180deg, #1e293b 0%, #0f172a 100%)',
        color: 'white',
        display: 'flex',
        flexDirection: 'column',
        position: 'fixed',
        height: '100vh',
        left: 0, top: 0, zIndex: 1000,
        transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: '4px 0 20px rgba(0,0,0,0.08)',
        overflow: 'hidden',
      }}>

        <div style={{
          padding: '18px 16px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex', alignItems: 'center', gap: 12,
          minHeight: 64,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'linear-gradient(135deg, #3b82f6, #1e40af)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 18, flexShrink: 0,
            boxShadow: '0 4px 12px rgba(59,130,246,0.4)',
          }}>🎯</div>
          {!collapsed && (
            <div style={{ overflow: 'hidden', flex: 1 }}>
              <div style={{ fontSize: '0.95rem', fontWeight: 700, whiteSpace: 'nowrap', letterSpacing: '0.01em' }}>
                SCヒアリング
              </div>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 5, marginTop: 1 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#10b981', flexShrink: 0 }} />
                {user?.username} {isAdmin && '· 管理者'}
              </div>
            </div>
          )}
        </div>

        <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto', overflowX: 'hidden' }}>
          {visibleMenu.map(item => {
            const isActive = location.pathname === item.path
              || (item.path !== '/menu' && location.pathname.startsWith(item.path + '/'))
            return (
              <button
                key={item.path}
                onClick={() => navigate(item.path)}
                title={collapsed ? item.label : item.description}
                style={{
                  width: '100%',
                  padding: collapsed ? '12px 0' : '11px 14px',
                  marginBottom: 4,
                  border: 'none',
                  background: isActive ? 'rgba(59,130,246,0.18)' : 'transparent',
                  color: isActive ? '#60a5fa' : '#cbd5e1',
                  textAlign: 'left',
                  cursor: 'pointer',
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  transition: 'all 0.15s',
                  fontSize: '0.88rem',
                  fontWeight: isActive ? 600 : 500,
                  position: 'relative',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                    e.currentTarget.style.color = 'white'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = '#cbd5e1'
                  }
                }}
              >
                {isActive && !collapsed && (
                  <span style={{
                    position: 'absolute',
                    left: 0, top: '50%', transform: 'translateY(-50%)',
                    width: 3, height: 24,
                    background: '#3b82f6',
                    borderRadius: '0 3px 3px 0',
                  }} />
                )}
                <span style={{ fontSize: 20, flexShrink: 0 }}>{item.icon}</span>
                {!collapsed && (
                  <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {item.label}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <div style={{
          padding: 12,
          borderTop: '1px solid rgba(255,255,255,0.08)',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'メニューを展開' : 'メニューを折りたたむ'}
            style={{
              width: '100%',
              padding: '8px 10px',
              background: 'transparent',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              fontSize: '0.78rem',
              fontWeight: 500,
              transition: 'all 0.15s',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
              e.currentTarget.style.color = 'white'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = '#94a3b8'
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0)', transition: 'transform 0.25s' }}>
              <path d="M15 18l-6-6 6-6"/>
            </svg>
            {!collapsed && <span>折りたたむ</span>}
          </button>
          {!collapsed && (
            <div style={{
              fontSize: '0.65rem', color: '#475569', textAlign: 'center', marginTop: 10,
              letterSpacing: '0.02em',
            }}>
              ©2026 Techno Culture System
            </div>
          )}
        </div>
      </aside>

      <div style={{
        marginLeft: SIDEBAR_WIDTH,
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
        height: '100vh',
        overflow: 'hidden',
      }}>

        <header style={{
          background: 'white',
          borderBottom: '1px solid #e5e7eb',
          padding: '0 24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: 56,
          position: 'sticky',
          top: 0, zIndex: 100,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            {location.pathname !== '/menu' && (
              <button
                onClick={handleBack}
                style={{
                  padding: '6px 12px',
                  background: '#f1f5f9',
                  color: '#475569',
                  border: 'none',
                  borderRadius: 6,
                  cursor: 'pointer',
                  fontSize: '0.85rem',
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  transition: 'all 0.15s',
                  outline: 'none',
                  fontFamily: 'inherit',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#e2e8f0' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#f1f5f9' }}
              >
                ← 戻る
              </button>
            )}
            {currentMenu && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 20 }}>{currentMenu.icon}</span>
                <div>
                  <div style={{ fontSize: '0.95rem', fontWeight: 600, color: '#0f172a', lineHeight: 1.2 }}>
                    {currentMenu.label}
                  </div>
                  {currentMenu.description && (
                    <div style={{ fontSize: '0.7rem', color: '#64748b', lineHeight: 1.2, marginTop: 1 }}>
                      {currentMenu.description}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            style={{
              padding: '7px 18px',
              background: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: 600,
              transition: 'all 0.15s',
              boxShadow: '0 2px 4px rgba(239,68,68,0.2)',
              outline: 'none',
              fontFamily: 'inherit',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = '#dc2626'
              e.currentTarget.style.boxShadow = '0 4px 8px rgba(239,68,68,0.3)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = '#ef4444'
              e.currentTarget.style.boxShadow = '0 2px 4px rgba(239,68,68,0.2)'
            }}
          >
            ログアウト
          </button>
        </header>

        <main style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
          {children}
        </main>
      </div>
    </div>
  )
}

export default Layout
