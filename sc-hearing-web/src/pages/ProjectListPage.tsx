import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout'
import { projectsApi } from '../services/api'
import { HelpModal, HelpButton, projectListHelpPages } from '../components/HelpModal'

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
type StatusFilter = string

const STATUS_CONFIG: Record<string, { color: string; bg: string; border: string; icon: string }> = {
  '未着手': { color: '#475569', bg: '#f1f5f9', border: '#cbd5e1', icon: '○' },
  '進行中': { color: '#0C447C', bg: '#E6F1FB', border: '#185FA5', icon: '◐' },
  '完了':   { color: '#0F6E56', bg: '#E1F5EE', border: '#1D9E75', icon: '✓' },
  '保留':   { color: '#854F0B', bg: '#FAEEDA', border: '#BA7517', icon: '⏸' },
}


// ─── マスタAPI取得フック ──────────────────────────────────────
function useMasterValues(category: string, defaults: string[]): string[] {
  const [values, setValues] = useState<string[]>(defaults)
  useEffect(() => {
    fetch('/sc-hearing/api/MasterItems/category/' + category)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.length) setValues(data.map((m: any) => m.value)) })
      .catch(() => {})
  }, [category])
  return values
}

function ProjectListPage() {
  const navigate = useNavigate()
  const [projects, setProjects] = useState<Project[]>([])
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('全て')
  const STATUS_OPTIONS = useMasterValues('project_progress', ['未着手','進行中','完了','保留'])

  const [sortField, setSortField] = useState<SortField>('createdAt')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [showHelp, setShowHelp] = useState(false)

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

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = Object.fromEntries([...STATUS_OPTIONS].map(s => [s, 0]))
    projects.forEach(p => {
      if (counts[p.status] !== undefined) counts[p.status]++
    })
    return counts
  }, [projects])

  const filteredProjects = useMemo(() => {
    let list = projects.filter(p =>
      p.companyName.includes(searchText) ||
      p.industry.includes(searchText) ||
      p.contactPerson.includes(searchText)
    )
    if (statusFilter !== '全て') {
      list = list.filter(p => p.status === statusFilter)
    }
    return list
  }, [projects, searchText, statusFilter])

  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a, b) => {
      let comparison = 0
      if (sortField === 'companyName') comparison = a.companyName.localeCompare(b.companyName, 'ja')
      else if (sortField === 'industry') comparison = a.industry.localeCompare(b.industry, 'ja')
      else if (sortField === 'contactPerson') comparison = a.contactPerson.localeCompare(b.contactPerson, 'ja')
      else if (sortField === 'createdAt') comparison = a.createdAt.localeCompare(b.createdAt)
      else if (sortField === 'status') comparison = a.status.localeCompare(b.status, 'ja')
      return sortOrder === 'asc' ? comparison : -comparison
    })
  }, [filteredProjects, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const handleDelete = async (project: Project) => {
    if (!confirm(`「${project.companyName}」の案件を削除してもよろしいですか？\n\nこの操作は取り消せません。`)) return
    try {
      await projectsApi.delete(project.id)
      alert('案件を削除しました')
      loadProjects()
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
    if (sortField !== field) return ''
    return sortOrder === 'asc' ? ' ↑' : ' ↓'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return ''
    return dateString.split('T')[0]
  }

  return (
    <Layout>
      <div style={{ padding: '24px 32px', maxWidth: 1600, margin: '0 auto', fontFamily: '"Noto Sans JP", sans-serif' }}>

        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: '20px 24px',
          marginBottom: 16,
          border: '1px solid #e2e8f0',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 16,
        }}>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 700, color: '#0f172a' }}>
              📋 案件一覧
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
              全 {projects.length} 件 · {Object.entries(statusCounts).map(([k, v]) =>
                v > 0 ? `${k} ${v}` : null).filter(Boolean).join(' · ') || 'データなし'}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <HelpButton onClick={() => setShowHelp(true)} />
            <button
              onClick={() => navigate('/projects/new')}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #1e40af, #3b82f6)',
                color: 'white',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: '0.9rem',
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
                fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', gap: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>＋</span> 新規案件作成
            </button>
          </div>
        </div>

        {showHelp && <HelpModal pages={projectListHelpPages} onClose={() => setShowHelp(false)} />}

        <div style={{
          background: 'white',
          borderRadius: 12,
          padding: 12,
          marginBottom: 16,
          border: '1px solid #e2e8f0',
          display: 'flex',
          gap: 12,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}>
          <div style={{ flex: 1, minWidth: 280, position: 'relative' }}>
            <span style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              fontSize: 16, color: '#94a3b8', pointerEvents: 'none',
            }}>🔍</span>
            <input
              type="text"
              placeholder="会社名、業種、担当者で検索"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 38px',
                fontSize: '0.9rem',
                border: '1px solid #e2e8f0',
                borderRadius: 8,
                outline: 'none',
                boxSizing: 'border-box',
                fontFamily: 'inherit',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            {(['全て', ...STATUS_OPTIONS] as StatusFilter[]).map(s => {
              const isActive = statusFilter === s
              const cfg = s !== '全て' ? STATUS_CONFIG[s] : null
              return (
                <button
                  key={s}
                  onClick={() => setStatusFilter(s)}
                  style={{
                    padding: '6px 12px',
                    background: isActive
                      ? (cfg ? cfg.border : '#1e40af')
                      : (cfg ? cfg.bg : '#f1f5f9'),
                    color: isActive ? 'white' : (cfg ? cfg.color : '#475569'),
                    border: '1px solid',
                    borderColor: isActive
                      ? (cfg ? cfg.border : '#1e40af')
                      : (cfg ? cfg.border + '40' : '#e2e8f0'),
                    borderRadius: 6,
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    fontWeight: 500,
                    transition: 'all 0.15s',
                    fontFamily: 'inherit',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {s} {s !== '全て' && statusCounts[s] !== undefined && `(${statusCounts[s]})`}
                </button>
              )
            })}
          </div>
        </div>

        <div style={{
          background: 'white',
          borderRadius: 12,
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 160px 140px 110px 130px 200px',
            gap: 16,
            padding: '12px 20px',
            background: '#f8fafc',
            borderBottom: '1px solid #e2e8f0',
            fontSize: '0.78rem',
            fontWeight: 600,
            color: '#475569',
            letterSpacing: '0.02em',
          }}>
            <div onClick={() => handleSort('companyName')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              会社名{getSortIndicator('companyName')}
            </div>
            <div onClick={() => handleSort('industry')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              業種{getSortIndicator('industry')}
            </div>
            <div onClick={() => handleSort('contactPerson')} style={{ cursor: 'pointer', userSelect: 'none' }}>
              担当者{getSortIndicator('contactPerson')}
            </div>
            <div onClick={() => handleSort('createdAt')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
              作成日{getSortIndicator('createdAt')}
            </div>
            <div onClick={() => handleSort('status')} style={{ cursor: 'pointer', userSelect: 'none', textAlign: 'center' }}>
              ステータス{getSortIndicator('status')}
            </div>
            <div style={{ textAlign: 'center' }}>操作</div>
          </div>

          {sortedProjects.map(project => {
            const cfg = STATUS_CONFIG[project.status] || STATUS_CONFIG['未着手']
            return (
              <div
                key={project.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 160px 140px 110px 130px 200px',
                  gap: 16,
                  padding: '14px 20px',
                  borderBottom: '1px solid #f1f5f9',
                  borderLeft: `3px solid ${cfg.border}`,
                  alignItems: 'center',
                  background: 'white',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc' }}
                onMouseLeave={(e) => { e.currentTarget.style.background = 'white' }}
              >
                <div
                  onClick={() => navigate(`/hearing/${project.id}`)}
                  style={{ cursor: 'pointer', minWidth: 0 }}
                >
                  <div style={{
                    fontSize: '0.95rem', fontWeight: 600, color: '#0f172a',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {project.companyName}
                  </div>
                </div>
                <div style={{
                  fontSize: '0.85rem', color: '#475569',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {project.industry}
                </div>
                <div style={{
                  fontSize: '0.85rem', color: '#475569',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}>
                  {project.contactPerson}
                </div>
                <div style={{ fontSize: '0.85rem', color: '#64748b', textAlign: 'center', fontFamily: 'monospace' }}>
                  {formatDate(project.createdAt)}
                </div>
                <div style={{ textAlign: 'center' }}>
                  <select
                    value={project.status}
                    onChange={async (e) => {
                      await projectsApi.updateStatus(project.id, e.target.value)
                      loadProjects()
                    }}
                    style={{
                      padding: '4px 10px',
                      background: cfg.bg,
                      color: cfg.color,
                      border: `1px solid ${cfg.border}`,
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                    }}
                  >
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{(STATUS_CONFIG[s] || STATUS_CONFIG['未着手']).icon} {s}</option>)}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: 4, justifyContent: 'center' }}>
                  <button
                    onClick={() => navigate(`/hearing/${project.id}`)}
                    title="編集"
                    style={{
                      padding: '6px 12px',
                      background: '#E6F1FB',
                      color: '#0C447C',
                      border: '1px solid #185FA5',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: 600,
                      fontFamily: 'inherit',
                      display: 'flex', alignItems: 'center', gap: 4,
                    }}
                  >✏️ 編集</button>
                  <button
                    onClick={() => handleExportProject(project)}
                    title="CSV出力"
                    style={{
                      padding: '6px 10px',
                      background: '#E1F5EE',
                      color: '#0F6E56',
                      border: '1px solid #1D9E75',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                    }}
                  >📤</button>
                  <button
                    onClick={() => handleDelete(project)}
                    title="削除"
                    style={{
                      padding: '6px 10px',
                      background: '#FCEBEB',
                      color: '#A32D2D',
                      border: '1px solid #E24B4A',
                      borderRadius: 6,
                      cursor: 'pointer',
                      fontSize: '0.85rem',
                      fontFamily: 'inherit',
                    }}
                  >🗑</button>
                </div>
              </div>
            )
          })}

          {sortedProjects.length === 0 && (
            <div style={{
              padding: '60px 20px',
              textAlign: 'center',
              color: '#94a3b8',
            }}>
              <div style={{ fontSize: 48, marginBottom: 12, opacity: 0.5 }}>📭</div>
              <div style={{ fontSize: '1rem' }}>
                {searchText || statusFilter !== '全て' ? '条件に一致する案件がありません' : '案件がありません'}
              </div>
              {(searchText || statusFilter !== '全て') && (
                <button
                  onClick={() => { setSearchText(''); setStatusFilter('全て') }}
                  style={{
                    marginTop: 12, padding: '6px 14px',
                    background: 'transparent', color: '#185FA5',
                    border: '1px solid #185FA5', borderRadius: 6,
                    cursor: 'pointer', fontSize: '0.85rem',
                    fontFamily: 'inherit',
                  }}
                >条件をクリア</button>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ProjectListPage
