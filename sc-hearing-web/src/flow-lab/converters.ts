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
