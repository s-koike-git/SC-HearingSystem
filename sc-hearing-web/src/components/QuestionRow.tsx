import { useState } from 'react'

interface QuestionRowProps {
  question: QuestionDef
  businessType: string
  value: string
  isCustom: boolean
  memo: string
  onChange: (value: string, isCustom: boolean, memo: string) => void
}

function QuestionRow({ question, businessType, value, isCustom, memo, onChange }: QuestionRowProps) {
  const [expanded, setExpanded] = useState(false)
  const [localMemo, setLocalMemo] = useState(memo)

  const handleMemoBlur = () => {
    if (localMemo !== memo) {
      onChange(value, isCustom, localMemo)
    }
  }

  const renderInput = () => {
    switch (question.type) {
      case 'yesno':
        return (
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              padding: '0.5rem 1rem', backgroundColor: value === '○' ? '#e3f2fd' : '#f5f5f5',
              borderRadius: '4px', border: value === '○' ? '2px solid #2196F3' : '2px solid transparent',
              transition: 'all 0.2s' }}>
              <input type="radio" name={`${businessType}_${question.no}`} value="○"
                checked={value === '○'} onChange={(e) => onChange(e.target.value, isCustom, memo)}
                style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: value === '○' ? 'bold' : 'normal' }}>○</span>
            </label>
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
              padding: '0.5rem 1rem', backgroundColor: value === '×' ? '#ffebee' : '#f5f5f5',
              borderRadius: '4px', border: value === '×' ? '2px solid #f44336' : '2px solid transparent',
              transition: 'all 0.2s' }}>
              <input type="radio" name={`${businessType}_${question.no}`} value="×"
                checked={value === '×'} onChange={(e) => onChange(e.target.value, isCustom, memo)}
                style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
              <span style={{ fontSize: '1.1rem', fontWeight: value === '×' ? 'bold' : 'normal' }}>×</span>
            </label>
            {value && (
              <button onClick={() => onChange('', isCustom, memo)} style={{
                padding: '0.4rem 0.8rem', backgroundColor: '#95a5a6', color: 'white',
                border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.85rem'
              }}>クリア</button>
            )}
          </div>
        )
      
      case 'choice':
        return (
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
            <select
              value={value}
              onChange={(e) => onChange(e.target.value, isCustom, memo)}
              style={{
                width: '250px',
                padding: '0.5rem',
                border: '1px solid #bdc3c7',
                borderRadius: '4px',
                fontSize: '1rem',
                backgroundColor: '#fff'
              }}
            >
              <option value="">選択してください</option>
              {question.choices?.map(choice => (
                <option key={choice.value} value={choice.value}>
                  {choice.label ?? choice.value}
                </option>
              ))}
            </select>

            {value && (
              <button
                onClick={() => onChange('', isCustom, memo)}
                style={{
                  padding: '0.4rem 0.8rem',
                  backgroundColor: '#95a5a6',
                  color: 'white',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '0.85rem'
                }}
              >
                クリア
              </button>
            )}
          </div>
        )

      case 'text':
        return (
          <input type="text" value={value} onChange={(e) => onChange(e.target.value, isCustom, memo)}
            placeholder="入力してください" style={{
              width: '250px', padding: '0.5rem', border: '1px solid #bdc3c7',
              borderRadius: '4px', fontSize: '1rem'
            }} />
        )
      default:
        return null
    }
  }

  const getChoiceLabel = () => {
    if (question.type === 'choice' && value && question.choices) {
      const choice = question.choices.find(c => c.value === value)
      return choice ? choice.label : ''
    }
    return ''
  }

  return (
    <div style={{ border: '1px solid #ecf0f1', borderRadius: '4px', marginBottom: '0.5rem', backgroundColor: 'white' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '1rem', gap: '1rem',
        cursor: (question.implementation || question.settings) ? 'pointer' : 'default' }}
        onClick={() => { if (question.implementation || question.settings) setExpanded(!expanded) }}>
        {(question.implementation || question.settings) && (
          <div style={{ width: '20px', color: '#7f8c8d', fontSize: '1.2rem',
            transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>▶</div>
        )}
        <div style={{ minWidth: '60px', fontWeight: 'bold', color: '#2c3e50', fontSize: '0.95rem' }}>
          {question.no}
        </div>
        <div style={{ flex: 1, color: '#34495e', fontSize: '1rem', minWidth: '250px' }}>
          {question.text}
          {getChoiceLabel() && (
            <span style={{ marginLeft: '0.5rem', color: '#2196F3', fontSize: '0.9rem', fontWeight: 'normal' }}>
              ({getChoiceLabel()})
            </span>
          )}
        </div>
        <div style={{ minWidth: '320px' }} onClick={(e) => e.stopPropagation()}>
          {renderInput()}
        </div>
        <div style={{ minWidth: '100px' }} onClick={(e) => e.stopPropagation()}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer',
            padding: '0.5rem', backgroundColor: isCustom ? '#fff3cd' : 'transparent',
            borderRadius: '4px', transition: 'all 0.2s' }}>
            <input type="checkbox" checked={isCustom}
              onChange={(e) => onChange(value, e.target.checked, memo)}
              style={{ cursor: 'pointer', width: '18px', height: '18px' }} />
            <span style={{ fontSize: '0.9rem', color: isCustom ? '#856404' : '#7f8c8d' }}>カスタム</span>
          </label>
        </div>
        <div style={{ minWidth: '220px' }} onClick={(e) => e.stopPropagation()}>
          <input type="text" value={localMemo} onChange={(e) => setLocalMemo(e.target.value)}
            onBlur={handleMemoBlur} placeholder="メモ" style={{
              width: '100%', padding: '0.5rem', border: '1px solid #ddd',
              borderRadius: '4px', fontSize: '0.9rem', backgroundColor: '#fafafa'
            }} />
        </div>
      </div>
      {expanded && (question.implementation || question.settings) && (
        <>
          {question.implementation && (
            <div>
              <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '0.25rem' }}>
                SC実現方法
              </div>
              <div style={{ whiteSpace: 'pre-line' }}>
                {question.implementation}
              </div>
            </div>
          )}

          {question.settings && (
            <div style={{ marginTop: '0.75rem' }}>
              <div style={{ fontSize: '0.85rem', color: '#7f8c8d', marginBottom: '0.25rem' }}>
                設定内容
              </div>
              <div style={{ whiteSpace: 'pre-line' }}>
                {question.settings}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
export default QuestionRow