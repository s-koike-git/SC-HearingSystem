import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { announcementsApi, type Announcement } from '../services/api'
import { inquiriesApi, type Inquiry } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const MENU_CARDS = [
  { id: 'projects',     path: '/projects',          icon: '📋', label: '案件一覧',         description: '進行中・過去の案件を検索・管理します',        accent: '#1e40af', bg: 'linear-gradient(135deg,#1e3a8a,#1e40af)', tag: '案件管理' },
  { id: 'new-project',  path: '/projects/new',       icon: '＋', label: '新規案件作成',     description: '会社情報を入力してヒアリングを開始します',    accent: '#059669', bg: 'linear-gradient(135deg,#064e3b,#059669)', tag: 'はじめる' },
  { id: 'estimate',     path: '/program-estimate',   icon: '🧮', label: '工数見積もり',     description: 'プログラム単位で概算工数を算出します',        accent: '#0284c7', bg: 'linear-gradient(135deg,#0c4a6e,#0284c7)', tag: '見積' },
  { id: 'cost',         path: '/cost-simulation',    icon: '💰', label: '原価シミュレーション', description: '顧客指定単価での利益率を試算します',      accent: '#d97706', bg: 'linear-gradient(135deg,#78350f,#d97706)', tag: '分析' },
]

export default function MenuPage() {
  const navigate = useNavigate()
  const { isAdmin } = useAuth()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  // お知らせを取得
  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const data = await announcementsApi.getActive()
        setAnnouncements(data)
      } catch (error) {
        console.error('お知らせの取得に失敗しました:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAnnouncements()
  }, [])

  const now = new Date()
  const h = now.getHours()
  
  // ── 問合せ state ──
  const [showInquiryForm, setShowInquiryForm] = useState(false)
  const [showInquiryList, setShowInquiryList] = useState(false)
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [inquiryCount, setInquiryCount] = useState(0)

  
  const loadInquiries = async () => {
    try {
      const res = await inquiriesApi.getAll()

      // ★ ここが重要：必ず配列を渡す
      const list = Array.isArray(res.data) ? res.data : []

      setInquiries(list)
      setInquiryCount(list.length)
    } catch (e) {
      setInquiries([])
      setInquiryCount(0)
    }
  }


  useEffect(() => { loadInquiries() }, [])

  const submitInquiry = async (title: string, content: string, image: string | null) => {
    await inquiriesApi.create({ title, content, imageData: image })
    await loadInquiries()
    setShowInquiryForm(false)
    alert('問合せを送信しました')
  }

  const changeInquiryStatus = async (id: number, status: Inquiry['status']) => {
    await inquiriesApi.updateStatus(id, status)
    await loadInquiries()
  }

  
  const editInquiry = async (
    id: number,
    title: string,
    content: string,
    imageData: string | null
  ) => {
    await inquiriesApi.update(id, {
      title,
      content,
      imageData,   // ★ null を送れば削除
    })
    await loadInquiries()
  }


  // お知らせの展開/折りたたみ
  const toggleAnnouncement = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }
  
  
  const deleteInquiry = async (id: number) => {
    await inquiriesApi.delete(id)
    await loadInquiries()
  }

  

  return (
    <Layout>
      <div style={{ minHeight: 'calc(100vh - 80px)', background: '#f1f5f9', padding: '2rem 2.5rem', fontFamily: '"Noto Sans JP", sans-serif' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ margin: '0.2rem 0 0', color: '#0f172a', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>使用する機能を選択してください</h1>
          </div>
          <div style={{ color: '#0f172a', fontSize: '1.83rem' }}>
            {now.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' })}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', maxWidth: 1400 }}>

          {/* メニューカード */}
          <div style={{ flex: 1, display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: '1.25rem' }}>
            {MENU_CARDS.map(card => {
              const isHov = hoveredCard === card.id
              return (
                <div
                  key={card.id}
                  onClick={() => navigate(card.path)}
                  onMouseEnter={() => setHoveredCard(card.id)}
                  onMouseLeave={() => setHoveredCard(null)}
                  style={{
                    background: 'white', borderRadius: 16, padding: '1.75rem',
                    cursor: 'pointer',
                    border: `2px solid ${isHov ? card.accent : 'transparent'}`,
                    boxShadow: isHov ? `0 12px 40px rgba(0,0,0,0.12),0 0 0 1px ${card.accent}20` : '0 2px 8px rgba(0,0,0,0.06)',
                    transition: 'all 0.2s ease',
                    transform: isHov ? 'translateY(-4px)' : 'none',
                    position: 'relative', overflow: 'hidden',
                  }}
                >
                  <div style={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: card.bg, borderRadius: '16px 0 0 16px' }} />
                  <div style={{ marginLeft: '0.5rem' }}>
                    <div style={{ display: 'inline-flex', alignItems: 'center', background: `${card.accent}15`, color: card.accent, borderRadius: 6, padding: '0.18rem 0.55rem', fontSize: '0.7rem', fontWeight: 700, letterSpacing: '0.05em', marginBottom: '0.9rem' }}>
                      {card.tag}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem' }}>
                      <div style={{ width: 48, height: 48, flexShrink: 0, background: card.bg, borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: `0 4px 12px ${card.accent}40` }}>
                        {card.icon}
                      </div>
                      <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{card.label}</h3>
                    </div>
                    <p style={{ margin: 0, color: '#64748b', fontSize: '0.86rem', lineHeight: 1.6 }}>{card.description}</p>
                    <div style={{ marginTop: '1rem', color: card.accent, fontSize: '0.82rem', fontWeight: 700, opacity: isHov ? 1 : 0, transition: 'opacity 0.2s' }}>
                      開く →
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* 右側：問合せ＋お知らせ */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', width: '380px', flexShrink: 0 }}>
            {/* 問合せボタン */}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                onClick={() => setShowInquiryForm(true)}
                style={{ flex: 1, padding: '0.65rem', background: 'linear-gradient(135deg,#1e40af,#0284c7)', border: 'none', borderRadius: 10, color: 'white', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', boxShadow: '0 4px 12px rgba(30,64,175,0.25)' }}
              >
                📝 問合せ登録
              </button>
              <button
                onClick={() => setShowInquiryList(true)}
                style={{ flex: 1, padding: '0.65rem', background: 'white', border: '1.5px solid #e2e8f0', borderRadius: 10, color: '#1e40af', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', position: 'relative' }}
              >
                📋 問合せ一覧
                {inquiryCount > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', color: 'white', borderRadius: 99, padding: '1px 6px', fontSize: '0.68rem', fontWeight: 700 }}>{inquiryCount}</span>}
              </button>
            </div>
          {!loading && announcements.length > 0 && (
              <div style={{
              width: '400px',
              flexShrink: 0
            }}>
              <h2 style={{
                fontSize: '1.3rem',
                color: '#2c3e50',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                📢 お知らせ
              </h2>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                overflow: 'hidden',
                maxHeight: 'calc(100vh - 250px)',
                overflowY: 'auto'
              }}>
                {announcements.map((announcement, index) => (
                  <div key={announcement.id}>
                    {/* タイトル行（クリック可能） */}
                    <div
                      onClick={() => toggleAnnouncement(announcement.id)}
                      style={{
                        padding: '1.2rem 1.5rem',
                        cursor: 'pointer',
                        backgroundColor: expandedId === announcement.id ? '#f8f9fa' : 'white',
                        borderBottom:
                          index < announcements.length - 1 || expandedId === announcement.id
                            ? '1px solid #e9ecef'
                            : 'none',
                        transition: 'background-color 0.2s',
                      }}
                      onMouseEnter={(e) => {
                        if (expandedId !== announcement.id) {
                          e.currentTarget.style.backgroundColor = '#f8f9fa'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (expandedId !== announcement.id) {
                          e.currentTarget.style.backgroundColor = 'white'
                        }
                      }}
                    >
                      <div style={{ marginBottom: '0.5rem' }}>
                        {/* 優先度バッジ */}
                        {announcement.priority === '重要' && (
                          <span style={{
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            padding: '0.25rem 0.6rem',
                            borderRadius: '4px',
                            fontSize: '0.75rem',
                            fontWeight: 'bold',
                            marginBottom: '0.5rem',
                            display: 'inline-block'
                          }}>
                            重要
                          </span>
                        )}
                      </div>
                      {/* タイトル */}
                      <div style={{
                        fontSize: '1rem',
                        color: '#2c3e50',
                        fontWeight: announcement.priority === '重要' ? 'bold' : 'normal',
                        marginBottom: '0.5rem',
                        lineHeight: '1.4'
                      }}>
                        {announcement.title}
                      </div>
                      {/* 公開日と展開アイコン */}
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{
                          fontSize: '0.85rem',
                          color: '#95a5a6'
                        }}>
                          {new Date(announcement.publishedAt).toLocaleDateString('ja-JP')}
                        </span>
                        {/* 展開アイコン */}
                        <span style={{
                          fontSize: '1rem',
                          color: '#7f8c8d',
                          transition: 'transform 0.2s',
                          transform: expandedId === announcement.id ? 'rotate(90deg)' : 'rotate(0deg)'
                        }}>
                          ▶
                        </span>
                      </div>
                    </div>
                    {/* 内容部分（展開時のみ表示） */}
                    {expandedId === announcement.id && (
                      <div style={{
                        padding: '1.5rem',
                        backgroundColor: '#f8f9fa',
                        borderBottom: index < announcements.length - 1 ? '1px solid #e9ecef' : 'none',
                        animation: 'slideDown 0.3s ease-out'
                      }}>
                        <div style={{
                          color: '#34495e',
                          lineHeight: '1.8',
                          whiteSpace: 'pre-wrap',
                          fontSize: '0.95rem'
                        }}>
                          {announcement.content}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          </div>{/* 右側：問合せ＋お知らせ end */}
        </div>
      </div>
      {/* ── 問合せ登録モーダル ── */}
      {showInquiryForm && (
        <InquiryModal
          onClose={() => setShowInquiryForm(false)}
          onSubmit={submitInquiry}
        />
      )}

      {/* ── 問合せ一覧モーダル ── */}
      {showInquiryList && (
        <InquiryListModal
          inquiries={inquiries}
          isAdmin={isAdmin}
          onClose={() => setShowInquiryList(false)}
          onStatusChange={changeInquiryStatus}
          onEdit={editInquiry}
          onDelete={deleteInquiry}
        />
      )}

      {/* アニメーションのCSS */}
      <style>
        {`
          @keyframes slideDown {
            from {
              opacity: 0;
              transform: translateY(-10px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
        `}
      </style>
    </Layout>
  )
}
// ─── 問合せ登録モーダル ───────────────────────────────────────
function InquiryModal({ onClose, onSubmit }: {
  onClose: () => void
  onSubmit: (title: string, content: string, image: string | null) => Promise<void>
}) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) { alert('タイトルと内容を入力してください'); return }
    setSubmitting(true)
    try { await onSubmit(title, content, imagePreview) }
    catch { alert('送信に失敗しました') }
    finally { setSubmitting(false) }
  }

  const inp: React.CSSProperties = { width: '100%', padding: '0.65rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit', outline: 'none' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>📝 問合せ登録</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>タイトル <span style={{ color: '#ef4444' }}>*</span></label>
          <input style={inp} value={title} onChange={e => setTitle(e.target.value)} placeholder="問合せのタイトルを入力" />
        </div>
        <div style={{ marginBottom: '1.25rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>内容 <span style={{ color: '#ef4444' }}>*</span></label>
          <textarea style={{ ...inp, resize: 'vertical', minHeight: 100 }} value={content} onChange={e => setContent(e.target.value)} placeholder="問合せ内容を詳しく入力してください" />
        </div>
        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#475569', marginBottom: '0.4rem' }}>画像添付（任意）</label>
          <input ref={fileRef} type="file" accept="image/*" onChange={handleImage} style={{ display: 'none' }} />
          <button onClick={() => fileRef.current?.click()} style={{ padding: '0.5rem 1rem', border: '1.5px dashed #cbd5e1', borderRadius: 8, background: '#f8fafc', color: '#64748b', cursor: 'pointer', fontSize: '0.85rem' }}>
            📎 画像を選択
          </button>
          {imagePreview && (
            <div style={{ marginTop: '0.75rem', position: 'relative', display: 'inline-block' }}>
              <img src={imagePreview} alt="preview" style={{ maxWidth: 200, maxHeight: 120, borderRadius: 8, border: '1px solid #e2e8f0' }} />
              <button onClick={() => setImagePreview(null)} style={{ position: 'absolute', top: -8, right: -8, background: '#ef4444', border: 'none', borderRadius: '50%', width: 20, height: 20, color: 'white', cursor: 'pointer', fontSize: 12 }}>✕</button>
            </div>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button onClick={onClose} style={{ flex: 1, padding: '0.75rem', border: '1px solid #e2e8f0', borderRadius: 8, background: 'white', color: '#64748b', cursor: 'pointer', fontWeight: 600 }}>キャンセル</button>
          <button onClick={handleSubmit} disabled={submitting} style={{ flex: 2, padding: '0.75rem', border: 'none', borderRadius: 8, background: 'linear-gradient(135deg,#1e40af,#0284c7)', color: 'white', cursor: submitting ? 'not-allowed' : 'pointer', fontWeight: 700, fontSize: '0.95rem' }}>
            {submitting ? '送信中...' : '📨 送信する'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── 問合せ一覧モーダル ───────────────────────────────────────
function InquiryListModal({ inquiries, isAdmin, onClose, onStatusChange, onEdit,onDelete, }: {
  inquiries: Inquiry[]
  isAdmin: boolean
  onClose: () => void
  onStatusChange: (id: number, status: Inquiry['status']) => Promise<void>
  onEdit: (id: number, title: string, content: string) => Promise<void>
  onDelete: (id: number) => Promise<void>
}) {
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [editImageData, setEditImageData] = useState<string | null>(null)

  const SC: Record<Inquiry['status'], { bg: string; text: string; border: string }> = {
    '未対応': { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    '対応中': { bg: '#fffbeb', text: '#d97706', border: '#fde68a' },
    '対応済': { bg: '#f0fdf4', text: '#059669', border: '#bbf7d0' },
  }

  const inp: React.CSSProperties = { width: '100%', padding: '0.5rem 0.75rem', border: '1px solid #e2e8f0', borderRadius: 6, fontSize: '0.85rem', boxSizing: 'border-box', fontFamily: 'inherit' }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'white', borderRadius: 16, padding: '2rem', width: '100%', maxWidth: 680, maxHeight: '85vh', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexShrink: 0 }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', color: '#0f172a' }}>📋 問合せ一覧</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, color: '#94a3b8' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {inquiries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8' }}>問合せはありません</div>
          ) : inquiries.map(inq => {
            const sc = SC[inq.status]
            const isExp = expandedId === inq.id
            const isEdit = editingId === inq.id
            return (
              <div key={inq.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ padding: '0.85rem 0.25rem', cursor: 'pointer' }} onClick={() => setExpandedId(isExp ? null : inq.id)}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{inq.title}</div>
                      <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 2 }}>{inq.createdBy}　{new Date(inq.createdAt).toLocaleDateString('ja-JP')}</div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                      {isAdmin ? (
                        <select value={inq.status}
                          onChange={async e => { e.stopPropagation(); await onStatusChange(inq.id, e.target.value as Inquiry['status']) }}
                          onClick={e => e.stopPropagation()}
                          style={{ background: sc.bg, color: sc.text, border: '1px solid ' + sc.border, borderRadius: 99, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700, cursor: 'pointer' }}>
                          <option value="未対応">未対応</option>
                          <option value="対応中">対応中</option>
                          <option value="対応済">対応済</option>
                        </select>
                      ) : (
                        <span style={{ background: sc.bg, color: sc.text, border: '1px solid ' + sc.border, borderRadius: 99, padding: '0.18rem 0.6rem', fontSize: '0.73rem', fontWeight: 700 }}>{inq.status}</span>
                      )}
                      <span style={{ color: '#94a3b8', fontSize: '0.8rem', transform: isExp ? 'rotate(90deg)' : 'none', transition: 'transform 0.15s', display: 'inline-block' }}>▶</span>
                    </div>
                  </div>
                </div>
                {isExp && !isEdit && (
                  <div style={{ padding: '0.75rem 0.5rem 1rem', background: '#f8fafc', marginBottom: '0.5rem', borderRadius: 8 }}>
                    <p style={{ margin: '0 0 0.75rem', fontSize: '0.88rem', color: '#334155', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{inq.content}</p>
                    {inq.imageData && <img src={inq.imageData} alt="添付" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }} />}
                    {isAdmin && <button onClick={() => { setEditingId(inq.id); setEditTitle(inq.title); setEditContent(inq.content); setEditImageData(inq.imageData ?? null) }} style={{ marginTop: '0.5rem', padding: '0.35rem 0.85rem', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 6, color: '#1e40af', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600 }}>✏️ 編集</button>}
                  </div>
                )}
                {isExp && isEdit && (
                  <div style={{ padding: '0.75rem', background: '#f8fafc', borderRadius: 8, marginBottom: '0.5rem' }}>
                    <input style={{ ...inp, marginBottom: '0.5rem' }} value={editTitle} onChange={e => setEditTitle(e.target.value)} />
                    <textarea style={{ ...inp, minHeight: 80, resize: 'vertical' }} value={editContent} onChange={e => setEditContent(e.target.value)} />
                    {editImageData && (
                      <div style={{ marginTop: '0.75rem' }}>
                        <img
                              src={editImageData}
                              alt="添付"
                              style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8 }}
                            />

                            <div style={{ marginTop: '0.5rem' }}>
                              <button
                                onClick={() => setEditImageData(null)}   // ★ 削除処理
                                style={{
                                  padding: '0.35rem 0.75rem',
                                  border: 'none',
                                  borderRadius: 6,
                                  background: '#fee2e2',
                                  color: '#b91c1c',
                                  fontSize: '0.8rem',
                                  cursor: 'pointer',
                                  fontWeight: 600,
                                }}
                              >
                                🗑 画像を削除
                              </button>
                            </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                          ※ 現在の添付画像（変更しない場合は、このまま保存されます）
                        </div>
                      </div>
                    )}
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button onClick={() => setEditingId(null)} style={{ padding: '0.35rem 0.85rem', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', color: '#64748b', cursor: 'pointer', fontSize: '0.8rem' }}>キャンセル</button>
                      <button
                        onClick={async () => {
                          await onEdit(
                            inq.id,            // ✅ id
                            editTitle,         // ✅ string
                            editContent,       // ✅ string
                            editImageData      // ✅ string | null
                          )
                          setEditingId(null)
                        }}
                        style={{
                          padding: '0.35rem 0.85rem',
                          border: 'none',
                          borderRadius: 6,
                          background: '#1e40af',
                          color: 'white',
                          cursor: 'pointer',
                          fontSize: '0.8rem',
                          fontWeight: 700,
                        }}
                      >
                        保存
                      </button>
                    </div>
                    {/* 🗑 問合せ削除（管理者のみ表示） */}
                    {isAdmin && (
                      <div style={{ marginTop: '0.75rem', textAlign: 'right' }}>
                        <button
                          onClick={async () => {
                            if (!confirm('この問い合わせを削除してもよろしいですか？')) {
                              return
                            }

                            await onDelete(inq.id)
                            setEditingId(null)
                            setExpandedId(null)
                          }}
                          style={{
                            padding: '0.4rem 0.9rem',
                            border: 'none',
                            borderRadius: 6,
                            background: '#fee2e2',
                            color: '#b91c1c',
                            fontSize: '0.8rem',
                            cursor: 'pointer',
                            fontWeight: 700,
                          }}
                        >
                          🗑 問合せを削除
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}