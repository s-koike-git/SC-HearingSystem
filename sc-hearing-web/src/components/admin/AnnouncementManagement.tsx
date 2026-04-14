import { useState, useEffect } from 'react'
import { announcementsApi } from '../../services/api'

function AnnouncementManagement() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [showForm, setShowForm] = useState(false)

  // フォーム用のstate
  const [formData, setFormData] = useState<Partial<Announcement>>({
    title: '',
    content: '',
    priority: '通常',
    isActive: true,
    publishedAt: new Date().toISOString().split('T')[0]
  })

  // お知らせ一覧を取得
  const fetchAnnouncements = async () => {
    try {
      const data = await announcementsApi.getAll()
      setAnnouncements(data)
    } catch (error) {
      console.error('お知らせの取得に失敗しました:', error)
      alert('お知らせの取得に失敗しました')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnnouncements()
  }, [])

  // フォームのリセット
  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      priority: '通常',
      isActive: true,
      publishedAt: new Date().toISOString().split('T')[0]
    })
    setEditingId(null)
    setShowForm(false)
  }

  // 新規作成
  const handleCreate = async () => {
    try {
      await announcementsApi.create(formData as Omit<Announcement, 'id' | 'createdAt' | 'updatedAt'>)
      alert('お知らせを作成しました')
      resetForm()
      await fetchAnnouncements()
    } catch (error) {
      console.error('お知らせの作成に失敗しました:', error)
      alert('お知らせの作成に失敗しました')
    }
  }

  // 更新
  const handleUpdate = async () => {
    if (!editingId) return

    try {
      await announcementsApi.update(editingId, formData as Announcement)
      alert('お知らせを更新しました')
      resetForm()
      await fetchAnnouncements()
    } catch (error) {
      console.error('お知らせの更新に失敗しました:', error)
      alert('お知らせの更新に失敗しました')
    }
  }

  // 削除
  const handleDelete = async (id: number) => {
    if (!confirm('このお知らせを削除しますか？')) return

    try {
      await announcementsApi.delete(id)
      alert('お知らせを削除しました')
      await fetchAnnouncements()
    } catch (error) {
      console.error('お知らせの削除に失敗しました:', error)
      alert('お知らせの削除に失敗しました')
    }
  }

  // 編集モード
  const handleEdit = (announcement: Announcement) => {
    setFormData(announcement)
    setEditingId(announcement.id)
    setShowForm(true)
  }

  if (loading) {
    return <div style={{ padding: '2rem', textAlign: 'center' }}>読み込み中...</div>
  }

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem'
      }}>
        <h2 style={{ margin: 0, fontSize: '1.8rem', color: '#2c3e50' }}>
          お知らせ管理
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          style={{
            padding: '0.8rem 1.5rem',
            backgroundColor: '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            fontSize: '1rem',
            cursor: 'pointer',
            fontWeight: 'bold'
          }}
        >
          {showForm ? 'フォームを閉じる' : '新規作成'}
        </button>
      </div>

      {/* フォーム */}
      {showForm && (
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '2rem',
          borderRadius: '12px',
          marginBottom: '2rem'
        }}>
          <h3 style={{ marginTop: 0, color: '#2c3e50' }}>
            {editingId ? 'お知らせを編集' : '新規お知らせ作成'}
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {/* タイトル */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#34495e' }}>
                タイトル <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '1rem'
                }}
                placeholder="お知らせのタイトルを入力"
                maxLength={200}
              />
            </div>

            {/* 内容 */}
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#34495e' }}>
                内容 <span style={{ color: '#e74c3c' }}>*</span>
              </label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                style={{
                  width: '100%',
                  padding: '0.8rem',
                  borderRadius: '6px',
                  border: '1px solid #ddd',
                  fontSize: '1rem',
                  minHeight: '150px',
                  fontFamily: 'inherit'
                }}
                placeholder="お知らせの内容を入力"
              />
            </div>

            {/* 優先度と公開日 */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
              {/* 優先度 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#34495e' }}>
                  優先度
                </label>
                <select
                  value={formData.priority}
                  onChange={(e) => setFormData({ ...formData, priority: e.target.value as '重要' | '通常' })}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                >
                  <option value="通常">通常</option>
                  <option value="重要">重要</option>
                </select>
              </div>

              {/* 公開日 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#34495e' }}>
                  公開日
                </label>
                <input
                  type="date"
                  value={formData.publishedAt?.split('T')[0]}
                  onChange={(e) => setFormData({ ...formData, publishedAt: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                />
              </div>

              {/* 有効/無効 */}
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold', color: '#34495e' }}>
                  ステータス
                </label>
                <select
                  value={formData.isActive ? 'active' : 'inactive'}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'active' })}
                  style={{
                    width: '100%',
                    padding: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid #ddd',
                    fontSize: '1rem'
                  }}
                >
                  <option value="active">有効</option>
                  <option value="inactive">無効</option>
                </select>
              </div>
            </div>

            {/* ボタン */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
              <button
                onClick={editingId ? handleUpdate : handleCreate}
                disabled={!formData.title || !formData.content}
                style={{
                  padding: '0.8rem 2rem',
                  backgroundColor: editingId ? '#3498db' : '#27ae60',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: !formData.title || !formData.content ? 'not-allowed' : 'pointer',
                  fontWeight: 'bold',
                  opacity: !formData.title || !formData.content ? 0.5 : 1
                }}
              >
                {editingId ? '更新' : '作成'}
              </button>
              <button
                onClick={resetForm}
                style={{
                  padding: '0.8rem 2rem',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '1rem',
                  cursor: 'pointer',
                  fontWeight: 'bold'
                }}
              >
                キャンセル
              </button>
            </div>
          </div>
        </div>
      )}

      {/* お知らせ一覧 */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
        overflow: 'hidden'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ backgroundColor: '#f8f9fa' }}>
              <th style={{ padding: '1rem', textAlign: 'left', borderBottom: '2px solid #dee2e6' }}>タイトル</th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '100px' }}>優先度</th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '120px' }}>公開日</th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '100px' }}>ステータス</th>
              <th style={{ padding: '1rem', textAlign: 'center', borderBottom: '2px solid #dee2e6', width: '150px' }}>操作</th>
            </tr>
          </thead>
          <tbody>
            {announcements.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#95a5a6' }}>
                  お知らせがありません
                </td>
              </tr>
            ) : (
              announcements.map((announcement, index) => (
                <tr key={announcement.id} style={{
                  borderBottom: index < announcements.length - 1 ? '1px solid #dee2e6' : 'none'
                }}>
                  <td style={{ padding: '1rem' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '0.3rem', color: '#2c3e50' }}>
                      {announcement.title}
                    </div>
                    <div style={{ fontSize: '0.85rem', color: '#7f8c8d', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '400px' }}>
                      {announcement.content}
                    </div>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      fontWeight: 'bold',
                      backgroundColor: announcement.priority === '重要' ? '#e74c3c' : '#95a5a6',
                      color: 'white'
                    }}>
                      {announcement.priority}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center', fontSize: '0.9rem', color: '#7f8c8d' }}>
                    {new Date(announcement.publishedAt).toLocaleDateString('ja-JP')}
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <span style={{
                      padding: '0.25rem 0.6rem',
                      borderRadius: '4px',
                      fontSize: '0.85rem',
                      backgroundColor: announcement.isActive ? '#27ae60' : '#95a5a6',
                      color: 'white'
                    }}>
                      {announcement.isActive ? '有効' : '無効'}
                    </span>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <button
                      onClick={() => handleEdit(announcement)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        cursor: 'pointer',
                        marginRight: '0.5rem'
                      }}
                    >
                      編集
                    </button>
                    <button
                      onClick={() => handleDelete(announcement.id)}
                      style={{
                        padding: '0.4rem 0.8rem',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        fontSize: '0.85rem',
                        cursor: 'pointer'
                      }}
                    >
                      削除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default AnnouncementManagement
