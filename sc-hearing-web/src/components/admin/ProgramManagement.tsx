import { useState, useEffect } from 'react'
import Select from 'react-select'
import { programsApi } from "../../services/api";

interface Program {
  id: number
  programId: string
  programName: string
  workHours: number
}

function ProgramManagement() {
  const [programs, setPrograms] = useState<Program[]>([])
  const [showModal, setShowModal] = useState(false)
  const [editingProgram, setEditingProgram] = useState<Program | null>(null)
  const [formData, setFormData] = useState({ programId: '', programName: '', workHours: 0 })
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  useEffect(() => {
    loadPrograms()
  }, [])

  
  const loadPrograms = async () => {
    try {
      const res = await programsApi.getAll()
      setPrograms(res.data)
    } catch (e) {
      console.error('プログラムマスタの読み込みエラー:', e)
    }
  }

  
  const savePrograms = async (newPrograms: Program[]) => {
    try {
      // ✅ DB に一括保存（CSV インポート含む）
      await programsApi.saveBulk(newPrograms)

      // ✅ 保存後は DB を正として再取得
      const res = await programsApi.getAll()
      setPrograms(res.data)

      console.log('プログラムマスタ保存:', newPrograms.length, '件')
    } catch (e) {
      console.error('プログラムマスタの保存エラー:', e)
      alert('保存に失敗しました')
      throw e   // ← 必須（外側に失敗を伝える）
    }
  }


  const handleAdd = () => {
    const newProgram: Program = {
      id: Math.max(...programs.map(p => p.id), 0) + 1,
      programId: formData.programId,
      programName: formData.programName,
      workHours: formData.workHours
    }
    savePrograms([...programs, newProgram])
    setShowModal(false)
    setFormData({ programId: '', programName: '', workHours: 0 })
  }

  const handleEdit = (program: Program) => {
    setEditingProgram(program)
    setFormData({ programId: program.programId, programName: program.programName, workHours: program.workHours })
    setShowModal(true)
  }

  const handleUpdate = () => {
    if (editingProgram) {
      savePrograms(programs.map(p => p.id === editingProgram.id ? { ...p, ...formData } : p))
      setShowModal(false)
      setEditingProgram(null)
      setFormData({ programId: '', programName: '', workHours: 0 })
    }
  }

  const handleDelete = (id: number) => {
    if (confirm('このプログラムを削除しますか？')) {
      savePrograms(programs.filter(p => p.id !== id))
    }
  }

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      try {
        const csv = event.target?.result as string
        const lines = csv.split('\n').filter(line => line.trim())
        
        const imported: Program[] = []
        
        lines.slice(1).forEach(line => {
          const [programId, programName, workHours] = line.split(',').map(s => s.trim())
          if (programId && programName && workHours) {
            const newProgram: Program = {
              id: Math.max(...programs.map(p => p.id), ...imported.map(p => p.id), 0) + imported.length + 1,
              programId,
              programName,
              workHours: parseFloat(workHours)
            }
            imported.push(newProgram)
          }
        })
        
        
      try {
        await savePrograms([...programs, ...imported])
        alert(`インポートが完了しました（${imported.length}件）`)
      } catch {
        // savePrograms 側で alert 済み
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
    const csv = 'プログラムID,プログラム名,工数\nP999,サンプルプログラム,1.5\n'
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'program_template.csv'
    link.click()
  }
  
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (!confirm(`選択した ${selectedIds.length} 件を削除しますか？`)) return;
    
    try {
      for (const id of selectedIds) {
        await programsApi.delete(id);
      }
      setSelectedIds([]);
      await loadPrograms();
    } catch (e) {
      console.error('一括削除エラー:', e);
      alert('一括削除に失敗しました');
    }
  };
  
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ margin: 0, color: '#2c3e50' }}>プログラム一覧（{programs.length}件）</h2>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            disabled={selectedIds.length === 0}
            onClick={handleBulkDelete}
            style={{
              padding: '0.75rem 1.5rem',
              backgroundColor:
                selectedIds.length === 0 ? '#bdc3c7' : '#e74c3c',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor:
                selectedIds.length === 0 ? 'not-allowed' : 'pointer',
              fontWeight: 'bold',
              fontSize: '1rem'
            }}
          >
            🗑 選択したプログラムを削除
          </button>
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
          <button onClick={() => { setShowModal(true); setEditingProgram(null); setFormData({ programId: '', programName: '', workHours: 0 }); }}
            style={{
              padding: '0.75rem 1.5rem', backgroundColor: '#3498db', color: 'white',
              border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold', fontSize: '1rem'
            }}>
            ＋ 新規プログラム追加
          </button>
        </div>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', backgroundColor: 'white', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <thead>
          <tr style={{ backgroundColor: '#3498db', color: 'white' }}>
            <th>
              <input
                type="checkbox"
                checked={
                  programs.length > 0 &&
                  selectedIds.length === programs.length
                }
                onChange={(e) => {
                  if (e.target.checked) {
                    setSelectedIds(programs.map(p => p.id));
                  } else {
                    setSelectedIds([]);
                  }
                }}
              />
            </th>

            <th style={{ padding: '1rem', textAlign: 'left' }}>プログラムID</th>
            <th style={{ padding: '1rem', textAlign: 'left' }}>プログラム名</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>工数</th>
            <th style={{ padding: '1rem', textAlign: 'center' }}>操作</th>
          </tr>
        </thead>
        <tbody>
          {programs.map((program, index) => (
            <tr key={program.id} style={{ borderBottom: '1px solid #ecf0f1', backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa' }}>
              
              <th style={{ padding: '0.75rem', textAlign: 'center', width: '40px' }}>
                <input
                  type="checkbox"
                  checked={
                    programs.length > 0 &&
                    selectedIds.length === programs.length
                  }
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedIds(programs.map(p => p.id));
                    } else {
                      setSelectedIds([]);
                    }
                  }}
                />
              </th>
              <td style={{ padding: '0.75rem' }}>{program.programId}</td>
              <td style={{ padding: '0.75rem' }}>{program.programName}</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>{program.workHours}H</td>
              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                <button onClick={() => handleEdit(program)} style={{
                  padding: '0.4rem 0.8rem', marginRight: '0.5rem', backgroundColor: '#27ae60', color: 'white',
                  border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
                }}>編集</button>
                <button onClick={() => handleDelete(program.id)} style={{
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
            <h2 style={{ marginTop: 0 }}>{editingProgram ? 'プログラム編集' : '新規プログラム追加'}</h2>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>プログラムID</label>
              <input type="text" value={formData.programId} onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                placeholder="P001"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>プログラム名</label>
              <input type="text" value={formData.programName} onChange={(e) => setFormData({ ...formData, programName: e.target.value })}
                placeholder="見積登録"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>工数（時間）</label>
              <input type="number" step="0.1" min="0" value={formData.workHours} onChange={(e) => setFormData({ ...formData, workHours: parseFloat(e.target.value) })}
                placeholder="1.5"
                style={{ width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7', borderRadius: '4px', fontSize: '1rem' }} />
              <small style={{ color: '#7f8c8d' }}>0.1時間刻みで入力してください（例：0.5, 1.0, 2.5）</small>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button onClick={editingProgram ? handleUpdate : handleAdd} style={{
                flex: 1, padding: '0.75rem', backgroundColor: '#3498db', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold'
              }}>{editingProgram ? '更新' : '追加'}</button>
              <button onClick={() => { setShowModal(false); setEditingProgram(null); }} style={{
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

export default ProgramManagement
