import { useState, useEffect, useRef } from 'react'
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
} from '../../services/api'
import { FlowMasterLabWrapper as FlowMasterLab } from "../../flow-lab/FlowMasterLab";

// ─── 共通スタイル ─────────────────────────────────────────────────
const btnStyle = (color: string, disabled = false): React.CSSProperties => ({
  padding: '0.6rem 1.2rem',
  backgroundColor: disabled ? '#bdc3c7' : color,
  color: 'white', border: 'none', borderRadius: '4px',
  cursor: disabled ? 'not-allowed' : 'pointer',
  fontWeight: 'bold', fontSize: '0.9rem',
})
const inputStyle: React.CSSProperties = {
  width: '100%', padding: '0.5rem', border: '1px solid #bdc3c7',
  borderRadius: '4px', fontSize: '0.95rem', boxSizing: 'border-box',
}
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '0.4rem', fontWeight: 'bold', fontSize: '0.9rem',
}
const thStyle: React.CSSProperties = { padding: '0.75rem 0.8rem', textAlign: 'left', fontWeight: 'bold' }
const tdStyle: React.CSSProperties = { padding: '0.5rem 0.8rem', fontSize: '0.9rem' }

// ─── タブ定義 ─────────────────────────────────────────────────────
const MAIN_TABS = [
  { id: 'business-flow', label: '📈 業務フロー設定' },
  { id: 'system-flow',   label: '🔧 システムフロー設定' },
  { id: 'question-map',  label: '❓ 質問紐づけ' },
  { id: 'program-map',   label: '💻 プログラム紐づけ' },
  { id: 'flow-preview',  label: '👁 フロー確認' },
  { id: 'flow-master-lab', label: '🧪 フローマスタ(仮)' },
] as const
type MainTab = typeof MAIN_TABS[number]['id']

// ─── CSV ユーティリティ ───────────────────────────────────────────
function downloadCsv(filename: string, rows: string[][], headers: string[]) {
  const bom = '\uFEFF'
  const csv = bom + [headers, ...rows].map(r =>
    r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')
  ).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
}

function parseCsv(text: string): string[][] {
  return text.split('\n')
    .map(line => line.replace(/\r$/, ''))
    .filter(line => line.trim())
    .slice(1)
    .map(line => {
      const result: string[] = []
      let cur = '', inQ = false
      for (let i = 0; i < line.length; i++) {
        const c = line[i]
        if (c === '"') { if (inQ && line[i + 1] === '"') { cur += '"'; i++ } else { inQ = !inQ } }
        else if (c === ',' && !inQ) { result.push(cur.trim()); cur = '' }
        else cur += c
      }
      result.push(cur.trim())
      return result
    })
}

// ─── 共通モーダル ─────────────────────────────────────────────────
function Modal({ title, children, onClose, onSave, wide = false }: {
  title: string; children: React.ReactNode
  onClose: () => void; onSave: () => void; wide?: boolean
}) {
  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', width: wide ? '720px' : '520px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#2c3e50' }}>{title}</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>{children}</div>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1.5rem' }}>
          <button style={{ ...btnStyle('#3498db'), flex: 1 }} onClick={onSave}>保存</button>
          <button style={{ ...btnStyle('#95a5a6'), flex: 1 }} onClick={onClose}>キャンセル</button>
        </div>
      </div>
    </div>
  )
}
function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label style={labelStyle}>{label}</label>{children}</div>
}

// ─── ヘルプモーダル ───────────────────────────────────────────────
function HelpModal({ onClose }: { onClose: () => void }) {
  const [page, setPage] = useState(0)

  const pages = [
    {
      title: '🗺 フローマスタ 登録手順ガイド',
      content: (
        <div>
          <p style={{ color: '#7f8c8d', marginBottom: '1.5rem' }}>
            フローマスタは以下の順序で登録してください。依存関係があるため順番が重要です。
          </p>
          {[
            { step: 1, tab: '📈 業務フロー設定 › ノード管理', color: '#3498db',
              desc: '業務フローのノード（箱）を登録します。工程ID・ノードID・ラベルを設定します。',
              example: '工程ID: STEP_ESTIMATE / ノードID: EST01 / ラベル: 見積登録' },
            { step: 2, tab: '📈 業務フロー設定 › 接続管理', color: '#2980b9',
              desc: 'ノード同士の接続（矢印）を登録します。ノード管理の登録が先に必要です。',
              example: '接続元: EST01 / 接続先: ORD01 / 種別: normal' },
            { step: 3, tab: '🔧 システムフロー設定', color: '#8e44ad',
              desc: 'システムフローの工程（業務区分ごとのステップ）を登録します。業務マスタが先に必要です。',
              example: '工程ID: SYS_ESTIMATE / 業務区分: 見積 / 表示順: 10' },
            { step: 4, tab: '❓ 質問紐づけ', color: '#16a085',
              desc: '質問の回答とフロー工程を紐づけます。質問マスタ・ノード管理の両方が先に必要です。',
              example: '業務: 見積 / Q1 / 回答: ○ → 工程ID: STEP_ESTIMATE（業務フロー）' },
            { step: 5, tab: '💻 プログラム紐づけ', color: '#e67e22',
              desc: 'フロー工程とプログラムを紐づけます。システムフロー設定・プログラムマスタが先に必要です。',
              example: '工程ID: SYS_ESTIMATE → P001（見積登録）' },
          ].map(({ step, tab, color, desc, example }) => (
            <div key={step} style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', backgroundColor: '#f8f9fa', borderRadius: '8px', padding: '0.75rem', borderLeft: `4px solid ${color}` }}>
              <div style={{ minWidth: '2rem', height: '2rem', borderRadius: '50%', backgroundColor: color, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', flexShrink: 0 }}>{step}</div>
              <div>
                <div style={{ fontWeight: 'bold', color, marginBottom: '0.25rem' }}>{tab}</div>
                <div style={{ fontSize: '0.9rem', color: '#2c3e50', marginBottom: '0.25rem' }}>{desc}</div>
                <div style={{ fontSize: '0.8rem', color: '#7f8c8d', fontFamily: 'monospace', backgroundColor: 'white', padding: '0.25rem 0.5rem', borderRadius: '4px' }}>例: {example}</div>
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '🔷 業務フロー設定 — 項目説明',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ backgroundColor: '#ebf5fb', padding: '1rem', borderRadius: '8px' }}>
            <strong style={{ color: '#2980b9' }}>ノード管理 — 主な項目</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <tbody>
                {[
                  ['工程ID', 'stepId', '同じ工程に属するノードをグループ化するID', 'STEP_ESTIMATE'],
                  ['ノードID', 'nodeId', 'Mermaid図上のユニークID（英数字のみ）', 'EST01'],
                  ['ノードラベル', 'nodeLabel', 'フロー図に表示するテキスト', '見積登録'],
                  ['Mermaidスタイル', 'mermaidStyle', 'step / active / inactive / custom', 'step'],
                  ['表示順', 'displayOrder', '数字が小さいほど先に表示', '10'],
                ].map(([name, key, desc, ex]) => (
                  <tr key={key} style={{ borderBottom: '1px solid #d6eaf8' }}>
                    <td style={{ padding: '0.4rem', fontWeight: 'bold', width: '110px' }}>{name}</td>
                    <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#2980b9', width: '130px' }}>{key}</td>
                    <td style={{ padding: '0.4rem', color: '#555' }}>{desc}　<span style={{ color: '#95a5a6' }}>例: {ex}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ backgroundColor: '#eaf4fb', padding: '1rem', borderRadius: '8px' }}>
            <strong style={{ color: '#2980b9' }}>接続管理 — 主な項目</strong>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.75rem', fontSize: '0.85rem' }}>
              <tbody>
                {[
                  ['接続元ノードID', 'fromNodeId', '矢印の始点（ノードIDを使用）', 'EST01'],
                  ['接続先ノードID', 'toNodeId', '矢印の終点（ノードIDを使用）', 'ORD01'],
                  ['接続種別', 'connectionType', 'normal（実線）/ dotted（点線）/ conditional（条件）', 'normal'],
                  ['条件ラベル', 'conditionLabel', '矢印に表示するテキスト（任意）', '承認時'],
                ].map(([name, key, desc, ex]) => (
                  <tr key={key} style={{ borderBottom: '1px solid #d6eaf8' }}>
                    <td style={{ padding: '0.4rem', fontWeight: 'bold', width: '110px' }}>{name}</td>
                    <td style={{ padding: '0.4rem', fontFamily: 'monospace', color: '#2980b9', width: '130px' }}>{key}</td>
                    <td style={{ padding: '0.4rem', color: '#555' }}>{desc}　<span style={{ color: '#95a5a6' }}>例: {ex}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ),
    },
    {
      title: '🔧 システムフロー / ❓ 質問紐づけ / 💻 プログラム紐づけ — 項目説明',
      content: (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {[
            { title: 'システムフロー設定', color: '#8e44ad', rows: [
              ['工程ID', 'stepId', 'SYS_XXX 形式を推奨', 'SYS_ESTIMATE'],
              ['業務区分', 'businessType', '業務マスタに登録済みの業務名を使用', '見積'],
              ['サブグラフ', 'isSubgraph', 'true にするとMermaid図でグループ表示', 'true'],
            ]},
            { title: '質問紐づけ', color: '#16a085', rows: [
              ['業務区分', 'businessType', '質問マスタの業務区分と一致させる', '見積'],
              ['質問No', 'questionNo', '質問マスタのQuestionNoと一致させる', 'Q1'],
              ['回答条件', 'answerCondition', 'yesno型: ○ or ×　choice型: 選択肢テキスト', '○'],
              ['フロー種別', 'flowType', 'business（業務フロー）or system（システムフロー）', 'business'],
              ['フロー工程ID', 'flowStepId', '業務/システムフロー設定で登録した工程ID', 'STEP_ESTIMATE'],
            ]},
            { title: 'プログラム紐づけ', color: '#e67e22', rows: [
              ['フロー工程ID', 'flowStepId', 'システムフロー設定で登録した工程ID', 'SYS_ESTIMATE'],
              ['プログラムID', 'programId', 'プログラムマスタのIDを使用', 'P001'],
              ['表示順', 'displayOrder', '同じ工程内でのプログラムの表示順', '10'],
            ]},
          ].map(({ title, color, rows }) => (
            <div key={title} style={{ backgroundColor: '#f8f9fa', padding: '0.75rem', borderRadius: '8px', borderLeft: `4px solid ${color}` }}>
              <strong style={{ color }}>{title}</strong>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '0.5rem', fontSize: '0.85rem' }}>
                <tbody>
                  {rows.map(([name, key, desc, ex]) => (
                    <tr key={key} style={{ borderBottom: '1px solid #ecf0f1' }}>
                      <td style={{ padding: '0.3rem', fontWeight: 'bold', width: '100px' }}>{name}</td>
                      <td style={{ padding: '0.3rem', fontFamily: 'monospace', color, width: '130px' }}>{key}</td>
                      <td style={{ padding: '0.3rem', color: '#555' }}>{desc}　<span style={{ color: '#95a5a6' }}>例: {ex}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.6)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 2000 }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', width: '820px', maxWidth: '95vw', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 4px 30px rgba(0,0,0,0.4)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, color: '#2c3e50' }}>{pages[page].title}</h2>
          <button onClick={onClose} style={btnStyle('#95a5a6')}>✕ 閉じる</button>
        </div>
        {pages[page].content}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid #ecf0f1' }}>
          <button onClick={() => setPage(p => p - 1)} disabled={page === 0} style={btnStyle('#95a5a6', page === 0)}>← 前へ</button>
          <span style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>{page + 1} / {pages.length}</span>
          <button onClick={() => setPage(p => p + 1)} disabled={page === pages.length - 1} style={btnStyle('#3498db', page === pages.length - 1)}>次へ →</button>
        </div>
      </div>
    </div>
  )
}

// ─── CSVインポートモーダル ─────────────────────────────────────────
function ImportModal({ onClose, onImport, templateHeaders, templateSample }: {
  onClose: () => void
  onImport: (rows: string[][]) => Promise<void>
  templateHeaders: string[]
  templateSample: string[]
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [status, setStatus] = useState('')

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return
    const reader = new FileReader()
    reader.onload = async ev => {
      try {
        setStatus('インポート中...')
        const rows = parseCsv(ev.target?.result as string)
        await onImport(rows)
        setStatus(`✅ ${rows.length}件インポート完了`)
        setTimeout(onClose, 1200)
      } catch { setStatus('❌ インポートに失敗しました') }
    }
    reader.readAsText(file, 'UTF-8')
    e.target.value = ''
  }

  return (
    <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1100 }}>
      <div style={{ backgroundColor: 'white', borderRadius: '8px', padding: '2rem', width: '460px', maxWidth: '95vw', boxShadow: '0 4px 20px rgba(0,0,0,0.3)' }}>
        <h3 style={{ marginTop: 0 }}>CSVインポート</h3>
        <p style={{ color: '#7f8c8d', fontSize: '0.9rem' }}>まず雛形をダウンロードしてデータを入力し、インポートしてください。</p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          <button style={btnStyle('#95a5a6')} onClick={() => downloadCsv('template.csv', [templateSample], templateHeaders)}>
            📥 雛形CSVダウンロード
          </button>
          <label style={{ ...btnStyle('#27ae60'), display: 'block', textAlign: 'center', cursor: 'pointer' }}>
            📤 CSVファイルを選択してインポート
            <input ref={fileRef} type="file" accept=".csv" onChange={handleImport} style={{ display: 'none' }} />
          </label>
          {status && <p style={{ margin: 0, padding: '0.5rem', backgroundColor: '#f8f9fa', borderRadius: '4px', fontSize: '0.9rem' }}>{status}</p>}
        </div>
        <button style={{ ...btnStyle('#95a5a6'), marginTop: '1rem', width: '100%' }} onClick={onClose}>閉じる</button>
      </div>
    </div>
  )
}

// ─── ツールバー ───────────────────────────────────────────────────
function BulkToolbar({ selectedCount, onBulkDelete, onExport, onImportOpen, onAdd, addLabel }: {
  selectedCount: number; onBulkDelete: () => void
  onExport: () => void; onImportOpen: () => void
  onAdd: () => void; addLabel: string
}) {
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
      <button style={btnStyle('#e74c3c', selectedCount === 0)} disabled={selectedCount === 0} onClick={onBulkDelete}>
        🗑 選択削除{selectedCount > 0 ? `（${selectedCount}件）` : ''}
      </button>
      <button style={btnStyle('#27ae60')} onClick={onExport}>📥 CSVエクスポート</button>
      <button style={btnStyle('#f39c12')} onClick={onImportOpen}>📤 CSVインポート</button>
      <div style={{ flex: 1 }} />
      <button style={btnStyle('#3498db')} onClick={onAdd}>{addLabel}</button>
    </div>
  )
}

// ===================================================================
// 1. 業務フロー設定
// ===================================================================
function BusinessFlowSettings() {
  const [subTab, setSubTab] = useState<'nodes' | 'connections'>('nodes')
  const [steps, setSteps] = useState<BusinessFlowStep[]>([])
  const [connections, setConnections] = useState<FlowConnection[]>([])
  const [loading, setLoading] = useState(false)
  const [selNodes, setSelNodes] = useState<number[]>([])
  const [selConns, setSelConns] = useState<number[]>([])
  const [showImport, setShowImport] = useState<'nodes' | 'connections' | null>(null)

  const [showNodeModal, setShowNodeModal] = useState(false)
  const [editingNode, setEditingNode] = useState<BusinessFlowStep | null>(null)
  const emptyNode = { stepId: '', stepName: '', nodeId: '', nodeLabel: '', nodeType: 'process', displayOrder: 0, parentNodeId: '', connectionType: 'normal', mermaidStyle: 'step', isActive: true }
  const [nodeForm, setNodeForm] = useState(emptyNode)

  const [showConnModal, setShowConnModal] = useState(false)
  const [editingConn, setEditingConn] = useState<FlowConnection | null>(null)
  const emptyConn = { fromNodeId: '', toNodeId: '', connectionType: 'normal', conditionLabel: '', displayOrder: 0, isActive: true }
  const [connForm, setConnForm] = useState(emptyConn)

  useEffect(() => { loadAll() }, [])
  const loadAll = async () => {
    setLoading(true)
    try {
      const [sr, cr] = await Promise.all([businessFlowStepsApi.getAll(), flowConnectionsApi.getAll()])
      setSteps(sr.data); setConnections(cr.data)
    } catch { alert('読み込みエラー') } finally { setLoading(false) }
  }

  // ノード CRUD
  const openAddNode = () => { setEditingNode(null); setNodeForm(emptyNode); setShowNodeModal(true) }
  const openEditNode = (s: BusinessFlowStep) => {
    setEditingNode(s)
    setNodeForm({ stepId: s.stepId, stepName: s.stepName, nodeId: s.nodeId, nodeLabel: s.nodeLabel, nodeType: s.nodeType, displayOrder: s.displayOrder, parentNodeId: s.parentNodeId ?? '', connectionType: s.connectionType ?? 'normal', mermaidStyle: s.mermaidStyle ?? 'step', isActive: s.isActive })
    setShowNodeModal(true)
  }
  const saveNode = async () => {
    try {
      if (editingNode?.id) await businessFlowStepsApi.update(editingNode.id, { ...editingNode, ...nodeForm })
      else await businessFlowStepsApi.create(nodeForm)
      setShowNodeModal(false); await loadAll()
    } catch { alert('保存に失敗しました') }
  }
  const deleteNode = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await businessFlowStepsApi.delete(id); setSelNodes(p => p.filter(x => x !== id)); await loadAll() } catch { alert('削除に失敗しました') }
  }
  const bulkDeleteNodes = async () => {
    if (!confirm(`${selNodes.length}件を削除しますか？`)) return
    try { for (const id of selNodes) await businessFlowStepsApi.delete(id); setSelNodes([]); await loadAll() } catch { alert('削除に失敗しました') }
  }
  const exportNodes = () => downloadCsv('業務フローノード.csv',
    steps.map(s => [s.stepId, s.stepName, s.nodeId, s.nodeLabel, s.nodeType, String(s.displayOrder), s.parentNodeId ?? '', s.connectionType ?? '', s.mermaidStyle ?? '', String(s.isActive)]),
    ['工程ID', '工程名', 'ノードID', 'ノードラベル', 'ノード種別', '表示順', '親ノードID', '接続種別', 'Mermaidスタイル', '有効']
  )
  const importNodes = async (rows: string[][]) => {
    for (const r of rows) {
      if (r.length < 4) continue
      await businessFlowStepsApi.create({ stepId: r[0], stepName: r[1], nodeId: r[2], nodeLabel: r[3], nodeType: r[4] || 'process', displayOrder: Number(r[5]) || 0, parentNodeId: r[6] || '', connectionType: r[7] || 'normal', mermaidStyle: r[8] || 'step', isActive: r[9] !== 'false' })
    }
    await loadAll()
  }

  // 接続 CRUD
  const openAddConn = () => { setEditingConn(null); setConnForm(emptyConn); setShowConnModal(true) }
  const openEditConn = (c: FlowConnection) => {
    setEditingConn(c)
    setConnForm({ fromNodeId: c.fromNodeId, toNodeId: c.toNodeId, connectionType: c.connectionType, conditionLabel: c.conditionLabel ?? '', displayOrder: c.displayOrder, isActive: c.isActive })
    setShowConnModal(true)
  }
  const saveConn = async () => {
    try {
      if (editingConn?.id) await flowConnectionsApi.update(editingConn.id, { ...editingConn, ...connForm })
      else await flowConnectionsApi.create(connForm)
      setShowConnModal(false); await loadAll()
    } catch { alert('保存に失敗しました') }
  }
  const deleteConn = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await flowConnectionsApi.delete(id); setSelConns(p => p.filter(x => x !== id)); await loadAll() } catch { alert('削除に失敗しました') }
  }
  const bulkDeleteConns = async () => {
    if (!confirm(`${selConns.length}件を削除しますか？`)) return
    try { for (const id of selConns) await flowConnectionsApi.delete(id); setSelConns([]); await loadAll() } catch { alert('削除に失敗しました') }
  }
  const exportConns = () => downloadCsv('業務フロー接続.csv',
    connections.map(c => [c.fromNodeId, c.toNodeId, c.connectionType, c.conditionLabel ?? '', String(c.displayOrder), String(c.isActive)]),
    ['接続元ノードID', '接続先ノードID', '接続種別', '条件ラベル', '表示順', '有効']
  )
  const importConns = async (rows: string[][]) => {
    for (const r of rows) {
      if (r.length < 2) continue
      await flowConnectionsApi.create({ fromNodeId: r[0], toNodeId: r[1], connectionType: r[2] || 'normal', conditionLabel: r[3] || '', displayOrder: Number(r[4]) || 0, isActive: r[5] !== 'false' })
    }
    await loadAll()
  }

  if (loading) return <p style={{ color: '#7f8c8d' }}>読み込み中...</p>

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['nodes', 'connections'] as const).map(t => (
          <button key={t} onClick={() => setSubTab(t)} style={{ padding: '0.5rem 1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: subTab === t ? '#2c3e50' : '#ecf0f1', color: subTab === t ? 'white' : '#2c3e50', fontWeight: 'bold' }}>
            {t === 'nodes' ? '🔷 ノード管理' : '🔗 接続管理'}
          </button>
        ))}
      </div>

      {subTab === 'nodes' && (
        <>
          <div style={{ marginBottom: '0.5rem' }}><h3 style={{ margin: 0 }}>業務フローノード（{steps.length}件）</h3></div>
          <BulkToolbar selectedCount={selNodes.length} onBulkDelete={bulkDeleteNodes} onExport={exportNodes} onImportOpen={() => setShowImport('nodes')} onAdd={openAddNode} addLabel="＋ ノード追加" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead><tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ ...thStyle, width: '40px' }}>
                <input type="checkbox" checked={steps.length > 0 && selNodes.length === steps.length} onChange={e => setSelNodes(e.target.checked ? steps.map(s => s.id!) : [])} />
              </th>
              {['工程ID / 工程名', 'ノードID', 'ノードラベル', '種別', '順', 'スタイル', '有効', '操作'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {steps.map((s, i) => (
                <tr key={s.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><input type="checkbox" checked={selNodes.includes(s.id!)} onChange={() => setSelNodes(p => p.includes(s.id!) ? p.filter(x => x !== s.id) : [...p, s.id!])} /></td>
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
        </>
      )}

      {subTab === 'connections' && (
        <>
          <div style={{ marginBottom: '0.5rem' }}><h3 style={{ margin: 0 }}>フロー接続（{connections.length}件）</h3></div>
          <BulkToolbar selectedCount={selConns.length} onBulkDelete={bulkDeleteConns} onExport={exportConns} onImportOpen={() => setShowImport('connections')} onAdd={openAddConn} addLabel="＋ 接続追加" />
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead><tr style={{ backgroundColor: '#2c3e50', color: 'white' }}>
              <th style={{ ...thStyle, width: '40px' }}>
                <input type="checkbox" checked={connections.length > 0 && selConns.length === connections.length} onChange={e => setSelConns(e.target.checked ? connections.map(c => c.id!) : [])} />
              </th>
              {['接続元', '接続先', '種別', '条件ラベル', '順', '有効', '操作'].map(h => <th key={h} style={thStyle}>{h}</th>)}
            </tr></thead>
            <tbody>
              {connections.map((c, i) => (
                <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
                  <td style={{ ...tdStyle, textAlign: 'center' }}><input type="checkbox" checked={selConns.includes(c.id!)} onChange={() => setSelConns(p => p.includes(c.id!) ? p.filter(x => x !== c.id) : [...p, c.id!])} /></td>
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
        </>
      )}

      {showNodeModal && (
        <Modal title={editingNode ? 'ノード編集' : 'ノード追加'} onClose={() => setShowNodeModal(false)} onSave={saveNode}>
          <FormRow label="工程ID"><input style={inputStyle} value={nodeForm.stepId} onChange={e => setNodeForm({ ...nodeForm, stepId: e.target.value })} placeholder="STEP_ESTIMATE" /></FormRow>
          <FormRow label="工程名"><input style={inputStyle} value={nodeForm.stepName} onChange={e => setNodeForm({ ...nodeForm, stepName: e.target.value })} placeholder="見積" /></FormRow>
          <FormRow label="ノードID（英数字のみ）"><input style={inputStyle} value={nodeForm.nodeId} onChange={e => setNodeForm({ ...nodeForm, nodeId: e.target.value })} placeholder="EST01" /></FormRow>
          <FormRow label="ノードラベル"><input style={inputStyle} value={nodeForm.nodeLabel} onChange={e => setNodeForm({ ...nodeForm, nodeLabel: e.target.value })} placeholder="見積登録" /></FormRow>
          <FormRow label="ノード種別">
            <select style={inputStyle} value={nodeForm.nodeType} onChange={e => setNodeForm({ ...nodeForm, nodeType: e.target.value })}>
              {['process', 'start', 'end', 'decision', 'io'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="Mermaidスタイルクラス">
            <select style={inputStyle} value={nodeForm.mermaidStyle ?? 'step'} onChange={e => setNodeForm({ ...nodeForm, mermaidStyle: e.target.value })}>
              {['step', 'active', 'inactive', 'custom', 'logistics_op'].map(t => <option key={t} value={t}>{t}</option>)}
            </select>
          </FormRow>
          <FormRow label="接続種別">
            <select style={inputStyle} value={nodeForm.connectionType} onChange={e => setNodeForm({ ...nodeForm, connectionType: e.target.value })}>
              <option value="normal">normal（実線）</option>
              <option value="dotted">dotted（点線）</option>
              <option value="conditional">conditional（条件）</option>
            </select>
          </FormRow>
          <FormRow label="親ノードID（任意）"><input style={inputStyle} value={nodeForm.parentNodeId ?? ''} onChange={e => setNodeForm({ ...nodeForm, parentNodeId: e.target.value })} /></FormRow>
          <FormRow label="表示順"><input style={inputStyle} type="number" value={nodeForm.displayOrder} onChange={e => setNodeForm({ ...nodeForm, displayOrder: Number(e.target.value) })} /></FormRow>
          <FormRow label="有効"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={nodeForm.isActive} onChange={e => setNodeForm({ ...nodeForm, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />有効にする</label></FormRow>
        </Modal>
      )}
      {showConnModal && (
        <Modal title={editingConn ? '接続編集' : '接続追加'} onClose={() => setShowConnModal(false)} onSave={saveConn}>
          <FormRow label="接続元ノードID"><input style={inputStyle} value={connForm.fromNodeId} onChange={e => setConnForm({ ...connForm, fromNodeId: e.target.value })} placeholder="EST01" /></FormRow>
          <FormRow label="接続先ノードID"><input style={inputStyle} value={connForm.toNodeId} onChange={e => setConnForm({ ...connForm, toNodeId: e.target.value })} placeholder="ORD01" /></FormRow>
          <FormRow label="接続種別">
            <select style={inputStyle} value={connForm.connectionType} onChange={e => setConnForm({ ...connForm, connectionType: e.target.value })}>
              <option value="normal">normal（実線矢印）</option>
              <option value="dotted">dotted（点線）</option>
              <option value="conditional">conditional（条件分岐）</option>
            </select>
          </FormRow>
          <FormRow label="条件ラベル（任意）"><input style={inputStyle} value={connForm.conditionLabel ?? ''} onChange={e => setConnForm({ ...connForm, conditionLabel: e.target.value })} placeholder="承認時" /></FormRow>
          <FormRow label="表示順"><input style={inputStyle} type="number" value={connForm.displayOrder} onChange={e => setConnForm({ ...connForm, displayOrder: Number(e.target.value) })} /></FormRow>
          <FormRow label="有効"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={connForm.isActive} onChange={e => setConnForm({ ...connForm, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />有効にする</label></FormRow>
        </Modal>
      )}
      {showImport === 'nodes' && (
        <ImportModal onClose={() => setShowImport(null)} onImport={importNodes}
          templateHeaders={['工程ID', '工程名', 'ノードID', 'ノードラベル', 'ノード種別', '表示順', '親ノードID', '接続種別', 'Mermaidスタイル', '有効']}
          templateSample={['STEP_ESTIMATE', '見積', 'EST01', '見積登録', 'process', '10', '', 'normal', 'step', 'true']} />
      )}
      {showImport === 'connections' && (
        <ImportModal onClose={() => setShowImport(null)} onImport={importConns}
          templateHeaders={['接続元ノードID', '接続先ノードID', '接続種別', '条件ラベル', '表示順', '有効']}
          templateSample={['EST01', 'ORD01', 'normal', '', '10', 'true']} />
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
  const [selIds, setSelIds] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<SystemFlowStep | null>(null)
  const empty = { stepId: '', stepName: '', businessType: '', displayOrder: 0, isSubgraph: false, subgraphLabel: '', isActive: true }
  const [form, setForm] = useState(empty)

  useEffect(() => { load() }, [])
  const load = async () => { setLoading(true); try { const r = await systemFlowStepsApi.getAll(); setSteps(r.data) } catch { alert('読み込みエラー') } finally { setLoading(false) } }

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (s: SystemFlowStep) => { setEditing(s); setForm({ stepId: s.stepId, stepName: s.stepName, businessType: s.businessType, displayOrder: s.displayOrder, isSubgraph: s.isSubgraph, subgraphLabel: s.subgraphLabel ?? '', isActive: s.isActive }); setShowModal(true) }
  const save = async () => {
    try {
      if (editing?.id) await systemFlowStepsApi.update(editing.id, { ...editing, ...form })
      else await systemFlowStepsApi.create(form)
      setShowModal(false); await load()
    } catch { alert('保存に失敗しました') }
  }
  const del = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await systemFlowStepsApi.delete(id); setSelIds(p => p.filter(x => x !== id)); await load() } catch { alert('削除に失敗しました') }
  }
  const bulkDelete = async () => {
    if (!confirm(`${selIds.length}件を削除しますか？`)) return
    try { for (const id of selIds) await systemFlowStepsApi.delete(id); setSelIds([]); await load() } catch { alert('削除に失敗しました') }
  }
  const exportCsv = () => downloadCsv('システムフロー工程.csv',
    steps.map(s => [s.stepId, s.stepName, s.businessType, String(s.displayOrder), String(s.isSubgraph), s.subgraphLabel ?? '', String(s.isActive)]),
    ['工程ID', '工程名', '業務区分', '表示順', 'サブグラフ', 'サブグラフラベル', '有効']
  )
  const importCsv = async (rows: string[][]) => {
    for (const r of rows) {
      if (r.length < 3) continue
      await systemFlowStepsApi.create({ stepId: r[0], stepName: r[1], businessType: r[2], displayOrder: Number(r[3]) || 0, isSubgraph: r[4] === 'true', subgraphLabel: r[5] || '', isActive: r[6] !== 'false' })
    }
    await load()
  }

  if (loading) return <p style={{ color: '#7f8c8d' }}>読み込み中...</p>
  return (
    <div>
      <div style={{ marginBottom: '0.5rem' }}><h3 style={{ margin: 0 }}>システムフロー工程（{steps.length}件）</h3></div>
      <BulkToolbar selectedCount={selIds.length} onBulkDelete={bulkDelete} onExport={exportCsv} onImportOpen={() => setShowImport(true)} onAdd={openAdd} addLabel="＋ 工程追加" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead><tr style={{ backgroundColor: '#8e44ad', color: 'white' }}>
          <th style={{ ...thStyle, width: '40px' }}>
            <input type="checkbox" checked={steps.length > 0 && selIds.length === steps.length} onChange={e => setSelIds(e.target.checked ? steps.map(s => s.id!) : [])} />
          </th>
          {['工程ID', '工程名', '業務区分', '順', 'サブグラフ', '有効', '操作'].map(h => <th key={h} style={thStyle}>{h}</th>)}
        </tr></thead>
        <tbody>
          {steps.map((s, i) => (
            <tr key={s.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ ...tdStyle, textAlign: 'center' }}><input type="checkbox" checked={selIds.includes(s.id!)} onChange={() => setSelIds(p => p.includes(s.id!) ? p.filter(x => x !== s.id) : [...p, s.id!])} /></td>
              <td style={tdStyle}><strong>{s.stepId}</strong></td>
              <td style={tdStyle}>{s.stepName}</td>
              <td style={tdStyle}><span style={{ backgroundColor: '#f5eef8', padding: '0.2rem 0.5rem', borderRadius: '3px', fontSize: '0.85rem' }}>{s.businessType}</span></td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.displayOrder}</td>
              <td style={{ ...tdStyle, textAlign: 'center' }}>{s.isSubgraph ? `✅ ${s.subgraphLabel || ''}` : '—'}</td>
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
          <FormRow label="工程ID"><input style={inputStyle} value={form.stepId} onChange={e => setForm({ ...form, stepId: e.target.value })} placeholder="SYS_ESTIMATE" /></FormRow>
          <FormRow label="工程名"><input style={inputStyle} value={form.stepName} onChange={e => setForm({ ...form, stepName: e.target.value })} placeholder="見積処理" /></FormRow>
          <FormRow label="業務区分">
            <select style={inputStyle} value={form.businessType} onChange={e => setForm({ ...form, businessType: e.target.value })}>
              <option value="">-- 選択 --</option>
              {businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
            </select>
          </FormRow>
          <FormRow label="表示順"><input style={inputStyle} type="number" value={form.displayOrder} onChange={e => setForm({ ...form, displayOrder: Number(e.target.value) })} /></FormRow>
          <FormRow label="サブグラフ"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={form.isSubgraph} onChange={e => setForm({ ...form, isSubgraph: e.target.checked })} style={{ marginRight: '0.5rem' }} />サブグラフとして表示</label></FormRow>
          {form.isSubgraph && <FormRow label="サブグラフラベル"><input style={inputStyle} value={form.subgraphLabel ?? ''} onChange={e => setForm({ ...form, subgraphLabel: e.target.value })} placeholder="見積業務" /></FormRow>}
          <FormRow label="有効"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />有効にする</label></FormRow>
        </Modal>
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImport={importCsv}
          templateHeaders={['工程ID', '工程名', '業務区分', '表示順', 'サブグラフ', 'サブグラフラベル', '有効']}
          templateSample={['SYS_ESTIMATE', '見積処理', '見積', '10', 'true', '見積業務', 'true']} />
      )}
    </div>
  )
}

// ===================================================================
// 3. 質問紐づけ
// ===================================================================
function QuestionMappingSettings({ businesses, questions, businessFlowSteps, systemFlowSteps }: {
  businesses: Business[]; questions: Question[]
  businessFlowSteps: BusinessFlowStep[]; systemFlowSteps: SystemFlowStep[]
}) {
  const [mappings, setMappings] = useState<FlowQuestionMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [selIds, setSelIds] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<FlowQuestionMapping | null>(null)
  const [filterBiz, setFilterBiz] = useState('')
  const empty = { businessType: '', questionNo: '', answerCondition: '', flowStepId: '', flowType: 'business', priority: 0, isActive: true }
  const [form, setForm] = useState(empty)

  useEffect(() => { load() }, [])
  const load = async () => { setLoading(true); try { const r = await flowQuestionMappingsApi.getAll(); setMappings(r.data) } catch { alert('読み込みエラー') } finally { setLoading(false) } }

  const filteredQuestions = questions.filter(q => q.businessType === form.businessType)
  const selectedQuestion = questions.find(q => q.businessType === form.businessType && q.questionNo === form.questionNo)
  const answerOptions = selectedQuestion ? (selectedQuestion.type === 'yesno' ? ['○', '×'] : selectedQuestion.choices ?? []) : []
  const stepOptions = form.flowType === 'business'
    ? [...new Set(businessFlowSteps.map(s => s.stepId))].sort()
    : [...new Set(systemFlowSteps.map(s => s.stepId))].sort()

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (m: FlowQuestionMapping) => { setEditing(m); setForm({ businessType: m.businessType, questionNo: m.questionNo, answerCondition: m.answerCondition, flowStepId: m.flowStepId, flowType: m.flowType, priority: m.priority, isActive: m.isActive }); setShowModal(true) }
  const save = async () => {
    try {
      if (editing?.id) await flowQuestionMappingsApi.update(editing.id, { ...editing, ...form })
      else await flowQuestionMappingsApi.create(form)
      setShowModal(false); await load()
    } catch { alert('保存に失敗しました') }
  }
  const del = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await flowQuestionMappingsApi.delete(id); setSelIds(p => p.filter(x => x !== id)); await load() } catch { alert('削除に失敗しました') }
  }
  const bulkDelete = async () => {
    if (!confirm(`${selIds.length}件を削除しますか？`)) return
    try { for (const id of selIds) await flowQuestionMappingsApi.delete(id); setSelIds([]); await load() } catch { alert('削除に失敗しました') }
  }
  const exportCsv = () => downloadCsv('質問紐づけ.csv',
    mappings.map(m => [m.businessType, m.questionNo, m.answerCondition, m.flowStepId, m.flowType, String(m.priority), String(m.isActive)]),
    ['業務区分', '質問No', '回答条件', 'フロー工程ID', 'フロー種別', '優先度', '有効']
  )
  const importCsv = async (rows: string[][]) => {
    for (const r of rows) {
      if (r.length < 5) continue
      await flowQuestionMappingsApi.create({ businessType: r[0], questionNo: r[1], answerCondition: r[2], flowStepId: r[3], flowType: r[4] || 'business', priority: Number(r[5]) || 0, isActive: r[6] !== 'false' })
    }
    await load()
  }
  const displayed = filterBiz ? mappings.filter(m => m.businessType === filterBiz) : mappings

  if (loading) return <p style={{ color: '#7f8c8d' }}>読み込み中...</p>
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>質問紐づけ（{displayed.length}件）</h3>
        <select value={filterBiz} onChange={e => setFilterBiz(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">全業務</option>
          {businesses.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
        </select>
      </div>
      <BulkToolbar selectedCount={selIds.length} onBulkDelete={bulkDelete} onExport={exportCsv} onImportOpen={() => setShowImport(true)} onAdd={openAdd} addLabel="＋ 紐づけ追加" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead><tr style={{ backgroundColor: '#16a085', color: 'white' }}>
          <th style={{ ...thStyle, width: '40px' }}>
            <input type="checkbox" checked={displayed.length > 0 && selIds.length === displayed.length} onChange={e => setSelIds(e.target.checked ? displayed.map(m => m.id!) : [])} />
          </th>
          {['業務区分', '質問No', '回答条件', 'フロー種別', 'フロー工程ID', '優先', '有効', '操作'].map(h => <th key={h} style={thStyle}>{h}</th>)}
        </tr></thead>
        <tbody>
          {displayed.map((m, i) => (
            <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ ...tdStyle, textAlign: 'center' }}><input type="checkbox" checked={selIds.includes(m.id!)} onChange={() => setSelIds(p => p.includes(m.id!) ? p.filter(x => x !== m.id) : [...p, m.id!])} /></td>
              <td style={tdStyle}><span style={{ backgroundColor: '#e8f8f5', padding: '0.2rem 0.5rem', borderRadius: '3px' }}>{m.businessType}</span></td>
              <td style={tdStyle}>{m.questionNo}</td>
              <td style={tdStyle}><strong>{m.answerCondition}</strong></td>
              <td style={tdStyle}><span style={{ color: m.flowType === 'business' ? '#2980b9' : '#8e44ad' }}>{m.flowType === 'business' ? '業務' : 'システム'}</span></td>
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
              {filteredQuestions.map(q => <option key={q.id} value={q.questionNo}>{q.questionNo}: {(q.text ?? '').slice(0, 40)}</option>)}
            </select>
            {form.businessType && filteredQuestions.length === 0 && (
              <small style={{ color: '#e74c3c' }}>⚠ この業務の質問が見つかりません。質問マスタを確認してください。</small>
            )}
          </FormRow>
          <FormRow label="回答条件">
            {answerOptions.length > 0
              ? <select style={inputStyle} value={form.answerCondition} onChange={e => setForm({ ...form, answerCondition: e.target.value })}>
                  <option value="">-- 選択 --</option>
                  {answerOptions.map(a => <option key={a} value={a}>{a}</option>)}
                </select>
              : <input style={inputStyle} value={form.answerCondition} onChange={e => setForm({ ...form, answerCondition: e.target.value })} placeholder="○ / × / 1 / 2" />
            }
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
            {stepOptions.length === 0 && <small style={{ color: '#e74c3c' }}>⚠ 工程が未登録です。先に業務/システムフロー設定を行ってください。</small>}
          </FormRow>
          <FormRow label="優先度"><input style={inputStyle} type="number" value={form.priority} onChange={e => setForm({ ...form, priority: Number(e.target.value) })} /></FormRow>
          <FormRow label="有効"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />有効にする</label></FormRow>
        </Modal>
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImport={importCsv}
          templateHeaders={['業務区分', '質問No', '回答条件', 'フロー工程ID', 'フロー種別', '優先度', '有効']}
          templateSample={['見積', 'Q1', '○', 'STEP_ESTIMATE', 'business', '0', 'true']} />
      )}
    </div>
  )
}

// ===================================================================
// 4. プログラム紐づけ
// ===================================================================
function ProgramMappingSettings({ programs, businessFlowSteps, systemFlowSteps }: {
  programs: Program[]; businessFlowSteps: BusinessFlowStep[]; systemFlowSteps: SystemFlowStep[]
}) {
  const [mappings, setMappings] = useState<FlowProgramMapping[]>([])
  const [loading, setLoading] = useState(false)
  const [selIds, setSelIds] = useState<number[]>([])
  const [showModal, setShowModal] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editing, setEditing] = useState<FlowProgramMapping | null>(null)
  const [filterStep, setFilterStep] = useState('')
  const empty = { flowStepId: '', programId: '', displayOrder: 0, isRequired: true, isActive: true }
  const [form, setForm] = useState(empty)

  const allStepIds = [...new Set([...businessFlowSteps.map(s => s.stepId), ...systemFlowSteps.map(s => s.stepId)])].sort()
  useEffect(() => { load() }, [])
  const load = async () => { setLoading(true); try { const r = await flowProgramMappingsApi.getAll(); setMappings(r.data) } catch { alert('読み込みエラー') } finally { setLoading(false) } }

  const openAdd = () => { setEditing(null); setForm(empty); setShowModal(true) }
  const openEdit = (m: FlowProgramMapping) => { setEditing(m); setForm({ flowStepId: m.flowStepId, programId: m.programId, displayOrder: m.displayOrder, isRequired: m.isRequired, isActive: m.isActive }); setShowModal(true) }
  const save = async () => {
    try {
      if (editing?.id) await flowProgramMappingsApi.update(editing.id, { ...editing, ...form })
      else await flowProgramMappingsApi.create(form)
      setShowModal(false); await load()
    } catch { alert('保存に失敗しました') }
  }
  const del = async (id: number) => {
    if (!confirm('削除しますか？')) return
    try { await flowProgramMappingsApi.delete(id); setSelIds(p => p.filter(x => x !== id)); await load() } catch { alert('削除に失敗しました') }
  }
  const bulkDelete = async () => {
    if (!confirm(`${selIds.length}件を削除しますか？`)) return
    try { for (const id of selIds) await flowProgramMappingsApi.delete(id); setSelIds([]); await load() } catch { alert('削除に失敗しました') }
  }
  const exportCsv = () => downloadCsv('プログラム紐づけ.csv',
    mappings.map(m => [m.flowStepId, m.programId, programs.find(p => p.programId === m.programId)?.programName ?? '', String(m.displayOrder), String(m.isRequired), String(m.isActive)]),
    ['フロー工程ID', 'プログラムID', 'プログラム名', '表示順', '必須', '有効']
  )
  const importCsv = async (rows: string[][]) => {
    for (const r of rows) {
      if (r.length < 2) continue
      await flowProgramMappingsApi.create({ flowStepId: r[0], programId: r[1], displayOrder: Number(r[3]) || 0, isRequired: r[4] !== 'false', isActive: r[5] !== 'false' })
    }
    await load()
  }
  const displayed = filterStep ? mappings.filter(m => m.flowStepId === filterStep) : mappings

  if (loading) return <p style={{ color: '#7f8c8d' }}>読み込み中...</p>
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
        <h3 style={{ margin: 0 }}>プログラム紐づけ（{displayed.length}件）</h3>
        <select value={filterStep} onChange={e => setFilterStep(e.target.value)} style={{ ...inputStyle, width: 'auto' }}>
          <option value="">全工程</option>
          {allStepIds.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <BulkToolbar selectedCount={selIds.length} onBulkDelete={bulkDelete} onExport={exportCsv} onImportOpen={() => setShowImport(true)} onAdd={openAdd} addLabel="＋ 紐づけ追加" />
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
        <thead><tr style={{ backgroundColor: '#e67e22', color: 'white' }}>
          <th style={{ ...thStyle, width: '40px' }}>
            <input type="checkbox" checked={displayed.length > 0 && selIds.length === displayed.length} onChange={e => setSelIds(e.target.checked ? displayed.map(m => m.id!) : [])} />
          </th>
          {['フロー工程ID', 'プログラムID', 'プログラム名', '表示順', '必須', '有効', '操作'].map(h => <th key={h} style={thStyle}>{h}</th>)}
        </tr></thead>
        <tbody>
          {displayed.map((m, i) => (
            <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? 'white' : '#f8f9fa', borderBottom: '1px solid #ecf0f1' }}>
              <td style={{ ...tdStyle, textAlign: 'center' }}><input type="checkbox" checked={selIds.includes(m.id!)} onChange={() => setSelIds(p => p.includes(m.id!) ? p.filter(x => x !== m.id) : [...p, m.id!])} /></td>
              <td style={tdStyle}><code>{m.flowStepId}</code></td>
              <td style={tdStyle}><strong>{m.programId}</strong></td>
              <td style={tdStyle}>{programs.find(p => p.programId === m.programId)?.programName ?? '—'}</td>
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
          <FormRow label="必須"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={form.isRequired} onChange={e => setForm({ ...form, isRequired: e.target.checked })} style={{ marginRight: '0.5rem' }} />必須プログラムとして扱う</label></FormRow>
          <FormRow label="有効"><label style={{ cursor: 'pointer' }}><input type="checkbox" checked={form.isActive} onChange={e => setForm({ ...form, isActive: e.target.checked })} style={{ marginRight: '0.5rem' }} />有効にする</label></FormRow>
        </Modal>
      )}
      {showImport && (
        <ImportModal onClose={() => setShowImport(false)} onImport={importCsv}
          templateHeaders={['フロー工程ID', 'プログラムID', 'プログラム名（参考）', '表示順', '必須', '有効']}
          templateSample={['SYS_ESTIMATE', 'P001', '見積登録', '10', 'true', 'true']} />
      )}
    </div>
  )
}

// ===================================================================
// 5. フロー確認
// ===================================================================
function FlowPreview({ businessFlowSteps, systemFlowSteps, connections, programs }: {
  businessFlowSteps: BusinessFlowStep[]; systemFlowSteps: SystemFlowStep[]
  connections: FlowConnection[]; programs: Program[]
}) {
  const [tab, setTab] = useState<'business' | 'system'>('business')
  const bizGroups = businessFlowSteps.filter(s => s.isActive).reduce<Record<string, BusinessFlowStep[]>>((acc, s) => { if (!acc[s.stepId]) acc[s.stepId] = []; acc[s.stepId].push(s); return acc }, {})
  const sysGroups = systemFlowSteps.filter(s => s.isActive).reduce<Record<string, SystemFlowStep[]>>((acc, s) => { if (!acc[s.businessType]) acc[s.businessType] = []; acc[s.businessType].push(s); return acc }, {})

  return (
    <div>
      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {(['business', 'system'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '0.5rem 1.2rem', border: 'none', borderRadius: '4px', cursor: 'pointer', backgroundColor: tab === t ? '#2c3e50' : '#ecf0f1', color: tab === t ? 'white' : '#2c3e50', fontWeight: 'bold' }}>
            {t === 'business' ? '📈 業務フロー' : '🔧 システムフロー'}
          </button>
        ))}
      </div>
      <p style={{ margin: '0 0 1rem', color: '#7f8c8d', fontSize: '0.9rem' }}>※ 実際のフロー図はヒアリング結果画面から確認できます。ここではマスタの構造を確認できます。</p>
      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {tab === 'business' && Object.entries(bizGroups).sort(([, a], [, b]) => a[0].displayOrder - b[0].displayOrder).map(([stepId, nodes]) => (
          <div key={stepId} style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #ecf0f1' }}>
            <div style={{ fontWeight: 'bold', color: '#2c3e50', marginBottom: '0.5rem' }}>
              🔷 {stepId} <span style={{ color: '#7f8c8d', fontWeight: 'normal', fontSize: '0.9rem' }}>（{nodes[0].stepName}）</span>
              <span style={{ marginLeft: '1rem', fontSize: '0.8rem', color: '#95a5a6' }}>接続: {connections.filter(c => nodes.some(n => n.nodeId === c.fromNodeId || n.nodeId === c.toNodeId)).length}件</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {nodes.sort((a, b) => a.displayOrder - b.displayOrder).map(n => (
                <span key={n.nodeId} style={{ backgroundColor: '#ebf5fb', border: '1px solid #aed6f1', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <code style={{ color: '#2980b9' }}>{n.nodeId}</code>: {n.nodeLabel}
                </span>
              ))}
            </div>
          </div>
        ))}
        {tab === 'system' && Object.entries(sysGroups).map(([bizType, steps]) => (
          <div key={bizType} style={{ backgroundColor: 'white', padding: '0.75rem 1rem', borderRadius: '6px', border: '1px solid #ecf0f1' }}>
            <div style={{ fontWeight: 'bold', color: '#8e44ad', marginBottom: '0.5rem' }}>📁 {bizType}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {steps.sort((a, b) => a.displayOrder - b.displayOrder).map(s => (
                <span key={s.stepId} style={{ backgroundColor: '#f5eef8', border: '1px solid #d7bde2', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>
                  <code style={{ color: '#8e44ad' }}>{s.stepId}</code>: {s.stepName}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ===================================================================
// メインコンポーネント
// ===================================================================
function FlowMasterManagement() {
  const [activeTab, setActiveTab] = useState<MainTab>('business-flow')
  const [showHelp, setShowHelp] = useState(false)
  const [businesses, setBusinesses] = useState<Business[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [programs, setPrograms] = useState<Program[]>([])
  const [businessFlowSteps, setBusinessFlowSteps] = useState<BusinessFlowStep[]>([])
  const [systemFlowSteps, setSystemFlowSteps] = useState<SystemFlowStep[]>([])
  const [connections, setConnections] = useState<FlowConnection[]>([])

  useEffect(() => {
    Promise.all([
      businessesApi.getAll(),
      questionsApi.getAll(),
      programsApi.getAll(),
      businessFlowStepsApi.getAll(),
      systemFlowStepsApi.getAll(),
      flowConnectionsApi.getAll(),
    ]).then(([b, q, p, bfs, sfs, fc]) => {
      setBusinesses(b.data)
      // ✅ ...item のスプレッドで businessType / questionNo 等を正しく展開
      setQuestions(q.data.map((item: any) => ({
        ...item,
        text: item.text ?? item.questionText ?? '',
      })))
      setPrograms(p.data)
      setBusinessFlowSteps(bfs.data)
      setSystemFlowSteps(sfs.data)
      setConnections(fc.data)
    }).catch(e => console.error('共通マスタの読み込みエラー', e))
  }, [])

  const refreshSteps = async () => {
    const [bfs, sfs, fc] = await Promise.all([businessFlowStepsApi.getAll(), systemFlowStepsApi.getAll(), flowConnectionsApi.getAll()])
    setBusinessFlowSteps(bfs.data); setSystemFlowSteps(sfs.data); setConnections(fc.data)
  }

  const handleTabChange = (tab: MainTab) => {
    setActiveTab(tab)
    if (tab === 'question-map' || tab === 'program-map' || tab === 'flow-preview') refreshSteps()
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'stretch', borderBottom: '2px solid #ecf0f1', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', overflowX: 'auto', flex: 1 }}>
          {MAIN_TABS.map(tab => (
            <button key={tab.id} onClick={() => handleTabChange(tab.id)} style={{ padding: '0.9rem 1.2rem', border: 'none', borderBottom: activeTab === tab.id ? '3px solid #3498db' : '3px solid transparent', backgroundColor: 'transparent', color: activeTab === tab.id ? '#3498db' : '#2c3e50', fontWeight: activeTab === tab.id ? 'bold' : 'normal', cursor: 'pointer', whiteSpace: 'nowrap', fontSize: '0.95rem' }}>
              {tab.label}
            </button>
          ))}
        </div>
        <button onClick={() => setShowHelp(true)} style={{ ...btnStyle('#7f8c8d'), margin: '0.5rem 0 0.5rem 0.5rem', whiteSpace: 'nowrap', flexShrink: 0 }}>
          ❓ 登録ガイド
        </button>
      </div>

      {activeTab === 'business-flow' && <BusinessFlowSettings />}
      {activeTab === 'system-flow'   && <SystemFlowSettings businesses={businesses} />}
      {activeTab === 'question-map'  && <QuestionMappingSettings businesses={businesses} questions={questions} businessFlowSteps={businessFlowSteps} systemFlowSteps={systemFlowSteps} />}
      {activeTab === 'program-map'   && <ProgramMappingSettings programs={programs} businessFlowSteps={businessFlowSteps} systemFlowSteps={systemFlowSteps} />}
      {activeTab === 'flow-preview'  && <FlowPreview businessFlowSteps={businessFlowSteps} systemFlowSteps={systemFlowSteps} connections={connections} programs={programs} />}
      {activeTab === 'flow-master-lab' && <FlowMasterLab />}

      {showHelp && <HelpModal onClose={() => setShowHelp(false)} />}
    </div>
  )
}

export default FlowMasterManagement
