import { useEffect, useState, useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import ReactFlowCanvas from './ReactFlowCanvas'
import NodePropertyPanel from './NodePropertyPanel'
import NodePalette from './NodePalette'
import { convertToReactFlow, convertSystemFlowToReactFlow } from './converters'
import {
  businessFlowStepsApi,
  flowConnectionsApi,
  systemFlowStepsApi,
} from '../services/api'
import type { FlowNode, FlowEdge, NodeKind } from './types'
import { NODE_KIND_META } from './types'

type FlowTab = 'business' | 'system'
const POS_KEY_BIZ = 'flow-lab-pos-biz'
const POS_KEY_SYS = 'flow-lab-pos-sys'

function loadPositions(key: string): Record<string, { x: number; y: number }> {
  try { return JSON.parse(localStorage.getItem(key) ?? '{}') } catch { return {} }
}
function savePositions(key: string, nodes: FlowNode[]) {
  const pos: Record<string, { x: number; y: number }> = {}
  nodes.forEach(n => { pos[n.id] = n.position })
  localStorage.setItem(key, JSON.stringify(pos))
}
function applyPositions(nodes: FlowNode[], posKey: string): FlowNode[] {
  const saved = loadPositions(posKey)
  return nodes.map(n => ({ ...n, position: saved[n.id] ?? n.position }))
}

export default function FlowMasterLab() {
  const [flowTab, setFlowTab] = useState<FlowTab>('business')
  const [bizNodes, setBizNodes] = useState<FlowNode[]>([])
  const [bizEdges, setBizEdges] = useState<FlowEdge[]>([])
  const [sysNodes, setSysNodes] = useState<FlowNode[]>([])
  const [sysEdges, setSysEdges] = useState<FlowEdge[]>([])

  const nodes = flowTab === 'business' ? bizNodes : sysNodes
  const edges = flowTab === 'business' ? bizEdges : sysEdges
  const setNodes = flowTab === 'business' ? setBizNodes : setSysNodes
  const setEdges = flowTab === 'business' ? setBizEdges : setSysEdges
  const posKey = flowTab === 'business' ? POS_KEY_BIZ : POS_KEY_SYS

  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<FlowEdge | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const showStatus = (msg: string) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 3500) }

  const loadBizFromDB = useCallback(async () => {
    setLoading(true)
    try {
      const [stepsRes, connRes] = await Promise.all([businessFlowStepsApi.getAll(), flowConnectionsApi.getAll()])
      const { nodes: n, edges: e } = convertToReactFlow(stepsRes.data, connRes.data)
      setBizNodes(applyPositions(n, POS_KEY_BIZ))
      setBizEdges(e)
      showStatus('✓ 業務フローを読み込みました')
    } catch { showStatus('❌ 読み込みエラー') }
    finally { setLoading(false) }
  }, [])

  const loadSysFromDB = useCallback(async () => {
    setLoading(true)
    try {
      const res = await systemFlowStepsApi.getAll()
      const { nodes: n, edges: e } = convertSystemFlowToReactFlow(res.data)
      setSysNodes(applyPositions(n, POS_KEY_SYS))
      setSysEdges(e)
      showStatus('✓ システムフローを読み込みました')
    } catch { showStatus('❌ 読み込みエラー') }
    finally { setLoading(false) }
  }, [])

  useEffect(() => { loadBizFromDB() }, [])
  useEffect(() => { if (flowTab === 'system' && sysNodes.length === 0) loadSysFromDB() }, [flowTab])

  const handleFlowTabChange = (tab: FlowTab) => {
    setFlowTab(tab); setSelectedNode(null); setSelectedEdge(null); setIsDirty(false)
  }

  const saveToDb = async () => {
    setSaving(true)
    try {
      savePositions(posKey, nodes)
      if (flowTab === 'business') {
        const [stepsRes, connRes] = await Promise.all([businessFlowStepsApi.getAll(), flowConnectionsApi.getAll()])
        const existingSteps = stepsRes.data as any[]
        const existingConns = connRes.data as any[]
        const canvasNodeIds = new Set(nodes.map(n => n.id))
        for (const s of existingSteps) { if (!canvasNodeIds.has(s.nodeId)) await businessFlowStepsApi.delete(s.id) }
        const existingNodeIdMap = new Map(existingSteps.map((s: any) => [s.nodeId, s]))
        for (const node of nodes) {
          const d = { stepId: node.data.stepId || node.id, stepName: node.data.stepId || node.id, nodeId: node.id, nodeLabel: node.data.label, nodeType: node.data.kind || 'process', displayOrder: Math.round(node.position.x / 10), parentNodeId: '', connectionType: 'normal', mermaidStyle: node.data.kind || 'step', isActive: true }
          const ex = existingNodeIdMap.get(node.id)
          if (ex) await businessFlowStepsApi.update(ex.id, { ...ex, ...d })
          else await businessFlowStepsApi.create(d)
        }
        const canvasEdgeKeys = new Set(edges.map(e => `${e.source}-${e.target}`))
        for (const c of existingConns) { if (!canvasEdgeKeys.has(`${c.fromNodeId}-${c.toNodeId}`)) await flowConnectionsApi.delete(c.id) }
        const existingConnMap = new Map(existingConns.map((c: any) => [`${c.fromNodeId}-${c.toNodeId}`, c]))
        for (let i = 0; i < edges.length; i++) {
          const edge = edges[i]; const key = `${edge.source}-${edge.target}`
          const cd = { fromNodeId: edge.source, toNodeId: edge.target, connectionType: edge.data?.edgeStyle === 'dotted' ? 'dotted' : edge.data?.edgeStyle === 'dashed' ? 'dashed' : 'normal', conditionLabel: edge.data?.conditionLabel || '', displayOrder: i + 1, isActive: true }
          const exC = existingConnMap.get(key)
          if (exC) await flowConnectionsApi.update(exC.id, { ...exC, ...cd })
          else await flowConnectionsApi.create(cd)
        }
      } else {
        const res = await systemFlowStepsApi.getAll()
        const existingSteps = res.data as any[]
        const canvasNodeIds = new Set(nodes.map(n => n.id))
        for (const s of existingSteps) { if (!canvasNodeIds.has(s.stepId)) await systemFlowStepsApi.delete(s.id) }
        const existingStepMap = new Map(existingSteps.map((s: any) => [s.stepId, s]))
        for (let i = 0; i < nodes.length; i++) {
          const node = nodes[i]
          const d = { stepId: node.id, stepName: node.data.label, businessType: node.data.stepId || node.data.label, displayOrder: i + 1, isSubgraph: true, subgraphLabel: node.data.label, isActive: true }
          const ex = existingStepMap.get(node.id)
          if (ex) await systemFlowStepsApi.update(ex.id, { ...ex, ...d })
          else await systemFlowStepsApi.create(d)
        }
      }
      setSavedAt(new Date()); setIsDirty(false)
      showStatus('✅ DBに保存しました')
    } catch (err) { console.error(err); showStatus('❌ 保存に失敗しました') }
    finally { setSaving(false) }
  }

  const handleReloadFromDB = async () => {
    if (!confirm(`DBから再読み込みします。現在の配置が失われます。`)) return
    localStorage.removeItem(posKey)
    setSelectedNode(null); setSelectedEdge(null); setIsDirty(false)
    if (flowTab === 'business') { setBizNodes([]); setBizEdges([]); await loadBizFromDB() }
    else { setSysNodes([]); setSysEdges([]); await loadSysFromDB() }
  }

  const handleAddNode = useCallback((kind: NodeKind, position = { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 }) => {
    const meta = NODE_KIND_META[kind]
    const id = `node_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    setNodes(prev => [...prev, { id, type: kind, data: { label: meta.label, kind, stepId: '', description: '' }, position }])
    setIsDirty(true)
  }, [setNodes])

  const handleNodeChange = useCallback((id: string, patch: Partial<FlowNode['data']>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, data: { ...n.data, ...patch } } : n))
    setSelectedNode(prev => prev?.id === id ? { ...prev, data: { ...prev.data, ...patch } } : prev)
    setIsDirty(true)
  }, [setNodes])

  const handleEdgeChange = useCallback((id: string, patch: Partial<FlowEdge['data'] & { label?: string }>) => {
    setEdges(prev => prev.map(e => e.id === id ? { ...e, data: { ...e.data, ...patch }, label: patch.label ?? e.label } : e))
    setSelectedEdge(prev => prev?.id === id ? { ...prev, data: { ...prev.data, ...patch } } : prev)
    setIsDirty(true)
  }, [setEdges])

  const handleDeleteNode = useCallback((id: string) => {
    if (!confirm('削除しますか？')) return
    setNodes(prev => prev.filter(n => n.id !== id))
    setEdges(prev => prev.filter(e => e.source !== id && e.target !== id))
    setSelectedNode(null); setIsDirty(true)
  }, [setNodes, setEdges])

  const handleDeleteEdge = useCallback((id: string) => {
    if (!confirm('削除しますか？')) return
    setEdges(prev => prev.filter(e => e.id !== id))
    setSelectedEdge(null); setIsDirty(true)
  }, [setEdges])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', background: '#0a1628', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e3a5f', fontFamily: '"Noto Sans JP", sans-serif' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: '#0f172a', borderBottom: '1px solid #1e3a5f', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 16 }}>🔀</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>フローマスタ</span>
        <div style={{ width: 1, height: 20, background: '#1e3a5f' }} />
        {([{ id: 'business' as FlowTab, label: '📈 業務フロー', color: '#3b82f6' }, { id: 'system' as FlowTab, label: '🔧 システムフロー', color: '#10b981' }] as const).map(({ id, label, color }) => {
          const isActive = flowTab === id
          return (
            <button key={id} onClick={() => handleFlowTabChange(id)} style={{ padding: '4px 14px', border: isActive ? 'none' : '1px solid #1e3a5f', borderRadius: 6, background: isActive ? color : 'transparent', color: isActive ? 'white' : '#94a3b8', fontWeight: isActive ? 700 : 500, fontSize: 12, cursor: 'pointer' } as React.CSSProperties}
              onMouseEnter={e => { if (!isActive) e.currentTarget.style.color = 'white' }}
              onMouseLeave={e => { if (!isActive) e.currentTarget.style.color = '#94a3b8' }}
            >{label}</button>
          )
        })}
        <div style={{ width: 1, height: 20, background: '#1e3a5f' }} />
        <div style={{ fontSize: 11, color: '#cbd5e1', display: 'flex', gap: 12 }}>
          <span>ノード: <strong style={{ color: '#93c5fd' }}>{nodes.length}</strong></span>
          <span>接続: <strong style={{ color: '#93c5fd' }}>{edges.length}</strong></span>
        </div>
        <div style={{ flex: 1 }} />
        {statusMsg && <div style={{ fontSize: 11, color: statusMsg.startsWith('✅') || statusMsg.startsWith('✓') ? '#34d399' : statusMsg.startsWith('❌') ? '#f87171' : '#93c5fd' }}>{statusMsg}</div>}
        <div style={{ fontSize: 10, color: isDirty ? '#f59e0b' : '#34d399' }}>
          {isDirty ? '● 未保存' : savedAt ? `✓ DB保存済 ${savedAt.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
        </div>
        <div style={{ width: 1, height: 20, background: '#1e3a5f' }} />
        {[
          { label: saving ? '保存中...' : '💾 DBに保存', bg: '#1d4ed8', hov: '#2563eb', fn: saveToDb, dis: saving },
          { label: '🔄 DB再読込', bg: '#065f46', hov: '#047857', fn: handleReloadFromDB, dis: false },
        ].map(({ label, bg, hov, fn, dis }) => (
          <button key={label} onClick={fn} disabled={dis}
            style={{ padding: '5px 12px', background: dis ? '#334155' : bg, border: 'none', borderRadius: 5, color: 'white', fontSize: 11, fontWeight: 700, cursor: dis ? 'not-allowed' : 'pointer' }}
            onMouseEnter={e => { if (!dis) e.currentTarget.style.background = hov }}
            onMouseLeave={e => { if (!dis) e.currentTarget.style.background = bg }}
          >{label}</button>
        ))}
      </div>

      <div style={{ display: 'flex', flex: 1 }}>
        <NodePalette onAddNode={kind => handleAddNode(kind)} />
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{ position: 'absolute', inset: 0, zIndex: 10, background: 'rgba(10,22,40,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#93c5fd', fontSize: 14, fontWeight: 700, gap: 8 }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>DBから読み込み中...
            </div>
          )}
          <div style={{ position: 'absolute', bottom: 10, left: 10, zIndex: 5, fontSize: 10, color: '#94a3b8', background: 'rgba(10,22,40,0.7)', padding: '4px 8px', borderRadius: 4 }}>
            Delete: 選択削除　Shift: 複数選択
          </div>
          <ReactFlowCanvas
            nodes={nodes} edges={edges}
            onNodesChange={ns => { setNodes(ns); setIsDirty(true) }}
            onEdgesChange={es => { setEdges(es); setIsDirty(true) }}
            onNodeSelect={setSelectedNode} onEdgeSelect={setSelectedEdge}
            onAddNode={handleAddNode}
          />
        </div>
        <NodePropertyPanel
          node={selectedNode} edge={selectedEdge}
          onNodeChange={handleNodeChange} onEdgeChange={handleEdgeChange}
          onDeleteNode={handleDeleteNode} onDeleteEdge={handleDeleteEdge}
        />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .react-flow__handle { opacity: 0; transition: opacity 0.15s; }
        .react-flow__node:hover .react-flow__handle { opacity: 1; }
        .react-flow__handle:hover { opacity: 1 !important; transform: scale(1.4); }
        .react-flow__controls button { background: #0f172a !important; border-color: #1e3a5f !important; color: #60a5fa !important; fill: #60a5fa !important; }
        .react-flow__controls button:hover { background: #1e3a5f !important; }
        .react-flow__connection-line { stroke: #60a5fa !important; }
      `}</style>
    </div>
  )
}

export function FlowMasterLabWrapper() {
  return <ReactFlowProvider><FlowMasterLab /></ReactFlowProvider>
}
