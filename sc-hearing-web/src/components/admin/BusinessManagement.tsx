import { useState, useEffect } from 'react'
import { businessesApi } from "../../services/api";

interface Business {
  id: number
  name: string
  displayOrder: number
  status: '有効' | '無効'
}

function BusinessManagement() {
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [showModal, setShowModal] = useState(false)
  const [formData, setFormData] = useState({ name: '', status: '有効' as '有効' | '無効' })

  useEffect(() => {
    loadBusinesses()
  }, [])

  
  const loadBusinesses = async () => {
    try {
      const res = await businessesApi.getAll()
      setBusinesses(res.data)
    } catch (e) {
      console.error('業務マスタの読み込みエラー:', e)
    }
  }


  
  const saveBusinesses = async (newBusinesses: Business[]) => {
    try {
      // ✅ DBへ一括保存（CSVインポート含む）
      await businessesApi.saveBulk(newBusinesses)

      // ✅ 保存後はDBを正として再取得
      const res = await businessesApi.getAll()
      setBusinesses(res.data)

      console.log('業務マスタ保存:', newBusinesses.length, '件')
    } catch (e) {
      console.error('業務マスタの保存エラー:', e)
      alert('保存に失敗しました')
      throw e   // ← 必須（外側に失敗を伝える）
    }
  }

  const handleAdd = () => {
    const newBusiness: Business = {
      id: Math.max(...businesses.map(b => b.id), 0) + 1,
      name: formData.name,
      displayOrder: businesses.length + 1,
      status: formData.status
    }
    saveBusinesses([...businesses, newBusiness])
    setShowModal(false)
    setFormData({ name: '', status: '有効' })
  }

  const handleDelete = (id: number) => {
    if (confirm('この業務を削除しますか？')) {
      const filtered = businesses.filter(b => b.id !== id)
      const reordered = filtered.map((b, index) => ({ ...b, displayOrder: index + 1 }))
      saveBusinesses(reordered)
    }
  }

  const handleToggleStatus = (id: number) => {
    saveBusinesses(businesses.map(b => 
      b.id === id ? { ...b, status: b.status === '有効' ? '無効' : '有効' } as Business : b
    ))
  }

  const moveUp = (index: number) => {
    if (index === 0) return
    const newBusinesses = [...businesses]
    ;[newBusinesses[index - 1], newBusinesses[index]] = [newBusinesses[index], newBusinesses[index - 1]]
    updateDisplayOrder(newBusinesses)
  }

  const moveDown = (index: number) => {
    if (index === businesses.length - 1) return
    const newBusinesses = [...businesses]
    ;[newBusinesses[index], newBusinesses[index + 1]] = [newBusinesses[index + 1], newBusinesses[index]]
    updateDisplayOrder(newBusinesses)
  }

  const updateDisplayOrder = (businessList: Business[]) => {
    const updated = businessList.map((b, index) => ({ ...b, displayOrder: index + 1 }))
    saveBusinesses(updated)
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        
        const imported: Business[] = []
        
        lines.slice(1).forEach(line => {
          const [name, displayOrderStr, status] = line.split(',').map(s => s.trim())
          if (name) {
            const newBusiness: Business = {
              id: Math.max(...businesses.map(b => b.id), ...imported.map(b => b.id), 0) + imported.length + 1,
              name,
              displayOrder: parseInt(displayOrderStr) || (businesses.length + imported.length + 1),
              status: (status === '有効' || status === '無効' ? status : '有効') as '有効' | '無効'
            }
            imported.push(newBusiness)
          }
        })
        
        try {
          await saveBusinesses([...businesses, ...imported])
          alert(`インポートが完了しました（${imported.length}件）`)
        } catch {
          // saveBusinesses 側で alert 済み
        }

      } catch (error) {
        console.error('インポートエラー:', error)
        alert('インポートに失敗しました: ' + error)
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const handleDownloadTemplate = () => {
    const csv = '業務名,表示順,ステータス\n原価計算,8,有効\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'business_template.csv'
    link.click()
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>業務一覧（{businesses.length}件）</h2>
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
          <button onClick={() => setShowModal(true)} style={{
            padding: '0.75rem 1.5rem', backgroundColor: '#3498db', color: 'white',
            border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
          }}>＋ 新規業務追加</button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
            <th style={{ padding: '1rem', textAlign: 'center', width: '100px' }}>表示順</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>業務名</th>
            <th style={{ padding: '1rem', textAlign: 'center', width: '120px' }}>ステータス</th>
            <th style={{ padding: '1rem', textAlign: 'center', width: '200px' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {businesses.map((business, index) => (
            <tr key={business.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                  <span style={{ fontWeight: 'bold' }}>{business.displayOrder}</span>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <button onClick={() => moveUp(index)} disabled={index === 0}
                      style={{
                        padding: '0.15rem 0.4rem', backgroundColor: index === 0 ? '#ecf0f1' : '#3498db',
                        color: index === 0 ? '#95a5a6' : 'white', border: 'none', borderRadius: '2px',
                        cursor: index === 0 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', lineHeight: 1
                      }}>▲</button>
                    <button onClick={() => moveDown(index)} disabled={index === businesses.length - 1}
                      style={{
                        padding: '0.15rem 0.4rem', backgroundColor: index === businesses.length - 1 ? '#ecf0f1' : '#3498db',
                        color: index === businesses.length - 1 ? '#95a5a6' : 'white', border: 'none', borderRadius: '2px',
                        cursor: index === businesses.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.7rem', lineHeight: 1
                      }}>▼</button>
                  </div>
                </div>
              </td>
              <td style={{ padding: '0.75rem' }}>{business.name}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <button onClick={() => handleToggleStatus(business.id)} style={{
                  padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.85rem',
                  backgroundColor: business.status === '有効' ? '#27ae60' : '#95a5a6',
                  color: 'white', border: 'none', cursor: 'pointer'
                }}>{business.status}</button>
              </td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <button onClick={() => handleDelete(business.id)} style={{
                  padding: '0.4rem 0.8rem', backgroundColor: '#e74c3c', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white', borderRadius: '8px', padding: '2rem', maxWidth: '500px', width: '90%',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)'
          }}>
            <h2 style={{ marginTop: 0 }}>新規業務追加</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>業務名</label>
              <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="原価計算"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>ステータス</label>
              <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value as '有効' | '無効' })}
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }}>
                <option value="有効">有効</option>
                <option value="無効">無効</option>
              </select>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={handleAdd} style={{
                flex: 1, padding: '0.75rem', backgroundColor: '#3498db', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
              }}>追加</button>
              <button onClick={() => { setShowModal(false); setFormData({ name: '', status: '有効' }); }} style={{
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

export default BusinessManagement
