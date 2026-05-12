import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import { customersApi, customerProjectsApi, customerFilesApi, type Customer, type CustomerDto, type CustomerProject, type CustomerProjectDto, type CustomerFileItem } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import CustomerGanttView from './CustomerGanttView'

const TODAY = new Date('2026-05-11')
const TODAY_STR = '2026/05/11'
const THIS_YEAR = '2026'
type Urgency = 'expired'|'critical'|'warning'|'caution'|'ok'|'none'
const URGENCY: Record<Urgency,{bar:string;badge:string;label:string}> = {
  expired:{bar:'#dc2626',badge:'#fef2f2',label:'期限切れ'},
  critical:{bar:'#ea580c',badge:'#fff7ed',label:'要対応'},
  warning:{bar:'#d97706',badge:'#fffbeb',label:'注意'},
  caution:{bar:'#ca8a04',badge:'#fefce8',label:'確認推奨'},
  ok:{bar:'#16a34a',badge:'#f0fdf4',label:'正常'},
  none:{bar:'#cbd5e1',badge:'#f8fafc',label:'―'},
}
const STATUS_STYLE: Record<string,{bg:string;color:string;border:string}> = {
  '提案中':{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'},
  '商談中':{bg:'#faf5ff',color:'#7c3aed',border:'#ddd6fe'},
  '受注':{bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0'},
  '対応中':{bg:'#fff7ed',color:'#c2410c',border:'#fed7aa'},
  '完了':{bg:'#f1f5f9',color:'#475569',border:'#e2e8f0'},
  '失注':{bg:'#fef2f2',color:'#b91c1c',border:'#fecaca'},
}
const TYPE_ICON: Record<string,string> = {
  'サーバーリプレイス':'🖥','SCカスタマイズ':'⚙️','バージョンアップ':'⬆️','商品購入':'🛒','保守契約更新':'🔄','その他':'📌',
}
// TCS担当者マスタ（顧客連絡・案件・作業で共通使用）
const CONTACTS = ['永田 暁洋','岸本 健二','小池 慎郁','成清 祐介','西山 悠太','赤星 美和子']
const SERVER_ENVS = ['オンプレ(TCS管理)','オンプレ(お客様管理)','AWS(TCS管理)','Azure(TCS管理)','データセンター(仮想)']
const MODULE_OPTIONS = ['SC販売','SC販売生産','SC販売生産原価']
const PROJECT_TYPES = ['サーバーリプレイス','SCカスタマイズ','バージョンアップ','商品購入','保守契約更新','その他']
const PROJECT_STATUSES = ['提案中','商談中','受注','対応中','完了','失注']

function fileIcon(t:string,n:string):string{const e=n.split('.').pop()?.toLowerCase()??'';if(t.includes('pdf')||e==='pdf')return'📄';if(t.includes('word')||['docx','doc'].includes(e))return'📝';if(t.includes('excel')||['xlsx','xls'].includes(e))return'📊';if(t.includes('powerpoint')||['pptx','ppt'].includes(e))return'📋';if(t.includes('image')||['jpg','jpeg','png','gif','webp'].includes(e))return'🖼️';return'📎'}
function formatSize(b:number){return b<1024?`${b}B`:b<1048576?`${(b/1024).toFixed(1)}KB`:`${(b/1048576).toFixed(1)}MB`}
function parseDate(s:string|null):Date|null{if(!s)return null;const p=s.split('/');return p.length===3?new Date(+p[0],+p[1]-1,+p[2]):null}
function getUrgency(s:string|null):Urgency{if(!s)return'none';const d=parseDate(s);if(!d)return'none';const m=(d.getTime()-TODAY.getTime())/(1000*60*60*24*30);if(m<0)return'expired';if(m<6)return'critical';if(m<12)return'warning';if(m<24)return'caution';return'ok'}
function cardUrgency(c:Customer):Urgency{const order:Urgency[]=['expired','critical','warning','caution','ok','none'];const si=order.indexOf(getUrgency(c.serverMaintDate)),sci=order.indexOf(getUrgency(c.scMaintDate));return order[Math.min(si<0?99:si,sci<0?99:sci)]??'none'}
function dateLabel(s:string|null,u:Urgency):string{if(!s)return'―';const d=parseDate(s);if(!d)return s;const m=Math.round((d.getTime()-TODAY.getTime())/(1000*60*60*24*30));return u==='expired'?`${s}（期限切れ）`:`${s}（あと${m}ヶ月）`}
function parseMods(s:string){return['販売','生産','原価'].filter(m=>s.includes(m))}
function getLastVisit(c:Customer):string|null{return(c as any).lastVisitDate as string|null|undefined??null}
function isVisitedThisYear(c:Customer):boolean{const lv=getLastVisit(c);return !!(lv&&lv.startsWith(THIS_YEAR))}
function visitDaysAgo(c:Customer):number|null{const lv=getLastVisit(c);const d=parseDate(lv);if(!d)return null;return Math.round((TODAY.getTime()-d.getTime())/86400000)}
function assigneeList(s:string|undefined|null):string[]{if(!s)return[];return s.split(',').map(a=>a.trim()).filter(Boolean)}

const EMPTY_CUSTOMER: CustomerDto={name:'',industry:'',primeType:'プライム',partner:null,modules:'SC販売',version:null,proposalStatus:'',scMaintDate:null,serverEnv:null,serverMaintDate:null,contact:'永田 暁洋',customerContact:null,notes:null,monthlyFee:null,lastVisitDate:null}

export default function CustomerManagementPage(){
  const{user}=useAuth()
  const[customers,setCustomers]=useState<Customer[]>([])
  const[projects,setProjects]=useState<Record<number,CustomerProject[]>>({})
  const[files,setFiles]=useState<Record<number,CustomerFileItem[]>>({})
  const[loading,setLoading]=useState(true)
  const[expanded,setExpanded]=useState<Set<number>>(new Set())
  const[viewMode,setViewMode]=useState<'tree'|'gantt'>('tree')
  const[meetingMode,setMeetingMode]=useState(false)
  const[search,setSearch]=useState('')
  const[fContact,setFContact]=useState('all')
  const[fUrgency,setFUrgency]=useState('all')
  const[fVisit,setFVisit]=useState('all')
  const[fType,setFType]=useState('all')
  const[editCustomer,setEditCustomer]=useState<Customer|null>(null)
  const[isCreating,setIsCreating]=useState(false)
  const[delTarget,setDelTarget]=useState<Customer|null>(null)
  const[editProject,setEditProject]=useState<{project:CustomerProject|null;customerId:number}|null>(null)
  const[visitingId,setVisitingId]=useState<number|null>(null)

  const load=useCallback(async()=>{try{const r=await customersApi.getAll();setCustomers(r.data)}catch(e){console.error(e)}finally{setLoading(false)}},[])
  useEffect(()=>{load()},[load])
  const loadProjects=async(id:number)=>{try{const r=await customerProjectsApi.getByCustomer(id);setProjects(p=>({...p,[id]:r.data}))}catch{setProjects(p=>({...p,[id]:[]}))}};
  const loadFiles=async(id:number)=>{try{const r=await customerFilesApi.getByCustomer(id);setFiles(f=>({...f,[id]:r.data}))}catch{setFiles(f=>({...f,[id]:[]}))}};
  const toggle=async(id:number)=>{const next=new Set(expanded);if(next.has(id)){next.delete(id)}else{next.add(id);if(!projects[id])await loadProjects(id);if(!files[id])await loadFiles(id)};setExpanded(next)}
  const switchToGantt=async()=>{setViewMode('gantt');for(const c of customers){if(!projects[c.id])await loadProjects(c.id)}}
  const switchToMeeting=async()=>{setMeetingMode(true);for(const c of customers){if(!projects[c.id])await loadProjects(c.id)}}

  // ★ 訪問登録（ワンクリックで今日の日付をセット）
  const handleQuickVisit=async(c:Customer)=>{
    setVisitingId(c.id)
    try{
      await customersApi.update(c.id,{
        name:c.name,industry:c.industry,primeType:c.primeType,partner:c.partner,
        modules:c.modules,version:c.version,proposalStatus:'',
        scMaintDate:c.scMaintDate,serverEnv:c.serverEnv,serverMaintDate:c.serverMaintDate,
        contact:c.contact,customerContact:c.customerContact,notes:c.notes,monthlyFee:c.monthlyFee,
        lastVisitDate:TODAY_STR,
      } as CustomerDto)
      await load()
    }catch{alert('訪問登録に失敗しました')}finally{setVisitingId(null)}
  }

  const filtered=useMemo(()=>{
    const ord:Urgency[]=['expired','critical','warning','caution','ok','none']
    return customers.filter(c=>{
      const q=search.toLowerCase()
      if(q&&!c.name.includes(q)&&!c.contact.includes(q)&&!(c.industry||'').includes(q))return false
      if(fContact!=='all'&&c.contact!==fContact)return false
      if(fType!=='all'&&c.primeType!==fType)return false
      if(fUrgency!=='all'){const u=cardUrgency(c);if(fUrgency==='expired'&&u!=='expired')return false;if(fUrgency==='critical'&&u!=='critical'&&u!=='expired')return false;if(fUrgency==='warning'&&u!=='warning')return false;if(fUrgency==='ok'&&u!=='ok'&&u!=='none'&&u!=='caution')return false}
      if(fVisit==='unvisited'&&isVisitedThisYear(c))return false
      if(fVisit==='visited'&&!isVisitedThisYear(c))return false
      return true
    }).sort((a,b)=>{
      if(meetingMode){const au=!isVisitedThisYear(a),bu=!isVisitedThisYear(b);if(au&&!bu)return-1;if(!au&&bu)return 1}
      return ord.indexOf(cardUrgency(a))-ord.indexOf(cardUrgency(b))
    })
  },[customers,search,fContact,fUrgency,fVisit,fType,meetingMode])

  const totalFee=customers.reduce((s,c)=>s+(c.monthlyFee??0),0)
  const criticalCount=customers.filter(c=>['expired','critical'].includes(cardUrgency(c))).length
  const activeCount=Object.values(projects).flat().filter(p=>p.status!=='完了'&&p.status!=='失注').length
  const unvisitedCount=customers.filter(c=>!isVisitedThisYear(c)).length
  const sel:React.CSSProperties={padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.82rem',color:'#0f172a',background:'white',outline:'none',cursor:'pointer'}

  return(
    <Layout>
      <div style={{maxWidth:meetingMode?1500:1400,margin:'0 auto',padding:meetingMode?'1rem 1.5rem':'1.5rem 2rem',fontFamily:'"Noto Sans JP",sans-serif',background:meetingMode?'#f0f4f8':undefined}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.25rem'}}>
          <div>
            <h2 style={{margin:0,fontSize:meetingMode?'1.4rem':'1.2rem',fontWeight:700,color:'#0f172a'}}>既存顧客管理</h2>
            {meetingMode&&<p style={{margin:'4px 0 0',fontSize:'0.85rem',color:'#64748b'}}>会議モード — {TODAY_STR} 未訪問: {unvisitedCount}社 / 計{customers.length}社</p>}
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            {!meetingMode&&(
              <div style={{display:'flex',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
                <button onClick={()=>setViewMode('tree')} style={{padding:'7px 14px',border:'none',background:viewMode==='tree'?'#0f172a':'white',color:viewMode==='tree'?'white':'#475569',fontWeight:600,fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit'}}>ツリー</button>
                <button onClick={switchToGantt} style={{padding:'7px 14px',border:'none',borderLeft:'1px solid #e2e8f0',background:viewMode==='gantt'?'#0f172a':'white',color:viewMode==='gantt'?'white':'#475569',fontWeight:600,fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit'}}>ガントチャート</button>
              </div>
            )}
            <button onClick={meetingMode?()=>setMeetingMode(false):switchToMeeting}
              style={{padding:'7px 16px',border:`2px solid ${meetingMode?'#7c3aed':'#e2e8f0'}`,borderRadius:8,background:meetingMode?'#7c3aed':'white',color:meetingMode?'white':'#475569',fontWeight:700,fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit'}}>
              {meetingMode?'✕ 会議モード終了':'🖥 会議モード'}
            </button>
            {!meetingMode&&<button onClick={()=>setIsCreating(true)} style={{padding:'8px 20px',background:'#0f172a',border:'none',borderRadius:8,color:'white',fontWeight:700,fontSize:'0.85rem',cursor:'pointer'}}>＋ 顧客を登録</button>}
          </div>
        </div>

        {/* サマリ */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:'1.25rem'}}>
          {[
            {label:'総顧客数',value:`${customers.length}`,unit:'社',color:'#0f172a'},
            {label:'要対応',value:`${criticalCount}`,unit:'社',color:'#dc2626'},
            {label:'進行中案件',value:`${activeCount}`,unit:'件',color:'#7c3aed'},
            {label:'今年未訪問',value:`${unvisitedCount}`,unit:'社',color:'#d97706',click:()=>setFVisit(fVisit==='unvisited'?'all':'unvisited')},
            {label:'月次保守料合計',value:totalFee?`¥${Math.round(totalFee/10000)}万`:'―',unit:'',color:'#059669'},
          ].map(s=>(
            <div key={s.label} onClick={(s as any).click} style={{background:s.label==='今年未訪問'&&fVisit==='unvisited'?'#fffbeb':'white',borderRadius:10,border:s.label==='今年未訪問'&&fVisit==='unvisited'?'2px solid #d97706':'1px solid #e2e8f0',padding:'12px 14px',cursor:(s as any).click?'pointer':undefined,transition:'all .15s'}}>
              <div style={{fontSize:'0.7rem',color:'#94a3b8',marginBottom:3}}>{s.label}{(s as any).click&&<span style={{fontSize:'0.62rem',marginLeft:4,color:'#d97706'}}>{fVisit==='unvisited'?'▶ 解除':'▶ 絞込'}</span>}</div>
              <div style={{fontSize:meetingMode?'1.5rem':'1.3rem',fontWeight:700,color:s.color}}>{s.value}<span style={{fontSize:'0.8rem',fontWeight:500,marginLeft:2}}>{s.unit}</span></div>
            </div>
          ))}
        </div>

        {/* フィルター */}
        <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
          <input style={{...sel,flex:1,minWidth:160,padding:'7px 12px'}} placeholder="顧客名・担当者・業種で検索..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <select style={sel} value={fContact} onChange={e=>setFContact(e.target.value)}><option value="all">全担当者</option>{CONTACTS.map(c=><option key={c}>{c}</option>)}</select>
          <select style={sel} value={fUrgency} onChange={e=>setFUrgency(e.target.value)}><option value="all">全保守状況</option><option value="expired">期限切れ</option><option value="critical">要対応</option><option value="warning">注意</option><option value="ok">正常</option></select>
          <select style={{...sel,background:fVisit!=='all'?'#fffbeb':'white',color:fVisit!=='all'?'#92400e':'#0f172a',fontWeight:fVisit!=='all'?700:400}} value={fVisit} onChange={e=>setFVisit(e.target.value)}>
            <option value="all">訪問: 全て</option>
            <option value="unvisited">📅 今年未訪問のみ</option>
            <option value="visited">✅ 今年訪問済みのみ</option>
          </select>
          {!meetingMode&&<select style={sel} value={fType} onChange={e=>setFType(e.target.value)}><option value="all">全種別</option><option value="プライム">プライム</option><option value="サブ">サブ</option></select>}
        </div>

        {/* コンテンツ */}
        {loading?<div style={{textAlign:'center',padding:'4rem',color:'#94a3b8'}}>読み込み中...</div>
          :viewMode==='gantt'&&!meetingMode?<CustomerGanttView customers={filtered} projects={projects} onProjectChange={loadProjects}/>
          :meetingMode?(
          <div style={{display:'flex',flexDirection:'column',gap:14}}>
            {filtered.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'#94a3b8'}}>条件に一致する顧客がありません</div>}
            {filtered.map(c=>(
              <MeetingCard key={c.id} customer={c} projects={projects[c.id]??[]}
                visiting={visitingId===c.id}
                onEdit={()=>setEditCustomer(c)}
                onVisit={()=>handleQuickVisit(c)}
                onAddProject={()=>setEditProject({project:null,customerId:c.id})}
                onEditProject={p=>setEditProject({project:p,customerId:c.id})}
                onDeleteProject={async pid=>{await customerProjectsApi.delete(pid);await loadProjects(c.id)}}/>
            ))}
          </div>
        ):(
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {filtered.length===0&&<div style={{textAlign:'center',padding:'3rem',color:'#94a3b8'}}>条件に一致する顧客がありません</div>}
            {filtered.map(c=>(
              <CustomerCard key={c.id} customer={c} projects={projects[c.id]??[]} files={files[c.id]??[]}
                expanded={expanded.has(c.id)} currentUser={user?.fullName||user?.username||''}
                visiting={visitingId===c.id}
                onToggle={()=>toggle(c.id)} onEdit={()=>setEditCustomer(c)} onDelete={()=>setDelTarget(c)}
                onVisit={()=>handleQuickVisit(c)}
                onAddProject={()=>setEditProject({project:null,customerId:c.id})}
                onEditProject={p=>setEditProject({project:p,customerId:c.id})}
                onDeleteProject={async pid=>{await customerProjectsApi.delete(pid);await loadProjects(c.id)}}
                onFilesChange={()=>loadFiles(c.id)}/>
            ))}
          </div>
        )}
      </div>

      {(isCreating||editCustomer)&&<CustomerFormModal customer={editCustomer} onClose={()=>{setIsCreating(false);setEditCustomer(null)}} onSave={async dto=>{if(editCustomer)await customersApi.update(editCustomer.id,dto);else await customersApi.create(dto);await load();setIsCreating(false);setEditCustomer(null)}}/>}
      {editProject&&<ProjectFormModal project={editProject.project} customerId={editProject.customerId} onClose={()=>setEditProject(null)} onSave={async dto=>{if(editProject.project)await customerProjectsApi.update(editProject.project.id,dto);else await customerProjectsApi.create(dto);await loadProjects(editProject.customerId);setEditProject(null)}}/>}
      {delTarget&&<ConfirmModal title="顧客を削除しますか？" message={`「${delTarget.name}」を削除します。\n関連する案件・添付ファイルも全て削除されます。`} onCancel={()=>setDelTarget(null)} onConfirm={async()=>{await customersApi.delete(delTarget.id);await load();setDelTarget(null)}}/>}
    </Layout>
  )
}

// ─── 訪問ステータスバッジ ─────────────────────────────────────
function VisitBadge({c,onVisit,visiting,size='sm'}:{c:Customer;onVisit:()=>void;visiting:boolean;size?:'sm'|'lg'}){
  const visited=isVisitedThisYear(c)
  const lv=getLastVisit(c)
  const dago=visitDaysAgo(c)
  const fs=size==='lg'?'0.82rem':'0.65rem'
  if(visited){
    return(
      <div style={{display:'flex',alignItems:'center',gap:4}}>
        <span style={{fontSize:fs,padding:size==='lg'?'4px 12px':'2px 8px',borderRadius:99,background:'#f0fdf4',color:'#15803d',fontWeight:700,border:'1px solid #bbf7d0'}}>
          ✅ 訪問済 {lv}
        </span>
        <button onClick={e=>{e.stopPropagation();onVisit()}} disabled={visiting} style={{fontSize:'0.6rem',padding:'1px 6px',border:'1px solid #bbf7d0',borderRadius:99,background:'white',color:'#64748b',cursor:'pointer',outline:'none',fontFamily:'inherit'}}>
          {visiting?'…':'更新'}
        </button>
      </div>
    )
  }
  return(
    <button onClick={e=>{e.stopPropagation();onVisit()}} disabled={visiting}
      style={{display:'flex',alignItems:'center',gap:4,fontSize:fs,padding:size==='lg'?'5px 14px':'2px 8px',borderRadius:99,background:'#faf5ff',color:'#7c3aed',fontWeight:700,border:'2px solid #ddd6fe',cursor:'pointer',outline:'none',fontFamily:'inherit',animation:visiting?'none':undefined}}>
      {visiting?'登録中…':'📅 今日 訪問済にする'}
    </button>
  )
}

// ─── 会議モードカード ─────────────────────────────────────────
function MeetingCard({customer:c,projects,visiting,onEdit,onVisit,onAddProject,onEditProject,onDeleteProject}:{
  customer:Customer;projects:CustomerProject[];visiting:boolean
  onEdit:()=>void;onVisit:()=>void;onAddProject:()=>void;onEditProject:(p:CustomerProject)=>void;onDeleteProject:(id:number)=>void
}){
  const u=cardUrgency(c),uc=URGENCY[u],mods=parseMods(c.modules)
  const su=getUrgency(c.serverMaintDate),sci=getUrgency(c.scMaintDate)
  const active=projects.filter(p=>p.status!=='完了'&&p.status!=='失注')
  const vBg=c.version==null?'#f1f5f9':c.version>=9?'#f0fdf4':c.version>=8?'#fffbeb':'#fef2f2'
  const vCol=c.version==null?'#94a3b8':c.version>=9?'#15803d':c.version>=8?'#b45309':'#dc2626'
  const visited=isVisitedThisYear(c)
  const dago=visitDaysAgo(c)

  return(
    <div style={{borderRadius:14,background:'white',border:`2px solid ${!visited?'#e9d5ff':visited?'#bbf7d0':'#e2e8f0'}`,overflow:'hidden',boxShadow:'0 4px 16px rgba(0,0,0,0.07)'}}>
      {/* ヘッダー */}
      <div style={{display:'flex',alignItems:'stretch'}}>
        <div style={{width:8,background:uc.bar,flexShrink:0}}/>
        <div style={{flex:1,padding:'14px 18px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6,flexWrap:'wrap'}}>
            <span style={{fontSize:'1.4rem',fontWeight:700,color:'#0f172a'}}>{c.name}</span>
            {(u==='expired'||u==='critical')&&<span style={{fontSize:'0.82rem',padding:'3px 12px',borderRadius:99,background:uc.badge,color:uc.bar,fontWeight:700,border:`1px solid ${uc.bar}40`}}>⚠️ {uc.label}</span>}
            {/* ★ 訪問ステータス（会議モードで大きく表示） */}
            <VisitBadge c={c} onVisit={onVisit} visiting={visiting} size="lg"/>
            <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
              <span style={{fontSize:'0.82rem',padding:'3px 12px',borderRadius:6,background:c.primeType==='プライム'?'#0f172a':'#f1f5f9',color:c.primeType==='プライム'?'white':'#475569',fontWeight:700}}>{c.primeType}</span>
              <span style={{fontSize:'0.82rem',padding:'3px 12px',borderRadius:6,background:vBg,color:vCol,fontWeight:700}}>{c.version!=null?`V${c.version}`:'Ver不明'}</span>
              {mods.map(m=><span key={m} style={{fontSize:'0.8rem',padding:'3px 10px',borderRadius:6,background:'#f1f5f9',color:'#475569'}}>{m}</span>)}
              <button onClick={onEdit} style={{width:34,height:34,border:'1px solid #e2e8f0',borderRadius:8,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.9rem',display:'flex',alignItems:'center',justifyContent:'center',outline:'none'}}>✏️</button>
            </div>
          </div>
          <div style={{fontSize:'0.92rem',color:'#64748b',display:'flex',gap:12,flexWrap:'wrap'}}>
            {c.industry&&<span>{c.industry}</span>}
            {/* ★ 顧客連絡担当（TCS）= contact フィールド */}
            <span>顧客連絡担当: <strong style={{color:'#334155'}}>{c.contact}</strong></span>
            {c.customerContact&&<span>顧客側担当: <strong style={{color:'#334155'}}>{c.customerContact}</strong></span>}
            {c.partner&&<span>パートナー: {c.partner}</span>}
          </div>
        </div>
      </div>

      {/* 情報3カラム */}
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',borderTop:'2px solid #f1f5f9'}}>
        <div style={{padding:'12px 18px',borderRight:'1px solid #f1f5f9'}}>
          <div style={{fontSize:'0.68rem',fontWeight:700,color:'#2563eb',letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:6}}>▍SC情報</div>
          <div style={{fontSize:'1rem',fontWeight:600,color:'#0f172a',marginBottom:3}}>{mods.join(' · ')||'不明'}</div>
          {c.scMaintDate&&<div style={{fontSize:'0.82rem',color:URGENCY[sci].bar,fontWeight:sci!=='none'&&sci!=='ok'?700:400}}>SC保守: {dateLabel(c.scMaintDate,sci)}</div>}
        </div>
        <div style={{padding:'12px 18px',borderRight:'1px solid #f1f5f9',background:su==='expired'||su==='critical'?`${URGENCY[su].badge}`:undefined}}>
          <div style={{fontSize:'0.68rem',fontWeight:700,color:URGENCY[su].bar,letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:6}}>▍サーバー</div>
          <div style={{fontSize:'1rem',fontWeight:600,color:'#0f172a',marginBottom:3}}>{c.serverEnv||'管理対象外'}</div>
          {c.serverMaintDate&&<div style={{fontSize:'0.82rem',color:URGENCY[su].bar,fontWeight:su!=='none'&&su!=='ok'?700:400}}>保守期限: {dateLabel(c.serverMaintDate,su)}</div>}
        </div>
        {/* ★ 最終訪問カラム */}
        <div style={{padding:'12px 18px',background:!visited?'#fdf4ff':undefined}}>
          <div style={{fontSize:'0.68rem',fontWeight:700,color:!visited?'#7c3aed':'#059669',letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:6}}>▍最終訪問（今年: {visited?'✅ 済':'❌ 未'}）</div>
          {getLastVisit(c)?(
            <>
              <div style={{fontSize:'1rem',fontWeight:600,color:'#0f172a',marginBottom:2}}>{getLastVisit(c)}</div>
              <div style={{fontSize:'0.82rem',color:dago&&dago>180?'#dc2626':'#64748b',fontWeight:dago&&dago>180?700:400}}>{dago!==null?`${dago}日前（約${Math.round(dago/30)}ヶ月前）`:''}</div>
            </>
          ):(
            <div style={{fontSize:'1rem',fontWeight:700,color:'#dc2626'}}>訪問記録なし</div>
          )}
          {c.monthlyFee!=null&&<div style={{fontSize:'0.85rem',fontWeight:700,color:'#059669',marginTop:4}}>¥{c.monthlyFee.toLocaleString()}/月</div>}
        </div>
      </div>

      {/* 案件チップ */}
      <div style={{padding:'10px 18px',borderTop:'1px solid #f1f5f9',display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',background:'#fafafa',minHeight:48}}>
        {active.length>0?(
          <>
            <span style={{fontSize:'0.82rem',color:'#475569',flexShrink:0,fontWeight:600}}>案件:</span>
            {active.map(p=>{
              const st=STATUS_STYLE[p.status]??STATUS_STYLE['提案中']
              const pas=assigneeList((p as any).assignees)
              return(
                <span key={p.id} style={{fontSize:'0.82rem',padding:'4px 10px',borderRadius:7,background:st.bg,color:st.color,border:`1px solid ${st.border}`,fontWeight:600,whiteSpace:'nowrap',display:'flex',alignItems:'center',gap:4}}>
                  <span style={{fontSize:'0.9rem'}}>{TYPE_ICON[p.projectType]??'📌'}</span>
                  {p.projectName.length>12?p.projectName.slice(0,12)+'…':p.projectName}·{p.status}
                  {/* ★ 案件担当者 */}
                  {pas.length>0&&<span style={{fontSize:'0.65rem',color:st.color,opacity:0.8}}>({pas.join(',')})</span>}
                </span>
              )
            })}
            <button onClick={onAddProject} style={{padding:'3px 9px',border:'1px dashed #d1d5db',borderRadius:6,background:'white',color:'#94a3b8',cursor:'pointer',fontSize:'0.75rem',outline:'none',fontFamily:'inherit'}}>＋</button>
          </>
        ):(<span style={{fontSize:'0.85rem',color:'#94a3b8'}}>進行中案件なし</span>)}
      </div>
      {c.notes&&<div style={{padding:'8px 18px',borderTop:'1px solid #f1f5f9',fontSize:'0.85rem',color:'#64748b',background:'#f8fafc'}}>💬 {c.notes}</div>}
    </div>
  )
}

// ─── 通常ツリーカード ─────────────────────────────────────────
function CustomerCard({customer:c,projects,files,expanded,currentUser,visiting,onToggle,onEdit,onDelete,onVisit,onAddProject,onEditProject,onDeleteProject,onFilesChange}:{
  customer:Customer;projects:CustomerProject[];files:CustomerFileItem[];expanded:boolean;currentUser:string;visiting:boolean
  onToggle:()=>void;onEdit:()=>void;onDelete:()=>void;onVisit:()=>void
  onAddProject:()=>void;onEditProject:(p:CustomerProject)=>void;onDeleteProject:(id:number)=>void;onFilesChange:()=>void
}){
  const[activeTab,setActiveTab]=useState<'projects'|'files'>('projects')
  const u=cardUrgency(c),uc=URGENCY[u],mods=parseMods(c.modules),su=getUrgency(c.serverMaintDate)
  const active=projects.filter(p=>p.status!=='完了'&&p.status!=='失注')
  const customerFiles=files.filter(f=>!f.projectId)
  const vBg=c.version==null?'#f1f5f9':c.version>=9?'#f0fdf4':c.version>=8?'#fffbeb':'#fef2f2'
  const vCol=c.version==null?'#94a3b8':c.version>=9?'#15803d':c.version>=8?'#b45309':'#dc2626'
  const visited=isVisitedThisYear(c)

  return(
    <div style={{borderRadius:12,background:'white',border:`1px solid ${!visited?'#ddd6fe':'#e2e8f0'}`,overflow:'hidden',boxShadow:expanded?'0 2px 16px rgba(0,0,0,0.06)':'none',transition:'box-shadow .2s'}}>
      <div style={{display:'flex',alignItems:'stretch'}}>
        <div style={{width:4,background:uc.bar,flexShrink:0}}/>
        <div onClick={onToggle} style={{flex:1,minWidth:0,padding:'11px 14px',display:'flex',alignItems:'center',gap:10,cursor:'pointer'}}>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:7,flexWrap:'wrap'}}>
              <span style={{fontSize:'0.95rem',fontWeight:700,color:'#0f172a'}}>{c.name}</span>
              {(u==='expired'||u==='critical')&&<span style={{fontSize:'0.63rem',padding:'1px 6px',borderRadius:99,background:uc.badge,color:uc.bar,fontWeight:700,border:`1px solid ${uc.bar}30`}}>{uc.label}</span>}
              {/* ★ 訪問状態（コンパクト表示） */}
              {visited
                ?<span style={{fontSize:'0.62rem',padding:'1px 6px',borderRadius:99,background:'#f0fdf4',color:'#15803d',fontWeight:700,border:'1px solid #bbf7d0'}}>✅ {getLastVisit(c)}</span>
                :<span style={{fontSize:'0.62rem',padding:'1px 6px',borderRadius:99,background:'#faf5ff',color:'#7c3aed',fontWeight:700,border:'1px solid #ddd6fe'}}>📅 未訪問</span>
              }
            </div>
            <div style={{fontSize:'0.72rem',color:'#94a3b8',marginTop:1}}>
              {c.industry&&<span style={{marginRight:8}}>{c.industry}</span>}
              {/* ★ 顧客連絡担当（TCS）ラベルを明確化 */}
              <span>連絡担当: {c.contact}</span>
              {c.customerContact&&<span style={{marginLeft:7}}>顧客担当: {c.customerContact}</span>}
            </div>
          </div>
          <div style={{display:'flex',gap:4,flexWrap:'wrap',alignItems:'center',flexShrink:0}}>
            <span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:4,background:c.primeType==='プライム'?'#0f172a':'#f1f5f9',color:c.primeType==='プライム'?'white':'#475569',fontWeight:700}}>{c.primeType}</span>
            <span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:4,background:vBg,color:vCol,fontWeight:700}}>{c.version!=null?`V${c.version}`:'Ver不明'}</span>
            {mods.map(m=><span key={m} style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:4,background:'#f1f5f9',color:'#475569',fontWeight:600}}>{m}</span>)}
            {c.serverEnv&&<span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:4,background:'#f1f5f9',color:'#475569',fontWeight:600}}>{c.serverEnv.includes('AWS')?'AWS':'オンプレ'}</span>}
            {active.length>0&&<span style={{fontSize:'0.65rem',padding:'2px 7px',borderRadius:4,background:'#f5f3ff',color:'#7c3aed',fontWeight:700}}>案件{active.length}</span>}
          </div>
          <div style={{color:'#cbd5e1',fontSize:'0.7rem',transform:expanded?'rotate(90deg)':'none',transition:'transform .2s',flexShrink:0}}>▶</div>
        </div>
        {/* 操作ボタン群 */}
        <div style={{display:'flex',alignItems:'center',gap:4,padding:'0 10px',borderLeft:'1px solid #f1f5f9'}}>
          {/* ★ 訪問登録ボタン */}
          {!visited&&(
            <button onClick={e=>{e.stopPropagation();onVisit()}} disabled={visiting}
              style={{padding:'4px 10px',border:'2px solid #ddd6fe',borderRadius:6,background:'#faf5ff',color:'#7c3aed',cursor:'pointer',fontSize:'0.7rem',fontWeight:700,outline:'none',fontFamily:'inherit',whiteSpace:'nowrap'}}>
              {visiting?'…':'📅 訪問済'}
            </button>
          )}
          <button onClick={e=>{e.stopPropagation();onEdit()}} style={{width:28,height:28,border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center',outline:'none'}}>✏️</button>
          <button onClick={e=>{e.stopPropagation();onDelete()}} style={{width:28,height:28,border:'1px solid #fecaca',borderRadius:6,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'0.75rem',display:'flex',alignItems:'center',justifyContent:'center',outline:'none'}}>🗑</button>
        </div>
      </div>

      {expanded&&(
        <div style={{borderTop:'1px solid #f1f5f9',display:'flex',minHeight:0}}>
          {/* 左: 顧客情報 */}
          <div style={{width:240,flexShrink:0,borderRight:'1px solid #f1f5f9',background:'#fafafa',padding:'12px 14px',fontSize:'0.78rem'}}>
            <CompactSection label="SC情報" color="#2563eb">
              <CKV label="モジュール" value={mods.join('・')||'―'}/>
              <CKV label="バージョン" value={c.version?`V${c.version}`:'不明'} vc={vCol}/>
              {c.scMaintDate&&<CKV label="SC保守" value={dateLabel(c.scMaintDate,getUrgency(c.scMaintDate))} vc={URGENCY[getUrgency(c.scMaintDate)].bar}/>}
            </CompactSection>
            <CompactSection label="サーバー" color={URGENCY[su].bar}>
              <CKV label="環境" value={c.serverEnv||'管理対象外'} vc={c.serverEnv?undefined:'#94a3b8'}/>
              <CKV label="保守期限" value={dateLabel(c.serverMaintDate,su)} vc={URGENCY[su].bar}/>
              {c.partner&&<CKV label="パートナー" value={c.partner}/>}
            </CompactSection>
            {/* ★ 担当者をラベルで明確化 */}
            <CompactSection label="担当者" color="#059669">
              <CKV label="連絡担当(TCS)" value={c.contact}/>
              {c.customerContact&&<CKV label="顧客側担当" value={c.customerContact}/>}
              {c.monthlyFee!=null&&<CKV label="保守料" value={`¥${c.monthlyFee.toLocaleString()}`}/>}
              {c.notes&&<CKV label="備考" value={c.notes}/>}
            </CompactSection>
            {/* ★ 訪問管理 */}
            <CompactSection label="訪問管理" color={visited?'#059669':'#7c3aed'}>
              {getLastVisit(c)?<CKV label="最終訪問" value={getLastVisit(c)!} vc={visited?'#15803d':'#7c3aed'}/>:<CKV label="最終訪問" value="記録なし" vc="#dc2626"/>}
              {visitDaysAgo(c)!==null&&<CKV label="経過" value={`${visitDaysAgo(c)}日前`}/>}
              <div style={{marginTop:6}}>
                <VisitBadge c={c} onVisit={onVisit} visiting={visiting} size="sm"/>
              </div>
            </CompactSection>
          </div>

          {/* 右: タブコンテンツ */}
          <div style={{flex:1,minWidth:0,display:'flex',flexDirection:'column'}}>
            <div style={{display:'flex',borderBottom:'1px solid #f1f5f9',background:'#fafafa',flexShrink:0}}>
              {[{key:'projects' as const,label:'案件・プロジェクト',count:projects.length,ac:active.length},{key:'files' as const,label:'顧客添付資料',count:customerFiles.length,ac:0}].map(t=>(
                <button key={t.key} onClick={()=>setActiveTab(t.key)} style={{padding:'8px 16px',border:'none',borderBottom:activeTab===t.key?'2px solid #0f172a':'2px solid transparent',background:'transparent',color:activeTab===t.key?'#0f172a':'#64748b',fontWeight:activeTab===t.key?700:500,fontSize:'0.78rem',cursor:'pointer',fontFamily:'inherit',display:'flex',alignItems:'center',gap:5}}>
                  {t.label}
                  {t.count>0&&<span style={{fontSize:'0.65rem',padding:'0 5px',borderRadius:99,background:activeTab===t.key?'#0f172a':'#e2e8f0',color:activeTab===t.key?'white':'#64748b',fontWeight:700}}>{t.count}</span>}
                  {t.ac>0&&<span style={{fontSize:'0.63rem',padding:'0 5px',borderRadius:99,background:'#f5f3ff',color:'#7c3aed',fontWeight:700}}>{t.ac}進行中</span>}
                </button>
              ))}
              <div style={{flex:1}}/>
              {activeTab==='projects'&&<button onClick={onAddProject} style={{margin:'6px 10px',padding:'4px 12px',border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.72rem',fontWeight:600,outline:'none',fontFamily:'inherit'}}>＋ 案件を追加</button>}
            </div>
            <div style={{flex:1,overflowY:'auto',maxHeight:340}}>
              {activeTab==='projects'&&(
                <div style={{padding:'8px 12px'}}>
                  {projects.length===0?<div style={{textAlign:'center',padding:'24px',color:'#94a3b8',fontSize:'0.8rem'}}>案件が登録されていません</div>:(
                    <>
                      {projects.length>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:8}}>{['提案中','商談中','受注','対応中','完了','失注'].map(s=>{const cnt=projects.filter(p=>p.status===s).length;if(!cnt)return null;const st=STATUS_STYLE[s];return<span key={s} style={{fontSize:'0.63rem',padding:'1px 7px',borderRadius:99,background:st.bg,color:st.color,border:`1px solid ${st.border}`,fontWeight:700}}>{s} {cnt}</span>})}</div>}
                      <div style={{display:'flex',flexDirection:'column',gap:4}}>
                        {projects.map(p=><ProjectRow key={p.id} project={p} customerId={c.id} allFiles={files} currentUser={currentUser} onEdit={()=>onEditProject(p)} onDelete={()=>onDeleteProject(p.id)} onFilesChange={onFilesChange}/>)}
                      </div>
                    </>
                  )}
                </div>
              )}
              {activeTab==='files'&&<div style={{padding:'8px 12px'}}><CompactFileSection customerId={c.id} projectId={null} allFiles={files} currentUser={currentUser} onFilesChange={onFilesChange}/></div>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function CompactSection({label,color,children}:{label:string;color:string;children:React.ReactNode}){return<div style={{marginBottom:10}}><div style={{display:'flex',alignItems:'center',gap:4,marginBottom:5}}><div style={{width:3,height:10,borderRadius:2,background:color}}/><span style={{fontSize:'0.63rem',fontWeight:700,color:'#64748b',letterSpacing:'0.05em',textTransform:'uppercase' as const}}>{label}</span></div><div style={{paddingLeft:7,display:'flex',flexDirection:'column',gap:3}}>{children}</div></div>}
function CKV({label,value,vc}:{label:string;value:string;vc?:string}){return<div style={{display:'flex',gap:6,alignItems:'baseline'}}><span style={{fontSize:'0.65rem',color:'#94a3b8',flexShrink:0,width:60}}>{label}</span><span style={{fontSize:'0.72rem',color:vc||'#334155',fontWeight:vc?600:400,lineHeight:1.3,wordBreak:'break-all'}}>{value}</span></div>}

// ─── 案件行 ───────────────────────────────────────────────────
function ProjectRow({project:p,customerId,allFiles,currentUser,onEdit,onDelete,onFilesChange}:{project:CustomerProject;customerId:number;allFiles:CustomerFileItem[];currentUser:string;onEdit:()=>void;onDelete:()=>void;onFilesChange:()=>void}){
  const[showFiles,setShowFiles]=useState(false)
  const[delTarget,setDelTarget]=useState<CustomerProject|null>(null)
  const sc=STATUS_STYLE[p.status]??STATUS_STYLE['提案中']
  const isActive=p.status!=='完了'&&p.status!=='失注'
  const projectFiles=allFiles.filter(f=>f.projectId===p.id)
  // ★ 案件担当者
  const pas=assigneeList((p as any).assignees)
  return(
    <div style={{border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden',background:isActive?'white':'#fafafa',opacity:isActive?1:0.75}}>
      <div style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px'}}>
        <span style={{fontSize:'0.82rem',flexShrink:0}}>{TYPE_ICON[p.projectType]??'📌'}</span>
        <div style={{flex:1,minWidth:0}}>
          <span style={{fontSize:'0.78rem',fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',display:'block'}}>{p.projectName}</span>
          {/* ★ 案件担当者をプロジェクト名の下に表示 */}
          {pas.length>0&&(
            <div style={{display:'flex',gap:3,marginTop:1,flexWrap:'wrap'}}>
              {pas.map(a=><span key={a} style={{fontSize:'0.6rem',padding:'0 5px',borderRadius:99,background:'#eff6ff',color:'#1d4ed8',fontWeight:600}}>{a}</span>)}
            </div>
          )}
        </div>
        <span style={{fontSize:'0.63rem',padding:'1px 6px',borderRadius:99,background:sc.bg,color:sc.color,border:`1px solid ${sc.border}`,fontWeight:700,flexShrink:0}}>{p.status}</span>
        <span style={{fontSize:'0.65rem',color:'#94a3b8',flexShrink:0}}>{p.projectType}</span>
        {p.expectedEndDate&&<span style={{fontSize:'0.65rem',color:'#94a3b8',flexShrink:0}}>📅 {p.expectedEndDate}</span>}
        {p.amount!=null&&<span style={{fontSize:'0.65rem',color:'#94a3b8',flexShrink:0}}>💴 ¥{p.amount.toLocaleString()}</span>}
        <button onClick={()=>setShowFiles(v=>!v)} style={{display:'flex',alignItems:'center',gap:2,padding:'2px 7px',border:'1px solid #e2e8f0',borderRadius:4,background:showFiles?'#f0f9ff':'white',color:showFiles?'#0369a1':'#64748b',cursor:'pointer',fontSize:'0.65rem',fontWeight:600,outline:'none',fontFamily:'inherit',flexShrink:0}}>📎{projectFiles.length>0&&<span style={{background:'#0369a1',color:'white',borderRadius:99,padding:'0 3px',fontSize:'0.58rem'}}>{projectFiles.length}</span>}</button>
        <button onClick={onEdit} style={{width:22,height:22,border:'1px solid #e2e8f0',borderRadius:4,background:'white',color:'#64748b',cursor:'pointer',fontSize:'0.62rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✏</button>
        <button onClick={()=>setDelTarget(p)} style={{width:22,height:22,border:'1px solid #fecaca',borderRadius:4,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'0.62rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
      </div>
      {p.description&&<div style={{padding:'0 10px 7px 34px',fontSize:'0.7rem',color:'#64748b',lineHeight:1.4}}>{p.description}</div>}
      {showFiles&&<div style={{borderTop:'1px solid #f1f5f9',padding:'8px 10px 8px 28px',background:'#f8fafc'}}><CompactFileSection customerId={customerId} projectId={p.id} allFiles={allFiles} currentUser={currentUser} onFilesChange={onFilesChange}/></div>}
      {delTarget&&<ConfirmModal title="案件を削除しますか？" message={`「${delTarget.projectName}」を削除します。\nこの操作は元に戻せません。`} onCancel={()=>setDelTarget(null)} onConfirm={async()=>{await onDelete();setDelTarget(null)}}/>}
    </div>
  )
}

function CompactFileSection({customerId,projectId,allFiles,currentUser,onFilesChange}:{customerId:number;projectId:number|null;allFiles:CustomerFileItem[];currentUser:string;onFilesChange:()=>void}){
  const[uploading,setUploading]=useState(false)
  const[dragOver,setDragOver]=useState(false)
  const[delTarget,setDelTarget]=useState<CustomerFileItem|null>(null)
  const fileInputRef=useRef<HTMLInputElement>(null)
  const displayFiles=projectId===null?allFiles.filter(f=>!f.projectId):allFiles.filter(f=>f.projectId===projectId)
  const handleFiles=async(fl:FileList|null)=>{if(!fl||fl.length===0)return;setUploading(true);try{for(const f of Array.from(fl))await customerFilesApi.upload(customerId,f,undefined,currentUser,projectId??undefined);onFilesChange()}catch{alert('アップロードに失敗しました')}finally{setUploading(false);if(fileInputRef.current)fileInputRef.current.value=''}}
  return(
    <div>
      <div onDragOver={e=>{e.preventDefault();setDragOver(true)}} onDragLeave={()=>setDragOver(false)} onDrop={e=>{e.preventDefault();setDragOver(false);handleFiles(e.dataTransfer.files)}} style={{display:'flex',alignItems:'center',gap:8,marginBottom:displayFiles.length>0?6:0}}>
        <input ref={fileInputRef} type="file" multiple style={{display:'none'}} onChange={e=>handleFiles(e.target.files)}/>
        <button onClick={()=>fileInputRef.current?.click()} disabled={uploading} style={{display:'flex',alignItems:'center',gap:4,padding:'4px 10px',border:`1px dashed ${dragOver?'#0369a1':'#d1d5db'}`,borderRadius:6,background:dragOver?'#f0f9ff':'white',color:dragOver?'#0369a1':'#64748b',cursor:'pointer',fontSize:'0.72rem',fontWeight:600,outline:'none',fontFamily:'inherit'}}>{uploading?'アップロード中...':'📎 ファイルを追加'}</button>
        <span style={{fontSize:'0.62rem',color:'#94a3b8'}}>またはドロップ（最大20MB）</span>
      </div>
      {displayFiles.length>0&&<div style={{display:'flex',flexDirection:'column',gap:3}}>{displayFiles.map(f=>(
        <div key={f.id} style={{display:'flex',alignItems:'center',gap:7,padding:'5px 8px',background:'white',borderRadius:6,border:'1px solid #e2e8f0'}}>
          <span style={{fontSize:'0.9rem',flexShrink:0}}>{fileIcon(f.fileType,f.fileName)}</span>
          <a href={customerFilesApi.getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer" style={{flex:1,minWidth:0,fontSize:'0.74rem',fontWeight:600,color:'#0369a1',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onMouseEnter={e=>(e.currentTarget.style.textDecoration='underline')} onMouseLeave={e=>(e.currentTarget.style.textDecoration='none')}>{f.fileName}</a>
          <span style={{fontSize:'0.62rem',color:'#94a3b8',flexShrink:0,whiteSpace:'nowrap'}}>{formatSize(f.fileSize)}</span>
          <span style={{fontSize:'0.62rem',color:'#94a3b8',flexShrink:0,whiteSpace:'nowrap'}}>{f.createdAt.slice(0,10)}</span>
          <a href={customerFilesApi.getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer" style={{width:22,height:22,border:'1px solid #bae6fd',borderRadius:4,background:'#f0f9ff',color:'#0369a1',textDecoration:'none',fontSize:'0.68rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} title="開く">↗</a>
          <a href={customerFilesApi.getDownloadUrl(f.id)} download={f.fileName} style={{width:22,height:22,border:'1px solid #d1fae5',borderRadius:4,background:'#f0fdf4',color:'#059669',textDecoration:'none',fontSize:'0.68rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} title="ダウンロード">↓</a>
          <button onClick={()=>setDelTarget(f)} style={{width:22,height:22,border:'1px solid #fecaca',borderRadius:4,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'0.62rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}} title="削除">✕</button>
        </div>
      ))}</div>}
      {delTarget&&<ConfirmModal title="ファイルを削除しますか？" message={`「${delTarget.fileName}」を削除します。\nこの操作は元に戻せません。`} onCancel={()=>setDelTarget(null)} onConfirm={async()=>{await customerFilesApi.delete(delTarget.id);onFilesChange();setDelTarget(null)}}/>}
    </div>
  )
}

// ─── 顧客フォームモーダル ─────────────────────────────────────
function CustomerFormModal({customer,onClose,onSave}:{customer:Customer|null;onClose:()=>void;onSave:(dto:CustomerDto)=>Promise<void>}){
  const lv=(customer as any)?.lastVisitDate as string|null|undefined
  const[form,setForm]=useState<CustomerDto>(customer?{
    name:customer.name,industry:customer.industry,primeType:customer.primeType,partner:customer.partner,
    modules:customer.modules,version:customer.version,proposalStatus:'',
    scMaintDate:customer.scMaintDate,serverEnv:customer.serverEnv,serverMaintDate:customer.serverMaintDate,
    contact:customer.contact,customerContact:customer.customerContact,notes:customer.notes,monthlyFee:customer.monthlyFee,
    lastVisitDate:lv??null,
  }:{...EMPTY_CUSTOMER})
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const set=(k:keyof CustomerDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))
  const handleSave=async()=>{if(!form.name.trim()){setError('顧客名は必須です');return};setSaving(true);try{await onSave(form)}catch{setError('保存に失敗しました');setSaving(false)}}
  const inp:React.CSSProperties={width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:'0.85rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.72rem',fontWeight:700,color:'#64748b',marginBottom:4}
  const fld:React.CSSProperties={marginBottom:'0.85rem'}
  return(
    <Modal title={customer?'顧客情報を編集':'新規顧客を登録'} onClose={onClose} onSave={handleSave} saving={saving} error={error}>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
        <div style={fld}><label style={lbl}>顧客名 *</label><input style={inp} value={form.name} onChange={e=>set('name',e.target.value)} placeholder="例：シマブン"/></div>
        <div style={fld}><label style={lbl}>業種</label><input style={inp} value={form.industry??''} onChange={e=>set('industry',e.target.value)} placeholder="例：食品製造"/></div>
        <div style={fld}><label style={lbl}>プライム / サブ</label><select style={inp} value={form.primeType} onChange={e=>set('primeType',e.target.value)}><option>プライム</option><option>サブ</option></select></div>
        <div style={fld}><label style={lbl}>パートナー</label><input style={inp} value={form.partner??''} onChange={e=>set('partner',e.target.value)}/></div>
        <div style={fld}><label style={lbl}>SCモジュール</label><select style={inp} value={form.modules} onChange={e=>set('modules',e.target.value)}>{MODULE_OPTIONS.map(m=><option key={m}>{m}</option>)}</select></div>
        <div style={fld}><label style={lbl}>バージョン</label><input style={inp} type="number" step="0.1" value={form.version??''} onChange={e=>set('version',e.target.value?+e.target.value:null)} placeholder="例：9"/></div>
        <div style={fld}><label style={lbl}>月次保守料（円）</label><input style={inp} type="number" value={form.monthlyFee??''} onChange={e=>set('monthlyFee',e.target.value?+e.target.value:null)}/></div>
        <div style={fld}><label style={lbl}>最終訪問日 (YYYY/MM/DD)</label><input style={inp} value={(form as any).lastVisitDate??''} onChange={e=>set('lastVisitDate' as any,e.target.value)} placeholder="例：2026/03/15"/></div>
      </div>
      <div style={{borderTop:'1px solid #f1f5f9',paddingTop:'0.85rem',marginBottom:'0.85rem'}}>
        <div style={{fontSize:'0.68rem',fontWeight:700,color:'#94a3b8',marginBottom:'0.7rem',letterSpacing:'0.06em',textTransform:'uppercase' as const}}>サーバー情報</div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
          <div style={fld}><label style={lbl}>サーバー環境</label><select style={inp} value={form.serverEnv??''} onChange={e=>set('serverEnv',e.target.value)}><option value="">（なし）</option>{SERVER_ENVS.map(s=><option key={s}>{s}</option>)}</select></div>
          <div style={fld}><label style={lbl}>サーバー保守期限 (YYYY/MM/DD)</label><input style={inp} value={form.serverMaintDate??''} onChange={e=>set('serverMaintDate',e.target.value)} placeholder="例：2026/09/30"/></div>
          <div style={fld}><label style={lbl}>SC保守期限 (YYYY/MM/DD)</label><input style={inp} value={form.scMaintDate??''} onChange={e=>set('scMaintDate',e.target.value)} placeholder="例：2027/03/31"/></div>
        </div>
      </div>
      <div style={{borderTop:'1px solid #f1f5f9',paddingTop:'0.85rem'}}>
        {/* ★ 担当者の役割を明確化 */}
        <div style={{fontSize:'0.68rem',fontWeight:700,color:'#94a3b8',marginBottom:'0.7rem',letterSpacing:'0.06em',textTransform:'uppercase' as const}}>担当者（顧客との連絡窓口）</div>
        <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:8,padding:'8px 12px',marginBottom:'0.75rem',fontSize:'0.75rem',color:'#0369a1'}}>
          💡 ここで設定する担当者は「顧客との主な連絡窓口（年次訪問担当）」です。案件ごとの担当者は案件フォームで、作業ごとの担当者は作業管理ページで設定します。
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
          <div style={fld}><label style={lbl}>TCS連絡担当者</label><select style={inp} value={form.contact} onChange={e=>set('contact',e.target.value)}>{CONTACTS.map(c=><option key={c}>{c}</option>)}</select></div>
          <div style={fld}><label style={lbl}>顧客側担当者</label><input style={inp} value={form.customerContact??''} onChange={e=>set('customerContact',e.target.value)} placeholder="例：濱様"/></div>
        </div>
        <div style={fld}><label style={lbl}>備考</label><textarea style={{...inp,resize:'vertical',minHeight:72}} value={form.notes??''} onChange={e=>set('notes',e.target.value)}/></div>
      </div>
    </Modal>
  )
}

// ─── 案件フォームモーダル（担当者追加） ──────────────────────
function ProjectFormModal({project,customerId,onClose,onSave}:{project:CustomerProject|null;customerId:number;onClose:()=>void;onSave:(dto:CustomerProjectDto)=>Promise<void>}){
  const pas=assigneeList((project as any)?.assignees)
  const[form,setForm]=useState<CustomerProjectDto>(project?{customerId,projectName:project.projectName,projectType:project.projectType,status:project.status,description:project.description,startDate:project.startDate,expectedEndDate:project.expectedEndDate,amount:project.amount}:{customerId,projectName:'',projectType:'その他',status:'提案中',description:null,startDate:null,expectedEndDate:null,amount:null})
  const[assigneeSet,setAssigneeSet]=useState<Set<string>>(new Set(pas))
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const set=(k:keyof CustomerProjectDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))
  const toggleA=(a:string)=>{const n=new Set(assigneeSet);n.has(a)?n.delete(a):n.add(a);setAssigneeSet(n)}
  const handleSave=async()=>{
    if(!form.projectName.trim()){setError('案件名は必須です');return}
    setSaving(true)
    try{await onSave({...form,assignees:Array.from(assigneeSet).join(',')} as any)}catch{setError('保存に失敗しました');setSaving(false)}
  }
  const inp:React.CSSProperties={width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:'0.85rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.72rem',fontWeight:700,color:'#64748b',marginBottom:4}
  const fld:React.CSSProperties={marginBottom:'0.85rem'}
  return(
    <Modal title={project?'案件を編集':'案件を追加'} onClose={onClose} onSave={handleSave} saving={saving} error={error} maxWidth={500}>
      <div style={fld}><label style={lbl}>案件名 *</label><input style={inp} value={form.projectName} onChange={e=>set('projectName',e.target.value)} placeholder="例：サーバーリプレイス提案"/></div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
        <div style={fld}><label style={lbl}>種別</label><select style={inp} value={form.projectType} onChange={e=>set('projectType',e.target.value)}>{PROJECT_TYPES.map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.status} onChange={e=>set('status',e.target.value)}>{PROJECT_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
        <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} value={form.startDate??''} onChange={e=>set('startDate',e.target.value)} placeholder="例：2026/05/01"/></div>
        <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} value={form.expectedEndDate??''} onChange={e=>set('expectedEndDate',e.target.value)} placeholder="例：2026/09/30"/></div>
        <div style={fld}><label style={lbl}>金額（円）</label><input style={inp} type="number" value={form.amount??''} onChange={e=>set('amount',e.target.value?+e.target.value:null)}/></div>
      </div>
      {/* ★ 案件担当者チェックボックス */}
      <div style={fld}>
        <label style={lbl}>案件担当者（複数選択可）</label>
        <div style={{background:'#f0f9ff',border:'1px solid #bae6fd',borderRadius:6,padding:'6px 10px',marginBottom:6,fontSize:'0.72rem',color:'#0369a1'}}>
          💡 この案件の推進・対応を担当するTCSメンバーを選択
        </div>
        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,background:'#f8fafc'}}>
          {CONTACTS.map(a=>{const checked=assigneeSet.has(a);return(
            <label key={a} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:5,cursor:'pointer',background:checked?'#eff6ff':'white',border:`1px solid ${checked?'#bfdbfe':'#e2e8f0'}`}}>
              <input type="checkbox" checked={checked} onChange={()=>toggleA(a)} style={{width:13,height:13,accentColor:'#1d4ed8',cursor:'pointer',flexShrink:0}}/>
              <span style={{fontSize:'0.73rem',fontWeight:checked?700:400,color:checked?'#1d4ed8':'#334155'}}>{a}</span>
            </label>
          )})}
        </div>
      </div>
      <div style={fld}><label style={lbl}>詳細・メモ</label><textarea style={{...inp,resize:'vertical',minHeight:80}} value={form.description??''} onChange={e=>set('description',e.target.value)} placeholder="提案内容・進捗メモ"/></div>
    </Modal>
  )
}

function Modal({title,onClose,onSave,saving,error,maxWidth=640,children}:{title:string;onClose:()=>void;onSave:()=>void;saving:boolean;error:string;maxWidth?:number;children:React.ReactNode}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.18)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.1rem 1.4rem',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <h3 style={{margin:0,fontSize:'0.95rem',fontWeight:700,color:'#0f172a'}}>{title}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#94a3b8',outline:'none'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'1.1rem 1.4rem'}}>
          {error&&<div style={{background:'#fef2f2',color:'#dc2626',padding:'8px 12px',borderRadius:6,fontSize:'0.8rem',marginBottom:'1rem',border:'1px solid #fecaca'}}>{error}</div>}
          {children}
        </div>
        <div style={{display:'flex',gap:8,padding:'0.85rem 1.4rem',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:'9px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontSize:'0.85rem',fontFamily:'inherit',outline:'none'}}>キャンセル</button>
          <button onClick={onSave} disabled={saving} style={{flex:2,padding:'9px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontSize:'0.88rem',opacity:saving?0.6:1,fontFamily:'inherit',outline:'none'}}>{saving?'保存中...':'保存する'}</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmModal({title,message,onCancel,onConfirm}:{title:string;message:string;onCancel:()=>void;onConfirm:()=>void}){
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}}>
      <div style={{background:'white',borderRadius:14,padding:'1.75rem',maxWidth:380,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{fontSize:'1.6rem',textAlign:'center',marginBottom:'0.75rem'}}>⚠️</div>
        <h3 style={{margin:'0 0 0.75rem',fontSize:'1rem',color:'#0f172a',textAlign:'center'}}>{title}</h3>
        <div style={{margin:'0 0 1.5rem',textAlign:'center',color:'#475569',fontSize:'0.85rem',lineHeight:1.6,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'10px 14px',whiteSpace:'pre-wrap'}}>{message}</div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={onCancel} style={{flex:1,padding:'9px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button>
          <button onClick={onConfirm} style={{flex:1,padding:'9px',border:'none',borderRadius:7,background:'#dc2626',color:'white',cursor:'pointer',fontWeight:700,fontFamily:'inherit',outline:'none'}}>削除する</button>
        </div>
      </div>
    </div>
  )
}
