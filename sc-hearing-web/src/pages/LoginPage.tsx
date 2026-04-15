import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

function LoginPage() {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (!username || !password) { setError('ユーザー名とパスワードを入力してください'); return }
    setIsLoading(true)
    try {
      const success = await login(username, password)
      if (success) { navigate('/menu') }
      else { setError('ユーザー名またはパスワードが正しくありません'); setPassword('') }
    } finally { setIsLoading(false) }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex',
      background: '#0f1c2e',
      backgroundImage: `
        radial-gradient(ellipse at 20% 50%, rgba(30,64,175,0.15) 0%, transparent 60%),
        radial-gradient(ellipse at 80% 20%, rgba(2,132,199,0.1) 0%, transparent 50%)
      `,
      fontFamily: '"Noto Sans JP", sans-serif',
    }}>
      {/* 左：ブランドパネル */}
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        justifyContent: 'center', alignItems: 'center', padding: '4rem',
        borderRight: '1px solid rgba(30,64,175,0.25)',
      }}>
        <div style={{
          width: 72, height: 72, borderRadius: 16,
          background: 'linear-gradient(135deg, #1e40af, #0284c7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: '2rem',
          boxShadow: '0 0 40px rgba(30,64,175,0.4)',
        }}>🎯</div>
        <h1 style={{ margin: 0, color: '#f8fafc', fontSize: '2rem', fontWeight: 800, letterSpacing: '-0.02em', textAlign: 'center' }}>
          SC ヒアリングシステム
        </h1>
        <p style={{ color: '#64748b', marginTop: '0.75rem', fontSize: '0.9rem', textAlign: 'center', lineHeight: 1.7 }}>
          スーパーカクテルCore 導入支援<br />ヒアリング・判定・フロー分析
        </p>
        <div style={{ marginTop: '3rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[['📋','質問ベースの自動判定'],['📊','業務・システムフロー生成'],['💰','工数・原価シミュレーション']].map(([icon, text]) => (
            <div key={text} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div style={{ width: 36, height: 36, background: 'rgba(30,64,175,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{icon}</div>
              <span style={{ color: '#94a3b8', fontSize: '0.88rem' }}>{text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 右：ログインフォーム */}
      <div style={{ width: 460, flexShrink: 0, display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: '4rem 3.5rem' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ margin: 0, color: '#f8fafc', fontSize: '1.6rem', fontWeight: 700 }}>ログイン</h2>
          <p style={{ margin: '0.5rem 0 0', color: '#64748b', fontSize: '0.88rem' }}>アカウント情報を入力してください</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 8, padding: '0.75rem 1rem', marginBottom: '1.5rem', color: '#fca5a5', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span>⚠</span> {error}
            </div>
          )}
          {[
            { label: 'ユーザー名', value: username, set: setUsername, type: 'text', ph: 'ユーザー名を入力' },
            { label: 'パスワード', value: password, set: setPassword, type: 'password', ph: 'パスワードを入力' },
          ].map(({ label, value, set, type, ph }) => (
            <div key={label} style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#cbd5e1', fontSize: '0.83rem', fontWeight: 600, letterSpacing: '0.03em' }}>{label}</label>
              <input
                type={type} value={value} onChange={e => set(e.target.value)} placeholder={ph}
                style={{ width: '100%', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(148,163,184,0.2)', borderRadius: 8, color: '#f8fafc', fontSize: '0.95rem', outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                onFocus={e => { e.target.style.borderColor = '#3b82f6'; e.target.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.15)' }}
                onBlur={e => { e.target.style.borderColor = 'rgba(148,163,184,0.2)'; e.target.style.boxShadow = 'none' }}
              />
            </div>
          ))}
          <button
            type="submit" disabled={isLoading}
            style={{
              width: '100%', padding: '0.9rem', marginTop: '0.5rem',
              background: isLoading ? '#334155' : 'linear-gradient(135deg, #1e40af, #0284c7)',
              border: 'none', borderRadius: 8, color: 'white',
              fontSize: '1rem', fontWeight: 700, cursor: isLoading ? 'not-allowed' : 'pointer',
              boxShadow: isLoading ? 'none' : '0 4px 20px rgba(30,64,175,0.4)',
              letterSpacing: '0.02em', transition: 'opacity 0.2s',
            }}
            onMouseEnter={e => { if (!isLoading) e.currentTarget.style.opacity = '0.9' }}
            onMouseLeave={e => { e.currentTarget.style.opacity = '1' }}
          >
            {isLoading ? '認証中...' : 'ログイン →'}
          </button>
        </form>
        <p style={{ marginTop: '3rem', color: '#334155', fontSize: '0.78rem', textAlign: 'center' }}>
          ©2026 Techno Culture System Co., Ltd.
        </p>
      </div>
    </div>
  )
}

export default LoginPage
