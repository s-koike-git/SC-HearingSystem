import { useState } from 'react'

interface Program {
  programId: string
  programName: string
  workHours: number
}

interface Props {
  programs: Program[]
  initialSelected: string[]
  onConfirm: (ids: string[]) => void
  onClose: () => void
}

const ProgramSelectModal = ({
  programs,
  initialSelected,
  onConfirm,
  onClose,
}: Props) => {
  const [selected, setSelected] = useState<string[]>(initialSelected)

  const toggle = (id: string) => {
    setSelected(prev =>
      prev.includes(id)
        ? prev.filter(x => x !== id)
        : [...prev, id]
    )
  }

  return (
    // オーバーレイ
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
      }}
      onClick={onClose}
    >
      {/* モーダル本体 */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          backgroundColor: 'white',
          width: '520px',
          maxHeight: '80vh',
          margin: '5% auto',
          padding: '2rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.2)',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* タイトル */}
        <h2
          style={{
            marginTop: 0,
            marginBottom: '1.2rem',
            color: '#2c3e50',
          }}
        >
          プログラム選択
        </h2>

        {/* プログラム一覧 */}
        <div
          style={{
            overflowY: 'auto',
            marginBottom: '1.5rem',
          }}
        >
          {programs.map(p => (
            <label
              key={p.programId}
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0.6rem 0',
                cursor: 'pointer',
                borderBottom: '1px solid #eee',
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(p.programId)}
                onChange={() => toggle(p.programId)}
                style={{ marginRight: '0.7rem' }}
              />
              <div>
                <strong>{p.programId}</strong> {p.programName}
                <div
                  style={{
                    fontSize: '0.85rem',
                    color: '#666',
                  }}
                >
                  基本工数：{p.workHours}H
                </div>
              </div>
            </label>
          ))}
        </div>

        {/* フッターボタン */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '0.75rem',
          }}
        >
          <button
            onClick={onClose}
            style={{
              padding: '0.5rem 1.2rem',
              borderRadius: '6px',
              border: '1px solid #ccc',
              backgroundColor: '#f2f2f2',
              cursor: 'pointer',
            }}
          >
            キャンセル
          </button>

          <button
            onClick={() => onConfirm(selected)}
            style={{
              padding: '0.5rem 1.4rem',
              borderRadius: '6px',
              border: 'none',
              backgroundColor: '#2980b9',
              color: 'white',
              fontWeight: 'bold',
              cursor: 'pointer',
            }}
          >
            OK
          </button>
        </div>
      </div>
    </div>
  )
}

export default ProgramSelectModal