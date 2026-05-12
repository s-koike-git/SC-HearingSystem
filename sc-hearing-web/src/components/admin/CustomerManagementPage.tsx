import { useState, useMemo } from 'react'
import Layout from '../components/Layout'

// ─── 型定義 ──────────────────────────────────────────────────
interface Customer {
  id: number
  name: string
  industry: string
  primeType: '프라임' | 'プライム' | 'サブ'
  partner: string | null
  modules: string
  version: number | null
  proposal: string
  scMaint: string | null
  serverEnv: string | null
  serverMaint: string | null
  contact: string
  custContact: string | null
  notes: string | null
  fee: number | null
}

// ─── データ ──────────────────────────────────────────────────
const CUSTOMERS: Customer[] = [
  { id:1,  name:'吉岡屋',        industry:'食品卸',        primeType:'サブ',    partner:'日本NCRビジネスソリューション', modules:'SC販売',       version:9,   proposal:'未提案', scMaint:null,         serverEnv:null,                  serverMaint:null,       contact:'永田 暁洋',  custContact:null,    notes:null,                                               fee:840000 },
  { id:2,  name:'高口精密工業',   industry:'精密部品製造',  primeType:'プライム',partner:null,                           modules:'SC販売',       version:8,   proposal:'未提案', scMaint:null,         serverEnv:'オンプレ(TCS管理)',    serverMaint:null,       contact:'永田 暁洋',  custContact:null,    notes:null,                                               fee:28000  },
  { id:3,  name:'重光産業',       industry:'食品製造',      primeType:'サブ',    partner:'NDIソリューションズ',           modules:'SC販売生産',   version:9,   proposal:'未提案', scMaint:null,         serverEnv:null,                  serverMaint:null,       contact:'永田 暁洋',  custContact:null,    notes:null,                                               fee:600000 },
  { id:4,  name:'シマブン',       industry:'グレーチング製造',primeType:'プライム',partner:null,                         modules:'SC販売',       version:9,   proposal:'提案済', scMaint:null,         serverEnv:'オンプレ(TCS管理)',    serverMaint:'2026/09/30',contact:'永田 暁洋', custContact:'濱様',  notes:'保守延長7年目→2026年9月。サーバーリプレイスの提案を進めたい',fee:78000  },
  { id:5,  name:'テーオー食品',   industry:'調味料製造販売',primeType:'サブ',    partner:'日本NCRビジネスソリューション', modules:'SC販売',       version:null,proposal:'未提案', scMaint:null,         serverEnv:null,                  serverMaint:null,       contact:'永田 暁洋',  custContact:null,    notes:null,                                               fee:84000  },
  { id:6,  name:'ジーピーフーズ', industry:'食品製造',      primeType:'プライム',partner:null,                           modules:'SC販売生産',   version:9,   proposal:'未提案', scMaint:null,         serverEnv:null,                  serverMaint:null,       contact:'永田 暁洋',  custContact:null,    notes:null,                                               fee:221000 },
  { id:7,  name:'柳川冷凍食品',   industry:'食品製造卸',    primeType:'プライム',partner:null,                           modules:'SC販売生産原価',version:9,  proposal:'未提案', scMaint:null,         serverEnv:'オンプレ(TCS管理)',    serverMaint:null,       contact:'永田 暁洋',  custContact:null,    notes:null,                                               fee:347500 },
  { id:8,  name:'コゲツ産業',     industry:'食品卸',        primeType:'プライム',partner:null,                           modules:'SC販売',       version:9,   proposal:'未提案', scMaint:null,         serverEnv:'オンプレ(TCS管理)',    serverMaint:'2026/07/31',contact:'岸本 健二', custContact:'横山次長',notes:null,                                              fee:212500 },
  { id:9,  name:'JAふくおか八女', industry:'食品製造',      primeType:'プライム',partner:null,                           modules:'SC販売',       version:8.2, proposal:'提案済', scMaint:null,         serverEnv:'AWS(TCS管理)',         serverMaint:null,       contact:'小池 慎郁',  custContact:'原様',  notes:'2026/8末で新システムに移行予定',                    fee:185000 },
  { id:10, name:'九美堂',         industry:'美容卸',        primeType:'プライム',partner:null,                           modules:'SC販売',       version:8,   proposal:'未提案', scMaint:'2021/05/31', serverEnv:'オンプレ(お客様管理)', serverMaint:'2028/05/31',contact:'成清 祐介', custContact:'吉田社長',notes:'FTサーバー7年保守',                               fee:129100 },
  { id:11, name:'木村',           industry:'食品製造卸',    primeType:'プライム',partner:null,                           modules:'SC販売生産',   version:9,   proposal:'未提案', scMaint:null,         serverEnv:null,                  serverMaint:null,       contact:'成清 祐介',  custContact:'藤岡様', notes:'サーバはデータセンターの仮想環境（保守対象外）',     fee:124000 },
  { id:12, name:'アポロ商事',     industry:'美容卸',        primeType:'プライム',partner:null,                           modules:'SC販売',       version:9,   proposal:'未提案', scMaint:null,         serverEnv:'オンプレ(TCS管理)',    serverMaint:'2029/11/30',contact:'西山 悠太', custContact:'佐藤様', notes:null,                                              fee:102500 },
  { id:13, name:'藤安醸造',       industry:'食品製造',      primeType:'プライム',partner:null,                           modules:'SC販売生産',   version:9,   proposal:'未提案', scMaint:null,         serverEnv:'オンプレ(TCS管理)',    serverMaint:'2029/09/30',contact:'西山 悠太', custContact:'西田様', notes:null,                                              fee:116000 },
  { id:14, name:'食菜工房',       industry:'野菜加工',      primeType:'プライム',partner:null,                           modules:'SC販売生産',   version:8,   proposal:'未提案', scMaint:null,         serverEnv:'オンプレ(TCS管理)',    serverMaint:'2026/11/30',contact:'西山 悠太', custContact:'矢竹社長',notes:null,                                              fee:50000  },
  { id:15, name:'サムソン',       industry:'ボイラー製造',  primeType:'サブ',    partner:'富士通四国',                    modules:'SC販売',       version:7,   proposal:'未提案', scMaint:null,         serverEnv:null,                  serverMaint:null,       contact:'西山 悠太',  custContact:null,    notes:null,                                               fee:null   },
  { id:16, name:'ハウディ',       industry:'食品卸',        primeType:'プライム',partner:null,                           modules:'SC販売',       version:8.2, proposal:'未提案', scMaint:null,         serverEnv:'オンプレ(お客様管理)', serverMaint:'2024/03/31',contact:'赤星 美和子',custContact:'江﨑様', notes:'Acronis契約中',                                    fee:164000 },
]

// ─── ユーティリティ ───────────────────────────────────────────
const TODAY = new Date('2026-05-11')

type Urgency = 'expired' | 'critical' | 'warning' | 'caution' | 'ok' | 'none'

function parseDate(s: string | null): Date | null {
  if (!s) return null
  const p = s.split('/')
  if (p.length !== 3) return null
  return new Date(+p[0], +p[1] - 1, +p[2])
}

function getUrgency(dateStr: string | null): Urgency {
  if (!dateStr) return 'none'
  const d = parseDate(dateStr)
  if (!d) return 'none'
  const diffMs = d.getTime() - TODAY.getTime()
  const diffM = diffMs / (1000 * 60 * 60 * 24 * 30)
  if (diffMs < 0) return 'expired'
  if (diffM < 6) return 'critical'
  if (diffM < 12) return 'warning'
  if (diffM < 24) return 'caution'
  return 'ok'
}

function cardUrgency(c: Customer): Urgency {
  const order: Urgency[] = ['expired', 'critical', 'warning', 'caution', 'ok', 'none']
  const su = getUrgency(c.serverMaint)
  const scu = getUrgency(c.scMaint)
  const si = order.indexOf(su), sci = order.indexOf(scu)
  return order[Math.min(si < 0 ? 99 : si, sci < 0 ? 99 : sci)] ?? 'none'
}

function monthsLeft(dateStr: string | null): number | null {
  if (!dateStr) return null
  const d = parseDate(dateStr)
  if (!d) return null
  return Math.round((d.getTime() - TODAY.getTime()) / (1000 * 60 * 60 * 24 * 30))
}

function dateLabel(dateStr: string | null, u: Urgency): string {
  if (!dateStr) return ''
  const m = monthsLeft(dateStr)
  if (u === 'expired') return `${dateStr}（期限切れ）`
  if (m !== null) return `${dateStr}（あと${m}ヶ月）`
  return dateStr
}

function parseMods(s: string): string[] {
  const r: string[] = []
  if (s.includes('販売')) r.push('販売')
  if (s.includes('生産')) r.push('生産')
  if (s.includes('原価')) r.push('原価')
  return r
}

const URGENCY_COLORS: Record<Urgency, string> = {
  expired: '#c0392b', critical: '#e74c3c', warning: '#e67e22',
  caution: '#f39c12', ok: '#27ae60', none: '#bdc3c7',
}

const CONTACTS = ['全担当者', '永田 暁洋', '岸本 健二', '小池 慎郁', '成清 祐介', '西山 悠太', '赤星 美和子']

// ─── メインコンポーネント ─────────────────────────────────────
export default function CustomerManagementPage() {
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [search, setSearch] = useState('')
  const [filterContact, setFilterContact] = useState('全担当者')
  const [filterUrgency, setFilterUrgency] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const toggle = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filtered = useMemo(() => {
    const urgOrder: Urgency[] = ['expired', 'critical', 'warning', 'caution', 'ok', 'none']
    return CUSTOMERS.filter(c => {
      const q = search.toLowerCase()
      if (q && !c.name.toLowerCase().includes(q) && !c.contact.toLowerCase().includes(q)) return false
      if (filterContact !== '全担当者' && c.contact !== filterContact) return false
      if (filterType !== 'all' && c.primeType !== filterType) return false
      if (filterUrgency !== 'all') {
        const u = cardUrgency(c)
        if (filterUrgency === 'expired' && u !== 'expired') return false
        if (filterUrgency === 'critical' && u !== 'critical' && u !== 'expired') return false
        if (filterUrgency === 'warning' && u !== 'warning') return false
        if (filterUrgency === 'ok' && u !== 'ok' && u !== 'none' && u !== 'caution') return false
      }
      return true
    }).sort((a, b) => urgOrder.indexOf(cardUrgency(a)) - urgOrder.indexOf(cardUrgency(b)))
  }, [search, filterContact, filterUrgency, filterType])

  const totalFee = CUSTOMERS.reduce((s, c) => s + (c.fee ?? 0), 0)
  const criticalCount = CUSTOMERS.filter(c => { const u = cardUrgency(c); return u === 'critical' || u === 'expired' }).length
  const proposedCount = CUSTOMERS.filter(c => c.proposal === '提案済').length

  const inp: React.CSSProperties = { padding: '7px 12px', border: '1px solid #e2e8f0', borderRadius: 8, fontSize: '0.85rem', color: '#0f172a', background: 'white', outline: 'none', cursor: 'pointer' }

  return (
    <Layout>
      <div style={{ maxWidth: 1400, margin: '0 auto', padding: '1.5rem 2rem', fontFamily: '"Noto Sans JP", sans-serif' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: '1.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>既存顧客管理</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.82rem', color: '#64748b' }}>サーバー保守期限・SC保守期限・案件状況をツリーで管理</p>
        </div>

        {/* サマリカード */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { label: '総顧客数', value: `${CUSTOMERS.length}社`, color: '#1e40af' },
            { label: '要対応（6ヶ月以内）', value: `${criticalCount}社`, color: '#dc2626' },
            { label: '提案済', value: `${proposedCount}社`, color: '#0284c7' },
            { label: '月次保守料合計', value: `¥${Math.round(totalFee / 10000)}万`, color: '#059669' },
          ].map(s => (
            <div key={s.label} style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', padding: '1rem 1.25rem' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* フィルター */}
        <div style={{ display: 'flex', gap: 8, marginBottom: '1.25rem', flexWrap: 'wrap' }}>
          <input style={{ ...inp, flex: 1, minWidth: 160 }} placeholder="顧客名・担当者で検索..." value={search} onChange={e => setSearch(e.target.value)} />
          <select style={inp} value={filterContact} onChange={e => setFilterContact(e.target.value)}>
            {CONTACTS.map(c => <option key={c}>{c}</option>)}
          </select>
          <select style={inp} value={filterUrgency} onChange={e => setFilterUrgency(e.target.value)}>
            <option value="all">全ステータス</option>
            <option value="expired">期限切れ</option>
            <option value="critical">要対応（6ヶ月以内）</option>
            <option value="warning">注意（1年以内）</option>
            <option value="ok">正常</option>
          </select>
          <select style={inp} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">プライム / サブ</option>
            <option value="プライム">プライム</option>
            <option value="サブ">サブ</option>
          </select>
        </div>

        {/* 顧客一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.length === 0 && (
            <div style={{ textAlign: 'center', padding: '3rem', color: '#94a3b8', fontSize: '0.9rem' }}>条件に一致する顧客がありません</div>
          )}
          {filtered.map(c => (
            <CustomerCard key={c.id} customer={c} expanded={expanded.has(c.id)} onToggle={() => toggle(c.id)} />
          ))}
        </div>
      </div>
    </Layout>
  )
}

// ─── 顧客カード ───────────────────────────────────────────────
function CustomerCard({ customer: c, expanded, onToggle }: { customer: Customer; expanded: boolean; onToggle: () => void }) {
  const u = cardUrgency(c)
  const mods = parseMods(c.modules)
  const barColor = URGENCY_COLORS[u]

  const vColor = c.version === null ? '#94a3b8' : c.version >= 9 ? '#059669' : c.version >= 8 ? '#d97706' : '#dc2626'
  const vBg = c.version === null ? '#f1f5f9' : c.version >= 9 ? '#f0fdf4' : c.version >= 8 ? '#fffbeb' : '#fef2f2'

  return (
    <div style={{ borderRadius: 12, border: '1px solid #e2e8f0', background: 'white', overflow: 'hidden', transition: 'border-color .15s' }}>
      {/* カードヘッダー */}
      <div onClick={onToggle} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 16px', cursor: 'pointer' }}>
        <div style={{ width: 4, height: 48, borderRadius: 2, background: barColor, flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{c.name}</span>
            {(u === 'expired' || u === 'critical') && (
              <span style={{ fontSize: '0.7rem', padding: '1px 6px', borderRadius: 99, background: u === 'expired' ? '#fef2f2' : '#fff7ed', color: barColor, fontWeight: 700, border: `1px solid ${barColor}` }}>
                {u === 'expired' ? '期限切れ' : '要対応'}
              </span>
            )}
          </div>
          <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>{c.industry}　担当: {c.contact}</div>
        </div>
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', flexShrink: 0, alignItems: 'center' }}>
          <Badge text={c.primeType} bg={c.primeType === 'プライム' ? '#eff6ff' : '#f0fdf4'} color={c.primeType === 'プライム' ? '#1e40af' : '#065f46'} />
          <Badge text={c.version ? `V${c.version}` : 'Ver不明'} bg={vBg} color={vColor} />
          {mods.map(m => <Badge key={m} text={m} bg="#f8fafc" color="#475569" />)}
          {c.proposal === '提案済' && <Badge text="提案済" bg="#eff6ff" color="#1e40af" />}
        </div>
        <span style={{ color: '#94a3b8', fontSize: '0.9rem', transform: expanded ? 'rotate(90deg)' : 'none', transition: 'transform .2s' }}>▶</span>
      </div>

      {/* ツリー展開部分 */}
      {expanded && <TreeView customer={c} />}
    </div>
  )
}

function Badge({ text, bg, color }: { text: string; bg: string; color: string }) {
  return (
    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: 99, background: bg, color, fontWeight: 700, whiteSpace: 'nowrap' }}>{text}</span>
  )
}

// ─── ツリービュー ─────────────────────────────────────────────
function TreeView({ customer: c }: { customer: Customer }) {
  const mods = parseMods(c.modules)
  const su = getUrgency(c.serverMaint)
  const scu = getUrgency(c.scMaint)

  const urgencyText = (dateStr: string | null, u: Urgency): { text: string; color: string } => {
    if (!dateStr) return { text: '設定なし', color: '#94a3b8' }
    const label = dateLabel(dateStr, u)
    const color = URGENCY_COLORS[u]
    return { text: label, color }
  }

  const serverInfo = urgencyText(c.serverMaint, su)
  const scInfo = urgencyText(c.scMaint, scu)

  // ステータスフロー
  const flowSteps = [
    { label: 'SC導入', done: true, active: false },
    { label: 'サーバー運用', done: !!c.serverEnv, active: false },
    { label: c.serverMaint && (su === 'critical' || su === 'expired') ? 'リプレイス急務' : 'リプレイス検討', done: false, active: c.serverMaint ? (su === 'critical' || su === 'expired' || su === 'warning') : false, alert: su === 'expired' || su === 'critical' },
    { label: c.proposal === '提案済' ? '提案中' : '提案', done: false, active: c.proposal === '提案済' },
    { label: '継続保守', done: false, active: true },
  ].filter(s => s.done || s.active)

  return (
    <div style={{ borderTop: '1px solid #f1f5f9', padding: '8px 20px 20px 28px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

        {/* SC情報 */}
        <TreeSection dot="#2980b9" icon="📦" label="SC情報">
          <TreeLeaf label="モジュール" value={mods.join(' / ') || '不明'} />
          <TreeLeaf label="バージョン" value={c.version ? `V${c.version}` : '不明'} valueColor={c.version && c.version >= 9 ? '#27ae60' : '#e67e22'} />
          {c.scMaint && <TreeLeaf label="SC保守期限" value={scInfo.text} valueColor={scInfo.color} />}
        </TreeSection>

        {/* インフラ */}
        <TreeSection dot="#16a085" icon="🖥" label="インフラ・サーバー">
          <TreeLeaf label="環境" value={c.serverEnv || '管理対象外 / 不明'} valueColor={c.serverEnv ? '#0f172a' : '#94a3b8'} />
          <TreeLeaf label="保守期限" value={serverInfo.text} valueColor={serverInfo.color} />
          {c.partner && <TreeLeaf label="パートナー" value={c.partner} />}
        </TreeSection>

        {/* 案件状況 */}
        <TreeSection dot="#8e44ad" icon="📋" label="案件ステータス">
          <div style={{ display: 'flex', gap: 0, alignItems: 'center', flexWrap: 'wrap', padding: '4px 0 4px 14px' }}>
            {flowSteps.map((s, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
                {i > 0 && <span style={{ color: '#cbd5e1', padding: '0 4px', fontSize: '0.8rem' }}>→</span>}
                <span style={{
                  fontSize: '0.72rem', padding: '3px 10px', borderRadius: 99,
                  background: s.active ? (s.alert ? '#fff7ed' : '#eff6ff') : s.done ? '#f0fdf4' : '#f8fafc',
                  color: s.active ? (s.alert ? '#c05621' : '#1e40af') : s.done ? '#065f46' : '#94a3b8',
                  border: `1px solid ${s.active ? (s.alert ? '#fed7aa' : '#bfdbfe') : s.done ? '#bbf7d0' : '#e2e8f0'}`,
                  fontWeight: s.active ? 700 : 400,
                }}>
                  {s.label}
                </span>
              </span>
            ))}
          </div>
          {c.notes && (
            <div style={{ margin: '4px 14px 0', padding: '7px 10px', background: '#fffbeb', borderRadius: 6, fontSize: '0.78rem', color: '#92400e', borderLeft: '3px solid #fcd34d' }}>
              {c.notes}
            </div>
          )}
        </TreeSection>

        {/* 担当者 */}
        <TreeSection dot="#d35400" icon="👤" label="担当者" last>
          <TreeLeaf label="TCS担当" value={c.contact} />
          {c.custContact && <TreeLeaf label="顧客担当" value={c.custContact} />}
          {c.fee && <TreeLeaf label="月次保守料" value={`¥${c.fee.toLocaleString()}`} />}
        </TreeSection>

      </div>
    </div>
  )
}

function TreeSection({ dot, icon, label, last, children }: { dot: string; icon: string; label: string; last?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 0, position: 'relative' }}>
      {!last && <div style={{ position: 'absolute', left: 5, top: 18, bottom: -1, width: 1, background: '#e2e8f0' }} />}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 4, flexShrink: 0, width: 12 }}>
        <div style={{ width: 11, height: 11, borderRadius: '50%', background: dot, flexShrink: 0, marginTop: 2 }} />
      </div>
      <div style={{ flex: 1, paddingLeft: 10, paddingBottom: 12, minWidth: 0 }}>
        <div style={{ fontSize: '0.8rem', fontWeight: 700, color: '#334155', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 5 }}>
          <span>{icon}</span><span>{label}</span>
        </div>
        {children}
      </div>
    </div>
  )
}

function TreeLeaf({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div style={{ display: 'flex', paddingLeft: 14, position: 'relative', marginBottom: 2 }}>
      <div style={{ position: 'absolute', left: 0, top: 8, width: 10, height: 1, background: '#e2e8f0' }} />
      <div style={{ fontSize: '0.78rem' }}>
        <span style={{ color: '#94a3b8', marginRight: 4 }}>{label}</span>
        <span style={{ color: valueColor || '#334155', fontWeight: valueColor ? 600 : 400 }}>{value}</span>
      </div>
    </div>
  )
}
