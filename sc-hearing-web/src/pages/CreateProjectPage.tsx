import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { projectsApi } from '../services/api'

function CreateProjectPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    companyName: '',
    industry: '',
    personInCharge: '',
    email: '',
    phone: '',
    address: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.companyName || !formData.industry || !formData.personInCharge) {
      alert('会社名、業種、担当者は必須項目です')
      return
    }
    
    const res = await projectsApi.create({
      companyName: formData.companyName,
      industry: formData.industry,
      contactPerson: formData.personInCharge,
      email: formData.email,
      phoneNumber: formData.phone,
      remarks: formData.address,
    })

    //const updatedProjects = [...existingProjects, newProject]
    //localStorage.setItem('projects', JSON.stringify(updatedProjects))

    alert('案件を作成しました')
    //navigate(`/hearing/${newProject.id}`)
    navigate(`/hearing/${res.data.id}`)
  }

  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
        <h1 style={{ marginBottom: '2rem', color: '#2c3e50' }}>新規案件作成</h1>

        <form onSubmit={handleSubmit} style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '2rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              会社名 <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.companyName}
              onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
              placeholder="株式会社〇〇"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #bdc3c7',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              業種 <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <select
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #bdc3c7',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            >
              <option value="">選択してください</option>
              <option value="製造業">製造業</option>
              <option value="小売業">小売業</option>
              <option value="卸売業">卸売業</option>
              <option value="サービス業">サービス業</option>
              <option value="建設業">建設業</option>
              <option value="運輸業">運輸業</option>
              <option value="その他">その他</option>
            </select>
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              担当者名 <span style={{ color: '#e74c3c' }}>*</span>
            </label>
            <input
              type="text"
              value={formData.personInCharge}
              onChange={(e) => setFormData({ ...formData, personInCharge: e.target.value })}
              placeholder="山田 太郎"
              required
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #bdc3c7',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              メールアドレス
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="yamada@example.com"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #bdc3c7',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '1.5rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              電話番号
            </label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="092-xxx-xxxx"
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #bdc3c7',
                borderRadius: '4px',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ marginBottom: '2rem' }}>
            <label style={{
              display: 'block',
              marginBottom: '0.5rem',
              fontWeight: 'bold',
              color: '#2c3e50'
            }}>
              住所
            </label>
            <textarea
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="福岡県福岡市..."
              rows={3}
              style={{
                width: '100%',
                padding: '0.75rem',
                fontSize: '1rem',
                border: '2px solid #bdc3c7',
                borderRadius: '4px',
                resize: 'vertical',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '1rem' }}>
            <button type="submit" style={{
              flex: 1,
              padding: '1rem',
              fontSize: '1.1rem',
              fontWeight: 'bold',
              color: 'white',
              backgroundColor: '#3498db',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}>
              作成してヒアリング開始
            </button>
          </div>
        </form>
      </div>
    </Layout>
  )
}

export default CreateProjectPage
