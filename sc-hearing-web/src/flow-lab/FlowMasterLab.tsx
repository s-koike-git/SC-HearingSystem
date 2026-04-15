import { useEffect, useState, useCallback } from 'react'
import { ReactFlowProvider } from 'reactflow'
import ReactFlowCanvas from './ReactFlowCanvas'
import NodePropertyPanel from './NodePropertyPanel'
import NodePalette from './NodePalette'
import { convertToReactFlow } from './converters'
import { businessFlowStepsApi, flowConnectionsApi } from '../services/api'
import type { FlowNode, FlowEdge, NodeKind } from './types'
import { STORAGE_KEY, NODE_KIND_META } from './types'

let _nodeCounter = 1

function genNodeId() {
  return `node_${Date.now()}_${_nodeCounter++}`
}

export default function FlowMasterLab() {
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [edges, setEdges] = useState<FlowEdge[]>([])
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null)
  const [selectedEdge, setSelectedEdge] = useState<FlowEdge | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [isDirty, setIsDirty] = useState(false)

  // ─── 保存・読み込み ────────────────────────────────────────
  const save = useCallback((n: FlowNode[], e: FlowEdge[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ nodes: n, edges: e }))
    setLastSaved(new Date())
    setIsDirty(false)
  }, [])

  const loadFromStorage = (): { nodes: FlowNode[]; edges: FlowEdge[] } | null => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? JSON.parse(raw) : null
    } catch { return null }
  }

  // ─── 初期ロード ────────────────────────────────────────────
  useEffect(() => {
    const stored = loadFromStorage()
    if (stored?.nodes?.length) {
      setNodes(stored.nodes)
      setEdges(stored.edges ?? [])
      return
    }
    // DBから取得
    setLoading(true)
    Promise.all([businessFlowStepsApi.getAll(), flowConnectionsApi.getAll()])
      .then(([stepsRes, connRes]) => {
        const { nodes: n, edges: e } = convertToReactFlow(stepsRes.data, connRes.data)
        setNodes(n)
        setEdges(e)
        save(n, e)
      })
      .catch(err => console.error('フローマスタ(仮) 読み込みエラー', err))
      .finally(() => setLoading(false))
  }, [])

  // 変更時に自動保存（500msデバウンス）
  useEffect(() => {
    if (!isDirty) return
    const t = setTimeout(() => save(nodes, edges), 500)
    return () => clearTimeout(t)
  }, [nodes, edges, isDirty, save])

  const markDirty = () => setIsDirty(true)

  // ─── ノード追加 ────────────────────────────────────────────
  const handleAddNode = useCallback((
    kind: NodeKind,
    position = { x: 200 + Math.random() * 200, y: 100 + Math.random() * 200 }
  ) => {
    const meta = NODE_KIND_META[kind]
    const id = genNodeId()
    const newNode: FlowNode = {
      id,
      type: kind,
      data: { label: meta.label, kind, stepId: '', description: '' },
      position,
    }
    setNodes(prev => {
      const next = [...prev, newNode]
      markDirty()
      return next
    })
  }, [])

  // ─── ノード変更 ────────────────────────────────────────────
  const handleNodeChange = useCallback((id: string, patch: Partial<FlowNode['data']>) => {
    setNodes(prev => {
      const next = prev.map(n =>
        n.id === id ? { ...n, data: { ...n.data, ...patch } } : n
      )
      markDirty()
      return next
    })
    setSelectedNode(prev =>
      prev?.id === id ? { ...prev, data: { ...prev.data, ...patch } } : prev
    )
  }, [])

  // ─── エッジ変更 ────────────────────────────────────────────
  const handleEdgeChange = useCallback((
    id: string,
    patch: Partial<FlowEdge['data'] & { label?: string }>
  ) => {
    setEdges(prev => {
      const next = prev.map(e =>
        e.id === id
          ? { ...e, data: { ...e.data, ...patch }, label: patch.label ?? e.label }
          : e
      )
      markDirty()
      return next
    })
    setSelectedEdge(prev =>
      prev?.id === id ? { ...prev, data: { ...prev.data, ...patch } } : prev
    )
  }, [])

  // ─── ノード削除 ────────────────────────────────────────────
  const handleDeleteNode = useCallback((id: string) => {
    if (!confirm('このノードを削除しますか？')) return
    setNodes(prev => { markDirty(); return prev.filter(n => n.id !== id) })
    setEdges(prev => { markDirty(); return prev.filter(e => e.source !== id && e.target !== id) })
    setSelectedNode(null)
  }, [])

  // ─── エッジ削除 ────────────────────────────────────────────
  const handleDeleteEdge = useCallback((id: string) => {
    if (!confirm('この接続を削除しますか？')) return
    setEdges(prev => { markDirty(); return prev.filter(e => e.id !== id) })
    setSelectedEdge(null)
  }, [])

  // ─── DBから再読み込み ──────────────────────────────────────
  const handleReloadFromDB = async () => {
    if (!confirm('DBのフローマスタデータを再読み込みします。現在の編集は失われます。')) return
    localStorage.removeItem(STORAGE_KEY)
    setLoading(true)
    setSelectedNode(null)
    setSelectedEdge(null)
    try {
      const [stepsRes, connRes] = await Promise.all([
        businessFlowStepsApi.getAll(),
        flowConnectionsApi.getAll(),
      ])
      const { nodes: n, edges: e } = convertToReactFlow(stepsRes.data, connRes.data)
      setNodes(n)
      setEdges(e)
      save(n, e)
    } catch (err) {
      alert('読み込みに失敗しました')
    } finally {
      setLoading(false)
    }
  }

  // ─── 全クリア ─────────────────────────────────────────────
  const handleClear = () => {
    if (!confirm('キャンバスをすべてクリアしますか？')) return
    setNodes([])
    setEdges([])
    setSelectedNode(null)
    setSelectedEdge(null)
    localStorage.removeItem(STORAGE_KEY)
    setIsDirty(false)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      background: '#0a1628',
      borderRadius: 8,
      overflow: 'hidden',
      border: '1px solid #1e3a5f',
      fontFamily: '"Noto Sans JP", sans-serif',
    }}>

      {/* ─── ツールバー ──────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '8px 14px',
        background: '#0f172a',
        borderBottom: '1px solid #1e3a5f',
        flexWrap: 'wrap',
      }}>
        {/* タイトル */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          marginRight: 8,
        }}>
          <span style={{ fontSize: 16 }}>🧪</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: '#93c5fd' }}>
            フローマスタ(仮)
          </span>
          <span style={{
            fontSize: 10, background: '#1e3a5f', color: '#60a5fa',
            borderRadius: 99, padding: '1px 8px', fontWeight: 600,
          }}>BETA</span>
        </div>

        <div style={{ width: 1, height: 20, background: '#1e3a5f', margin: '0 4px' }} />

        {/* 統計 */}
        <div style={{ fontSize: 11, color: '#64748b', display: 'flex', gap: 12 }}>
          <span>ノード: <strong style={{ color: '#93c5fd' }}>{nodes.length}</strong></span>
          <span>接続: <strong style={{ color: '#93c5fd' }}>{edges.length}</strong></span>
        </div>

        <div style={{ flex: 1 }} />

        {/* 保存状態 */}
        <div style={{ fontSize: 10, color: isDirty ? '#f59e0b' : '#34d399' }}>
          {isDirty ? '● 未保存' : lastSaved ? `✓ 保存済 ${lastSaved.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
        </div>

        <div style={{ width: 1, height: 20, background: '#1e3a5f', margin: '0 4px' }} />

        {/* ボタン群 */}
        {[
          { label: '💾 保存', color: '#1d4ed8', hov: '#2563eb', onClick: () => save(nodes, edges) },
          { label: '🔄 DBから再読込', color: '#065f46', hov: '#047857', onClick: handleReloadFromDB },
          { label: '🗑 クリア', color: '#7f1d1d', hov: '#991b1b', onClick: handleClear },
        ].map(({ label, color, hov, onClick }) => (
          <button
            key={label}
            onClick={onClick}
            style={{
              padding: '5px 12px', background: color, border: 'none',
              borderRadius: 5, color: 'white', fontSize: 11,
              fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = hov)}
            onMouseLeave={e => (e.currentTarget.style.background = color)}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ─── 注意バナー ─────────────────────────────────────── */}
      <div style={{
        padding: '6px 14px',
        background: '#1c1700',
        borderBottom: '1px solid #3d2a00',
        fontSize: 11,
        color: '#a16207',
        display: 'flex',
        alignItems: 'center',
        gap: 6,
      }}>
        <span>⚠️</span>
        この画面での編集内容は既存フローマスタ・DBには反映されません。
        ローカルブラウザに一時保存されます。
      </div>

      {/* ─── メインエリア ──────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1 }}>

        {/* パレット */}
        <NodePalette onAddNode={kind => handleAddNode(kind)} />

        {/* キャンバス */}
        <div style={{ flex: 1, position: 'relative' }}>
          {loading && (
            <div style={{
              position: 'absolute', inset: 0, zIndex: 10,
              background: 'rgba(10,22,40,0.85)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#93c5fd', fontSize: 14, fontWeight: 700, gap: 8,
            }}>
              <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
              DBから読み込み中...
            </div>
          )}
          {/* キーボードショートカットヒント */}
          <div style={{
            position: 'absolute', bottom: 10, left: 10, zIndex: 5,
            fontSize: 10, color: '#334155', lineHeight: 1.8,
            background: 'rgba(10,22,40,0.7)', padding: '4px 8px', borderRadius: 4,
          }}>
            Delete: 選択削除　Shift+クリック: 複数選択　Ctrl+クリック: 多重選択
          </div>

          <ReactFlowCanvas
            nodes={nodes}
            edges={edges}
            onNodesChange={ns => { setNodes(ns); markDirty() }}
            onEdgesChange={es => { setEdges(es); markDirty() }}
            onNodeSelect={setSelectedNode}
            onEdgeSelect={setSelectedEdge}
            onAddNode={handleAddNode}
          />
        </div>

        {/* プロパティパネル */}
        <NodePropertyPanel
          node={selectedNode}
          edge={selectedEdge}
          onNodeChange={handleNodeChange}
          onEdgeChange={handleEdgeChange}
          onDeleteNode={handleDeleteNode}
          onDeleteEdge={handleDeleteEdge}
        />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .react-flow__handle { opacity: 0; transition: opacity 0.15s; }
        .react-flow__node:hover .react-flow__handle { opacity: 1; }
        .react-flow__handle:hover { opacity: 1 !important; transform: scale(1.4); }
        .react-flow__controls button {
          background: #0f172a !important;
          border-color: #1e3a5f !important;
          color: #60a5fa !important;
          fill: #60a5fa !important;
        }
        .react-flow__controls button:hover {
          background: #1e3a5f !important;
        }
        .react-flow__minimap { border-radius: 6px !important; }
        .react-flow__edge-path { cursor: pointer; }
        .react-flow__connection-line { stroke: #60a5fa !important; }
      `}</style>
    </div>
  )
}

// ReactFlowProvider でラップするラッパー
export function FlowMasterLabWrapper() {
  return (
    <ReactFlowProvider>
      <FlowMasterLab />
    </ReactFlowProvider>
  )
}
