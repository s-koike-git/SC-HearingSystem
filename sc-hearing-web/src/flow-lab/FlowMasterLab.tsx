import { useEffect, useState, useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import ReactFlowCanvas from './ReactFlowCanvas'
import NodePropertyPanel from './NodePropertyPanel'
import NodePalette from './NodePalette'
import {
  convertFunctionalFlowToReactFlow,
  convertSystemFlowToReactFlow,
  convertBusinessProcessFlowToReactFlow,
  convertBusinessFlowToReactFlow,
} from './converters'
import {
  businessFlowStepsApi,
  flowConnectionsApi,
  systemFlowStepsApi,
  systemFlowNodesApi,
  businessProcessFlowStepsApi,
  businessProcessFlowConnectionsApi,
  functionalFlowStepsApi,
} from '../services/api'
import type { FlowNode, FlowEdge, NodeKind } from './types'
import { NODE_KIND_META } from './types'

type FlowTab = 'process' | 'business' | 'functional' | 'system'

export default function FlowMasterLab() {
  const [flowTab, setFlowTab] = useState<FlowTab>('process')

  // 第1階層
  const [procNodes, setProcNodes] = useState<FlowNode[]>([])
  const [procEdges, setProcEdges] = useState<FlowEdge[]>([])

  // 第2階層
  const [bizNodes, setBizNodes] = useState<FlowNode[]>([])
  const [bizEdges, setBizEdges] = useState<FlowEdge[]>([])

  // 第3階層
  const [funcNodes, setFuncNodes] = useState<FlowNode[]>([])
  const [funcEdges, setFuncEdges] = useState<FlowEdge[]>([])

  // 第4階層
  const [sysNodes, setSysNodes] = useState<FlowNode[]>([])
  const [sysEdges, setSysEdges] = useState<FlowEdge[]>([])

  const nodes = flowTab === 'process' ? procNodes
              : flowTab === 'business' ? bizNodes
              : flowTab === 'functional' ? funcNodes
              : sysNodes
  const edges = flowTab === 'process' ? procEdges
              : flowTab === 'business' ? bizEdges
              : flowTab === 'functional' ? funcEdges
              : sysEdges
  const setNodes = flowTab === 'process' ? setProcNodes
                 : flowTab === 'business' ? setBizNodes
                 : flowTab === 'functional' ? setFuncNodes
                 : setSysNodes
  const setEdges = flowTab === 'process' ? setProcEdges
                 : flowTab === 'business' ? setBizEdges
                 : flowTab === 'functional' ? setFuncEdges
                 : setSysEdges

  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<FlowEdge | null>(null)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const [statusMsg, setStatusMsg] = useState('')

  const showStatus = (msg: string) => { setStatusMsg(msg); setTimeout(() => setStatusMsg(''), 3500) }

  // ========== ロード関数 ==========
  const loadProcFromDB = useCallback(async () => {
    setLoading(true)
    try {
      const [procRes, connRes] = await Promise.all([
        businessProcessFlowStepsApi.getAll(),
        businessProcessFlowConnectionsApi.getAll(),
      ])
      const { nodes: n, edges: e } = convertBusinessProcessFlowToReactFlow(procRes.data, connRes.data)
      setProcNodes(n)
      setProcEdges(e)
      showStatus('✓ 業務プロセスフローを読み込みました')
    } catch (err) {
      console.error(err); showStatus('❌ 読み込みエラー')
    } finally { setLoading(false) }
  }, [])

  const loadBizFromDB = useCallback(async () => {
    setLoading(true)
    try {
      const [stepsRes, connRes] = await Promise.all([
        businessFlowStepsApi.getAll(),
        flowConnectionsApi.getAll('business'),
      ])
      const { nodes: n, edges: e } = convertBusinessFlowToReactFlow(stepsRes.data, connRes.data)
      setBizNodes(n)
      setBizEdges(e)
      showStatus('✓ 業務フローを読み込みました')
    } catch (err) {
      console.error(err); showStatus('❌ 読み込みエラー')
    } finally { setLoading(false) }
  }, [])

  const loadFuncFromDB = useCallback(async () => {
    setLoading(true)
    try {
      const [stepsRes, connRes] = await Promise.all([
        functionalFlowStepsApi.getAll(),
        flowConnectionsApi.getAll('functional'),
      ])
      const { nodes: n, edges: e } = convertFunctionalFlowToReactFlow(stepsRes.data, connRes.data)
      setFuncNodes(n)
      setFuncEdges(e)
      showStatus('✓ 機能フローを読み込みました')
    } catch (err) {
      console.error(err); showStatus('❌ 読み込みエラー')
    } finally { setLoading(false) }
  }, [])

  const loadSysFromDB = useCallback(async () => {
    setLoading(true)
    try {
      const [stepsRes, nodesRes, connRes] = await Promise.all([
        systemFlowStepsApi.getAll(),
        systemFlowNodesApi.getAll(),
        flowConnectionsApi.getAll('system'),
      ])
      const { nodes: n, edges: e } = convertSystemFlowToReactFlow(stepsRes.data, nodesRes.data, connRes.data)
      setSysNodes(n)
      setSysEdges(e)
      showStatus('✓ システムフローを読み込みました')
    } catch (err) {
      console.error(err); showStatus('❌ 読み込みエラー')
    } finally { setLoading(false) }
  }, [])

  // 初回ロード
  useEffect(() => { loadProcFromDB() }, [])

  // タブ切替時の遅延ロード
  useEffect(() => {
    if (flowTab === 'business' && bizNodes.length === 0) loadBizFromDB()
    if (flowTab === 'functional' && funcNodes.length === 0) loadFuncFromDB()
    if (flowTab === 'system' && sysNodes.length === 0) loadSysFromDB()
  }, [flowTab])

  const handleFlowTabChange = (tab: FlowTab) => {
    setFlowTab(tab); setSelectedNode(null); setSelectedEdge(null); setIsDirty(false)
  }

  // ========== 保存処理 ==========
  const saveToDb = async () => {
    setSaving(true)
    try {
      if (flowTab === 'process') await saveProcFlow()
      else if (flowTab === 'business') await saveBizFlow()
      else if (flowTab === 'functional') await saveFuncFlow()
      else await saveSysFlow()
      setSavedAt(new Date()); setIsDirty(false); showStatus('✅ DBに保存しました')
    } catch (err) {
      console.error(err); showStatus('❌ 保存に失敗しました')
    } finally { setSaving(false) }
  }

  const saveProcFlow = async () => {
    const userNodes = procNodes.filter(n => !n.id.startsWith('cat_'))
    const positionUpdates = userNodes.map(n => ({
      stepId: n.id, x: n.position.x, y: n.position.y,
    }))
    if (positionUpdates.length > 0) {
      await businessProcessFlowStepsApi.updatePositionsBulk(positionUpdates)
    }
  }

  const saveBizFlow = async () => {
    const userNodes = bizNodes.filter(n => !n.id.startsWith('bp_grp_'))
    const positionUpdates = userNodes.map(n => ({
      stepId: n.id, x: n.position.x, y: n.position.y,
    }))
    if (positionUpdates.length > 0) {
      await businessFlowStepsApi.updatePositionsBulk(positionUpdates)
    }
  }

  const saveFuncFlow = async () => {
    const positionUpdates = funcNodes.map(n => ({
      nodeId: n.id, x: n.position.x, y: n.position.y,
    }))
    if (positionUpdates.length > 0) {
      await functionalFlowStepsApi.updatePositionsBulk(positionUpdates)
    }
  }

  const saveSysFlow = async () => {
    const userNodes = sysNodes.filter(n => !n.id.startsWith('step_'))
    const positionUpdates = userNodes.map(n => ({
      nodeId: n.id, x: n.position.x, y: n.position.y,
    }))
    if (positionUpdates.length > 0) {
      await systemFlowNodesApi.updatePositionsBulk(positionUpdates)
    }
  }

  const handleReloadFromDB = async () => {
    if (!confirm(`DBから再読み込みします。現在の配置が失われます。`)) return
    setSelectedNode(null); setSelectedEdge(null); setIsDirty(false)
    if (flowTab === 'process') { setProcNodes([]); setProcEdges([]); await loadProcFromDB() }
    else if (flowTab === 'business') { setBizNodes([]); setBizEdges([]); await loadBizFromDB() }
    else if (flowTab === 'functional') { setFuncNodes([]); setFuncEdges([]); await loadFuncFromDB() }
    else { setSysNodes([]); setSysEdges([]); await loadSysFromDB() }
  }

  const handleAddNode = useCallback((kind: NodeKind, position = { x: 200 + Math.random() * 300, y: 100 + Math.random() * 200 }) => {
    const meta = NODE_KIND_META[kind]
    const idPrefix = flowTab === 'system' ? 'SF_node'
                   : flowTab === 'process' ? 'BP_node'
                   : flowTab === 'business' ? 'BF_node'
                   : 'FF_node'
    const id = `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`
    setNodes(prev => [...prev, { id, type: kind, data: { label: meta.label, kind, stepId: '', description: '' }, position }])
    setIsDirty(true)
  }, [setNodes, flowTab])

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
        {([
          { id: 'process'    as FlowTab, label: '🌐 業務プロセス',  color: '#a855f7' },
          { id: 'business'   as FlowTab, label: '📈 業務フロー',    color: '#3b82f6' },
          { id: 'functional' as FlowTab, label: '⚙️ 機能フロー',    color: '#10b981' },
          { id: 'system'     as FlowTab, label: '🔧 システムフロー', color: '#f59e0b' },
        ] as const).map(({ id, label, color }) => {
          const isActive = flowTab === id
          return (
            <button key={id} onClick={() => handleFlowTabChange(id)} style={{ padding: '4px 12px', border: isActive ? 'none' : '1px solid #1e3a5f', borderRadius: 6, background: isActive ? color : 'transparent', color: isActive ? 'white' : '#94a3b8', fontWeight: isActive ? 700 : 500, fontSize: 12, cursor: 'pointer' } as React.CSSProperties}
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
