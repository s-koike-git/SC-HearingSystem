import { useState, useEffect } from 'react'
import { programsApi } from '../services/api'
import ProgramSelectModal from '../components/ProgramSelectModal'
import Layout from '../components/Layout'

interface Program {
  programId: string
  programName: string
  workHours: number
}

interface EstimateItem {
  programId: string
  quantity: number
  factor: number
}

const FACTORS = [
  { label: '低', value: 0.8 },
  { label: '標準', value: 1.0 },
  { label: '高', value: 1.3 },
]

const ProgramEstimatePage = () => {
  const [programs, setPrograms] = useState<Program[]>([])
  const [items, setItems] = useState<EstimateItem[]>([])
  const [showProgramModal, setShowProgramModal] = useState(false)
  const [selectedProgramIds, setSelectedProgramIds] = useState<string[]>([])

  useEffect(() => {
    programsApi.getAll().then(res => setPrograms(res.data))
  }, [])

  const updateItem = (
    index: number,
    patch: Partial<EstimateItem>
  ) => {
    const next = [...items]
    next[index] = { ...next[index], ...patch }
    setItems(next)
  }

  const total = items.reduce((sum, item) => {
    const program = programs.find(p => p.programId === item.programId)
    if (!program) return sum
    return sum + program.workHours * item.quantity * item.factor
  }, 0)

  return (
    <Layout>
      <div
        style={{
          padding: '2rem',
          backgroundColor: '#f4f6f8',
          minHeight: '100vh',
        }}
      >
        <div
          style={{
            maxWidth: '1200px',
            margin: '0 auto',
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '2rem',
            boxShadow: '0 10px 30px rgba(0,0,0,0.15)',
          }}
        >
          {/* タイトル */}
          <h1
            style={{
              marginTop: 0,
              marginBottom: '1.5rem',
              color: '#2c3e50',
            }}
          >
            プログラム工数見積もり
          </h1>

          {/* 操作エリア */}
          <div style={{ marginBottom: '1.5rem' }}>
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
              プログラム選択
            </button>
          </div>

          {/* 見積テーブル */}
          <div style={{ overflowX: 'auto', marginBottom: '1.5rem' }}>
            <table
              style={{
                width: '100%',
                borderCollapse: 'collapse',
              }}
            >
              <thead>
                <tr
                  style={{
                    backgroundColor: '#34495e',
                    color: 'white',
                  }}
                >
                  <th style={{ padding: '0.75rem' }}>プログラム</th>
                  <th style={{ padding: '0.75rem' }}>基本工数</th>
                  <th style={{ padding: '0.75rem' }}>数量</th>
                  <th style={{ padding: '0.75rem' }}>難易度</th>
                  <th style={{ padding: '0.75rem' }}>小計</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item, idx) => {
                  const program = programs.find(
                    p => p.programId === item.programId
                  )
                  if (!program) return null

                  const subtotal =
                    program.workHours * item.quantity * item.factor

                  return (
                    <tr key={item.programId}>
                      <td style={{ padding: '0.75rem' }}>
                        {program.programName}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {program.workHours}H
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <input
                          type="number"
                          min={1}
                          value={item.quantity}
                          onChange={e =>
                            updateItem(idx, {
                              quantity: Number(e.target.value),
                            })
                          }
                          style={{ width: '70px' }}
                        />
                      </td>
                      <td style={{ padding: '0.75rem' }}>
                        <select
                          value={item.factor}
                          onChange={e =>
                            updateItem(idx, {
                              factor: Number(e.target.value),
                            })
                          }
                        >
                          {FACTORS.map(f => (
                            <option key={f.value} value={f.value}>
                              {f.label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {subtotal.toFixed(1)}H
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* 合計工数 */}
          <div
            style={{
              textAlign: 'right',
              fontSize: '1.3rem',
              fontWeight: 'bold',
              color: '#2c3e50',
            }}
          >
            合計工数： {total.toFixed(1)}H
          </div>

          {/* モーダル */}
          {showProgramModal && (
            <ProgramSelectModal
              programs={programs}
              initialSelected={selectedProgramIds}
              onClose={() => setShowProgramModal(false)}
              onConfirm={(ids) => {
                setSelectedProgramIds(ids)
                setShowProgramModal(false)
                setItems(
                  ids.map(id => ({
                    programId: id,
                    quantity: 1,
                    factor: 1.0,
                  }))
                )
              }}
            />
          )}
        </div>
      </div>
    </Layout>
  )
}

export default ProgramEstimatePage