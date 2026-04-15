import { useCallback, useRef } from 'react'
import ReactFlow, {
  MiniMap,
  Controls,
  Background,
  BackgroundVariant,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  useReactFlow,
  MarkerType,
  ConnectionLineType,
} from 'reactflow'
import type { Connection, NodeChange, EdgeChange } from 'reactflow'
import 'reactflow/dist/style.css'

import type { FlowNode, FlowEdge, NodeKind } from './types'
import { NODE_KIND_META } from './types'
import { nodeTypes, kindToNodeType } from './CustomNodes'
import { edgeTypes } from './CustomEdge'

interface Props {
  nodes: FlowNode[]
  edges: FlowEdge[]
  onNodesChange: (nodes: FlowNode[]) => void
  onEdgesChange: (edges: FlowEdge[]) => void
  onNodeSelect: (node: FlowNode | null) => void
  onEdgeSelect: (edge: FlowEdge | null) => void
  onAddNode: (kind: NodeKind, position: { x: number; y: number }) => void
}

let nodeCounter = 1000

export default function ReactFlowCanvas({
  nodes, edges,
  onNodesChange, onEdgesChange,
  onNodeSelect, onEdgeSelect,
  onAddNode,
}: Props) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null)
  const { screenToFlowPosition } = useReactFlow()

  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    onNodesChange(applyNodeChanges(changes, nodes) as FlowNode[])
  }, [nodes, onNodesChange])

  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    onEdgesChange(applyEdgeChanges(changes, edges) as FlowEdge[])
  }, [edges, onEdgesChange])

  const handleConnect = useCallback((connection: Connection) => {
    const newEdge: FlowEdge = {
      ...connection,
      id: `e-${connection.source}-${connection.target}-${Date.now()}`,
      type: 'flowEdge',
      data: { conditionLabel: '', edgeStyle: 'solid' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
      style: { stroke: '#60a5fa' },
    } as FlowEdge
    onEdgesChange(addEdge(newEdge, edges) as FlowEdge[])
  }, [edges, onEdgesChange])

  // ドラッグオーバー
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'copy'
  }, [])

  // ドロップでノード追加
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const kind = e.dataTransfer.getData('application/flow-node-kind') as NodeKind
    if (!kind) return
    const position = screenToFlowPosition({ x: e.clientX, y: e.clientY })
    onAddNode(kind, position)
  }, [screenToFlowPosition, onAddNode])

  return (
    <div
      ref={reactFlowWrapper}
      style={{ width: '100%', height: '72vh', borderRadius: 8, overflow: 'hidden', border: '1px solid #1e3a5f' }}
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={handleConnect}
        onDragOver={onDragOver}
        onDrop={onDrop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        defaultEdgeOptions={{
          type: 'flowEdge',
          markerEnd: { type: MarkerType.ArrowClosed, color: '#60a5fa' },
          style: { stroke: '#60a5fa', strokeWidth: 1.8 },
          data: { conditionLabel: '', edgeStyle: 'solid' },
        }}
        onNodeClick={(_, node) => {
          onEdgeSelect(null)
          onNodeSelect(node as FlowNode)
        }}
        onEdgeClick={(_, edge) => {
          onNodeSelect(null)
          onEdgeSelect(edge as FlowEdge)
        }}
        onPaneClick={() => {
          onNodeSelect(null)
          onEdgeSelect(null)
        }}
        style={{ background: '#0a1628' }}
        proOptions={{ hideAttribution: true }}
        deleteKeyCode="Delete"
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Ctrl"
        snapToGrid
        snapGrid={[20, 20]}
        connectionLineStyle={{ stroke: '#60a5fa', strokeWidth: 2, strokeDasharray: '5 4' }}
        connectionLineType={ConnectionLineType.Bezier}
      >
        <MiniMap
          style={{ background: '#0f172a', border: '1px solid #1e3a5f' }}
          maskColor="rgba(15,23,42,0.7)"
          nodeColor={n => {
            const kind = (n.data as any)?.kind ?? 'process'
            return NODE_KIND_META[kind as NodeKind]?.border ?? '#60a5fa'
          }}
        />
        <Controls
          style={{ background: '#0f172a', border: '1px solid #1e3a5f', borderRadius: 8 }}
        />
        <Background
          variant={BackgroundVariant.Dots}
          color="#1e3a5f"
          gap={20}
          size={1.2}
        />
      </ReactFlow>
    </div>
  )
}
