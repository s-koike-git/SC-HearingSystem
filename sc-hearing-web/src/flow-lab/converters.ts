import type { FlowNode, FlowEdge } from './types'
import { MarkerType } from 'reactflow'

type BusinessFlowStep = {
  id?: number
  stepId: string
  nodeId: string
  nodeLabel: string
  nodeType?: string
  displayOrder?: number
  mermaidStyle?: string
}

type FlowConnection = {
  id?: number
  fromNodeId: string
  toNodeId: string
  conditionLabel?: string
  connectionType?: string
}

/**
 * stepId ごとにレーンを作り、Y方向にノードを並べる
 * 同じstepId内は X が同じ、stepIdが変わると X が右にずれる
 */
export function convertToReactFlow(
  steps: BusinessFlowStep[],
  connections: FlowConnection[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {

  // stepId 順でグループ化
  const stepGroups = new Map<string, BusinessFlowStep[]>()
  ;[...steps]
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .forEach(s => {
      const arr = stepGroups.get(s.stepId) ?? []
      arr.push(s)
      stepGroups.set(s.stepId, arr)
    })

  const NODE_W = 180
  const NODE_H = 60
  const COL_GAP = 80
  const ROW_GAP = 30

  const nodes: FlowNode[] = []
  let colX = 40

  stepGroups.forEach((group) => {
    let rowY = 40
    group.forEach(s => {
      // kind 推定
      const kind =
        s.nodeType === 'start' ? 'start'
        : s.nodeType === 'end' ? 'end'
        : s.nodeType === 'decision' ? 'decision'
        : s.nodeType === 'io' ? 'io'
        : 'process'

      nodes.push({
        id: s.nodeId,
        type: 'flowNode',
        data: {
          label: s.nodeLabel,
          stepId: s.stepId,
          kind,
        },
        position: { x: colX, y: rowY },
      })
      rowY += NODE_H + ROW_GAP
    })
    colX += NODE_W + COL_GAP
  })

  const edges: FlowEdge[] = connections.map(c => ({
    id: `e-${c.fromNodeId}-${c.toNodeId}-${c.id ?? Math.random()}`,
    source: c.fromNodeId,
    target: c.toNodeId,
    type: 'flowEdge',
    data: {
      conditionLabel: c.conditionLabel ?? '',
      edgeStyle: c.connectionType === 'dotted' ? 'dotted'
               : c.connectionType === 'dashed' ? 'dashed'
               : 'solid',
    },
    label: c.conditionLabel ?? undefined,
    animated: c.connectionType === 'dotted',
    markerEnd: { type: MarkerType.ArrowClosed },
  }))

  return { nodes, edges }
}

// ─── SystemFlowStep 型 ────────────────────────────────────────
type SystemFlowStep = {
  id?: number
  stepId: string
  stepName: string
  businessType: string
  displayOrder?: number
  isSubgraph?: boolean
  subgraphLabel?: string
  isActive?: boolean
}

/**
 * システムフロー → React Flow 変換
 * businessType ごとにレーン（列）を作り、工程を縦に並べる
 */
export function convertSystemFlowToReactFlow(
  steps: SystemFlowStep[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {

  // businessType ごとにグループ化
  const bizGroups = new Map<string, SystemFlowStep[]>()
  ;[...steps]
    .filter(s => s.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))
    .forEach(s => {
      const arr = bizGroups.get(s.businessType) ?? []
      arr.push(s)
      bizGroups.set(s.businessType, arr)
    })

  const NODE_W = 190
  const NODE_H = 56
  const COL_GAP = 70
  const ROW_GAP = 28
  const HEADER_H = 34  // 業務区分ヘッダー用の高さ

  const nodes: FlowNode[] = []
  let colX = 40

  bizGroups.forEach((group, bizType) => {
    // 業務区分ラベルノード（グループヘッダー）
    const headerId = `biz_header_${bizType}`
    nodes.push({
      id: headerId,
      type: 'group',
      data: {
        label: bizType,
        kind: 'group',
        stepId: bizType,
      },
      position: { x: colX, y: 0 },
      style: { width: NODE_W, height: HEADER_H, fontSize: 11 },
    })

    // 工程ノード
    let rowY = HEADER_H + 16
    group.forEach(s => {
      nodes.push({
        id: s.stepId,
        type: 'process',
        data: {
          label: s.stepName,
          stepId: s.stepId,
          kind: 'process',
        },
        position: { x: colX, y: rowY },
      })
      rowY += NODE_H + ROW_GAP
    })

    colX += NODE_W + COL_GAP
  })

  // システムフローは接続データがないため、同一業務内で上から下へ自動接続
  const edges: FlowEdge[] = []
  bizGroups.forEach(group => {
    for (let i = 0; i < group.length - 1; i++) {
      const from = group[i].stepId
      const to = group[i + 1].stepId
      edges.push({
        id: `sys-e-${from}-${to}`,
        source: from,
        target: to,
        type: 'flowEdge',
        data: { conditionLabel: '', edgeStyle: 'solid' },
        markerEnd: { type: MarkerType.ArrowClosed },
      })
    }
  })

  return { nodes, edges }
}
