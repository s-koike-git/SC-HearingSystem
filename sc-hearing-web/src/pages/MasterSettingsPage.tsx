import { useState, useEffect, useCallback } from 'react'
import Layout from '../components/Layout'

const API_BASE = '/sc-hearing/api'
async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(`${API_BASE}${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...opts?.headers } })
  if (!r.ok) throw new Error(await r.text())
  return r.status === 204 ? null : r.json()
}

interface MasterItem { id: number; category: string; value: string; sortOrder: number; isActive: boolean }

const CATEGORIES: { key: string; label: string; description: string; icon: string }[] = [
  { key: 'tcs_contact',    label: 'TCS担当者',     description: '顧客連絡・案件・作業の担当者一覧', icon: '👤' },
  { key: 'project_type',   label: '案件種別',       description: '顧客管理の案件種別（例: サーバーリプレイス）', icon: '📁' },
  { key: 'project_status', label: '案件ステータス', description: '案件の進行状況', icon: '🔖' },
  { key: 'work_category',  label: '作業分類',       description: '作業管理タスクの分類（例: 自社, NBS）', icon: '🏷️' },
  { key: 'work_status',    label: '作業ステータス', description: '作業管理タスクの状態', icon: '📊' },
  { key: 'work_priority',  label: '優先度',         description: '作業タスクの優先度', icon: '⚡' },
  { key: 'sc_module',      label: 'SCモジュール',   description: 'スーパーカクテルのモジュール構成', icon: '⚙️' },
  { key: 'server_env',     label: 'サーバー環境',   description: '顧客のサーバー設置環境', icon: '🖥️' },
]

export default function MasterSettingsPage() {
  const [allItems, setAllItems] = useState<MasterItem[]>([])
  const [selectedCat, setSelectedCat] = useState(CATEGORIES[0].key)
  const [newValue, setNewValue] = useState('')
  const [saving, setSaving] = useState(false)
  const [delTarget, setDelTarget] = useState<MasterItem | null>(null)
  const [editTarget, setEditTarget] = useState<{id:number;value:string} | null>(null)

  const load = useCallback(async () => {
    try { setAllItems(await apiFetch('/MasterItems')) } catch (e) { console.error(e) }
  }, [])
  useEffect(() => { load() }, [load])

  const catItems = allItems.filter(m => m.category === selectedCat).sort((a, b) => a.sortOrder - b.sortOrder)
  const catDef = CATEGORIES.find(c => c.key === selectedCat)!

  const handleAdd = async () => {
    if (!newValue.trim()) return
    setSaving(true)
    try { await apiFetch('/MasterItems', { method: 'POST', body: JSON.stringify({ category: selectedCat, value: newValue.trim(), sortOrder: 0, isActive: true }) }); setNewValue(''); await load() }
    catch { alert('追加に失敗しました') } finally { setSaving(false) }
  }
  const handleDelete = async () => {
    if (!delTarget) return
    try { await apiFetch(`/MasterItems/${delTarget.id}`, { method: 'DELETE' }); setDelTarget(null); await load() }
    catch { alert('削除に失敗しました') }
  }
  const handleEdit = async () => {
    if (!editTarget || !editTarget.value.trim()) return
    const item = allItems.find(m => m.id === editTarget.id)
    if (!item) return
    setSaving(true)
    try { await apiFetch(`/MasterItems/${editTarget.id}`, { method: 'PUT', body: JSON.stringify({ category: item.category, value: editTarget.value, sortOrder: item.sortOrder, isActive: item.isActive }) }); setEditTarget(null); await load() }
    catch { alert('更新に失敗しました') } finally { setSaving(false) }
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

  return (
    <Layout>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '1.5rem 2rem', fontFamily: '"Noto Sans JP",sans-serif' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#0f172a' }}>マスタ管理</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>各画面のプルダウンや選択肢を管理します。変更はすぐに全画面に反映されます。</p>
        </div>

        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }}>
          {/* 左: カテゴリ一覧 */}
          <div style={{ width: 240, flexShrink: 0, background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', fontSize: '0.7rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em', textTransform: 'uppercase' as const }}>カテゴリ</div>
            {CATEGORIES.map(c => {
              const cnt = allItems.filter(m => m.category === c.key).length
              const active = selectedCat === c.key
              return (
                <div key={c.key} onClick={() => setSelectedCat(c.key)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px', cursor: 'pointer', background: active ? '#eff6ff' : 'white', borderBottom: '1px solid #f1f5f9', borderLeft: active ? '3px solid #1d4ed8' : '3px solid transparent', transition: 'all .1s' }}>
                  <span style={{ fontSize: '1rem' }}>{c.icon}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.82rem', fontWeight: active ? 700 : 500, color: active ? '#1d4ed8' : '#0f172a' }}>{c.label}</div>
                  </div>
                  <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: 99, background: active ? '#dbeafe' : '#f1f5f9', color: active ? '#1d4ed8' : '#94a3b8', fontWeight: 600 }}>{cnt}</span>
                </div>
              )
            })}
          </div>

          {/* 右: 項目管理 */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
              {/* ヘッダー */}
              <div style={{ padding: '14px 18px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{ fontSize: '1.2rem' }}>{catDef.icon}</span>
                <div>
                  <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{catDef.label}</h3>
                  <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>{catDef.description}</p>
                </div>
                <span style={{ marginLeft: 'auto', fontSize: '0.72rem', color: '#94a3b8' }}>{catItems.length}件</span>
              </div>

              {/* 追加フォーム */}
              <div style={{ padding: '12px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 8 }}>
                <input value={newValue} onChange={e => setNewValue(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAdd()}
                  placeholder={`新しい項目を入力（例: ${catDef.label}）`}
                  style={{ flex: 1, padding: '8px 12px', border: '1px solid #e2e8f0', borderRadius: 7, fontSize: '0.85rem', outline: 'none', fontFamily: 'inherit' }}/>
                <button onClick={handleAdd} disabled={saving || !newValue.trim()}
                  style={{ padding: '8px 18px', border: 'none', borderRadius: 7, background: newValue.trim() ? '#0f172a' : '#e2e8f0', color: newValue.trim() ? 'white' : '#94a3b8', fontWeight: 700, fontSize: '0.85rem', cursor: newValue.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                  {saving ? '追加中...' : '＋ 追加'}
                </button>
              </div>

              {/* 項目一覧 */}
              {catItems.length === 0 ? (
                <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.85rem' }}>項目がありません。上のフォームから追加してください。</div>
              ) : (
                <div>
                  {catItems.map((item, idx) => (
                    <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 18px', borderBottom: '1px solid #f1f5f9', background: item.isActive ? 'white' : '#fafafa', opacity: item.isActive ? 1 : 0.6 }}>
                      {/* 並び替えボタン */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <button onClick={() => handleMove(item, -1)} disabled={idx === 0}
                          style={{ width: 20, height: 18, border: '1px solid #e2e8f0', borderRadius: 3, background: 'white', color: '#94a3b8', cursor: idx === 0 ? 'not-allowed' : 'pointer', fontSize: '0.6rem', lineHeight: 1, outline: 'none', opacity: idx === 0 ? 0.3 : 1 }}>▲</button>
                        <button onClick={() => handleMove(item, 1)} disabled={idx === catItems.length - 1}
                          style={{ width: 20, height: 18, border: '1px solid #e2e8f0', borderRadius: 3, background: 'white', color: '#94a3b8', cursor: idx === catItems.length - 1 ? 'not-allowed' : 'pointer', fontSize: '0.6rem', lineHeight: 1, outline: 'none', opacity: idx === catItems.length - 1 ? 0.3 : 1 }}>▼</button>
                      </div>
                      {/* 順番 */}
                      <span style={{ fontSize: '0.7rem', color: '#cbd5e1', width: 20, textAlign: 'center', flexShrink: 0 }}>{idx + 1}</span>
                      {/* 値（編集可能） */}
                      {editTarget?.id === item.id ? (
                        <input value={editTarget.value} onChange={e => setEditTarget(t => t ? {...t, value: e.target.value} : null)} onKeyDown={e => e.key === 'Enter' ? handleEdit() : e.key === 'Escape' && setEditTarget(null)} autoFocus
                          style={{ flex: 1, padding: '5px 8px', border: '2px solid #1d4ed8', borderRadius: 6, fontSize: '0.88rem', fontWeight: 600, outline: 'none', fontFamily: 'inherit' }}/>
                      ) : (
                        <span onDoubleClick={() => setEditTarget({ id: item.id, value: item.value })}
                          style={{ flex: 1, fontSize: '0.88rem', fontWeight: 500, color: '#0f172a', cursor: 'text' }} title="ダブルクリックで編集">{item.value}</span>
                      )}
                      {/* 有効/無効トグル */}
                      <button onClick={() => handleToggle(item)}
                        style={{ padding: '3px 10px', border: `1px solid ${item.isActive ? '#d1fae5' : '#e2e8f0'}`, borderRadius: 99, background: item.isActive ? '#f0fdf4' : '#f8fafc', color: item.isActive ? '#15803d' : '#94a3b8', fontSize: '0.7rem', fontWeight: 600, cursor: 'pointer', outline: 'none', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                        {item.isActive ? '有効' : '無効'}
                      </button>
                      {/* 編集/保存 */}
                      {editTarget?.id === item.id ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button onClick={handleEdit} style={{ padding: '4px 10px', border: 'none', borderRadius: 5, background: '#0f172a', color: 'white', fontSize: '0.72rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>保存</button>
                          <button onClick={() => setEditTarget(null)} style={{ padding: '4px 10px', border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', color: '#475569', fontSize: '0.72rem', cursor: 'pointer', fontFamily: 'inherit' }}>取消</button>
                        </div>
                      ) : (
                        <button onClick={() => setEditTarget({ id: item.id, value: item.value })}
                          style={{ width: 28, height: 28, border: '1px solid #e2e8f0', borderRadius: 5, background: 'white', color: '#475569', cursor: 'pointer', fontSize: '0.7rem', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✏</button>
                      )}
                      <button onClick={() => setDelTarget(item)}
                        style={{ width: 28, height: 28, border: '1px solid #fecaca', borderRadius: 5, background: '#fef2f2', color: '#dc2626', cursor: 'pointer', fontSize: '0.7rem', outline: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 使用方法ヒント */}
            <div style={{ marginTop: 12, padding: '12px 16px', background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 8, fontSize: '0.75rem', color: '#92400e' }}>
              💡 <strong>使い方:</strong> 項目を追加すると次回から各画面のプルダウンに反映されます。ダブルクリックで値を編集、▲▼で表示順を変更、「無効」にすると画面に表示されなくなります。
            </div>
          </div>
        </div>
      </div>

      {/* 削除確認 */}
      {delTarget && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: 'white', borderRadius: 12, padding: '1.75rem', maxWidth: 360, width: '90%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ fontSize: '1.5rem', textAlign: 'center', marginBottom: '0.75rem' }}>⚠️</div>
            <h3 style={{ margin: '0 0 0.75rem', fontSize: '1rem', color: '#0f172a', textAlign: 'center' }}>「{delTarget.value}」を削除しますか？</h3>
            <p style={{ margin: '0 0 1.25rem', textAlign: 'center', color: '#475569', fontSize: '0.83rem', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>削除するとこの項目はプルダウンに表示されなくなります。</p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setDelTarget(null)} style={{ flex: 1, padding: '9px', border: '1px solid #e2e8f0', borderRadius: 7, background: 'white', color: '#475569', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit', outline: 'none' }}>キャンセル</button>
              <button onClick={handleDelete} style={{ flex: 1, padding: '9px', border: 'none', borderRadius: 7, background: '#dc2626', color: 'white', cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', outline: 'none' }}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
