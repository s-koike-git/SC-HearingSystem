import { useState, useEffect } from 'react'
import axios from 'axios'

// ─── 型定義 ──────────────────────────────────────────────────
interface AdminUser {
  id: number
  username: string
  email: string
  fullName: string
  role: string
  roles: string[]
  password: string
}

interface FormData {
  username: string
  password: string
  email: string
  fullName: string
  roles: string[]
}

// ─── ロール定義 ─────────────────────────────────────────────
const ROLE_DEFS = [
  { key: 'admin',            label: '管理者',        desc: '全機能・管理画面にアクセス可能',             color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  { key: 'user',             label: '一般ユーザー',   desc: 'ヒアリング・閲覧・判定結果の確認が可能',      color: '#1e40af', bg: '#eff6ff', border: '#bfdbfe' },
  { key: 'customer_manager', label: '既存顧客担当者', desc: '既存顧客管理に担当者として表示・割り当て可能', color: '#059669', bg: '#f0fdf4', border: '#bbf7d0' },
]

const API_BASE = import.meta.env.VITE_API_BASE_URL
  ? import.meta.env.VITE_API_BASE_URL.replace('/api', '/api/Auth')
  : '/api/Auth'

const EMPTY_FORM: FormData = { username: '', password: '', email: '', fullName: '', roles: ['user'] }

// ─── メインコンポーネント ─────────────────────────────────────
export default function UserManagement() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminUser | null>(null)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await axios.get(`${API_BASE}/users`)
      setUsers(res.data)
    } catch { setError('ユーザー一覧の取得に失敗しました') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSave = async (form: FormData, id?: number) => {
    const payload = { ...form }
    if (id) {
      await axios.put(`${API_BASE}/users/${id}`, payload)
    } else {
      await axios.post(`${API_BASE}/users`, payload)
    }
    await load()
  }

  const handleDelete = async (id: number) => {
    await axios.delete(`${API_BASE}/users/${id}`)
    await load()
    setDeleteTarget(null)
  }

  const pill = (role: string) => {
    const def = ROLE_DEFS.find(r => r.key === role)
    if (!def) return null
    return (
      <span key={role} style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: def.bg, color: def.color, border: `1px solid ${def.border}`, fontWeight: 700, whiteSpace: 'nowrap' }}>
        {def.label}
      </span>
    )
  }

  if (loading) return <div style={{ padding: '2rem', color: '#64748b', textAlign: 'center' }}>読み込み中...</div>

  return (
    <div style={{ padding: '0' }}>
      {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.85rem' }}>{error}</div>}

      {/* ロール説明 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 20 }}>
        {ROLE_DEFS.map(r => (
          <div key={r.key} style={{ background: r.bg, border: `1px solid ${r.border}`, borderRadius: 8, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 700, color: r.color, marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', lineHeight: 1.4 }}>{r.desc}</div>
          </div>
        ))}
      </div>

      {/* 追加ボタン */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button onClick={() => setIsCreating(true)} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 16px', background: 'linear-gradient(135deg,#1e40af,#0284c7)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
          ＋ ユーザーを追加
        </button>
      </div>

      {/* ユーザー一覧テーブル */}
      <div style={{ background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
          <thead>
            <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
              {['氏名', 'ユーザー名', 'メールアドレス', 'ロール', '操作'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: '0.75rem', fontWeight: 700, color: '#64748b', whiteSpace: 'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map((u, i) => (
              <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{u.fullName || u.username}</div>
                </td>
                <td style={{ padding: '11px 14px', color: '#475569', fontFamily: 'monospace', fontSize: '0.82rem' }}>{u.username}</td>
                <td style={{ padding: '11px 14px', color: '#64748b', fontSize: '0.82rem' }}>{u.email || '―'}</td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {(u.roles?.length > 0 ? u.roles : [u.role]).map(r => pill(r))}
                  </div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button onClick={() => setEditingUser(u)} style={{ padding: '4px 12px', border: '1px solid #bfdbfe', borderRadius: 6, background: '#eff6ff', color: '#1e40af', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit' }}>編集</button>
                    <button onClick={() => setDeleteTarget(u)} style={{ padding: '4px 12px', border: '1px solid #fecaca', borderRadius: 6, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600, fontFamily: 'inherit' }}>削除</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 登録・編集モーダル */}
      {(isCreating || editingUser) && (
        <UserFormModal
          user={editingUser}
          onClose={() => { setIsCreating(false); setEditingUser(null) }}
          onSave={async (form) => {
            await handleSave(form, editingUser?.id)
            setIsCreating(false); setEditingUser(null)
          }}
        />
      )}

      {/* 削除確認 */}
      {deleteTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 14, padding: '2rem', maxWidth: 340, width: '90%', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>🗑</div>
            <h3 style={{ margin: '0 0 0.5rem', textAlign: 'center', fontSize: '1rem', color: '#0f172a' }}>ユーザーを削除しますか？</h3>
            <p style={{ margin: '0 0 1.5rem', textAlign: 'center', color: '#64748b', fontSize: '0.85rem' }}>「{deleteTarget.fullName || deleteTarget.username}」を削除します。</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDeleteTarget(null)} style={{ flex: 1, padding: '9px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>キャンセル</button>
              <button onClick={() => handleDelete(deleteTarget.id)} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 8, background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit' }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── ユーザーフォームモーダル ──────────────────────────────────
function UserFormModal({ user, onClose, onSave }: {
  user: AdminUser | null
  onClose: () => void
  onSave: (form: FormData) => Promise<void>
}) {
  const [form, setForm] = useState<FormData>(
    user ? {
      username: user.username,
      password: user.password,
      email: user.email,
      fullName: user.fullName,
      roles: user.roles?.length > 0 ? user.roles : [user.role],
    } : { ...EMPTY_FORM }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const toggleRole = (role: string) => {
    setForm(prev => ({
      ...prev,
      roles: prev.roles.includes(role)
        ? prev.roles.filter(r => r !== role)
        : [...prev.roles, role],
    }))
  }

  const handleSave = async () => {
    if (!form.username.trim()) { setError('ユーザー名は必須です'); return }
    if (!form.password.trim()) { setError('パスワードは必須です'); return }
    if (form.roles.length === 0) { setError('ロールを1つ以上選択してください'); return }
    setSaving(true)
    try { await onSave(form) }
    catch { setError('保存に失敗しました'); setSaving(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '8px 10px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.85rem', color: '#0f172a', background: 'white', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit' }
  const lbl: React.CSSProperties = { display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#475569', marginBottom: 4 }
  const fld: React.CSSProperties = { marginBottom: '1rem' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 3000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 500, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.2)' }}>

        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid #f1f5f9', flexShrink: 0 }}>
          <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a' }}>
            {user ? 'ユーザーを編集' : '新規ユーザーを追加'}
          </h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.2rem', cursor: 'pointer', color: '#94a3b8', lineHeight: 1 }}>✕</button>
        </div>

        {/* フォーム */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '1.25rem 1.5rem' }}>
          {error && <div style={{ background: '#fef2f2', color: '#dc2626', padding: '8px 12px', borderRadius: 7, fontSize: '0.82rem', marginBottom: '1rem', border: '1px solid #fecaca' }}>{error}</div>}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 1rem' }}>
            <div style={fld}>
              <label style={lbl}>氏名（表示名）</label>
              <input style={inp} value={form.fullName} onChange={e => setForm(p => ({ ...p, fullName: e.target.value }))} placeholder="例：永田 暁洋" />
            </div>
            <div style={fld}>
              <label style={lbl}>ユーザー名 <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={inp} value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="例：a-nagata" />
            </div>
            <div style={fld}>
              <label style={lbl}>パスワード <span style={{ color: '#dc2626' }}>*</span></label>
              <input style={inp} type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder="パスワードを入力" />
            </div>
            <div style={fld}>
              <label style={lbl}>メールアドレス</label>
              <input style={inp} type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="例：a-nagata@techno-net.co.jp" />
            </div>
          </div>

          {/* ロール選択 */}
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: '1rem' }}>
            <label style={{ ...lbl, marginBottom: 10 }}>ロール <span style={{ color: '#dc2626' }}>*</span> <span style={{ fontSize: '0.7rem', fontWeight: 400, color: '#94a3b8' }}>（複数選択可）</span></label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {ROLE_DEFS.map(r => {
                const checked = form.roles.includes(r.key)
                return (
                  <label key={r.key} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', borderRadius: 8, border: `1.5px solid ${checked ? r.border : '#e2e8f0'}`, background: checked ? r.bg : 'white', cursor: 'pointer', transition: 'all .15s' }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleRole(r.key)}
                      style={{ width: 16, height: 16, marginTop: 1, accentColor: r.color, cursor: 'pointer', flexShrink: 0 }}
                    />
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 700, color: checked ? r.color : '#334155', marginBottom: 2 }}>{r.label}</div>
                      <div style={{ fontSize: '0.73rem', color: '#64748b', lineHeight: 1.4 }}>{r.desc}</div>
                    </div>
                  </label>
                )
              })}
            </div>
          </div>
        </div>

        {/* フッター */}
        <div style={{ display: 'flex', gap: 8, padding: '1rem 1.5rem', borderTop: '1px solid #f1f5f9', flexShrink: 0 }}>
          <button onClick={onClose} style={{ flex: 1, padding: '9px', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem', fontFamily: 'inherit' }}>キャンセル</button>
          <button onClick={handleSave} disabled={saving} style={{ flex: 2, padding: '9px', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#1e40af,#0284c7)', color: 'white', cursor: saving ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.9rem', opacity: saving ? 0.7 : 1, fontFamily: 'inherit' }}>
            {saving ? '保存中...' : user ? '✓ 変更を保存' : '＋ 追加する'}
          </button>
        </div>
      </div>
    </div>
  )
}
