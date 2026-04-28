import { useState } from 'react'

export interface QuestionCardProps {
  question: {
    no: string
    text: string
    type: 'yesno' | 'choice' | 'text'
    choices?: { value: string; label: string }[]
    implementation?: string
    settings?: string
    priority?: '高' | '中' | '低'
  }
  layer: 'L1' | 'L2' | 'L3'
  businessType: string
  value: string
  isCustom: boolean
  memo: string
  disabled?: boolean
  onChange: (value: string, isCustom: boolean, memo: string) => void
}

const LAYER_CONFIG = {
  L1: {
    label: 'L1 業務プロセス',
    bgColor: '#EEEDFE',
    borderColor: '#534AB7',
    textColor: '#3C3489',
    badgeBg: '#534AB7',
  },
  L2: {
    label: 'L2 業務フロー',
    bgColor: '#E6F1FB',
    borderColor: '#185FA5',
    textColor: '#0C447C',
    badgeBg: '#185FA5',
  },
  L3: {
    label: 'L3 機能',
    bgColor: '#F1EFE8',
    borderColor: '#888780',
    textColor: '#444441',
    badgeBg: '#5F5E5A',
  },
} as const

const PRIORITY_CONFIG = {
  '高': { bg: '#A32D2D', label: '高' },
  '中': { bg: '#BA7517', label: '中' },
  '低': { bg: '#888780', label: '低' },
} as const

function QuestionCard({
  question,
  layer,
  businessType,
  value,
  isCustom,
  memo,
  disabled = false,
  onChange,
}: QuestionCardProps) {
  const [expanded, setExpanded] = useState(false)
  const [localMemo, setLocalMemo] = useState(memo)
  const cfg = LAYER_CONFIG[layer]

  const handleMemoBlur = () => {
    if (localMemo !== memo) {
      onChange(value, isCustom, localMemo)
    }
  }

  const renderInput = () => {
    if (question.type === 'yesno') {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => onChange('○', isCustom, memo)}
            disabled={disabled}
            style={{
              padding: '8px 24px',
              backgroundColor: value === '○' ? '#1D9E75' : 'white',
              color: value === '○' ? 'white' : '#5F5E5A',
              border: value === '○' ? 'none' : '1px solid #d0d7de',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            ○ はい
          </button>
          <button
            onClick={() => onChange('×', isCustom, memo)}
            disabled={disabled}
            style={{
              padding: '8px 24px',
              backgroundColor: value === '×' ? '#A32D2D' : 'white',
              color: value === '×' ? 'white' : '#5F5E5A',
              border: value === '×' ? 'none' : '1px solid #d0d7de',
              borderRadius: 6,
              fontSize: 14,
              fontWeight: 500,
              cursor: disabled ? 'not-allowed' : 'pointer',
              opacity: disabled ? 0.5 : 1,
              transition: 'all 0.15s',
            }}
          >
            × いいえ
          </button>
          {value && !disabled && (
            <button
              onClick={() => onChange('', isCustom, memo)}
              style={{
                padding: '6px 10px',
                backgroundColor: 'transparent',
                color: '#888780',
                border: 'none',
                borderRadius: 4,
                cursor: 'pointer',
                fontSize: 12,
              }}
            >
              クリア
            </button>
          )}
        </div>
      )
    }
    if (question.type === 'choice') {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <select
            value={value}
            onChange={(e) => onChange(e.target.value, isCustom, memo)}
            disabled={disabled}
            style={{
              minWidth: 280,
              padding: '8px 10px',
              border: '1px solid #d0d7de',
              borderRadius: 6,
              fontSize: 14,
              backgroundColor: 'white',
              cursor: disabled ? 'not-allowed' : 'pointer',
            }}
          >
            <option value="">選択してください</option>
            {question.choices?.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
          {value && !disabled && (
            <button
              onClick={() => onChange('', isCustom, memo)}
              style={{
                padding: '6px 10px', backgroundColor: 'transparent', color: '#888780',
                border: 'none', borderRadius: 4, cursor: 'pointer', fontSize: 12,
              }}
            >クリア</button>
          )}
        </div>
      )
    }
    return (
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value, isCustom, memo)}
        disabled={disabled}
        placeholder="入力してください"
        style={{
          width: 280, padding: '8px 10px',
          border: '1px solid #d0d7de', borderRadius: 6, fontSize: 14,
        }}
      />
    )
  }

  return (
    <div
      style={{
        backgroundColor: disabled ? '#fafafa' : cfg.bgColor,
        borderRadius: 8,
        borderLeft: `4px solid ${cfg.borderColor}`,
        padding: '12px 16px',
        marginBottom: 8,
        opacity: disabled ? 0.6 : 1,
        transition: 'all 0.2s',
      }}
    >
      {/* バッジ + QuestionNo */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        marginBottom: 8,
        flexWrap: 'wrap',
      }}>
        <span style={{
          backgroundColor: cfg.badgeBg,
          color: 'white',
          fontSize: 10,
          fontWeight: 500,
          padding: '2px 8px',
          borderRadius: 3,
          letterSpacing: '0.3px',
        }}>{cfg.label}</span>
        {question.priority && (
          <span style={{
            backgroundColor: PRIORITY_CONFIG[question.priority].bg,
            color: 'white',
            fontSize: 10,
            fontWeight: 500,
            padding: '2px 8px',
            borderRadius: 3,
          }}>{PRIORITY_CONFIG[question.priority].label}</span>
        )}
        <span style={{
          fontSize: 11,
          color: cfg.textColor,
          fontFamily: 'monospace',
          opacity: 0.8,
        }}>{question.no}</span>
        {disabled && (
          <span style={{
            marginLeft: 'auto',
            fontSize: 11,
            color: '#888780',
            fontStyle: 'italic',
          }}>L1で「いいえ」のため表示のみ</span>
        )}
      </div>

      {/* 質問文 */}
      <div style={{
        fontSize: 14,
        color: disabled ? '#888780' : cfg.textColor,
        fontWeight: layer === 'L1' ? 500 : 400,
        marginBottom: 10,
        lineHeight: 1.5,
      }}>{question.text}</div>

      {/* 入力エリア + メモ */}
      <div style={{
        display: 'flex',
        gap: 12,
        alignItems: 'center',
        flexWrap: 'wrap',
      }}>
        {renderInput()}
        <input
          type="text"
          value={localMemo}
          onChange={(e) => setLocalMemo(e.target.value)}
          onBlur={handleMemoBlur}
          disabled={disabled}
          placeholder="メモ（任意）"
          style={{
            flex: 1,
            minWidth: 160,
            padding: '6px 10px',
            border: '1px solid #d0d7de',
            borderRadius: 4,
            fontSize: 12,
            backgroundColor: 'white',
          }}
        />
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: 4,
          cursor: disabled ? 'not-allowed' : 'pointer',
          fontSize: 12,
          color: isCustom ? '#854F0B' : '#888780',
          padding: '4px 8px',
          backgroundColor: isCustom ? '#FAEEDA' : 'transparent',
          borderRadius: 4,
          whiteSpace: 'nowrap',
        }}>
          <input
            type="checkbox"
            checked={isCustom}
            onChange={(e) => onChange(value, e.target.checked, memo)}
            disabled={disabled}
            style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
          />
          🔧 カスタム
        </label>
        {(question.implementation || question.settings) && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              color: '#185FA5',
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              whiteSpace: 'nowrap',
            }}
          >
            {expanded ? '▼ 詳細を閉じる' : '▶ SC実現方法'}
          </button>
        )}
      </div>

      {/* 展開時のSC実現方法・設定内容 */}
      {expanded && (question.implementation || question.settings) && (
        <div style={{
          marginTop: 12,
          paddingTop: 12,
          borderTop: '1px dashed #d0d7de',
          display: 'grid',
          gap: 8,
          fontSize: 12,
        }}>
          {question.implementation && (
            <div>
              <div style={{ color: '#888780', fontSize: 11, marginBottom: 2 }}>SC実現方法</div>
              <div style={{ whiteSpace: 'pre-line', color: '#444441' }}>{question.implementation}</div>
            </div>
          )}
          {question.settings && (
            <div>
              <div style={{ color: '#888780', fontSize: 11, marginBottom: 2 }}>設定内容</div>
              <div style={{ whiteSpace: 'pre-line', color: '#444441' }}>{question.settings}</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default QuestionCard
