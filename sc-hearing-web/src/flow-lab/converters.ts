import type { FlowNode, FlowEdge } from './types'
import { MarkerType } from 'reactflow'

/**
 * 4階層フロー → ReactFlow 変換ロジック
 *
 * 階層:
 *   1. 業務プロセス (BusinessProcessFlow*)         - 27ノード、お客様向け俯瞰
 *   2. 業務フロー (BusinessFlowStep)               - 80ノード、業務処理単位
 *   3. 機能フロー (FunctionalFlowStep)             - 180ノード、処理機能単位
 *   4. システムフロー (SystemFlowStep + Node)      - 181ノード、PRGID+DS+外部
 */

// ============================================================
// 共通: 接続(FlowConnection) 型定義
// ============================================================
type FlowConnection = {
  id?: number
  fromNodeId: string
  toNodeId: string
  conditionLabel?: string
  connectionType?: string
  flowType?: string
}

function buildFlowEdge(c: FlowConnection, prefix: string): FlowEdge {
  return {
    id: `${prefix}-${c.fromNodeId}-${c.toNodeId}-${c.id ?? Math.random()}`,
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
  }
}

// ============================================================
// 第1階層: 業務プロセスフロー → ReactFlow
// ============================================================
type BusinessProcessFlowStep = {
  id?: number
  stepId: string
  stepName: string
  category: string
  displayOrder?: number
  description?: string
  positionX?: number
  positionY?: number
  isActive?: boolean
}

type BusinessProcessFlowConnection = {
  id?: number
  fromStepId: string
  toStepId: string
  connectionType?: string
  conditionLabel?: string
  displayOrder?: number
  isActive?: boolean
}

/**
 * 業務プロセスフロー → ReactFlow 変換 (第1階層)
 * カテゴリごとの group 枠内にノードがキレイに収まるよう厳密にレイアウト計算
 */
export function convertBusinessProcessFlowToReactFlow(
  processes: BusinessProcessFlowStep[],
  connections: BusinessProcessFlowConnection[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const sortedProcesses = [...processes]
    .filter(p => p.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  // カテゴリごとにグループ化
  const byCategory = new Map<string, BusinessProcessFlowStep[]>()
  sortedProcesses.forEach(p => {
    const arr = byCategory.get(p.category) ?? []
    arr.push(p)
    byCategory.set(p.category, arr)
  })

  // ----- レイアウト定数 (厳密) -----
  const NODE_W = 180
  const NODE_H = 56
  const NODE_GAP_Y = 16
  const HEADER_H = 32      // group ノードのヘッダー領域
  const PAD_X = 20         // 左右余白
  const PAD_TOP = HEADER_H + 16   // 上余白(ヘッダ+追加)
  const PAD_BOTTOM = 20    // 下余白

  const GROUP_W = NODE_W + 2 * PAD_X  // = 220
  const GROUP_GAP_X = 30
  const TOP_MARGIN = 30
  const LEFT_MARGIN = 30

  // カテゴリの並び順
  const categoryOrder = ['販売', '請求売掛', '購買', '支払買掛', '在庫', '製造', '原価', '管理', '物流OP']

  const nodes: FlowNode[] = []
  let colIdx = 0

  categoryOrder.forEach(category => {
    const procs = byCategory.get(category)
    if (!procs || procs.length === 0) return

    // group の x 位置
    const groupX = LEFT_MARGIN + colIdx * (GROUP_W + GROUP_GAP_X)

    // group の高さを内側のノード数で正確に計算
    const innerHeight = procs.length * NODE_H + (procs.length - 1) * NODE_GAP_Y
    const groupH = PAD_TOP + innerHeight + PAD_BOTTOM

    // group ノード
    nodes.push({
      id: `cat_${category}`,
      type: 'group',
      data: {
        label: category,
        kind: 'group',
        stepId: category,
      },
      position: { x: groupX, y: TOP_MARGIN },
      style: {
        width: GROUP_W,
        height: groupH,
        fontSize: 13,
      },
    })

    // 内側のプロセスノード (ReactFlowの parentNode 機能を使う)
    procs.forEach((p, idx) => {
      // 親グループ内での相対座標 (groupからの相対位置)
      const relX = PAD_X
      const relY = PAD_TOP + idx * (NODE_H + NODE_GAP_Y)

      nodes.push({
        id: p.stepId,
        type: 'process',
        data: {
          label: p.stepName,
          stepId: p.stepId,
          kind: 'process',
          category: p.category,
          description: p.description,
        },
        // parentNode指定: 親グループ内のローカル座標として配置される
        parentNode: `cat_${category}`,
        extent: 'parent' as const,
        position: { x: relX, y: relY },
        style: { width: NODE_W, height: NODE_H },
      } as any)
    })

    colIdx++
  })

  const edges: FlowEdge[] = connections
    .filter(c => c.isActive !== false)
    .map(c => buildFlowEdge(
      { fromNodeId: c.fromStepId, toNodeId: c.toStepId, conditionLabel: c.conditionLabel, connectionType: c.connectionType, id: c.id },
      'bp-e'
    ))

  return { nodes, edges }
}


// ============================================================
// 第2階層: 業務フロー (業務処理単位) → ReactFlow
// ============================================================
type BusinessFlowStep = {
  id?: number
  stepId: string
  stepName: string
  nodeId: string
  nodeLabel: string
  nodeType?: string
  displayOrder?: number
  mermaidStyle?: string
  businessProcessStepId?: string
  positionX?: number
  positionY?: number
  isActive?: boolean
}

/**
 * 業務フロー → ReactFlow 変換 (第2階層)
 * 業務プロセスごとに group 枠を作り、その中に業務処理を配置
 */
export function convertBusinessFlowToReactFlow(
  steps: BusinessFlowStep[],
  connections: FlowConnection[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const sortedSteps = [...steps]
    .filter(s => s.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  // 業務プロセスごとにグループ化
  const byProcess = new Map<string, BusinessFlowStep[]>()
  sortedSteps.forEach(s => {
    const key = s.businessProcessStepId ?? '_misc'
    const arr = byProcess.get(key) ?? []
    arr.push(s)
    byProcess.set(key, arr)
  })

  // 業務プロセスの並び順 (BusinessProcessFlowSteps と同じ順)
  const processOrder = [
    '見積', '受注', '引当', '出荷準備', '出荷', '売上', '返品',
    '請求', '売掛',
    '発注', '入荷', '仕入',
    '支払請求', '買掛',
    '移動', 'セット加工', '棚卸', '預り在庫',
    '製造', '原価', '原価シミュレーション',
    '月次更新',
    '物流OP(基本)', '物流OP(出荷・出庫)', '物流OP(入荷・入庫)', '物流OP(在庫)', '物流OP(棚卸)',
    '_misc',
  ]

  // ----- レイアウト定数 -----
  const NODE_W = 180
  const NODE_H = 50
  const NODE_GAP_Y = 14
  const HEADER_H = 30
  const PAD_X = 18
  const PAD_TOP = HEADER_H + 14
  const PAD_BOTTOM = 18

  const GROUP_W = NODE_W + 2 * PAD_X  // = 216

  // 行(row)に何個グループを並べるか
  const COLS_PER_ROW = 7
  const GROUP_GAP_X = 24
  const ROW_GAP_Y = 30

  const nodes: FlowNode[] = []

  let layoutIdx = 0
  let rowMaxY = 30

  // 各行のY位置を保持
  const rowYAtIdx: number[] = []
  const rowMaxHAtIdx: number[] = []

  processOrder.forEach(processId => {
    const procs = byProcess.get(processId)
    if (!procs || procs.length === 0) return

    const colIdxInRow = layoutIdx % COLS_PER_ROW
    const rowIdx = Math.floor(layoutIdx / COLS_PER_ROW)

    const innerHeight = procs.length * NODE_H + (procs.length - 1) * NODE_GAP_Y
    const groupH = PAD_TOP + innerHeight + PAD_BOTTOM

    // 行のY位置
    if (rowIdx >= rowYAtIdx.length) {
      const prevMaxH = rowMaxHAtIdx[rowIdx - 1] ?? 0
      const prevY = rowYAtIdx[rowIdx - 1] ?? 30
      rowYAtIdx[rowIdx] = (rowIdx === 0) ? 30 : prevY + prevMaxH + ROW_GAP_Y
      rowMaxHAtIdx[rowIdx] = 0
    }
    rowMaxHAtIdx[rowIdx] = Math.max(rowMaxHAtIdx[rowIdx], groupH)

    const groupX = 30 + colIdxInRow * (GROUP_W + GROUP_GAP_X)
    const groupY = rowYAtIdx[rowIdx]

    // group ラベル
    const groupLabel = processId === '_misc' ? '未分類' : processId

    nodes.push({
      id: `bp_grp_${processId}`,
      type: 'group',
      data: {
        label: groupLabel,
        kind: 'group',
        stepId: processId,
      },
      position: { x: groupX, y: groupY },
      style: {
        width: GROUP_W,
        height: groupH,
        fontSize: 12,
      },
    })

    procs.forEach((p, idx) => {
      const relX = PAD_X
      const relY = PAD_TOP + idx * (NODE_H + NODE_GAP_Y)

      nodes.push({
        id: p.stepId,
        type: 'process',
        data: {
          label: p.stepName,
          stepId: p.stepId,
          kind: 'process',
          businessProcessStepId: p.businessProcessStepId,
        },
        parentNode: `bp_grp_${processId}`,
        extent: 'parent' as const,
        position: { x: relX, y: relY },
        style: { width: NODE_W, height: NODE_H },
      } as any)
    })

    layoutIdx++
  })

  // 業務フロー接続のみ抽出 (FlowType='business')
  const bizConns = connections.filter(c => c.flowType === 'business' || (!c.flowType && false))

  const edges: FlowEdge[] = bizConns.map(c => buildFlowEdge(c, 'bf-e'))

  return { nodes, edges }
}


// ============================================================
// 第3階層: 機能フロー → ReactFlow
// ============================================================
type FunctionalFlowStep = {
  id?: number
  stepId: string
  stepName: string
  nodeId: string
  nodeLabel: string
  nodeType: string
  displayOrder: number
  parentNodeId?: string
  connectionType?: string
  mermaidStyle?: string
  businessFlowStepId?: string
  businessProcessStepId?: string
  positionX?: number
  positionY?: number
  isActive?: boolean
}

/**
 * 機能フロー → ReactFlow 変換 (第3階層)
 * (旧convertToReactFlow相当: StepIdごとにカラム配置)
 */
export function convertFunctionalFlowToReactFlow(
  steps: FunctionalFlowStep[],
  connections: FlowConnection[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const stepGroups = new Map<string, FunctionalFlowStep[]>()
  ;[...steps]
    .filter(s => s.isActive !== false)
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
      const kind = s.nodeType === 'start' ? 'start'
        : s.nodeType === 'end' ? 'end'
        : s.nodeType === 'decision' ? 'decision'
        : s.nodeType === 'io' ? 'io'
        : 'process'

      const x = s.positionX ?? colX
      const y = s.positionY ?? rowY

      nodes.push({
        id: s.nodeId,
        type: 'flowNode',
        data: {
          label: s.nodeLabel,
          stepId: s.stepId,
          kind,
          businessFlowStepId: s.businessFlowStepId,
          businessProcessStepId: s.businessProcessStepId,
        },
        position: { x, y },
      })
      rowY += NODE_H + ROW_GAP
    })
    colX += NODE_W + COL_GAP
  })

  const funcConns = connections.filter(c => c.flowType === 'functional')
  const edges: FlowEdge[] = funcConns.map(c => buildFlowEdge(c, 'ff-e'))

  return { nodes, edges }
}


// ============================================================
// 第4階層: システムフロー → ReactFlow (既存)
// ============================================================
type SystemFlowStep = {
  id?: number
  stepId: string
  stepName: string
  businessType: string
  businessFlowStepId?: string
  displayOrder?: number
  isSubgraph?: boolean
  subgraphLabel?: string
  isActive?: boolean
}

type SystemFlowNode = {
  id?: number
  nodeId: string
  flowStepId: string
  nodeLabel: string
  nodeType: 'process' | 'io' | 'group' | 'start' | 'end' | 'decision'
  sourceType: 'program' | 'data_store' | 'external_entity' | 'decision'
  sourceRef?: string
  displayOrder: number
  mermaidStyle?: string
  positionX?: number
  positionY?: number
  description?: string
  isActive?: boolean
}

export function convertSystemFlowToReactFlow(
  steps: SystemFlowStep[],
  flowNodes: SystemFlowNode[],
  connections: FlowConnection[]
): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const sortedSteps = [...steps]
    .filter(s => s.isActive !== false)
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0))

  const nodesByStep = new Map<string, SystemFlowNode[]>()
  flowNodes
    .filter(n => n.isActive !== false)
    .forEach(n => {
      const arr = nodesByStep.get(n.flowStepId) ?? []
      arr.push(n)
      nodesByStep.set(n.flowStepId, arr)
    })

  const STEP_HEADER_H = 40
  const STEP_GAP = 60
  const STEP_PADDING = 30
  const STEP_WIDTH = 1100

  const ROW_Y = {
    external_entity: 0,
    program_process: 90,
    data_store: 200,
    program_io: 310,
    decision: 100,
  } as const

  const NODE_W = 130
  const NODE_GAP_X = 25

  const rfNodes: FlowNode[] = []
  let stepCursorY = 30

  sortedSteps.forEach(step => {
    const stepNodes = nodesByStep.get(step.stepId) ?? []
    const sortedNodes = [...stepNodes].sort((a, b) => a.displayOrder - b.displayOrder)

    const stepHeight = STEP_HEADER_H + STEP_PADDING * 2 + 360
    rfNodes.push({
      id: `step_${step.stepId}`,
      type: 'group',
      data: {
        label: step.subgraphLabel ?? step.stepName,
        kind: 'group',
        stepId: step.stepId,
      },
      position: { x: 30, y: stepCursorY },
      style: { width: STEP_WIDTH, height: stepHeight, fontSize: 13 },
    })

    const rowCounters = { external_entity: 0, program_process: 0, data_store: 0, program_io: 0, decision: 0 }
    const baseX = 30 + 30
    const baseY = stepCursorY + STEP_HEADER_H + STEP_PADDING

    sortedNodes.forEach(n => {
      let row: keyof typeof rowCounters
      if (n.sourceType === 'external_entity') row = 'external_entity'
      else if (n.sourceType === 'data_store') row = 'data_store'
      else if (n.sourceType === 'decision') row = 'decision'
      else if (n.nodeType === 'io') row = 'program_io'
      else row = 'program_process'

      const colIndex = rowCounters[row]++
      const autoX = baseX + colIndex * (NODE_W + NODE_GAP_X)
      const autoY = baseY + ROW_Y[row]

      const x = n.positionX ?? autoX
      const y = n.positionY ?? autoY

      const rfKind = mapToFlowNodeKind(n)

      rfNodes.push({
        id: n.nodeId,
        type: rfKind,
        data: {
          label: n.nodeLabel,
          stepId: step.stepId,
          kind: rfKind,
          sourceType: n.sourceType,
          sourceRef: n.sourceRef,
          mermaidStyle: n.mermaidStyle,
          description: n.description,
        },
        position: { x, y },
      })
    })
    stepCursorY += stepHeight + STEP_GAP
  })

  const sysConns = connections.filter(c =>
    c.flowType === 'system' || (!c.flowType && (c.fromNodeId.startsWith('SF_') || c.toNodeId.startsWith('SF_')))
  )

  const edges: FlowEdge[] = sysConns.map(c => buildFlowEdge(c, 'sys-e'))

  return { nodes: rfNodes, edges }
}

function mapToFlowNodeKind(n: SystemFlowNode): string {
  if (n.sourceType === 'external_entity') return n.nodeType === 'end' ? 'end' : 'start'
  if (n.sourceType === 'data_store') return 'io'
  if (n.sourceType === 'decision') return 'decision'
  if (n.nodeType === 'io') return 'io'
  return 'process'
}

// 後方互換のため旧関数名もエクスポート
export const convertToReactFlow = convertFunctionalFlowToReactFlow
