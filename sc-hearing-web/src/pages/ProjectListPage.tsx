import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { projectsApi } from '../services/api'

interface Project {
  id: number
  companyName: string
  industry: string
  contactPerson: string
  createdAt: string
  status: string
}

type SortField = 'companyName' | 'industry' | 'contactPerson' | 'createdAt' | 'status'
type SortOrder = 'asc' | 'desc'

function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [searchText, setSearchText] = useState('')
  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')

  useEffect(() => {
    loadProjects()
  }, [])

  const loadProjects = async () => {
    try {
      const res = await projectsApi.getAll()
      setProjects(res.data)
    } catch (error) {
      console.error('案件の読み込みに失敗しました', error)
      alert('案件の読み込みに失敗しました')
    }
  }
  

  const filteredProjects = projects.filter(p =>
    p.companyName.includes(searchText) ||
    p.industry.includes(searchText) ||
    p.contactPerson.includes(searchText)
  )

  const sortedProjects = [...filteredProjects].sort((a, b) => {
    let comparison = 0
    
    if (sortField === 'companyName') {
      comparison = a.companyName.localeCompare(b.companyName, 'ja')
    } else if (sortField === 'industry') {
      comparison = a.industry.localeCompare(b.industry, 'ja')
    } else if (sortField === 'contactPerson') {
      comparison = a.contactPerson.localeCompare(b.contactPerson, 'ja')
    } else if (sortField === 'createdAt') {
      comparison = a.createdAt.localeCompare(b.createdAt)
    } else if (sortField === 'status') {
      comparison = a.status.localeCompare(b.status, 'ja')
    }
    
    return sortOrder === 'asc' ? comparison : -comparison
  })

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }
  
  const handleDelete = async (project: Project) => {
    if (!confirm(`「${project.companyName}」の案件を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) {
      return
    }

    try {
      await projectsApi.delete(project.id)
      alert('案件を削除しました')
      loadProjects()  // リストを再読み込み
    } catch (error) {
      console.error('削除に失敗しました', error)
      alert('削除に失敗しました')
    }
  }

  const handleExportProject = (project: Project) => {
    const csv = 'ID,会社名,業種,担当者,作成日,ステータス\n' +
      `${project.id},"${project.companyName}","${project.industry}","${project.contactPerson}",${project.createdAt},${project.status}\n`
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = `案件_${project.companyName}_${new Date().toISOString().split('T')[0]}.csv`
    link.click()
  }

  const getSortIndicator = (field: SortField) => {
    if (sortField !== field) return ' '
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    return dateString.split('T')[0];
  };


  return (
    <Layout>
      <div style={{ padding: '2rem', maxWidth: '1600px', margin: '0 auto' }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '2rem'
        }}>
          <h1 style={{ margin: 0, color: '#2c3e50' }}>案件一覧</h1>
          <button onClick={() => navigate('/projects/new')} style={{
            padding: '0.75rem 1.5rem',
            backgroundColor: '#3498db',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontWeight: 'bold',
            fontSize: '1rem'
          }}>＋ 新規案件作成</button>
        </div>

        {/* 検索 */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '1.5rem',
          marginBottom: '1.5rem',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <input
            type="text"
            placeholder="🔍 会社名、業種、担当者で検索"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '1rem',
              border: '2px solid #bdc3c7',
              borderRadius: '4px'
            }}
          />
        </div>

        {/* 案件一覧テーブル */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
          overflow: 'hidden'
        }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                <th 
                  onClick={() => handleSort('companyName')}
                  style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                  会社名{getSortIndicator('companyName')}
                </th>
                <th 
                  onClick={() => handleSort('industry')}
                  style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                  業種{getSortIndicator('industry')}
                </th>
                <th 
                  onClick={() => handleSort('contactPerson')}
                  style={{ padding: '1rem', textAlign: 'left', cursor: 'pointer', userSelect: 'none' }}>
                  担当者{getSortIndicator('contactPerson')}
                </th>
                <th 
                  onClick={() => handleSort('createdAt')}
                  style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                  作成日{getSortIndicator('createdAt')}
                </th>
                <th 
                  onClick={() => handleSort('status')}
                  style={{ padding: '1rem', textAlign: 'center', cursor: 'pointer', userSelect: 'none' }}>
                  ステータス{getSortIndicator('status')}
                </th>
                <th style={{ padding: '1rem', textAlign: 'center', width: '320px' }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {sortedProjects.map((project, index) => (
                <tr key={project.id} style={{
                  borderBottom: '1px solid #ecf0f1',
                  backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                }}>
                  <td style={{ padding: '1rem' }}>{project.companyName}</td>
                  <td style={{ padding: '1rem' }}>{project.industry}</td>
                  <td style={{ padding: '1rem' }}>{project.contactPerson}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>{formatDate(project.createdAt)}</td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <select
                      value={project.status}
                      onChange={async (e) => {
                        await projectsApi.updateStatus(project.id, e.target.value)
                        loadProjects()
                      }}
                      style={{
                        backgroundColor:
                          project.status === '完了' ? '#27ae60' :
                          project.status === '進行中' ? '#f39c12' :
                          project.status === '保留' ? '#95a5a6' : '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '0.25rem 0.75rem',
                        cursor: 'pointer'
                      }}
                    >
                      <option value="未着手">未着手</option>
                      <option value="進行中">進行中</option>
                      <option value="完了">完了</option>
                      <option value="保留">保留</option>
                    </select>
                  </td>
                  <td style={{ padding: '1rem', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'center' }}>
                      <button onClick={() => navigate(`/hearing/${project.id}`)} style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#3498db',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>✏️ 編集</button>
                      <button onClick={() => handleExportProject(project)} style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#27ae60',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>📤 出力</button>
                      <button onClick={() => handleDelete(project)} style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#e74c3c',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}>🗑️ 削除</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {sortedProjects.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '3rem',
            color: '#7f8c8d',
            fontSize: '1.1rem'
          }}>
            {searchText ? '検索結果が見つかりませんでした' : '案件がありません'}
          </div>
        )}
      </div>
    </Layout>
  )
}

export default ProjectListPage
