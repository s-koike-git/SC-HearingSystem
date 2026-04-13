import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import type { User } from '../../contexts/AuthContext'

function UserManagement() {
  const { users, addUser, updateUser, deleteUser } = useAuth()
  const [showAddModal, setShowAddModal] = useState(false)
  const [editingUser, setEditingUser] = useState<(User & { password: string }) | null>(null)
  const [formData, setFormData] = useState({ username: '', email: '', role: 'user' as 'admin' | 'user', password: '' })

  const handleAddUser = () => {
    const newUser = {
      id: Math.max(...users.map(u => u.id), 0) + 1,
      username: formData.username,
      email: formData.email,
      role: formData.role,
      password: formData.password,
    }
    addUser(newUser)
    setShowAddModal(false)
    setFormData({ username: '', email: '', role: 'user', password: '' })
  }

  const handleEditUser = (user: User & { password: string }) => {
    setEditingUser(user)
    setFormData({ username: user.username, email: user.email, role: user.role, password: '' })
    setShowAddModal(true)
  }

  const handleUpdateUser = () => {
    if (editingUser) {
      const updates: any = {
        username: formData.username,
        email: formData.email,
        role: formData.role,
      }
      if (formData.password) {
        updates.password = formData.password
      }
      updateUser(editingUser.id, updates)
      setShowAddModal(false)
      setEditingUser(null)
      setFormData({ username: '', email: '', role: 'user', password: '' })
    }
  }

  const handleDeleteUser = (id: number) => {
    if (confirm('このユーザーを削除しますか？')) {
      deleteUser(id)
    }
  }

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        
        lines.slice(1).forEach(line => {
          const [username, email, password, role] = line.split(',').map(s => s.trim())
          if (username && email && password) {
            const newUser = {
              id: Math.max(...users.map(u => u.id), 0) + 1,
              username,
              email,
              password,
              role: (role === 'admin' ? 'admin' : 'user') as 'admin' | 'user'
            }
            addUser(newUser)
          }
        })
        alert('インポートが完了しました')
      } catch (error) {
        alert('インポートに失敗しました: ' + error)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDownloadTemplate = () => {
    const csv = 'ユーザー名,メールアドレス,パスワード,権限\nsample,sample@example.com,password123,user\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'user_template.csv'
    link.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>ユーザー一覧</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleDownloadTemplate} style={{
            padding: '0.75rem 1.5rem', backgroundColor: '#95a5a6', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
          }}>📥 雛形ダウンロード</button>
          <label style={{
            padding: '0.75rem 1.5rem', backgroundColor: '#27ae60', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
          }}>
            📤 インポート
            <input type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          <button onClick={() => { setShowAddModal(true); setEditingUser(null); setFormData({ username: '', email: '', role: 'user', password: '' }); }}
            style={{
              padding: '0.75rem 1.5rem', backgroundColor: '#3498db', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
            }}>
            ＋ 新規ユーザー追加
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
            <th style={{ padding: '1rem', textAlign: 'left' }}>ユーザー名</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>メールアドレス</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>権限</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={user.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
              <td style={{ padding: '0.75rem' }}>{user.username}</td>
              <td style={{ padding: '0.75rem' }}>{user.email}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <span style={{
                  padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem',
                  backgroundColor: user.role === 'admin' ? '#e74c3c' : '#3498db',
                  color: 'white'
                }}>{user.role === 'admin' ? '管理者' : 'ユーザー'}</span>
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <button onClick={() => handleEditUser(user)} style={{
                  padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: '#27ae60', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}>編集</button>
                <button onClick={() => handleDeleteUser(user.id)} style={{
                  padding: '0.4rem 0.8rem', backgroundColor: '#e74c3c', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showAddModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '2rem', maxWidth: '500px', width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginTop: 0 }}>{editingUser ? 'ユーザー編集' : '新規ユーザー追加'}</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>ユーザー名</label>
              <input type="text" value={formData.username} onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>メールアドレス</label>
              <input type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>パスワード</label>
              <input type="password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder={editingUser ? '変更する場合のみ入力' : ''}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>権限</label>
              <select value={formData.role} onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}>
                <option value="user">ユーザー</option>
                <option value="admin">管理者</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={editingUser ? handleUpdateUser : handleAddUser} style={{
                flex: 1, padding: '0.75rem', backgroundColor: '#3498db', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
              }}>{editingUser ? '更新' : '追加'}</button>
              <button onClick={() => { setShowAddModal(false); setEditingUser(null); }} style={{
                flex: 1, padding: '0.75rem', backgroundColor: '#95a5a6', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
              }}>キャンセル</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserManagement
