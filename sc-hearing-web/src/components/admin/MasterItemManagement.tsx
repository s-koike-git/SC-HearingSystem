import { useState, useEffect, useCallback } from 'react'

const API_BASE = '/sc-hearing/api'
async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, {
    ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers }
  })
  if (!r.ok) throw new Error(await r.text())
  return r.status === 204 ? null : r.json()
}

interface MasterItem { id: number; category: string; value: string; sortOrder: number; isActive: boolean }

// ─── 画面 → 項目 の2段階定義 ──────────────────────────────────
interface FieldDef { key: string; label: string; desc: string; shared?: string }
interface ScreenDef { id: string; name: string; icon: string; color: string; gradient: string; desc: string; fields: FieldDef[] }

const SCREENS: ScreenDef[] = [
  {
    id: 'create_project', name: '新規案件作成', icon: '📝',
    color: '#2563eb', gradient: 'linear-gradient(135deg,#2563eb,#3b82f6)',
    desc: '新規案件の作成フォームで使用する選択肢',
    fields: [
      { key: 'create_industry', label: '業種', desc: '案件作成時に選ぶ業種の一覧' },
    ]
  },
  {
    id: 'project_list', name: '案件一覧', icon: '📁',
    color: '#7c3aed', gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)',
    desc: 'ヒアリング案件の管理・フィルターで使用する選択肢',
    fields: [
      { key: 'project_progress', label: 'ステータス', desc: '案件の進行状況（未着手/進行中/完了/保留）' },
    ]
  },
  {
    id: 'program_estimate', name: '工数見積もり', icon: '⏱️',
    color: '#0369a1', gradient: 'linear-gradient(135deg,#0369a1,#0ea5e9)',
    desc: 'プログラム工数見積もりで使用する選択肢',
    fields: [
      { key: 'estimate_complexity', label: '複雑度', desc: '工数計算に使う複雑度レベル' },
      { key: 'estimate_type', label: '見積種別', desc: '見積もりの種別（新規/改修/調査など）' },
    ]
  },
  {
    id: 'cost_simulation', name: '原価シミュレーション', icon: '💰',
    color: '#059669', gradient: 'linear-gradient(135deg,#059669,#10b981)',
    desc: '製品原価試算で使用する選択肢',
    fields: [
      { key: 'cost_unit', label: '数量単位', desc: '原材料・製品の数量単位（個/kg/L など）' },
    ]
  },
  {
    id: 'customer_management', name: '顧客管理', icon: '🏢',
    color: '#d97706', gradient: 'linear-gradient(135deg,#d97706,#f59e0b)',
    desc: '既存顧客の保守・案件管理で使用する選択肢',
    fields: [
      { key: 'tcs_contact',    label: 'TCS担当者',      desc: '顧客連絡・訪問を担当するTCSスタッフ', shared: '作業管理と共通' },
      { key: 'project_type',   label: '案件種別',       desc: '案件の種別（サーバーリプレイス/SCカスタマイズ など）' },
      { key: 'project_status', label: '案件ステータス', desc: '案件の進行状態（提案中/商談中/受注 など）' },
      { key: 'sc_module',      label: 'SCモジュール',   desc: 'スーパーカクテルのモジュール構成' },
      { key: 'server_env',     label: 'サーバー環境',   desc: '顧客のサーバー設置環境' },
    ]
  },
  {
    id: 'work_management', name: '作業管理', icon: '📋',
    color: '#dc2626', gradient: 'linear-gradient(135deg,#dc2626,#ef4444)',
    desc: '担当タスク・スケジュール管理で使用する選択肢',
    fields: [
      { key: 'tcs_contact',   label: 'TCS担当者',      desc: '作業担当者（顧客管理と共通）', shared: '顧客管理と共通' },
      { key: 'work_category', label: '作業分類',       desc: '作業タスクの分類（自社/NBS/内田洋行 など）' },
      { key: 'work_status',   label: '作業ステータス', desc: '作業タスクの進行状態' },
      { key: 'work_priority', label: '優先度',         desc: '作業タスクの優先度（高/中/低）' },
    ]
  },
]

// ─── メインコンポーネント ────────────────────────────────────
export default function MasterItemManagement() {
  const [allItems, setAllItems] = useState<MasterItem[]>([])
  const [selectedScreen, setSelectedScreen] = useState<ScreenDef | null>(null)
  const [selectedField, setSelectedField] = useState<FieldDef | null>(null)
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [editTarget, setEditTarget] = useState<{ id: number; value: string } | null>(null)
  const [delTarget, setDelTarget] = useState<MasterItem | null>(null)

  const load = useCallback(async () => {
    try { setAllItems(await apiFetch('/MasterItems')) } catch (e) { console.error(e) }
  }, [])
  useEffect(() => { load() }, [load])

  const catItems = selectedField
    ? allItems.filter(m => m.category === selectedField.key).sort((a, b) => a.sortOrder - b.sortOrder)
    : []

  const activeCount = (key: string) => allItems.filter(m => m.category === key && m.isActive).length
  const totalCount = (key: string) => allItems.filter(m => m.category === key).length

  const handleAdd = async () => {
    if (!newValue.trim() || !selectedField) return
    setSaving(true)
    try {
      const maxOrder = Math.max(0, ...catItems.map(i => i.sortOrder))
      await apiFetch('/MasterItems', { method: 'POST', body: JSON.stringify({ category: selectedField.key, value: newValue.trim(), sortOrder: maxOrder + 1, isActive: true }) })
      setNewValue(''); await load()
    } catch { alert('追加に失敗しました') } finally { setSaving(false) }
  }

  const handleDelete = async () => {
    if (!delTarget) return
    try { await apiFetch(`/MasterItems/${delTarget.id}`, { method: 'DELETE' }); setDelTarget(null); await load() }
    catch { alert('削除に失敗しました') }
  }

  const handleSaveEdit = async () => {
    if (!editTarget?.value.trim()) return
    const item = allItems.find(m => m.id === editTarget.id)
    if (!item) return
    setSaving(true)
    try {
      await apiFetch(`/MasterItems/${editTarget.id}`, { method: 'PUT', body: JSON.stringify({ category: item.category, value: editTarget.value.trim(), sortOrder: item.sortOrder, isActive: item.isActive }) })
      setEditTarget(null); await load()
    } catch { alert('更新に失敗しました') } finally { setSaving(false) }
  }

  const handleMove = async (item: MasterItem, dir: -1 | 1) => {
    const idx = catItems.indexOf(item)
    const target = catItems[idx + dir]
    if (!target) return
    await Promise.all([
      apiFetch(`/MasterItems/${item.id}`, { method: 'PUT', body: JSON.stringify({ category: item.category, value: item.value, sortOrder: target.sortOrder, isActive: item.isActive }) }),
      apiFetch(`/MasterItems/${target.id}`, { method: 'PUT', body: JSON.stringify({ category: target.category, value: target.value, sortOrder: item.sortOrder, isActive: target.isActive }) }),
    ])
    await load()
  }

  const handleToggle = async (item: MasterItem) => {
    await apiFetch(`/MasterItems/${item.id}`, { method: 'PUT', body: JSON.stringify({ category: item.category, value: item.value, sortOrder: item.sortOrder, isActive: !item.isActive }) })
    await load()
  }

  // ─── STEP 1: 画面選択 ─────────────────────────────────────
  if (!selectedScreen) {
    return (
      <div>
        <div style={{ marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>変更したい画面を選択してください</h3>
          <p style={{ margin: 0, fontSize: '0.78rem', color: '#64748b' }}>選択した画面内の項目（プルダウン・選択肢）を追加・削除・並び替えできます</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
          {SCREENS.map(screen => {
            const totalFields = screen.fields.reduce((s, f) => s + totalCount(f.key), 0)
            return (
              <div key={screen.id} onClick={() => { setSelectedScreen(screen); setSelectedField(null) }}
                style={{ border: `2px solid ${screen.color}30`, borderRadius: 12, padding: '18px 16px', cursor: 'pointer', transition: 'all .15s', background: 'white', position: 'relative', overflow: 'hidden' }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = screen.color; (e.currentTarget as HTMLElement).style.background = `${screen.color}08` }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = `${screen.color}30`; (e.currentTarget as HTMLElement).style.background = 'white' }}>
                {/* 左アクセントライン */}
                <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 4, background: screen.gradient }} />
                <div style={{ paddingLeft: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <span style={{ fontSize: '1.5rem' }}>{screen.icon}</span>
                    <div>
                      <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#0f172a' }}>{screen.name}</div>
                      <div style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{screen.fields.length}項目 / {totalFields}件の設定値</div>
                    </div>
                  </div>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b', lineHeight: 1.5 }}>{screen.desc}</p>
                  <div style={{ marginTop: 10, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                    {screen.fields.map(f => (
                      <span key={f.key} style={{ fontSize: '0.65rem', padding: '2px 7px', borderRadius: 99, background: `${screen.color}15`, color: screen.color, fontWeight: 600, border: `1px solid ${screen.color}30` }}>
                        {f.label}
                      </span>
                    ))}
                  </div>
                </div>
                <div style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: screen.color, fontSize: '1.1rem', opacity: 0.5 }}>▶</div>
              </div>
            )
          })}
        </div>
        <div style={{ marginTop: 16, padding: '10px 14px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 8, fontSize: '0.75rem', color: '#0369a1' }}>
          💡 変更した内容は次回の画面読み込み時から各ページのプルダウンに反映されます
        </div>
      </div>
    )
  }

  // ─── STEP 2: 項目選択 + 値管理 ────────────────────────────
  const sc = selectedScreen
  return (
    <div>
      {/* パンくず */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16, fontSize: '0.82rem' }}>
        <button onClick={() => { setSelectedScreen(null); setSelectedField(null); setNewValue('') }}
          style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', color: '#475569', cursor: 'pointer', fontFamily: 'inherit', fontSize: '0.82rem', outline: 'none' }}>
          ← 画面選択に戻る
        </button>
        <span style={{ color: '#94a3b8' }}>›</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontWeight: 700, color: sc.color }}>
          <span>{sc.icon}</span> {sc.name}
        </span>
        {selectedField && <>
          <span style={{ color: '#94a3b8' }}>›</span>
          <span style={{ fontWeight: 600, color: '#0f172a' }}>{selectedField.label}</span>
        </>}
      </div>

      <div style={{ display: 'flex', gap: 16 }}>
        {/* 左: 項目選択 */}
        <div style={{ width: 200, flexShrink: 0 }}>
          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.06em', textTransform: 'uppercase' as const, padding: '0 4px 6px', marginBottom: 4 }}>
            {sc.icon} {sc.name} の項目
          </div>
          {sc.fields.map(field => {
            const active = selectedField?.key === field.key
            const cnt = activeCount(field.key)
            const total = totalCount(field.key)
            return (
              <div key={field.key} onClick={() => { setSelectedField(field); setNewValue(''); setEditTarget(null) }}
                style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '9px 10px', borderRadius: 7, cursor: 'pointer', background: active ? `${sc.color}12` : 'white', border: `1px solid ${active ? sc.color : '#e2e8f0'}`, marginBottom: 4, transition: 'all .1s' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.83rem', fontWeight: active ? 700 : 500, color: active ? sc.color : '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{field.label}</div>
                  {field.shared && <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: 1 }}>🔗 {field.shared}</div>}
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: active ? sc.color : '#94a3b8' }}>{cnt}<span style={{ color: '#cbd5e1', fontWeight: 400 }}>/{total}</span></div>
                  <div style={{ fontSize: '0.58rem', color: '#cbd5e1' }}>有効/全</div>
                </div>
              </div>
            )
          })}
        </div>

        {/* 右: 値管理 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          {!selectedField ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, border: '1px dashed #e2e8f0', borderRadius: 10, color: '#94a3b8', fontSize: '0.85rem' }}>
              ← 左のリストから変更したい項目を選択してください
            </div>
          ) : (
            <div>
              {/* 項目ヘッダー */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #f1f5f9' }}>
                <div>
                  <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>
                    「{selectedField.label}」の選択肢
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{selectedField.desc}</div>
                </div>
                <div style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
                  {selectedField.shared && (
                    <span style={{ fontSize: '0.7rem', padding: '3px 10px', borderRadius: 99, background: '#fef3c7', color: '#92400e', fontWeight: 600, border: '1px solid #fde68a' }}>
                      🔗 {selectedField.shared}
                    </span>
                  )}
                  <span style={{ fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99, background: '#f0f9ff', color: '#0369a1', fontWeight: 700, border: '1px solid #bae6fd' }}>
                    {activeCount(selectedField.key)}件有効 / {totalCount(selectedField.key)}件登録
                  </span>
                </div>
              </div>

              {/* 追加フォーム */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
                <input value={newValue} onChange={e => setNewValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder={`新しい「${selectedField.label}」の値を入力`}
                  style={{ flex: 1, padding: '8px 12px', border: `1px solid ${sc.color}50`, borderRadius: 7, fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}/>
                <button onClick={handleAdd} disabled={saving || !newValue.trim()}
                  style={{ padding: '8px 18px', border: 'none', borderRadius: 7, background: newValue.trim() ? sc.gradient : '#e2e8f0', color: newValue.trim() ? 'white' : '#94a3b8', fontWeight: 700, fontSize: '0.85rem', cursor: newValue.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap', transition: 'all .15s' }}>
                  ＋ 追加
                </button>
              </div>

              {/* 値一覧 */}
              {catItems.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8', fontSize: '0.85rem', border: '1px dashed #e2e8f0', borderRadius: 8 }}>
                  まだ値が登録されていません。上のフォームから追加してください。
                </div>
              ) : (
                <div style={{ border: '1px solid #e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                  {/* ヘッダー行 */}
                  <div style={{ display: 'flex', alignItems: 'center', padding: '7px 12px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.68rem', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.04em' }}>
                    <span style={{ width: 52, flexShrink: 0 }}>並び順</span>
                    <span style={{ flex: 1 }}>値（画面に表示されるテキスト）</span>
                    <span style={{ width: 60, textAlign: 'center', flexShrink: 0 }}>有効</span>
                    <span style={{ width: 80, textAlign: 'center', flexShrink: 0 }}>操作</span>
                  </div>
                  {catItems.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', padding: '8px 12px', borderBottom: idx < catItems.length - 1 ? '1px solid #f1f5f9' : 'none', background: item.isActive ? 'white' : '#fafafa', gap: 6 }}>
                      {/* 並び替え */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, width: 20, flexShrink: 0 }}>
                        <button onClick={() => handleMove(item, -1)} disabled={idx === 0}
                          style={{ width: 20, height: 16, border: '1px solid #e2e8f0', borderRadius: 3, background: 'white', color: '#94a3b8', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '0.55rem', lineHeight: 1, outline: 'none', opacity: idx === 0 ? 0.3 : 1, padding: 0 }}>▲</button>
                        <button onClick={() => handleMove(item, 1)} disabled={idx === catItems.length - 1}
                          style={{ width: 20, height: 16, border: '1px solid #e2e8f0', borderRadius: 3, background: 'white', color: '#94a3b8', cursor: idx === catItems.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.55rem', lineHeight: 1, outline: 'none', opacity: idx === catItems.length - 1 ? 0.3 : 1, padding: 0 }}>▼</button>
                      </div>
                      {/* 番号 */}
                      <span style={{ fontSize: '0.7rem', color: '#cbd5e1', width: 24, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                      {/* 値 */}
                      {editTarget?.id === item.id ? (
                        <input value={editTarget.value} autoFocus
                          onChange={e => setEditTarget(t => t ? { ...t, value: e.target.value } : null)}
                          onKeyDown={e => e.key === 'Enter' ? handleSaveEdit() : e.key === 'Escape' && setEditTarget(null)}
                          style={{ flex: 1, padding: '5px 8px', border: `2px solid ${sc.color}`, borderRadius: 5, fontSize: '0.88rem', fontWeight: 600, outline: 'none', fontFamily: 'inherit', color: '#0f172a' }}/>
                      ) : (
                        <span onDoubleClick={() => setEditTarget({ id: item.id, value: item.value })}
                          style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500, color: item.isActive ? '#0f172a' : '#94a3b8', cursor: 'text', opacity: item.isActive ? 1 : 0.6 }}
                          title="ダブルクリックで編集">
                          {item.value}
                          {!item.isActive && <span style={{ fontSize: '0.65rem', color: '#94a3b8', marginLeft: 6 }}>(無効)</span>}
                        </span>
                      )}
                      {/* 有効/無効 */}
                      <button onClick={() => handleToggle(item)}
                        style={{ width: 60, padding: '3px 0', border: `1px solid ${item.isActive ? '#bbf7d0' : '#e2e8f0'}`, borderRadius: 99, background: item.isActive ? '#f0fdf4' : '#f8fafc', color: item.isActive ? '#15803d' : '#94a3b8', fontSize: '0.68rem', fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', flexShrink: 0 }}>
                        {item.isActive ? '✅ 有効' : '⬜ 無効'}
                      </button>
                      {/* 編集/削除 */}
                      <div style={{ display: 'flex', gap: 4, width: 68, flexShrink: 0, justifyContent: 'flex-end' }}>
                        {editTarget?.id === item.id ? (
                          <>
                            <button onClick={handleSaveEdit} style={{ padding: '4px 8px', border: 'none', borderRadius: 5, background: sc.color, color: 'white', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>保存</button>
                            <button onClick={() => setEditTarget(null)} style={{ padding: '4px 6px', border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', color: '#475569', fontSize: '0.7rem', cursor: 'pointer', fontFamily: 'inherit', outline: 'none' }}>取消</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => setEditTarget({ id: item.id, value: item.value })}
                              style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', color: '#475569', cursor: 'pointer', fontSize: '0.7rem', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏</button>
                            <button onClick={() => setDelTarget(item)}
                              style={{ width: 28, height: 28, border: '1px solid #fecaca', borderRadius: 5, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.7rem', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 操作ヒント */}
              <div style={{ marginTop: 12, padding: '8px 12px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 7, fontSize: '0.72rem', color: '#92400e' }}>
                💡 <strong>編集:</strong> ダブルクリック → Enterで保存　／　<strong>並び順:</strong> ▲▼で変更　／　<strong>非表示:</strong>「有効」ボタンで無効化（削除せず非表示）
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 削除確認 */}
      {delTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 9000, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setDelTarget(null)}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.75rem', maxWidth: 380, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: '1.75rem', textAlign: 'center', marginBottom: '0.75rem' }}>🗑️</div>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0f172a', textAlign: 'center' }}>「{delTarget.value}」を削除しますか？</h3>
            <p style={{ margin: '0 0 1.25rem', textAlign: 'center', color: '#475569', fontSize: '0.83rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px', lineHeight: 1.6 }}>
              この値は選択肢から完全に削除されます。<br/>
              <span style={{ color: '#92400e' }}>非表示にするだけなら「無効」ボタンをお使いください。</span>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDelTarget(null)} style={{ flex: 1, padding: '9px', border: '1px solid #e2e8f0', borderRadius: 7, background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}>キャンセル</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 7, background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', outline: 'none' }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
