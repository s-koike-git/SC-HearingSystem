import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { announcementsApi, type Announcement } from '../services/api'

const MENU_CARDS = [
  { id: 'projects',     path: '/projects',          icon: '📋', label: '案件一覧',         description: '進行中・過去の案件を検索・管理します',        accent: '#1e40af', bg: 'linear-gradient(135deg,#1e3a8a,#1e40af)', tag: '案件管理' },
  { id: 'new-project',  path: '/projects/new',       icon: '＋', label: '新規案件作成',     description: '会社情報を入力してヒアリングを開始します',    accent: '#059669', bg: 'linear-gradient(135deg,#064e3b,#059669)', tag: 'はじめる' },
  { id: 'estimate',     path: '/program-estimate',   icon: '🧮', label: '工数見積もり',     description: 'プログラム単位で概算工数を算出します',        accent: '#0284c7', bg: 'linear-gradient(135deg,#0c4a6e,#0284c7)', tag: '見積' },
  { id: 'cost',         path: '/cost-simulation',    icon: '💰', label: '原価シミュレーション', description: '顧客指定単価での利益率を試算します',      accent: '#d97706', bg: 'linear-gradient(135deg,#78350f,#d97706)', tag: '分析' },
]

export default function MenuPage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  useEffect(() => {
    announcementsApi.getActive().then(setAnnouncements).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const now = new Date()
  const h = now.getHours()
  const greeting = h < 11 ? 'おはようございます' : h < 17 ? 'こんにちは' : 'お疲れ様です'

  return (
    <Layout>
      <div style={{ minHeight: 'calc(100vh - 80px)', background: '#f1f5f9', padding: '2rem 2.5rem', fontFamily: '"Noto Sans JP", sans-serif' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <p style={{ margin: 0, color: '#64748b', fontSize: '0.88rem', fontWeight: 500 }}>{greeting}</p>
            <h1 style={{ margin: '0.2rem 0 0', color: '#0f172a', fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-0.02em' }}>何をしますか？</h1>
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.83rem' }}>
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

          {/* お知らせ */}
          {!loading && announcements.length > 0 && (
            <div style={{ width: 360, flexShrink: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem' }}>
                <span style={{ fontSize: 18 }}>📢</span>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>お知らせ</h2>
                <span style={{ background: '#ef4444', color: 'white', borderRadius: 99, padding: '0.1rem 0.55rem', fontSize: '0.7rem', fontWeight: 700 }}>{announcements.length}</span>
              </div>
              <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden', maxHeight: 'calc(100vh - 280px)', overflowY: 'auto' }}>
                {announcements.map((ann, idx) => (
                  <div key={ann.id}>
                    <div
                      onClick={() => setExpandedId(expandedId === ann.id ? null : ann.id)}
                      style={{
                        padding: '1rem 1.25rem', cursor: 'pointer',
                        borderBottom: idx < announcements.length - 1 || expandedId === ann.id ? '1px solid #f1f5f9' : 'none',
                        background: expandedId === ann.id ? '#f8fafc' : 'white',
                        transition: 'background 0.15s',
                      }}
                    >
                      {ann.priority === '重要' && (
                        <span style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: 4, padding: '0.15rem 0.5rem', fontSize: '0.7rem', fontWeight: 700, display: 'inline-block', marginBottom: '0.4rem' }}>重要</span>
                      )}
                      <div style={{ fontSize: '0.88rem', fontWeight: ann.priority === '重要' ? 700 : 500, color: '#1e293b', lineHeight: 1.4 }}>{ann.title}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.4rem' }}>
                        <span style={{ fontSize: '0.76rem', color: '#94a3b8' }}>{new Date(ann.publishedAt).toLocaleDateString('ja-JP')}</span>
                        <span style={{ color: '#94a3b8', fontSize: '0.78rem', transform: expandedId === ann.id ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                      </div>
                    </div>
                    {expandedId === ann.id && (
                      <div style={{ padding: '1rem 1.25rem', background: '#f8fafc', borderBottom: idx < announcements.length - 1 ? '1px solid #f1f5f9' : 'none', fontSize: '0.86rem', color: '#334155', lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                        {ann.content}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}
