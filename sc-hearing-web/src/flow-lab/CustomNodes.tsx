import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import type { FlowNodeData, NodeKind } from './types'
import { NODE_KIND_META } from './types'

// NodeProps を自前定義（reactflow のバージョンによってエクスポート名が異なるため）
interface NodeProps<T = any> {
  id: string
  data: T
  selected: boolean
  type?: string
  xPos?: number
  yPos?: number
  dragging?: boolean
}

// ─── ハンドルスタイル ─────────────────────────────────────────
const handleStyle = (active = false): React.CSSProperties => ({
  width: 10,
  height: 10,
  background: active ? '#60a5fa' : '#334155',
  border: '2px solid #60a5fa',
  borderRadius: '50%',
  transition: 'background 0.15s',
})

// ─── ベースノード ─────────────────────────────────────────────
function NodeBase({
  children,
  meta,
  selected,
  style,
}: {
  children: React.ReactNode
  meta: typeof NODE_KIND_META[NodeKind]
  selected: boolean
  style?: React.CSSProperties
}) {
  return (
    <div style={{
      position: 'relative',
      background: meta.bg,
      border: `2px solid ${selected ? '#f0abfc' : meta.border}`,
      borderRadius: 8,
      color: meta.text,
      fontFamily: '"Noto Sans JP", sans-serif',
      fontSize: 12,
      fontWeight: 600,
      boxShadow: selected
        ? `0 0 0 3px rgba(240,171,252,0.4), 0 4px 16px rgba(0,0,0,0.5)`
        : '0 2px 8px rgba(0,0,0,0.4)',
      cursor: 'grab',
      transition: 'box-shadow 0.15s, border-color 0.15s',
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── 全方向ハンドルセット ─────────────────────────────────────
function AllHandles() {
  return (
    <>
      <Handle type="target" position={Position.Top}    id="t" style={handleStyle()} />
      <Handle type="source" position={Position.Bottom} id="b" style={handleStyle()} />
      <Handle type="target" position={Position.Left}   id="l" style={handleStyle()} />
      <Handle type="source" position={Position.Right}  id="r" style={handleStyle()} />
    </>
  )
}

// ─── Process ノード ───────────────────────────────────────────
export const ProcessNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
  const meta = NODE_KIND_META['process']
  return (
    <NodeBase meta={meta} selected={selected} style={{ minWidth: 160, minHeight: 52 }}>
      <AllHandles />
      <div style={{ padding: '10px 14px' }}>
        {data.stepId && (
          <div style={{ fontSize: 9, opacity: 0.65, marginBottom: 2, letterSpacing: '0.05em' }}>
            {data.stepId}
          </div>
        )}
        <div style={{ lineHeight: 1.3 }}>{data.label}</div>
      </div>
    </NodeBase>
  )
})

// ─── Start ノード ─────────────────────────────────────────────
export const StartNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
  const meta = NODE_KIND_META['start']
  return (
    <NodeBase meta={meta} selected={selected} style={{ minWidth: 130, borderRadius: 999 }}>
      <AllHandles />
      <div style={{ padding: '10px 18px', textAlign: 'center' }}>
        <span style={{ marginRight: 4 }}>▶</span>{data.label}
      </div>
    </NodeBase>
  )
})

// ─── End ノード ───────────────────────────────────────────────
export const EndNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
  const meta = NODE_KIND_META['end']
  return (
    <NodeBase meta={meta} selected={selected} style={{ minWidth: 130, borderRadius: 999 }}>
      <AllHandles />
      <div style={{ padding: '10px 18px', textAlign: 'center' }}>
        <span style={{ marginRight: 4 }}>■</span>{data.label}
      </div>
    </NodeBase>
  )
})

// ─── Decision ノード (ひし形風) ──────────────────────────────
export const DecisionNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
  const meta = NODE_KIND_META['decision']
  return (
    <NodeBase meta={meta} selected={selected} style={{
      minWidth: 160,
      clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)',
      borderRadius: 0,
    }}>
      <AllHandles />
      <div style={{ padding: '22px 20px', textAlign: 'center', fontSize: 11 }}>
        {data.label}
      </div>
    </NodeBase>
  )
})

// ─── IO ノード (平行四辺形風) ────────────────────────────────
export const IoNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
  const meta = NODE_KIND_META['io']
  return (
    <NodeBase meta={meta} selected={selected} style={{
      minWidth: 160, minHeight: 52,
      clipPath: 'polygon(12% 0%, 100% 0%, 88% 100%, 0% 100%)',
      borderRadius: 0,
    }}>
      <AllHandles />
      <div style={{ padding: '10px 24px', lineHeight: 1.3 }}>
        {data.stepId && (
          <div style={{ fontSize: 9, opacity: 0.65, marginBottom: 2 }}>{data.stepId}</div>
        )}
        {data.label}
      </div>
    </NodeBase>
  )
})

// ─── Group ノード ─────────────────────────────────────────────
export const GroupNode = memo(({ data, selected }: NodeProps<FlowNodeData>) => {
  const meta = NODE_KIND_META['group']
  return (
    <NodeBase meta={meta} selected={selected} style={{
      minWidth: 200, minHeight: 120,
      background: 'rgba(30,58,95,0.5)',
      borderStyle: 'dashed',
    }}>
      <AllHandles />
      <div style={{ padding: '6px 12px', fontSize: 11, opacity: 0.8, borderBottom: `1px dashed ${meta.border}` }}>
        📁 {data.label}
      </div>
    </NodeBase>
  )
})

// ─── nodeTypes マップ ─────────────────────────────────────────
export const nodeTypes = {
  flowNode: ProcessNode,   // デフォルト（kindはdataで判断）
  process: ProcessNode,
  start:    StartNode,
  end:      EndNode,
  decision: DecisionNode,
  io:       IoNode,
  group:    GroupNode,
}

// ─── kind → nodeType 変換 ─────────────────────────────────────
export function kindToNodeType(kind: FlowNodeData['kind']): string {
  return kind  // nodeTypes のキーと一致させる
}
