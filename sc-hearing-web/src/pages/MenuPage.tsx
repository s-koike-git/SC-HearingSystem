import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'

function MenuPage() {
  const navigate = useNavigate()

  return (
    <Layout>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 'calc(100vh - 80px)',
        padding: '2rem'
      }}>
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

        {/* メニューカード */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '2rem',
          maxWidth: '800px',
          width: '100%'
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
      </div>
    </Layout>
  )
}

export default MenuPage
