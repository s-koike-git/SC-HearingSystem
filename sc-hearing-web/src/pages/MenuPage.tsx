import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { announcementsApi, type Announcement } from '../services/api'

function MenuPage() {
  const navigate = useNavigate()
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [expandedId, setExpandedId] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

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

  // お知らせの展開/折りたたみ
  const toggleAnnouncement = (id: number) => {
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <Layout>
      <div style={{
        padding: '2rem',
        minHeight: 'calc(100vh - 80px)'
      }}>
        {/* ページタイトル */}
        <div style={{
          textAlign: 'center',
          marginBottom: '3rem'
        }}>
          <h1 style={{
            fontSize: '2.5rem',
            color: '#2c3e50',
            margin: 0,
            marginBottom: '0.5rem'
          }}>
            メニュー
          </h1>
          <p style={{
            fontSize: '1.1rem',
            color: '#7f8c8d',
            margin: 0
          }}>
            実施する作業を選択してください
          </p>
        </div>

        {/* メインコンテンツ（2カラムレイアウト） */}
        <div style={{
          display: 'flex',
          gap: '2rem',
          maxWidth: '1400px',
          margin: '0 auto',
          alignItems: 'flex-start'
        }}>
          {/* 左側：メニューカード */}
          <div style={{
            flex: 1,
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '2rem',
            minWidth: 0
          }}>
            {/* 案件一覧 */}
            <div
              onClick={() => navigate('/projects')}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'center'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(0,0,0,0.25)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                backgroundColor: '#3498db',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem'
              }}>
                📋
              </div>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.5rem',
                color: '#2c3e50',
                fontWeight: 'bold'
              }}>
                案件一覧
              </h3>
              <p style={{
                margin: 0,
                color: '#7f8c8d',
                fontSize: '0.95rem',
                lineHeight: '1.6'
              }}>
                既存の案件を確認・編集します。<br />
                進行中の案件や過去の案件を<br />
                一覧で確認できます。
              </p>
            </div>

            {/* 新規案件作成 */}
            <div
              onClick={() => navigate('/projects/new')}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'center',
                border: '2px solid #27ae60'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(39, 174, 96, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                backgroundColor: '#27ae60',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem'
              }}>
                ➕
              </div>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.5rem',
                color: '#2c3e50',
                fontWeight: 'bold'
              }}>
                新規案件作成
              </h3>
              <p style={{
                margin: 0,
                color: '#7f8c8d',
                fontSize: '0.95rem',
                lineHeight: '1.6'
              }}>
                新しい案件を作成します。<br />
                会社情報を登録後、<br />
                ヒアリングを開始できます。
              </p>
            </div>

            {/* プログラム工数見積もり */}
            <div
              onClick={() => navigate('/program-estimate')}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'center',
                border: '2px solid #2980b9',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(41, 128, 185, 0.35)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'
              }}
            >
              <span
                style={{
                  width: '80px',
                  height: '80px',
                  margin: '0 auto 1.5rem',
                  backgroundColor: '#dcd6f7',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2.5rem',
                }}
              >
                🧮
              </span>

              <h4 style={{ marginTop: '1rem' }}>
                プログラム工数見積もり
              </h4>

              <p style={{ fontSize: '0.9rem', color: '#555' }}>
                プログラム単位で
                <br />
                概算の工数見積を行います。
              </p>
            </div>

            {/* 原価シミュレーション */}
            <div
              onClick={() => navigate('/cost-simulation')}
              style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2.5rem',
                boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
                cursor: 'pointer',
                transition: 'all 0.3s',
                textAlign: 'center',
                border: '2px solid #e67e22'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-8px)'
                e.currentTarget.style.boxShadow = '0 15px 40px rgba(230, 126, 34, 0.3)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.15)'
              }}
            >
              <div style={{
                width: '80px',
                height: '80px',
                margin: '0 auto 1.5rem',
                backgroundColor: '#e67e22',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem'
              }}>
                💰
              </div>
              <h3 style={{
                margin: '0 0 1rem 0',
                fontSize: '1.5rem',
                color: '#2c3e50',
                fontWeight: 'bold'
              }}>
                原価シミュレーション
              </h3>
              <p style={{
                margin: 0,
                color: '#7f8c8d',
                fontSize: '0.95rem',
                lineHeight: '1.6'
              }}>
                顧客指定単価での<br />
                利益シミュレーションを行います。<br />
                原価内訳と利益率を確認できます。
              </p>
            </div>
          </div>

          {/* 右側：お知らせ */}
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
                        borderBottom: index < announcements.length - 1 || expandedId === announcement.id ? '1px solid #e9ecef' : 'none',
                        transition: 'background-color 0.2s'
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
        </div>
      </div>

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

export default MenuPage
