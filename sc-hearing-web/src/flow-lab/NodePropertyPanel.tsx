import type { FlowNode, FlowEdge, NodeKind } from './types'
import { NODE_KIND_META } from './types'

interface Props {
  node: FlowNode | null
  edge: FlowEdge | null
  onNodeChange: (id: string, patch: Partial<FlowNode['data']>) => void
  onEdgeChange: (id: string, patch: Partial<FlowEdge['data'] & { label?: string }>) => void
  onDeleteNode: (id: string) => void
  onDeleteEdge: (id: string) => void
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  background: '#1e293b',
  border: '1px solid #334155',
  borderRadius: 5,
  color: '#e2e8f0',
  fontSize: 12,
  padding: '6px 8px',
  outline: 'none',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#64748b',
  textTransform: 'uppercase' as const,
  marginBottom: 3,
  display: 'block',
}

const sectionStyle: React.CSSProperties = {
  borderBottom: '1px solid #1e3a5f',
  paddingBottom: 14,
  marginBottom: 14,
}

export default function NodePropertyPanel({
  node, edge, onNodeChange, onEdgeChange, onDeleteNode, onDeleteEdge,
}: Props) {

  if (!node && !edge) {
    return (
      <div style={{
        width: 220, flexShrink: 0,
        background: '#0f172a',
        borderLeft: '1px solid #1e3a5f',
        padding: '16px 14px',
        color: '#475569',
        fontSize: 12,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        <div style={{ fontSize: 28 }}>👆</div>
        <div style={{ textAlign: 'center', lineHeight: 1.6 }}>
          ノードまたは<br />エッジを選択すると<br />プロパティを編集できます
        </div>
      </div>
    )
  }

  return (
    <div style={{
      width: 220, flexShrink: 0,
      background: '#0f172a',
      borderLeft: '1px solid #1e3a5f',
      padding: '14px 12px',
      overflowY: 'auto',
      fontFamily: '"Noto Sans JP", sans-serif',
    }}>
      <div style={{
        fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
        color: '#475569', textTransform: 'uppercase', marginBottom: 12,
      }}>
        {node ? 'ノード設定' : 'エッジ設定'}
      </div>

      {/* ─── ノード編集 ─── */}
      {node && (() => {
        const meta = NODE_KIND_META[node.data.kind]
        return (
          <>
            {/* 種別バッジ */}
            <div style={sectionStyle}>
              <span style={{
                background: meta.bg, border: `1px solid ${meta.border}`,
                borderRadius: 99, padding: '3px 10px',
                color: meta.text, fontSize: 11, fontWeight: 700,
              }}>
                {meta.icon} {meta.label}
              </span>
              <div style={{ fontSize: 9, color: '#334155', marginTop: 4 }}>ID: {node.id}</div>
            </div>

            {/* ラベル */}
            <div style={{ ...sectionStyle }}>
              <label style={labelStyle}>ラベル</label>
              <input
                style={inputStyle}
                value={node.data.label}
                onChange={e => onNodeChange(node.id, { label: e.target.value })}
              />
            </div>

            {/* 工程ID */}
            <div style={{ ...sectionStyle }}>
              <label style={labelStyle}>工程ID（stepId）</label>
              <input
                style={inputStyle}
                value={node.data.stepId ?? ''}
                placeholder="例: STEP_ESTIMATE"
                onChange={e => onNodeChange(node.id, { stepId: e.target.value })}
              />
            </div>

            {/* 説明 */}
            <div style={{ ...sectionStyle }}>
              <label style={labelStyle}>説明（メモ）</label>
              <textarea
                style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                value={node.data.description ?? ''}
                placeholder="任意の説明を入力"
                onChange={e => onNodeChange(node.id, { description: e.target.value })}
              />
            </div>

            {/* 種別変更 */}
            <div style={{ ...sectionStyle }}>
              <label style={labelStyle}>ノード種別</label>
              <select
                style={{ ...inputStyle }}
                value={node.data.kind}
                onChange={e => onNodeChange(node.id, { kind: e.target.value as NodeKind })}
              >
                {(Object.keys(NODE_KIND_META) as NodeKind[]).map(k => (
                  <option key={k} value={k}>
                    {NODE_KIND_META[k].icon} {NODE_KIND_META[k].label}
                  </option>
                ))}
              </select>
            </div>

            {/* 削除 */}
            <button
              onClick={() => onDeleteNode(node.id)}
              style={{
                width: '100%', padding: '7px',
                background: '#7f1d1d', border: '1px solid #ef4444',
                borderRadius: 5, color: '#fca5a5', fontSize: 12,
                fontWeight: 700, cursor: 'pointer',
              }}
            >
              🗑 ノードを削除
            </button>
          </>
        )
      })()}

      {/* ─── エッジ編集 ─── */}
      {edge && (
        <>
          <div style={sectionStyle}>
            <div style={{ fontSize: 11, color: '#64748b' }}>
              <span style={{ color: '#60a5fa' }}>{edge.source}</span>
              <span style={{ color: '#475569' }}> → </span>
              <span style={{ color: '#34d399' }}>{edge.target}</span>
            </div>
          </div>

          <div style={sectionStyle}>
            <label style={labelStyle}>条件ラベル</label>
            <input
              style={inputStyle}
              value={(edge.data?.conditionLabel) ?? (edge.label as string) ?? ''}
              placeholder="例：承認時、はい"
              onChange={e => onEdgeChange(edge.id, { conditionLabel: e.target.value })}
            />
          </div>

          <div style={{ ...sectionStyle }}>
            <label style={labelStyle}>線のスタイル</label>
            <select
              style={inputStyle}
              value={edge.data?.edgeStyle ?? 'solid'}
              onChange={e => onEdgeChange(edge.id, { edgeStyle: e.target.value as any })}
            >
              <option value="solid">実線</option>
              <option value="dotted">点線（アニメーション）</option>
              <option value="dashed">破線</option>
            </select>
          </div>

          <button
            onClick={() => onDeleteEdge(edge.id)}
            style={{
              width: '100%', padding: '7px',
              background: '#7f1d1d', border: '1px solid #ef4444',
              borderRadius: 5, color: '#fca5a5', fontSize: 12,
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            🗑 接続を削除
          </button>
        </>
      )}
    </div>
  )
}
