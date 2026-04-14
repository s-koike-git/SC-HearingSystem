import { useState, useEffect } from 'react'
import { programsApi, programEstimatesApi, type ProgramEstimate, type ProgramEstimateItem } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import ProgramSelectModal from '../components/ProgramSelectModal'
import Layout from '../components/Layout'

interface Program {
  programId: string
  programName: string
  workHours: number
}

interface FactorConfig {
  label: string
  value: number
}

const ProgramEstimatePage = () => {
  const { user } = useAuth()
  const [programs, setPrograms] = useState<Program[]>([])
  const [items, setItems] = useState<ProgramEstimateItem[]>([])
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [showCustomProgramModal, setShowCustomProgramModal] = useState(false)
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showFactorModal, setShowFactorModal] = useState(false)
  const [estimates, setEstimates] = useState<ProgramEstimate[]>([])
  const [currentEstimateId, setCurrentEstimateId] = useState<number | null>(null)
  
  // 難易度係数設定（カスタマイズ可能）
  const [factors, setFactors] = useState<FactorConfig[]>([
    { label: '低', value: 0.8 },
    { label: '標準', value: 1.0 },
    { label: '高', value: 1.3 },
  ])
  
  // 保存用フォーム
  const [saveTitle, setSaveTitle] = useState('')
  const [saveDescription, setSaveDescription] = useState('')
  
  // 新規プログラム用フォーム
  const [customProgramName, setCustomProgramName] = useState('')
  const [customDesignHours, setCustomDesignHours] = useState(0)
  const [customBaseHours, setCustomBaseHours] = useState(0)

  useEffect(() => {
    programsApi.getAll().then(res => setPrograms(res.data))
    if (user) {
      loadEstimates()
    }
  }, [user])

  const loadEstimates = async () => {
    if (!user) return
    try {
      const data = await programEstimatesApi.getAll(user.id)
      setEstimates(data)
    } catch (error) {
      console.error('見積もり履歴の取得に失敗:', error)
    }
  }

  const updateItem = (index: number, patch: Partial<ProgramEstimateItem>) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    setItems(next)
  }

  const deleteItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index))
  }

  const addCustomProgram = () => {
    if (!customProgramName || (customDesignHours === 0 && customBaseHours === 0)) {
      alert('プログラム名と工数を入力してください')
      return
    }

    const newItem: ProgramEstimateItem = {
      programName: customProgramName,
      designWorkHours: customDesignHours,
      baseWorkHours: customBaseHours,
      factor: 1.0,
      isCustomProgram: true,
      displayOrder: items.length
    }

    setItems([...items, newItem])
    setCustomProgramName('')
    setCustomDesignHours(0)
    setCustomBaseHours(0)
    setShowCustomProgramModal(false)
  }

  const saveEstimate = async () => {
    if (!user) {
      alert('ログインが必要です')
      return
    }

    if (!saveTitle) {
      alert('見積もりタイトルを入力してください')
      return
    }

    const totalHours = items.reduce((sum, item) => 
      sum + (item.designWorkHours + item.baseWorkHours) * item.factor, 0
    )

    const estimate: ProgramEstimate = {
      id: currentEstimateId || undefined,
      userId: user.id,
      title: saveTitle,
      description: saveDescription,
      totalHours,
      items: items.map((item, index) => ({
        ...item,
        displayOrder: index
      }))
    }

    try {
      if (currentEstimateId) {
        await programEstimatesApi.update(currentEstimateId, estimate)
        alert('見積もりを更新しました')
      } else {
        const created = await programEstimatesApi.create(estimate)
        setCurrentEstimateId(created.id!)
        alert('見積もりを保存しました')
      }
      
      setSaveTitle('')
      setSaveDescription('')
      setShowSaveModal(false)
      await loadEstimates()
    } catch (error) {
      console.error('保存に失敗:', error)
      alert('保存に失敗しました')
    }
  }

  const loadEstimate = async (estimateId: number) => {
    if (!user) return

    try {
      const estimate = await programEstimatesApi.getById(estimateId, user.id)
      setItems(estimate.items.sort((a, b) => a.displayOrder - b.displayOrder))
      setCurrentEstimateId(estimate.id!)
      setSaveTitle(estimate.title)
      setSaveDescription(estimate.description || '')
      setShowHistoryModal(false)
    } catch (error) {
      console.error('見積もりの読み込みに失敗:', error)
      alert('見積もりの読み込みに失敗しました')
    }
  }

  const deleteEstimate = async (estimateId: number) => {
    if (!user) return
    if (!confirm('この見積もりを削除しますか？')) return

    try {
      await programEstimatesApi.delete(estimateId, user.id)
      alert('見積もりを削除しました')
      await loadEstimates()
    } catch (error) {
      console.error('削除に失敗:', error)
      alert('削除に失敗しました')
    }
  }

  const newEstimate = () => {
    setItems([])
    setCurrentEstimateId(null)
    setSaveTitle('')
    setSaveDescription('')
  }

  // 設計工数の小計
  const designTotal = items.reduce((sum, item) => sum + item.designWorkHours * item.factor, 0)
  
  // 基本工数の小計
  const baseTotal = items.reduce((sum, item) => sum + item.baseWorkHours * item.factor, 0)
  
  // 合計工数
  const grandTotal = designTotal + baseTotal

  return (
    <Layout>
      <div style={{ padding: '2rem', backgroundColor: '#f4f6f8', minHeight: '100vh' }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '2rem',
          boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
        }}>
          {/* タイトル */}
          <h1 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#2c3e50' }}>
            プログラム工数見積もり
          </h1>

          {/* 操作エリア */}
          <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowProgramModal(true)}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#2980b9',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              既存プログラム選択
            </button>
            
            <button
              onClick={() => setShowCustomProgramModal(true)}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#27ae60',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              新規プログラム追加
            </button>

            <button
              onClick={() => setShowFactorModal(true)}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#9b59b6',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              難易度設定
            </button>

            <button
              onClick={() => setShowSaveModal(true)}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#8e44ad',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              保存
            </button>

            <button
              onClick={() => setShowHistoryModal(true)}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: '#e67e22',
                color: 'white',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              履歴参照
            </button>

            <button
              onClick={newEstimate}
              style={{
                padding: '0.6rem 1.4rem',
                borderRadius: '6px',
                border: '1px solid #95a5a6',
                backgroundColor: 'white',
                color: '#7f8c8d',
                fontWeight: 'bold',
                cursor: 'pointer',
              }}
            >
              新規作成
            </button>
          </div>

          {/* 現在の見積もりタイトル表示 */}
          {currentEstimateId && saveTitle && (
            <div style={{
              padding: '1rem',
              backgroundColor: '#ecf0f1',
              borderRadius: '6px',
              marginBottom: '1.5rem'
            }}>
              <strong>現在の見積もり:</strong> {saveTitle}
            </div>
          )}

          {/* 見積テーブル */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ backgroundColor: '#34495e', color: 'white' }}>
                  <th style={{ padding: '0.75rem', minWidth: '200px' }}>プログラム名</th>
                  <th style={{ padding: '0.75rem', width: '120px' }}>設計工数</th>
                  <th style={{ padding: '0.75rem', width: '120px' }}>基本工数</th>
                  <th style={{ padding: '0.75rem', width: '120px' }}>難易度</th>
                  <th style={{ padding: '0.75rem', width: '100px' }}>操作</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: '2rem', textAlign: 'center', color: '#95a5a6' }}>
                      プログラムを選択してください
                    </td>
                  </tr>
                ) : (
                  items.map((item, idx) => (
                    <tr key={idx} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '0.75rem' }}>
                        {item.programName}
                      </td>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={item.designWorkHours}
                          onChange={e => updateItem(idx, { designWorkHours: Number(e.target.value) })}
                          style={{ width: '80px', textAlign: 'right', padding: '0.3rem' }}
                        />
                        <span style={{ marginLeft: '0.2rem' }}>H</span>
                      </td>
                      <td style={{ padding: '0.75rem', whiteSpace: 'nowrap' }}>
                        <input
                          type="number"
                          min={0}
                          step={0.1}
                          value={item.baseWorkHours}
                          onChange={e => updateItem(idx, { baseWorkHours: Number(e.target.value) })}
                          style={{ width: '80px', textAlign: 'right', padding: '0.3rem' }}
                        />
                        <span style={{ marginLeft: '0.2rem' }}>H</span>
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          value={item.factor}
                          onChange={e => updateItem(idx, { factor: Number(e.target.value) })}
                          style={{ width: '100%', padding: '0.3rem' }}
                        >
                          {factors.map(f => (
                            <option key={f.value} value={f.value}>
                              {f.label} ({f.value})
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                        <button
                          onClick={() => deleteItem(idx)}
                          style={{
                            padding: '0.4rem 0.8rem',
                            borderRadius: '4px',
                            border: 'none',
                            backgroundColor: '#e74c3c',
                            color: 'white',
                            cursor: 'pointer',
                            fontSize: '0.85rem'
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

          {/* 小計・合計 */}
          <div style={{
            padding: '1.5rem',
            backgroundColor: '#ecf0f1',
            borderRadius: '6px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '1rem'
          }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
                設計工数 小計
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#3498db' }}>
                {designTotal.toFixed(1)}H
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
                基本工数 小計
              </div>
              <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#27ae60' }}>
                {baseTotal.toFixed(1)}H
              </div>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '0.9rem', color: '#7f8c8d', marginBottom: '0.5rem' }}>
                合計工数
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2c3e50' }}>
                {grandTotal.toFixed(1)}H
              </div>
            </div>
          </div>

          {/* 既存プログラム選択モーダル */}
          {showProgramModal && (
            <ProgramSelectModal
              programs={programs}
              initialSelected={items.filter(i => i.programId).map(i => i.programId!)}
              onClose={() => setShowProgramModal(false)}
              onConfirm={(ids) => {
                setShowProgramModal(false)
                const newItems = ids.map((id, index) => {
                  const program = programs.find(p => p.programId === id)!
                  // プログラムマスタの工数を50%ずつに分割（仮）
                  const halfHours = program.workHours / 2
                  return {
                    programId: id,
                    programName: program.programName,
                    designWorkHours: halfHours,
                    baseWorkHours: halfHours,
                    factor: 1.0,
                    isCustomProgram: false,
                    displayOrder: index
                  }
                })
                setItems(newItems)
              }}
            />
          )}

          {/* 新規プログラム追加モーダル */}
          {showCustomProgramModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h2 style={{ marginTop: 0, color: '#2c3e50' }}>新規プログラム追加</h2>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    プログラム名
                  </label>
                  <input
                    type="text"
                    value={customProgramName}
                    onChange={e => setCustomProgramName(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    placeholder="例: カスタム受注処理"
                  />
                </div>

                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    設計工数（H）
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={customDesignHours}
                    onChange={e => setCustomDesignHours(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    placeholder="例: 8.0"
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    基本工数（H）
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={0.1}
                    value={customBaseHours}
                    onChange={e => setCustomBaseHours(Number(e.target.value))}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    placeholder="例: 16.0"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={addCustomProgram}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#27ae60',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    追加
                  </button>
                  <button
                    onClick={() => setShowCustomProgramModal(false)}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      borderRadius: '6px',
                      border: '1px solid #95a5a6',
                      backgroundColor: 'white',
                      color: '#7f8c8d',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 難易度設定モーダル */}
          {showFactorModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h2 style={{ marginTop: 0, color: '#2c3e50' }}>難易度係数設定</h2>
                
                {factors.map((factor, idx) => (
                  <div key={idx} style={{ marginBottom: '1rem', display: 'flex', gap: '1rem', alignItems: 'center' }}>
                    <input
                      type="text"
                      value={factor.label}
                      onChange={e => {
                        const next = [...factors]
                        next[idx].label = e.target.value
                        setFactors(next)
                      }}
                      style={{
                        width: '100px',
                        padding: '0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                      placeholder="名称"
                    />
                    <input
                      type="number"
                      min={0}
                      step={0.1}
                      value={factor.value}
                      onChange={e => {
                        const next = [...factors]
                        next[idx].value = Number(e.target.value)
                        setFactors(next)
                      }}
                      style={{
                        flex: 1,
                        padding: '0.6rem',
                        borderRadius: '4px',
                        border: '1px solid #ddd'
                      }}
                      placeholder="係数"
                    />
                  </div>
                ))}

                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button
                    onClick={() => setShowFactorModal(false)}
                    style={{
                      padding: '0.8rem 1.5rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: '#3498db',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 保存モーダル */}
          {showSaveModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '500px',
                width: '90%'
              }}>
                <h2 style={{ marginTop: 0, color: '#2c3e50' }}>
                  {currentEstimateId ? '見積もりを更新' : '見積もりを保存'}
                </h2>
                
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    タイトル <span style={{ color: '#e74c3c' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={saveTitle}
                    onChange={e => setSaveTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd'
                    }}
                    placeholder="例: ○○社向け見積もり"
                  />
                </div>

                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 'bold' }}>
                    説明
                  </label>
                  <textarea
                    value={saveDescription}
                    onChange={e => setSaveDescription(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.6rem',
                      borderRadius: '4px',
                      border: '1px solid #ddd',
                      minHeight: '80px',
                      fontFamily: 'inherit'
                    }}
                    placeholder="備考など"
                  />
                </div>

                <div style={{ display: 'flex', gap: '1rem' }}>
                  <button
                    onClick={saveEstimate}
                    disabled={!saveTitle || items.length === 0}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      borderRadius: '6px',
                      border: 'none',
                      backgroundColor: !saveTitle || items.length === 0 ? '#95a5a6' : '#8e44ad',
                      color: 'white',
                      fontWeight: 'bold',
                      cursor: !saveTitle || items.length === 0 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    {currentEstimateId ? '更新' : '保存'}
                  </button>
                  <button
                    onClick={() => setShowSaveModal(false)}
                    style={{
                      flex: 1,
                      padding: '0.8rem',
                      borderRadius: '6px',
                      border: '1px solid #95a5a6',
                      backgroundColor: 'white',
                      color: '#7f8c8d',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    キャンセル
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* 履歴参照モーダル */}
          {showHistoryModal && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000
            }}>
              <div style={{
                backgroundColor: 'white',
                borderRadius: '12px',
                padding: '2rem',
                maxWidth: '800px',
                width: '90%',
                maxHeight: '80vh',
                overflowY: 'auto'
              }}>
                <h2 style={{ marginTop: 0, color: '#2c3e50' }}>見積もり履歴</h2>
                
                {estimates.length === 0 ? (
                  <p style={{ color: '#95a5a6', textAlign: 'center', padding: '2rem' }}>
                    保存された見積もりがありません
                  </p>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#ecf0f1' }}>
                        <th style={{ padding: '0.75rem', textAlign: 'left' }}>タイトル</th>
                        <th style={{ padding: '0.75rem', textAlign: 'right' }}>合計工数</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>更新日</th>
                        <th style={{ padding: '0.75rem', textAlign: 'center' }}>操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {estimates.map(estimate => (
                        <tr key={estimate.id} style={{ borderBottom: '1px solid #ecf0f1' }}>
                          <td style={{ padding: '0.75rem' }}>
                            <div style={{ fontWeight: 'bold' }}>{estimate.title}</div>
                            {estimate.description && (
                              <div style={{ fontSize: '0.85rem', color: '#7f8c8d' }}>
                                {estimate.description}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 'bold' }}>
                            {estimate.totalHours.toFixed(1)}H
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center', fontSize: '0.85rem' }}>
                            {new Date(estimate.updatedAt!).toLocaleString('ja-JP')}
                          </td>
                          <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                            <button
                              onClick={() => loadEstimate(estimate.id!)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#3498db',
                                color: 'white',
                                cursor: 'pointer',
                                marginRight: '0.5rem'
                              }}
                            >
                              読込
                            </button>
                            <button
                              onClick={() => deleteEstimate(estimate.id!)}
                              style={{
                                padding: '0.4rem 0.8rem',
                                borderRadius: '4px',
                                border: 'none',
                                backgroundColor: '#e74c3c',
                                color: 'white',
                                cursor: 'pointer'
                              }}
                            >
                              削除
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'right' }}>
                  <button
                    onClick={() => setShowHistoryModal(false)}
                    style={{
                      padding: '0.8rem 1.5rem',
                      borderRadius: '6px',
                      border: '1px solid #95a5a6',
                      backgroundColor: 'white',
                      color: '#7f8c8d',
                      fontWeight: 'bold',
                      cursor: 'pointer'
                    }}
                  >
                    閉じる
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ProgramEstimatePage
