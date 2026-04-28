import { useState } from 'react'
import { useEditLock } from '../../contexts/EditLockContext'

interface PasswordPromptModalProps {
  open: boolean
  onClose: () => void
}

function PasswordPromptModal({ open, onClose }: PasswordPromptModalProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { unlock } = useEditLock()

  if (!open) return null

  const handleSubmit = async () => {
    if (!password) {
      setError('パスワードを入力してください')
      return
    }
    setLoading(true)
    setError('')
    const success = await unlock(password)
    setLoading(false)
    if (success) {
      setPassword('')
      onClose()
    } else {
      setError('パスワードが正しくありません')
      setPassword('')
    }
  }

  const handleCancel = () => {
    setPassword('')
    setError('')
    onClose()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) handleSubmit()
    if (e.key === 'Escape' && !loading) handleCancel()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 2000,
    }}>
      <div style={{
        backgroundColor: 'white', borderRadius: 12, padding: '2rem',
        maxWidth: 440, width: '90%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: '1.5rem' }}>
          <div style={{
            width: 48, height: 48, borderRadius: '50%',
            backgroundColor: '#fef3c7',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, flexShrink: 0,
          }}>🔒</div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.15rem', color: '#111827' }}>
              編集ロックを解除
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '0.85rem', color: '#6b7280' }}>
              ログインパスワードを再入力してください
            </p>
          </div>
        </div>

        {error && (
          <div style={{
            backgroundColor: '#fef2f2', border: '1px solid #fecaca',
            color: '#b91c1c', padding: '0.75rem 1rem', borderRadius: 6,
            fontSize: '0.85rem', marginBottom: '1rem',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <span>⚠</span>
            <span>{error}</span>
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{
            display: 'block', marginBottom: '0.5rem',
            fontSize: '0.85rem', fontWeight: 600, color: '#374151',
          }}>パスワード</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="ログインパスワード"
            autoFocus
            disabled={loading}
            style={{
              width: '100%', padding: '0.7rem 0.9rem',
              border: '1px solid #d1d5db', borderRadius: 6,
              fontSize: '1rem', outline: 'none',
              boxSizing: 'border-box',
              backgroundColor: loading ? '#f3f4f6' : 'white',
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={handleCancel}
            disabled={loading}
            style={{
              flex: 1, padding: '0.7rem',
              backgroundColor: '#f3f4f6', color: '#374151',
              border: '1px solid #d1d5db', borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 500, fontSize: '0.9rem',
            }}
          >キャンセル</button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            style={{
              flex: 1, padding: '0.7rem',
              backgroundColor: loading ? '#94a3b8' : '#3b82f6',
              color: 'white', border: 'none', borderRadius: 6,
              cursor: loading ? 'not-allowed' : 'pointer',
              fontWeight: 600, fontSize: '0.9rem',
            }}
          >{loading ? '認証中...' : '🔓 ロック解除'}</button>
        </div>
      </div>
    </div>
  )
}

export default PasswordPromptModal
