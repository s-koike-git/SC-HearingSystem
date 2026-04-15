import type { Node, Edge } from 'reactflow'

// ─── ノード種別 ───────────────────────────────────────────────
export type NodeKind = 'process' | 'start' | 'end' | 'decision' | 'io' | 'group'

// ─── ノードデータ ─────────────────────────────────────────────
export interface FlowNodeData {
  label: string
  stepId?: string
  kind: NodeKind
  color?: string      // カスタムカラー（省略時はkindデフォルト）
  description?: string
}

// ─── エッジデータ ─────────────────────────────────────────────
export interface FlowEdgeData {
  conditionLabel?: string
  edgeStyle?: 'solid' | 'dotted' | 'dashed'
}

// ─── React Flow 型エイリアス ──────────────────────────────────
export type FlowNode = Node<FlowNodeData>
export type FlowEdge = Edge<FlowEdgeData>

// ─── ノード種別メタ情報 ───────────────────────────────────────
export const NODE_KIND_META: Record<NodeKind, {
  label: string
  icon: string
  bg: string
  border: string
  text: string
  shape: 'rect' | 'circle' | 'diamond' | 'parallelogram' | 'stadium'
}> = {
  process: {
    label: '処理',
    icon: '⬜',
    bg: '#1e40af',
    border: '#3b82f6',
    text: '#fff',
    shape: 'rect',
  },
  start: {
    label: '開始',
    icon: '🟢',
    bg: '#065f46',
    border: '#10b981',
    text: '#fff',
    shape: 'stadium',
  },
  end: {
    label: '終了',
    icon: '🔴',
    bg: '#7f1d1d',
    border: '#ef4444',
    text: '#fff',
    shape: 'stadium',
  },
  decision: {
    label: '判断',
    icon: '🔷',
    bg: '#78350f',
    border: '#f59e0b',
    text: '#fff',
    shape: 'diamond',
  },
  io: {
    label: 'I/O',
    icon: '📋',
    bg: '#4c1d95',
    border: '#8b5cf6',
    text: '#fff',
    shape: 'parallelogram',
  },
  group: {
    label: 'グループ',
    icon: '📁',
    bg: '#1e3a5f',
    border: '#60a5fa',
    text: '#93c5fd',
    shape: 'rect',
  },
}

// ─── ローカルストレージキー ────────────────────────────────────
export const STORAGE_KEY = 'flow-master-lab-v2'
