import { useState, useEffect } from 'react'
import {
  businessFlowStepsApi,
  flowConnectionsApi,
  systemFlowStepsApi,
  flowQuestionMappingsApi,
  flowProgramMappingsApi,
  businessesApi,
  questionsApi,
  programsApi,
  type BusinessFlowStep,
  type FlowConnection,
  type SystemFlowStep,
  type FlowQuestionMapping,
  type FlowProgramMapping,
  type Business,
  type Question,
  type Program,
} from "../../services/api";

// ─── 共通スタイル ────────────────────────────────────────────
const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
  padding: '0.6rem 1.2rem',
  backgroundColor: disabled ? '#bdc3c7' : color,
  color: 'white',
  border: 'none',
  borderRadius: '4px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 'bold',
  fontSize: '0.9rem',
})

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '0.5rem',
  border: '1px solid #bdc3c7',
  borderRadius: '4px',
  fontSize: '0.95rem',
  boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block',
  marginBottom: '0.4rem',
  fontWeight: 'bold',
  fontSize: '0.9rem',
}

const thStyle: React.CSSProperties = {
  padding: '0.75rem 1rem',
  textAlign: 'left',
  fontWeight: 'bold',
}

const tdStyle: React.CSSProperties = {
  padding: '0.6rem 1rem',
  fontSize: '0.9rem',
}

// ─── メインタブ定義 ──────────────────────────────────────────
const MAIN_TABS = [
  { id: 'business-flow', label: '📈 業務フロー設定' },
  { id: 'system-flow',   label: '🔧 システムフロー設定' },
  { id: 'question-map',  label: '❓ 質問紐づけ' },
  { id: 'program-map',   label: '💻 プログラム紐づけ' },
  { id: 'flow-preview',  label: '👁 フロー確認' },
] as const
type MainTab = typeof MAIN_TABS[number]['id']

// ===================================================================
// 1. 業務フロー設定（ノード管理 + 接続管理）
// ===================================================================
function BusinessFlowSettings() {
  const [subTab, setSubTab] = useState<'nodes' | 'connections'>('nodes')
  const [steps, setSteps] = useState<BusinessFlowStep[]>([])
  const [connections, setConnections] = useState<FlowConnection[]>([])
  const [loading, setLoading] = useState(false)

  // ノード用フォーム
  const [showNodeModal, setShowNodeModal] = useState(false)
  const [editingNode, setEditingNode] = useState<BusinessFlowStep | null>(null)
  const emptyNode: Omit<BusinessFlowStep, 'id' | 'createdAt' | 'updatedAt'> = {
    stepId: '', stepName: '', nodeId: '', nodeLabel: '',
    nodeType: 'process', displayOrder: 0, parentNodeId: '',
    connectionType: 'normal', mermaidStyle: 'step', isActive: true,
  }
  const [nodeForm, setNodeForm] = useState(emptyNode)

  // 接続用フォーム
  const [showConnModal, setShowConnModal] = useState(false)
  const [editingConn, setEditingConn] = useState<FlowConnection | null>(null)
  const emptyConn: Omit<FlowConnection, 'id' | 'createdAt' | 'updatedAt'> = {
    fromNodeId: '', toNodeId: '', connectionType: 'normal',
    conditionLabel: '', displayOrder: 0, isActive: true,
  }
  const [connForm, setConnForm] = useState(emptyConn)

  useEffect(() => { loadAll() }, [])

  const loadAll = async () => {
    setLoading(true)
    try {
      const [sr, cr] = await Promise.all([
        businessFlowStepsApi.getAll(),
        flowConnectionsApi.getAll(),
      ])
      setSteps(sr.data)
      setConnections(cr.data)
    } catch { alert('読み込みエラーが発生しました') }
    finally { setLoading(false) }
  }

  // ── ノード操作 ──
  const openAddNode = () => { setEditingNode(null); setNodeForm(emptyNode); setShowNodeModal(true) }
  const openEditNode = (s: BusinessFlowStep) => {
    setEditingNode(s)
    setNodeForm({ stepId: s.stepId, stepName: s.stepName, nodeId: s.nodeId, nodeLabel: s.nodeLabel,
      nodeType: s.nodeType, displayOrder: s.displayOrder, parentNodeId: s.parentNodeId ?? '',
      connectionType: s.connectionType ?? 'normal', mermaidStyle: s.mermaidStyle ?? 'step', isActive: s.isActive })
    setShowNodeModal(true)
  }
  const saveNode = async () => {
    try {
      if (editingNode?.id) {
        await businessFlowStepsApi.update(editingNode.id, nodeForm)
      } else {
        await businessFlowStepsApi.create(nodeForm)
      }
      setShowNodeModal(false)
      await loadAll()
    } catch { alert('保存に失敗しました') }
  }
  const deleteNode = async (id: number) => {
    if (!confirm('このノードを削除しますか？')) return
    try { await businessFlowStepsApi.delete(id); await loadAll() }
    catch { alert('削除に失敗しました') }
  }

  // ── 接続操作 ──
  const openAddConn = () => { setEditingConn(null); setConnForm(emptyConn); setShowConnModal(true) }
  const openEditConn = (c: FlowConnection) => {
    setEditingConn(c)
    setConnForm({ fromNodeId: c.fromNodeId, toNodeId: c.toNodeId, connectionType: c.connectionType,
      conditionLabel: c.conditionLabel ?? '', displayOrder: c.displayOrder, isActive: c.isActive })
    setShowConnModal(true)
  }
  const saveConn = async () => {
    try {
      if (editingConn?.id) {
        await flowConnectionsApi.update(editingConn.id, connForm)
      } else {
        await flowConnectionsApi.create(connForm)
      }
      setShowConnModal(false)
      await loadAll()
    } catch { alert('保存に失敗しました') }
  }
  const deleteConn = async (id: number) => {
    if (!confirm('この接続を削除しますか？')) return
    try { await flowConnectionsApi.delete(id); await loadAll() }
    catch { alert('削除に失敗しました') }
  }

  if (loading) return <p style={{ padding: '1rem', color: '#7f8c8d' }}>読み込み中...</p>

  return (
    <div>
      {/* サブタブ */}
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['nodes', 'connections'] as const).map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)} style={{
            padding: '0.5rem 1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
            backgroundColor: subTab === tab ? '#2c3e50' : '#ecf0f1',
            color: subTab === tab ? 'white' : '#2c3e50', fontWeight: 'bold',
          }}>
            {tab === 'nodes' ? '🔷 ノード管理' : '🔗 接続管理'}
          </button>
        ))}
      </div>

      {/* ── ノード管理 ── */}
      {subTab === 'nodes' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>業務フローノード一覧（{steps.length}件）</h3>
            <button style={btnStyle('#3498db')} onClick={openAddNode}>＋ ノード追加</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                {['工程ID', 'ノードID', 'ノードラベル', '種別', '表示順', 'スタイル', '有効', '操作'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={s.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
                  <td style={tdStyle}><strong>{s.stepId}</strong><br /><small style={{ color: '#7f8c8d' }}>{s.stepName}</small></td>
                  <td style={tdStyle}>{s.nodeId}</td>
                  <td style={tdStyle}>{s.nodeLabel}</td>
                  <td style={tdStyle}>{s.nodeType}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{s.displayOrder}</td>
                  <td style={tdStyle}><code style={{ backgroundColor: '#ecf0f1', padding: '0.1rem 0.4rem', borderRadius: '3px' }}>{s.mermaidStyle}</code></td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{s.isActive ? '✅' : '❌'}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button style={{ ...btnStyle('#27ae60'), marginRight: '0.4rem', padding: '0.3rem 0.7rem' }} onClick={() => openEditNode(s)}>編集</button>
                    <button style={{ ...btnStyle('#e74c3c'), padding: '0.3rem 0.7rem' }} onClick={() => deleteNode(s.id!)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── 接続管理 ── */}
      {subTab === 'connections' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h3 style={{ margin: 0 }}>フロー接続一覧（{connections.length}件）</h3>
            <button style={btnStyle('#3498db')} onClick={openAddConn}>＋ 接続追加</button>
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
                {['接続元ノード', '接続先ノード', '接続種別', '条件ラベル', '表示順', '有効', '操作'].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {connections.map((c, i) => (
                <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
                  <td style={tdStyle}><code>{c.fromNodeId}</code></td>
                  <td style={tdStyle}><code>{c.toNodeId}</code></td>
                  <td style={tdStyle}>{c.connectionType}</td>
                  <td style={tdStyle}>{c.conditionLabel || '—'}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{c.displayOrder}</td>
                  <td style={{ ...tdStyle, textAlign: 'center' }}>{c.isActive ? '✅' : '❌'}</td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    <button style={{ ...btnStyle('#27ae60'), marginRight: '0.4rem', padding: '0.3rem 0.7rem' }} onClick={() => openEditConn(c)}>編集</button>
                    <button style={{ ...btnStyle('#e74c3c'), padding: '0.3rem 0.7rem' }} onClick={() => deleteConn(c.id!)}>削除</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── ノードモーダル ── */}
      {showNodeModal && (
        <Modal title={editingNode ? 'ノード編集' : 'ノード追加'} onClose={() => setShowNodeModal(false)} onSave={saveNode}>
          <FormRow label="工程ID"><input style={inputStyle} value={nodeForm.stepId} onChange={e => setNodeForm({ ...nodeForm, stepId: e.target.value })} placeholder="例: STEP_ESTIMATE" /></FormRow>
          <FormRow label="工程名"><input style={inputStyle} value={nodeForm.stepName} onChange={e => setNodeForm({ ...nodeForm, stepName: e.target.value })} placeholder="例: 見積" /></FormRow>
          <FormRow label="ノードID"><input style={inputStyle} value={nodeForm.nodeId} onChange={e => setNodeForm({ ...nodeForm, nodeId: e.target.value })} placeholder="例: EST01" /></FormRow>
          <FormRow label="ノードラベル"><input style={inputStyle} value={nodeForm.nodeLabel} onChange={e => setNodeForm({ ...nodeForm, nodeLabel: e.target.value })} placeholder="例: 見積登録" /></FormRow>
          <FormRow label="ノード種別">
            <select style={inputStyle} value={nodeForm.nodeType} onChange={e => setNodeForm({ ...nodeForm, nodeType: e.target.value })}>
              {['process', 'start', 'end', 'decision', 'io'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="Mermaidスタイルクラス"><input style={inputStyle} value={nodeForm.mermaidStyle ?? ''} onChange={e => setNodeForm({ ...nodeForm, mermaidStyle: e.target.value })} placeholder="例: step, active, custom" /></FormRow>
          <FormRow label="接続種別">
            <select style={inputStyle} value={nodeForm.connectionType} onChange={e => setNodeForm({ ...nodeForm, connectionType: e.target.value })}>
              {['normal', 'conditional', 'dotted'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="親ノードID（任意）"><input style={inputStyle} value={nodeForm.parentNodeId ?? ''} onChange={e => setNodeForm({ ...nodeForm, parentNodeId: e.target.value })} placeholder="例: EST01" /></FormRow>
          <FormRow label="表示順"><input style={inputStyle} type="number" value={nodeForm.displayOrder} onChange={e => setNodeForm({ ...nodeForm, displayOrder: Number(e.target.value) })} /></FormRow>
          <FormRow label="有効">
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={nodeForm.isActive} onChange={e => setNodeForm({ ...nodeForm, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />
              有効にする
            </label>
          </FormRow>
        </Modal>
      )}

      {/* ── 接続モーダル ── */}
      {showConnModal && (
        <Modal title={editingConn ? '接続編集' : '接続追加'} onClose={() => setShowConnModal(false)} onSave={saveConn}>
          <FormRow label="接続元ノードID"><input style={inputStyle} value={connForm.fromNodeId} onChange={e => setConnForm({ ...connForm, fromNodeId: e.target.value })} placeholder="例: EST01" /></FormRow>
          <FormRow label="接続先ノードID"><input style={inputStyle} value={connForm.toNodeId} onChange={e => setConnForm({ ...connForm, toNodeId: e.target.value })} placeholder="例: ORD01" /></FormRow>
          <FormRow label="接続種別">
            <select style={inputStyle} value={connForm.connectionType} onChange={e => setConnForm({ ...connForm, connectionType: e.target.value })}>
              <option value="normal">normal（実線矢印）</option>
              <option value="dotted">dotted（点線）</option>
              <option value="conditional">conditional（条件分岐）</option>
            </select>
          </FormRow>
          <FormRow label="条件ラベル（任意）"><input style={inputStyle} value={connForm.conditionLabel ?? ''} onChange={e => setConnForm({ ...connForm, conditionLabel: e.target.value })} placeholder="例: 承認時" /></FormRow>
          <FormRow label="表示順"><input style={inputStyle} type="number" value={connForm.displayOrder} onChange={e => setConnForm({ ...connForm, displayOrder: Number(e.target.value) })} /></FormRow>
          <FormRow label="有効">
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={connForm.isActive} onChange={e => setConnForm({ ...connForm, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />
              有効にする
            </label>
          </FormRow>
        </Modal>
      )}
    </div>
  )
}

// ===================================================================
// 2. システムフロー設定
// ===================================================================
function SystemFlowSettings({ businesses }: { businesses: Business[] }) {
  const [steps, setSteps] = useState<SystemFlowStep[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<SystemFlowStep | null>(null)
  const empty: Omit<SystemFlowStep, 'id' | 'createdAt' | 'updatedAt'> = {
    stepId: '', stepName: '', businessType: '', displayOrder: 0,
    isSubgraph: false, subgraphLabel: '', isActive: true,
  }
  const [form, setForm] = useState(empty)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try { const r = await systemFlowStepsApi.getAll(); setSteps(r.data) }
    catch { alert('読み込みエラー') } finally { setLoading(false) }
  }

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (s: SystemFlowStep) => {
    setEditing(s)
    setForm({ stepId: s.stepId, stepName: s.stepName, businessType: s.businessType,
      displayOrder: s.displayOrder, isSubgraph: s.isSubgraph, subgraphLabel: s.subgraphLabel ?? '', isActive: s.isActive })
    setShowModal(true)
  }
  const save = async () => {
    try {
      if (editing?.id) await systemFlowStepsApi.update(editing.id, form)
      else await systemFlowStepsApi.create(form)
      setShowModal(false); await load()
    } catch { alert('保存に失敗しました') }
  }
  const del = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await systemFlowStepsApi.delete(id); await load() }
    catch { alert('削除に失敗しました') }
  }

  if (loading) return <p style={{ color: '#7f8c8d' }}>読み込み中...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0 }}>システムフロー工程一覧（{steps.length}件）</h3>
        <button style={btnStyle('#3498db')} onClick={openAdd}>＋ 工程追加</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#8e44ad', color: 'white' }}>
            {['工程ID', '工程名', '業務区分', '表示順', 'サブグラフ', 'サブグラフラベル', '有効', '操作'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={s.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
              <td style={tdStyle}><strong>{s.stepId}</strong></td>
              <td style={tdStyle}>{s.stepName}</td>
              <td style={tdStyle}><span style={{ backgroundColor: '#f5eef8', padding: '0.2rem 0.5rem', borderRadius: '3px', fontSize: '0.85rem' }}>{s.businessType}</span></td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.displayOrder}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.isSubgraph ? '✅' : '—'}</td>
              <td style={tdStyle}>{s.subgraphLabel || '—'}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.isActive ? '✅' : '❌'}</td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <button style={{ ...btnStyle('#27ae60'), marginRight: '0.4rem', padding: '0.3rem 0.7rem' }} onClick={() => openEdit(s)}>編集</button>
                <button style={{ ...btnStyle('#e74c3c'), padding: '0.3rem 0.7rem' }} onClick={() => del(s.id!)}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? '工程編集' : '工程追加'} onClose={() => setShowModal(false)} onSave={save}>
          <FormRow label="工程ID"><input style={inputStyle} value={form.stepId} onChange={e => setForm({ ...form, stepId: e.target.value })} placeholder="例: SYS_ESTIMATE" /></FormRow>
          <FormRow label="工程名"><input style={inputStyle} value={form.stepName} onChange={e => setForm({ ...form, stepName: e.target.value })} placeholder="例: 見積処理" /></FormRow>
          <FormRow label="業務区分">
            <select style={inputStyle} value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })}>
              <option value="">-- 選択 --</option>
              {businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="表示順"><input style={inputStyle} type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} /></FormRow>
          <FormRow label="サブグラフ">
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isSubgraph} onChange={e => setForm({ ...form, isSubgraph: e.target.checked })} style={{ marginRight: '0.5rem' }} />
              サブグラフとして表示する
            </label>
          </FormRow>
          {form.isSubgraph && (
            <FormRow label="サブグラフラベル"><input style={inputStyle} value={form.subgraphLabel ?? ''} onChange={e => setForm({ ...form, subgraphLabel: e.target.value })} placeholder="例: 見積業務" /></FormRow>
          )}
          <FormRow label="有効">
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />
              有効にする
            </label>
          </FormRow>
        </Modal>
      )}
    </div>
  )
}

// ===================================================================
// 3. 質問紐づけ
// ===================================================================
function QuestionMappingSettings({
  businesses, questions, businessFlowSteps, systemFlowSteps
}: {
  businesses: Business[]
  questions: Question[]
  businessFlowSteps: BusinessFlowStep[]
  systemFlowSteps: SystemFlowStep[]
}) {
  const [mappings, setMappings] = useState<FlowQuestionMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FlowQuestionMapping | null>(null)
  const [filterBiz, setFilterBiz] = useState('')

  const empty: Omit<FlowQuestionMapping, 'id' | 'createdAt' | 'updatedAt'> = {
    businessType: '', questionNo: '', answerCondition: '', flowStepId: '',
    flowType: 'business', priority: 0, isActive: true,
  }
  const [form, setForm] = useState(empty)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try { const r = await flowQuestionMappingsApi.getAll(); setMappings(r.data) }
    catch { alert('読み込みエラー') } finally { setLoading(false) }
  }

  // 選択中の業務に対応する質問を絞り込む
  const filteredQuestions = questions.filter(q => q.businessType === form.businessType)

  // 選択中の質問の回答選択肢を作成
  const selectedQuestion = questions.find(q =>
    q.businessType === form.businessType && q.questionNo === form.questionNo
  )
  const answerOptions = selectedQuestion
    ? selectedQuestion.type === 'yesno'
      ? ['○', '×']
      : selectedQuestion.choices ?? []
    : []

  // フロー工程選択肢（flowType に応じて切り替え）
  const stepOptions = form.flowType === 'business'
    ? [...new Set(businessFlowSteps.map(s => s.stepId))]
    : [...new Set(systemFlowSteps.map(s => s.stepId))]

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (m: FlowQuestionMapping) => {
    setEditing(m)
    setForm({ businessType: m.businessType, questionNo: m.questionNo, answerCondition: m.answerCondition,
      flowStepId: m.flowStepId, flowType: m.flowType, priority: m.priority, isActive: m.isActive })
    setShowModal(true)
  }
  const save = async () => {
    try {
      if (editing?.id) await flowQuestionMappingsApi.update(editing.id, form)
      else await flowQuestionMappingsApi.create(form)
      setShowModal(false); await load()
    } catch { alert('保存に失敗しました') }
  }
  const del = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await flowQuestionMappingsApi.delete(id); await load() }
    catch { alert('削除に失敗しました') }
  }

  const displayed = filterBiz ? mappings.filter(m => m.businessType === filterBiz) : mappings

  if (loading) return <p style={{ color: '#7f8c8d' }}>読み込み中...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>質問紐づけ一覧（{displayed.length}件）</h3>
          <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">全業務</option>
            {businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
          </select>
        </div>
        <button style={btnStyle('#3498db')} onClick={openAdd}>＋ 紐づけ追加</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#16a085', color: 'white' }}>
            {['業務区分', '質問No', '回答条件', 'フロー種別', 'フロー工程ID', '優先度', '有効', '操作'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((m, i) => (
            <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
              <td style={tdStyle}><span style={{ backgroundColor: '#e8f8f5', padding: '0.2rem 0.5rem', borderRadius: '3px' }}>{m.businessType}</span></td>
              <td style={tdStyle}>{m.questionNo}</td>
              <td style={tdStyle}><strong>{m.answerCondition}</strong></td>
              <td style={tdStyle}><span style={{ color: m.flowType === 'business' ? '#2980b9' : '#8e44ad' }}>{m.flowType === 'business' ? '業務フロー' : 'システムフロー'}</span></td>
              <td style={tdStyle}><code>{m.flowStepId}</code></td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{m.priority}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{m.isActive ? '✅' : '❌'}</td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <button style={{ ...btnStyle('#27ae60'), marginRight: '0.4rem', padding: '0.3rem 0.7rem' }} onClick={() => openEdit(m)}>編集</button>
                <button style={{ ...btnStyle('#e74c3c'), padding: '0.3rem 0.7rem' }} onClick={() => del(m.id!)}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? '質問紐づけ編集' : '質問紐づけ追加'} onClose={() => setShowModal(false)} onSave={save} wide>
          <FormRow label="業務区分">
            <select style={inputStyle} value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value, questionNo: '', answerCondition: '' })}>
              <option value="">-- 選択 --</option>
              {businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="質問No">
            <select style={inputStyle} value={form.questionNo} onChange={e => setForm({ ...form, questionNo: e.target.value, answerCondition: '' })}>
              <option value="">-- 選択 --</option>
              {filteredQuestions.map(q => <option key={q.id} value={q.questionNo}>{q.questionNo}: {q.text.slice(0, 40)}</option>)}
            </select>
          </FormRow>
          <FormRow label="回答条件">
            {answerOptions.length > 0 ? (
              <select style={inputStyle} value={form.answerCondition} onChange={e => setForm({ ...form, answerCondition: e.target.value })}>
                <option value="">-- 選択 --</option>
                {answerOptions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            ) : (
              <input style={inputStyle} value={form.answerCondition} onChange={e => setForm({ ...form, answerCondition: e.target.value })} placeholder="例: ○ / × / 1 / 2" />
            )}
          </FormRow>
          <FormRow label="フロー種別">
            <select style={inputStyle} value={form.flowType} onChange={e => setForm({ ...form, flowType: e.target.value, flowStepId: '' })}>
              <option value="business">業務フロー</option>
              <option value="system">システムフロー</option>
            </select>
          </FormRow>
          <FormRow label="フロー工程ID">
            <select style={inputStyle} value={form.flowStepId} onChange={e => setForm({ ...form, flowStepId: e.target.value })}>
              <option value="">-- 選択 --</option>
              {stepOptions.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>
          <FormRow label="優先度"><input style={inputStyle} type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} /></FormRow>
          <FormRow label="有効">
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />
              有効にする
            </label>
          </FormRow>
        </Modal>
      )}
    </div>
  )
}

// ===================================================================
// 4. プログラム紐づけ
// ===================================================================
function ProgramMappingSettings({
  programs, businessFlowSteps, systemFlowSteps
}: {
  programs: Program[]
  businessFlowSteps: BusinessFlowStep[]
  systemFlowSteps: SystemFlowStep[]
}) {
  const [mappings, setMappings] = useState<FlowProgramMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editing, setEditing] = useState<FlowProgramMapping | null>(null)
  const [filterStep, setFilterStep] = useState('')

  const empty: Omit<FlowProgramMapping, 'id' | 'createdAt' | 'updatedAt'> = {
    flowStepId: '', programId: '', displayOrder: 0, isRequired: true, isActive: true,
  }
  const [form, setForm] = useState(empty)

  // 全工程ID（業務フロー + システムフロー）
  const allStepIds = [
    ...new Set([
      ...businessFlowSteps.map(s => s.stepId),
      ...systemFlowSteps.map(s => s.stepId),
    ])
  ].sort()

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try { const r = await flowProgramMappingsApi.getAll(); setMappings(r.data) }
    catch { alert('読み込みエラー') } finally { setLoading(false) }
  }

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (m: FlowProgramMapping) => {
    setEditing(m)
    setForm({ flowStepId: m.flowStepId, programId: m.programId, displayOrder: m.displayOrder,
      isRequired: m.isRequired, isActive: m.isActive })
    setShowModal(true)
  }
  const save = async () => {
    try {
      if (editing?.id) await flowProgramMappingsApi.update(editing.id, form)
      else await flowProgramMappingsApi.create(form)
      setShowModal(false); await load()
    } catch { alert('保存に失敗しました') }
  }
  const del = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await flowProgramMappingsApi.delete(id); await load() }
    catch { alert('削除に失敗しました') }
  }

  const getProgramName = (programId: string) =>
    programs.find(p => p.programId === programId)?.programName ?? '—'

  const displayed = filterStep ? mappings.filter(m => m.flowStepId === filterStep) : mappings

  if (loading) return <p style={{ color: '#7f8c8d' }}>読み込み中...</p>

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <h3 style={{ margin: 0 }}>プログラム紐づけ一覧（{displayed.length}件）</h3>
          <select value={filterStep} onChange={e => setFilterStep(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
            <option value="">全工程</option>
            {allStepIds.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <button style={btnStyle('#3498db')} onClick={openAdd}>＋ 紐づけ追加</button>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead>
          <tr style={{ backgroundColor: '#e67e22', color: 'white' }}>
            {['フロー工程ID', 'プログラムID', 'プログラム名', '表示順', '必須', '有効', '操作'].map(h => (
              <th key={h} style={thStyle}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayed.map((m, i) => (
            <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
              <td style={tdStyle}><code>{m.flowStepId}</code></td>
              <td style={tdStyle}><strong>{m.programId}</strong></td>
              <td style={tdStyle}>{getProgramName(m.programId)}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{m.displayOrder}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{m.isRequired ? '✅' : '—'}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{m.isActive ? '✅' : '❌'}</td>
              <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                <button style={{ ...btnStyle('#27ae60'), marginRight: '0.4rem', padding: '0.3rem 0.7rem' }} onClick={() => openEdit(m)}>編集</button>
                <button style={{ ...btnStyle('#e74c3c'), padding: '0.3rem 0.7rem' }} onClick={() => del(m.id!)}>削除</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showModal && (
        <Modal title={editing ? 'プログラム紐づけ編集' : 'プログラム紐づけ追加'} onClose={() => setShowModal(false)} onSave={save}>
          <FormRow label="フロー工程ID">
            <select style={inputStyle} value={form.flowStepId} onChange={e => setForm({ ...form, flowStepId: e.target.value })}>
              <option value="">-- 選択 --</option>
              {allStepIds.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormRow>
          <FormRow label="プログラム">
            <select style={inputStyle} value={form.programId} onChange={e => setForm({ ...form, programId: e.target.value })}>
              <option value="">-- 選択 --</option>
              {programs.map(p => <option key={p.id} value={p.programId}>{p.programId}: {p.programName}</option>)}
            </select>
          </FormRow>
          <FormRow label="表示順"><input style={inputStyle} type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} /></FormRow>
          <FormRow label="必須">
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isRequired} onChange={e => setForm({ ...form, isRequired: e.target.checked })} style={{ marginRight: '0.5rem' }} />
              必須プログラムとして扱う
            </label>
          </FormRow>
          <FormRow label="有効">
            <label style={{ cursor: 'pointer' }}>
              <input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />
              有効にする
            </label>
          </FormRow>
        </Modal>
      )}
    </div>
  )
}

// ===================================================================
// 5. フロー確認（マスタ登録内容のサマリー表示）
// ===================================================================
function FlowPreview({
  businessFlowSteps, systemFlowSteps, connections, programs
}: {
  businessFlowSteps: BusinessFlowStep[]
  systemFlowSteps: SystemFlowStep[]
  connections: FlowConnection[]
  programs: Program[]
}) {
  const [tab, setTab] = useState<'business' | 'system'>('business')

  const bizGroups = businessFlowSteps
    .filter(s => s.isActive)
    .reduce<Record<string, BusinessFlowStep[]>>((acc, s) => {
      if (!acc[s.stepId]) acc[s.stepId] = []
      acc[s.stepId].push(s)
      return acc
    }, {})

  const sysGroups = systemFlowSteps
    .filter(s => s.isActive)
    .reduce<Record<string, SystemFlowStep[]>>((acc, s) => {
      if (!acc[s.businessType]) acc[s.businessType] = []
      acc[s.businessType].push(s)
      return acc
    }, {})

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['business', 'system'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding: '0.5rem 1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer',
            backgroundColor: tab === t ? '#2c3e50' : '#ecf0f1',
            color: tab === t ? 'white' : '#2c3e50', fontWeight: 'bold',
          }}>
            {t === 'business' ? '📈 業務フロー' : '🔧 システムフロー'}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gap: '1rem', backgroundColor: '#f8f9fa', padding: '1rem', borderRadius: '8px' }}>
        <p style={{ margin: 0, color: '#7f8c8d', fontSize: '0.9rem' }}>
          ※ 実際のフロー図は案件の判定結果画面から確認できます。ここではマスタの登録内容を確認できます。
        </p>

        {tab === 'business' && (
          <>
            <h3 style={{ margin: 0 }}>業務フロー工程（{businessFlowSteps.filter(s => s.isActive).length}件）</h3>
            {Object.entries(bizGroups)
              .sort(([, a], [, b]) => a[0].displayOrder - b[0].displayOrder)
              .map(([stepId, nodes]) => (
                <div key={stepId} style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #ecf0f1' }}>
                  <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '0.5rem' }}>
                    🔷 {stepId} <span style={{ color: '#7f8c8d', fontWeight: 'normal', fontSize: '0.9rem' }}>（{nodes[0].stepName}）</span>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                    {nodes.sort((a, b) => a.displayOrder - b.displayOrder).map(n => (
                      <span key={n.nodeId} style={{ backgroundColor: '#ebf5fb', border: '1px solid #aed6f1', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <code style={{ color: '#2980b9' }}>{n.nodeId}</code>: {n.nodeLabel}
                      </span>
                    ))}
                  </div>
                  <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#7f8c8d' }}>
                    接続: {connections.filter(c => nodes.some(n => n.nodeId === c.fromNodeId || n.nodeId === c.toNodeId)).length}件
                  </div>
                </div>
              ))}
          </>
        )}

        {tab === 'system' && (
          <>
            <h3 style={{ margin: 0 }}>システムフロー工程（{systemFlowSteps.filter(s => s.isActive).length}件）</h3>
            {Object.entries(sysGroups).map(([bizType, steps]) => (
              <div key={bizType} style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #ecf0f1' }}>
                <div style={{ fontWeight: 'bold', color: '#8e44ad', marginBottom: '0.5rem' }}>📁 {bizType}</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
                  {steps.sort((a, b) => a.displayOrder - b.displayOrder).map(s => {
                    const progs = programs.filter(p =>
                      p.programId.startsWith(s.stepId.replace('SYS_', '').slice(0, 2))
                    )
                    return (
                      <span key={s.stepId} style={{ backgroundColor: '#f5eef8', border: '1px solid #d7bde2', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <code style={{ color: '#8e44ad' }}>{s.stepId}</code>: {s.stepName}
                      </span>
                    )
                  })}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}

// ===================================================================
// 共通コンポーネント
// ===================================================================
function Modal({ title, children, onClose, onSave, wide = false }: {
  title: string
  children: React.ReactNode
  onClose: () => void
  onSave: () => void
  wide?: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', width: wide ? '700px' : '500px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#2c3e50' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {children}
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button style={{ ...btnStyle('#3498db'), flex: 1 }} onClick={onSave}>💾 保存</button>
          <button style={{ ...btnStyle('#95a5a6'), flex: 1 }} onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  )
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={labelStyle}>{label}</label>
      {children}
    </div>
  )
}

// ===================================================================
// メインコンポーネント
// ===================================================================
function FlowMasterManagement() {
  const [activeTab, setActiveTab] = useState<MainTab>('business-flow')

  // 共通マスタ（各タブで使い回す）
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [businessFlowSteps, setBusinessFlowSteps] = useState<BusinessFlowStep[]>([])
  const [systemFlowSteps, setSystemFlowSteps] = useState<SystemFlowStep[]>([])
  const [connections, setConnections] = useState<FlowConnection[]>([])

  useEffect(() => {
    // 紐づけタブ・プレビューで使う共通マスタを一括ロード
    Promise.all([
      businessesApi.getAll(),
      questionsApi.getAll(),
      programsApi.getAll(),
      businessFlowStepsApi.getAll(),
      systemFlowStepsApi.getAll(),
      flowConnectionsApi.getAll(),
    ]).then(([b, q, p, bfs, sfs, fc]) => {
      setBusinesses(b.data)
      setQuestions(q.data)
      setPrograms(p.data)
      setBusinessFlowSteps(bfs.data)
      setSystemFlowSteps(sfs.data)
      setConnections(fc.data)
    }).catch(() => console.error('共通マスタの読み込みエラー'))
  }, [])

  // タブ切り替え時に工程リストを更新（追加・編集後に反映させるため）
  const refreshSteps = async () => {
    const [bfs, sfs, fc] = await Promise.all([
      businessFlowStepsApi.getAll(),
      systemFlowStepsApi.getAll(),
      flowConnectionsApi.getAll(),
    ])
    setBusinessFlowSteps(bfs.data)
    setSystemFlowSteps(sfs.data)
    setConnections(fc.data)
  }

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab)
    // 紐づけ・確認タブに切り替えた時に工程リストを最新化
    if (tab === 'question-map' || tab === 'program-map' || tab === 'flow-preview') {
      refreshSteps()
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', borderBottom: '2px solid #ecf0f1', marginBottom: '1.5rem', overflowX: 'auto' }}>
        {MAIN_TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => handleTabChange(tab.id)}
            style={{
              padding: '0.9rem 1.2rem',
              border: 'none',
              borderBottom: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent',
              backgroundColor: 'transparent',
              color: activeTab === tab.id ? '#3498db' : '#2c3e50',
              fontWeight: activeTab === tab.id ? 'bold' : 'normal',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              fontSize: '0.95rem',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'business-flow' && <BusinessFlowSettings />}
      {activeTab === 'system-flow'   && <SystemFlowSettings businesses={businesses} />}
      {activeTab === 'question-map'  && (
        <QuestionMappingSettings
          businesses={businesses}
          questions={questions}
          businessFlowSteps={businessFlowSteps}
          systemFlowSteps={systemFlowSteps}
        />
      )}
      {activeTab === 'program-map'   && (
        <ProgramMappingSettings
          programs={programs}
          businessFlowSteps={businessFlowSteps}
          systemFlowSteps={systemFlowSteps}
        />
      )}
      {activeTab === 'flow-preview'  && (
        <FlowPreview
          businessFlowSteps={businessFlowSteps}
          systemFlowSteps={systemFlowSteps}
          connections={connections}
          programs={programs}
        />
      )}
    </div>
  )
}

export default FlowMasterManagement
