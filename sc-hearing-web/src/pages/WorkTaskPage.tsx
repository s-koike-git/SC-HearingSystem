import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import { workTasksApi, customerProjectsApi, customersApi, type WorkTask, type WorkTaskDto, type Customer, type CustomerProject } from '../services/api'

// ─── マスタ取得フック（APIが使えない場合はデフォルト値） ────────
const API_BASE = '/sc-hearing/api'
function useMasterValues(category: string, defaults: string[]): string[] {
  const [values, setValues] = useState<string[]>(defaults)
  useEffect(() => {
    fetch(`${API_BASE}/MasterItems/category/${category}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.length) setValues(data.map((m: any) => m.value)) })
      .catch(() => {})
  }, [category])
  return values
}


// ─── 日付変換ユーティリティ ──────────────────────────────────
const toDateInput = (s: string|null|undefined): string => s ? s.replace(/\//g, '-') : ''
const fromDateInput = (s: string): string|null => s ? s.replace(/-/g, '/') : null

const DEF_CONTACTS = ['永田 暁洋','岸本 健二','小池 慎郁','成清 祐介','西山 悠太','赤星 美和子']
const DEF_CATEGORIES = ['自社','NBS','内田洋行','その他']
const DEF_STATUSES = ['未着手','進行中','完了']
const DEF_PRIORITIES = ['高','中','低']

const TODAY = new Date('2026-05-11')
const ROW_H = 56, HDR_H = 44, HDR_H_DAY = 72, NAME_COL = 340

const STATUS_STYLE: Record<string,{bg:string;color:string;border:string;bar:string}> = {
  '未着手':{bg:'#f1f5f9',color:'#64748b',border:'#e2e8f0',bar:'#94a3b8'},
  '進行中':{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe',bar:'#3b82f6'},
  '完了':{bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0',bar:'#10b981'},
}
const PRIORITY_STYLE: Record<string,{bg:string;color:string}> = {
  '高':{bg:'#fef2f2',color:'#dc2626'},'中':{bg:'#fffbeb',color:'#d97706'},'低':{bg:'#f8fafc',color:'#94a3b8'},
}
const CATEGORY_COLOR: Record<string,string> = {'自社':'#1e40af','NBS':'#6d28d9','内田洋行':'#0369a1','その他':'#475569'}

type Scale = '1m'|'3m'|'6m'|'1y'|'all'
const SCALE_LABELS: Record<Scale,string> = {'1m':'1ヶ月(日)','3m':'3ヶ月','6m':'6ヶ月','1y':'1年','all':'全期間'}
const SCALE_MONTHS: Record<Scale,number> = {'1m':1,'3m':3,'6m':6,'1y':12,'all':0}
const SCALE_NAV: Record<Scale,number> = {'1m':1,'3m':1,'6m':3,'1y':6,'all':0}
const WEEKDAY_JA = ['日','月','火','水','木','金','土']

function parseDate(s:string|null):Date|null{if(!s)return null;const p=s.split('/');return p.length===3?new Date(+p[0],+p[1]-1,+p[2]):null}
function addMonths(d:Date,n:number){return new Date(d.getFullYear(),d.getMonth()+n,1)}
function addDays(d:Date,n:number){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function startOfMonth(d:Date){return new Date(d.getFullYear(),d.getMonth(),1)}
function endOfMonth(d:Date){return new Date(d.getFullYear(),d.getMonth()+1,0)}
function daysBetween(a:Date,b:Date){return(b.getTime()-a.getTime())/86400000}
function formatMonth(d:Date){return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`}
function fmt(d:Date){return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}
function daysLeft(s:string|null):number|null{const d=parseDate(s);if(!d)return null;return Math.round((d.getTime()-TODAY.getTime())/86400000)}
function assigneeList(s:string):string[]{return s.split(',').map(a=>a.trim()).filter(Boolean)}
function fileIcon(t:string,n:string){const e=n.split('.').pop()?.toLowerCase()??'';if(t.includes('pdf')||e==='pdf')return'📄';if(['docx','doc'].includes(e))return'📝';if(['xlsx','xls'].includes(e))return'📊';if(['pptx','ppt'].includes(e))return'📋';if(t.includes('image')||['jpg','jpeg','png','webp'].includes(e))return'🖼️';return'📎'}
function formatSize(b:number){return b<1024?`${b}B`:b<1048576?`${(b/1024).toFixed(1)}KB`:`${(b/1048576).toFixed(1)}MB`}

// ─── ファイルAPI ─────────────────────────────────────────────
interface WorkTaskFileItem{id:number;workTaskId:number;fileName:string;fileType:string;fileSize:number;uploadedBy:string;createdAt:string}
const wtFilesApi={
  getByTask:(id:number)=>fetch(`${API_BASE}/WorkTaskFiles/task/${id}`).then(r=>r.json()) as Promise<WorkTaskFileItem[]>,
  upload:async(taskId:number,file:File,uploadedBy:string)=>{const fd=new FormData();fd.append('file',file);fd.append('uploadedBy',uploadedBy);const r=await fetch(`${API_BASE}/WorkTaskFiles/task/${taskId}`,{method:'POST',body:fd});return r.json()},
  downloadUrl:(id:number)=>`${API_BASE}/WorkTaskFiles/${id}/download`,
  delete:(id:number)=>fetch(`${API_BASE}/WorkTaskFiles/${id}`,{method:'DELETE'}),
}

const EMPTY_TASK: WorkTaskDto = {No:0,Category:'自社',Assignees:'',CustomerName:'',TaskName:'',Status:'未着手',StartDate:null,PlannedEndDate:null,ActualEndDate:null,Progress:0,Priority:'中',Notes:'',Deliverable:'',ProjectId:null}

// ═══════════════════════════════════════════════════════════════
// メインページ
// ═══════════════════════════════════════════════════════════════
export default function WorkTaskPage(){
  const[tasks,setTasks]=useState<WorkTask[]>([])
  const[customers,setCustomers]=useState<Customer[]>([])
  const[allProjects,setAllProjects]=useState<CustomerProject[]>([])
  const[loading,setLoading]=useState(true)
  const[viewMode,setViewMode]=useState<'table'|'gantt'>('table')
  const[sortField,setSortField]=useState<string>('no')
  const[sortDir,setSortDir]=useState<'asc'|'desc'>('asc')
  const[showFilter,setShowFilter]=useState(false)
  const EMPTY_WF={statuses:[] as string[],assignees:[] as string[],categories:[] as string[],priorities:[] as string[],startFrom:'',startTo:'',endFrom:'',endTo:'',progressMin:0,progressMax:100,customer:''}
  const[wf,setWf]=useState(EMPTY_WF)
  const activeFilterCount=[wf.statuses.length>0,wf.assignees.length>0,wf.categories.length>0,wf.priorities.length>0,!!(wf.startFrom||wf.startTo),!!(wf.endFrom||wf.endTo),wf.progressMin>0||wf.progressMax<100,!!wf.customer].filter(Boolean).length
  const[search,setSearch]=useState('')
  const[fStatus,setFStatus]=useState('all')
  const[fAssignee,setFAssignee]=useState('all')
  const[fCategory,setFCategory]=useState('all')
  const[fPriority,setFPriority]=useState('all')
  const handleSort=(field:string)=>{
    if(sortField===field){setSortDir(d=>d==='asc'?'desc':'asc')}
    else{setSortField(field);setSortDir('asc')}
  }
  const sortIcon=(field:string)=>sortField===field?(sortDir==='asc'?'▲':'▼'):'⇅'
  const[editTask,setEditTask]=useState<WorkTask|null>(null)
  const[isCreating,setIsCreating]=useState(false)
  const[delTarget,setDelTarget]=useState<WorkTask|null>(null)

  // マスタ値（APIから動的取得）
  const contacts=useMasterValues('tcs_contact',DEF_CONTACTS)
  const categories=useMasterValues('work_category',DEF_CATEGORIES)
  const statuses=useMasterValues('work_status',DEF_STATUSES)
  const priorities=useMasterValues('work_priority',DEF_PRIORITIES)

  const load=useCallback(async()=>{
    try{
      const[tr,cr]=await Promise.all([workTasksApi.getAll(),customersApi.getAll()])
      setTasks(tr.data);setCustomers(cr.data)
      const all:CustomerProject[]=[]
      for(const c of cr.data){try{const r=await customerProjectsApi.getByCustomer(c.id);all.push(...r.data)}catch{}}
      setAllProjects(all)
    }catch(e){console.error(e)}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  const filtered=useMemo(()=>tasks.filter(t=>{
    const q=search.toLowerCase()
    if(q&&!t.taskName.toLowerCase().includes(q)&&!t.customerName.toLowerCase().includes(q)&&!t.assignees.toLowerCase().includes(q))return false
    if(wf.statuses.length>0&&!wf.statuses.includes(t.status))return false
    if(wf.assignees.length>0&&!wf.assignees.some(a=>t.assignees.includes(a)))return false
    if(wf.categories.length>0&&!wf.categories.includes(t.category))return false
    if(wf.priorities.length>0&&!wf.priorities.includes(t.priority))return false
    if(wf.customer&&!t.customerName.toLowerCase().includes(wf.customer.toLowerCase()))return false
    if(wf.startFrom&&(t.startDate||'')<wf.startFrom.replace(/-/g,'/'))return false
    if(wf.startTo&&(t.startDate||'')>wf.startTo.replace(/-/g,'/'))return false
    if(wf.endFrom&&(t.plannedEndDate||'')<wf.endFrom.replace(/-/g,'/'))return false
    if(wf.endTo&&(t.plannedEndDate||'')>wf.endTo.replace(/-/g,'/'))return false
    const prog=Math.round(t.progress*100)
    if(prog<wf.progressMin||prog>wf.progressMax)return false
    return true
  }).sort((a,b)=>{
    const dir=sortDir==='asc'?1:-1
    switch(sortField){
      case 'no':     return(a.no-b.no)*dir
      case 'category':return a.category.localeCompare(b.category,'ja')*dir
      case 'customer':return(a.customerName||'').localeCompare(b.customerName||'','ja')*dir
      case 'taskName':return a.taskName.localeCompare(b.taskName,'ja')*dir
      case 'assignees':return a.assignees.localeCompare(b.assignees,'ja')*dir
      case 'status':{const o=['未着手','進行中','完了'];return(o.indexOf(a.status)-o.indexOf(b.status))*dir}
      case 'startDate':return((a.startDate||'').localeCompare(b.startDate||''))*dir
      case 'endDate':  return((a.plannedEndDate||'').localeCompare(b.plannedEndDate||''))*dir
      case 'progress':return(a.progress-b.progress)*dir
      case 'priority':{const o=['高','中','低'];return(o.indexOf(a.priority)-o.indexOf(b.priority))*dir}
      default:return 0
    }
  }),[tasks,search,wf,sortField,sortDir])

  const stats=useMemo(()=>({total:tasks.length,inProgress:tasks.filter(t=>t.status==='進行中').length,done:tasks.filter(t=>t.status==='完了').length,overdue:tasks.filter(t=>{const dl=daysLeft(t.plannedEndDate);return t.status!=='完了'&&dl!==null&&dl<0}).length}),[tasks])
  const sel:React.CSSProperties={padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.8rem',color:'#0f172a',background:'white',outline:'none',cursor:'pointer'}

  return(
    <Layout>
      <div style={{maxWidth:1600,margin:'0 auto',padding:'1.5rem 2rem',fontFamily:'"Noto Sans JP",sans-serif'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:'1.5rem'}}>
          <div>
            <h2 style={{margin:0,fontSize:'1.2rem',fontWeight:700,color:'#0f172a'}}>作業管理</h2>
            <p style={{margin:'3px 0 0',fontSize:'0.78rem',color:'#64748b'}}>担当タスク・スケジュール・進捗を一元管理</p>
          </div>
          <div style={{display:'flex',gap:8,alignItems:'center'}}>
            <div style={{display:'flex',border:'1px solid #e2e8f0',borderRadius:8,overflow:'hidden'}}>
              <button onClick={()=>setViewMode('table')} style={{padding:'7px 14px',border:'none',background:viewMode==='table'?'#0f172a':'white',color:viewMode==='table'?'white':'#475569',fontWeight:600,fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit'}}>テーブル</button>
              <button onClick={()=>setViewMode('gantt')} style={{padding:'7px 14px',border:'none',borderLeft:'1px solid #e2e8f0',background:viewMode==='gantt'?'#0f172a':'white',color:viewMode==='gantt'?'white':'#475569',fontWeight:600,fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit'}}>ガント</button>
            </div>
            <button onClick={()=>setIsCreating(true)} style={{padding:'8px 20px',background:'#0f172a',border:'none',borderRadius:8,color:'white',fontWeight:700,fontSize:'0.85rem',cursor:'pointer'}}>＋ タスクを追加</button>
          </div>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:'1.25rem'}}>
          {[{label:'総タスク数',value:`${stats.total}`,unit:'件',color:'#0f172a'},{label:'進行中',value:`${stats.inProgress}`,unit:'件',color:'#1d4ed8'},{label:'完了',value:`${stats.done}`,unit:'件',color:'#15803d'},{label:'期限超過',value:`${stats.overdue}`,unit:'件',color:'#dc2626'}].map(s=>(
            <div key={s.label} style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'12px 14px'}}>
              <div style={{fontSize:'0.68rem',color:'#94a3b8',marginBottom:3}}>{s.label}</div>
              <div style={{fontSize:'1.3rem',fontWeight:700,color:s.color}}>{s.value}<span style={{fontSize:'0.75rem',fontWeight:500,marginLeft:2}}>{s.unit}</span></div>
            </div>
          ))}
        </div>

        <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap',alignItems:'center'}}>
          <input style={{...sel,flex:1,minWidth:180,padding:'7px 12px'}} placeholder="タスク名・顧客名・担当者で検索..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <button onClick={()=>setShowFilter(true)} style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',border:`2px solid ${activeFilterCount>0?'#1d4ed8':'#e2e8f0'}`,borderRadius:8,background:activeFilterCount>0?'#eff6ff':'white',color:activeFilterCount>0?'#1d4ed8':'#475569',fontWeight:700,fontSize:'0.82rem',cursor:'pointer',fontFamily:'inherit',outline:'none',whiteSpace:'nowrap'}}>
            <span>🔽 フィルター</span>
            {activeFilterCount>0&&<span style={{background:'#1d4ed8',color:'white',borderRadius:99,padding:'1px 7px',fontSize:'0.7rem',fontWeight:700}}>{activeFilterCount}</span>}
          </button>
          {activeFilterCount>0&&<button onClick={()=>setWf(EMPTY_WF)} style={{padding:'6px 10px',border:'1px solid #fecaca',borderRadius:7,background:'#fef2f2',color:'#dc2626',fontSize:'0.75rem',fontWeight:600,cursor:'pointer',fontFamily:'inherit',outline:'none'}}>✕ クリア</button>}
          <span style={{fontSize:'0.78rem',color:'#94a3b8',display:'flex',alignItems:'center'}}>{filtered.length}件</span>
        </div>

        {loading?<div style={{textAlign:'center',padding:'4rem',color:'#94a3b8'}}>読み込み中...</div>
          :viewMode==='gantt'?<WorkTaskGanttView tasks={filtered} customers={customers} allProjects={allProjects} onTaskChange={load}/>
          :(
          <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                  {[
                {label:'No',field:'no'},{label:'分類',field:'category'},{label:'顧客・案件',field:'customer'},
                {label:'タスク名',field:'taskName'},{label:'担当者',field:'assignees'},{label:'ステータス',field:'status'},
                {label:'開始日',field:'startDate'},{label:'完了予定日',field:'endDate'},{label:'進捗',field:'progress'},
                {label:'優先度',field:'priority'},{label:'操作',field:''},
              ].map(({label,field})=>(
                <th key={label} onClick={field?()=>handleSort(field):undefined}
                  style={{padding:'10px 12px',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:field&&sortField===field?'#1d4ed8':'#64748b',whiteSpace:'nowrap',cursor:field?'pointer':'default',userSelect:'none',background:field&&sortField===field?'#eff6ff':undefined,transition:'background .1s'}}>
                  <span style={{display:'inline-flex',alignItems:'center',gap:4}}>
                    {label}
                    {field&&<span style={{fontSize:'0.55rem',opacity:sortField===field?1:0.35,color:sortField===field?'#1d4ed8':'#94a3b8'}}>{sortIcon(field)}</span>}
                  </span>
                </th>
              ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={11} style={{padding:'3rem',textAlign:'center',color:'#94a3b8'}}>タスクがありません</td></tr>}
                {filtered.map((t,i)=>{
                  const dl=daysLeft(t.plannedEndDate),overdue=t.status!=='完了'&&dl!==null&&dl<0
                  const as=assigneeList(t.assignees),st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手'],pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
                  const catColor=CATEGORY_COLOR[t.category]??'#475569'
                  const linkedProj=t.projectId?allProjects.find(p=>p.id===t.projectId):null
                  return(
                    <tr key={t.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa',opacity:t.status==='完了'?0.7:1}}>
                      <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:'0.7rem'}}>{t.no||t.id}</td>
                      <td style={{padding:'9px 12px'}}><span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:4,background:`${catColor}15`,color:catColor,fontWeight:700}}>{t.category}</span></td>
                      <td style={{padding:'9px 12px',maxWidth:120}}><div style={{fontSize:'0.78rem',color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.customerName||'―'}</div>{linkedProj&&<div style={{fontSize:'0.62rem',color:'#0369a1',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>↪ {linkedProj.projectName}</div>}</td>
                      <td style={{padding:'9px 12px',maxWidth:200}}><div style={{fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.taskName}</div>{t.notes&&<div style={{fontSize:'0.65rem',color:'#94a3b8',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes}</div>}</td>
                      <td style={{padding:'9px 12px'}}><div style={{display:'flex',gap:3,flexWrap:'wrap'}}>{as.map(a=><span key={a} style={{fontSize:'0.65rem',padding:'1px 6px',borderRadius:99,background:'#f1f5f9',color:'#334155',fontWeight:600,whiteSpace:'nowrap'}}>{a}</span>)}{as.length===0&&<span style={{color:'#94a3b8',fontSize:'0.7rem'}}>―</span>}</div></td>
                      <td style={{padding:'9px 12px',whiteSpace:'nowrap'}}><span style={{fontSize:'0.7rem',padding:'2px 8px',borderRadius:99,background:st.bg,color:st.color,border:`1px solid ${st.border}`,fontWeight:700}}>{t.status}</span></td>
                      <td style={{padding:'9px 12px',color:'#64748b',fontSize:'0.73rem',whiteSpace:'nowrap'}}>{t.startDate||'―'}</td>
                      <td style={{padding:'9px 12px',whiteSpace:'nowrap'}}><div style={{fontSize:'0.73rem',color:overdue?'#dc2626':'#64748b',fontWeight:overdue?600:400}}>{t.status==='完了'?t.actualEndDate||t.plannedEndDate||'―':t.plannedEndDate||'―'}</div>{overdue&&<div style={{fontSize:'0.62rem',color:'#dc2626'}}>⚠ {Math.abs(dl!)}日超過</div>}{!overdue&&dl!==null&&t.status!=='完了'&&dl<=7&&<div style={{fontSize:'0.62rem',color:'#d97706'}}>あと{dl}日</div>}</td>
                      <td style={{padding:'9px 12px',minWidth:90}}><div style={{display:'flex',alignItems:'center',gap:6}}><div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}><div style={{height:'100%',width:`${Math.round(t.progress*100)}%`,background:t.progress>=1?'#10b981':t.progress>=0.5?'#3b82f6':'#f59e0b',borderRadius:99}}/></div><span style={{fontSize:'0.68rem',color:'#64748b',flexShrink:0}}>{Math.round(t.progress*100)}%</span></div></td>
                      <td style={{padding:'9px 12px'}}><span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:99,background:pt.bg,color:pt.color,fontWeight:700}}>{t.priority}</span></td>
                      <td style={{padding:'9px 12px'}}><div style={{display:'flex',gap:4}}><button onClick={()=>setEditTask(t)} style={{width:26,height:26,border:'1px solid #e2e8f0',borderRadius:5,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.7rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>✏</button><button onClick={()=>setDelTarget(t)} style={{width:26,height:26,border:'1px solid #fecaca',borderRadius:5,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'0.7rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button></div></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(isCreating||editTask)&&<TaskFormModal task={editTask} customers={customers} allProjects={allProjects} contacts={contacts} categories={categories} statuses={statuses} priorities={priorities} onClose={()=>{setIsCreating(false);setEditTask(null)}} onSave={async dto=>{if(editTask)await workTasksApi.update(editTask.id,dto);else await workTasksApi.create(dto);await load();setIsCreating(false);setEditTask(null)}}/>}
      {showFilter&&<WorkTaskFilterModal wf={wf} setWf={setWf} onClose={()=>setShowFilter(false)} onClear={()=>{setWf(EMPTY_WF);setShowFilter(false)}} contacts={contacts} categories={categories} statuses={statuses} priorities={priorities}/>}
      {delTarget&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}><div style={{background:'white',borderRadius:12,padding:'1.75rem',maxWidth:360,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}><div style={{fontSize:'1.5rem',textAlign:'center',marginBottom:'0.75rem'}}>⚠️</div><h3 style={{margin:'0 0 0.75rem',fontSize:'0.95rem',textAlign:'center',color:'#0f172a'}}>タスクを削除しますか？</h3><p style={{margin:'0 0 1.25rem',textAlign:'center',color:'#475569',fontSize:'0.83rem',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>「{delTarget.taskName}」を削除します。<br/>この操作は元に戻せません。</p><div style={{display:'flex',gap:8}}><button onClick={()=>setDelTarget(null)} style={{flex:1,padding:'9px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button><button onClick={async()=>{await workTasksApi.delete(delTarget.id);await load();setDelTarget(null)}} style={{flex:1,padding:'9px',border:'none',borderRadius:7,background:'#dc2626',color:'white',cursor:'pointer',fontWeight:700,fontFamily:'inherit',outline:'none'}}>削除する</button></div></div></div>)}
    </Layout>
  )
}

// ═══════════════════════════════════════════════════════════════
// ★ ガントチャート（左右分離スクロール：めり込み問題修正版）
// ═══════════════════════════════════════════════════════════════
interface DragInfo{type:'move'|'left'|'right';task:WorkTask;startX:number;origStart:Date|null;origEnd:Date|null}
function WorkTaskGanttView({tasks,customers,allProjects,onTaskChange}:{tasks:WorkTask[];customers:Customer[];allProjects:CustomerProject[];onTaskChange:()=>void}){
  const[scale,setScale]=useState<Scale>('6m')
  const[viewStart,setViewStart]=useState(()=>startOfMonth(addMonths(TODAY,-1)))
  const[activeStatuses,setActiveStatuses]=useState(new Set(['未着手','進行中']))
  const[selected,setSelected]=useState<WorkTask|null>(null)
  const[drag,setDrag]=useState<DragInfo|null>(null)
  const[tempDate,setTempDate]=useState<{id:number;start:Date|null;end:Date|null}|null>(null)
  const[saving,setSaving]=useState(false)
  // ★ スクロール同期用 ref
  const leftRowsRef=useRef<HTMLDivElement>(null)
  const rightPanelRef=useRef<HTMLDivElement>(null)
  const timelineContentRef=useRef<HTMLDivElement>(null)

  const{allMin,allMax}=useMemo(()=>{
    let min:Date|null=null,max:Date|null=null
    tasks.forEach(t=>{const s=parseDate(t.startDate),e=parseDate(t.plannedEndDate);if(s&&(!min||s<min))min=s;if(e&&(!max||e>max))max=e})
    return{allMin:min?startOfMonth(addMonths(min,-1)):startOfMonth(addMonths(TODAY,-2)),allMax:max?new Date(max.getFullYear(),max.getMonth()+2,0):startOfMonth(addMonths(TODAY,10))}
  },[tasks])

  const{timeStart,timeEnd,months,days,totalDays,isDay}=useMemo(()=>{
    const isDay=scale==='1m',start=scale==='all'?allMin:viewStart,end=scale==='all'?allMax:addMonths(viewStart,SCALE_MONTHS[scale])
    const months:Date[]=[],days:Date[]=[],c=new Date(start)
    while(c<end){months.push(new Date(c));c.setMonth(c.getMonth()+1)}
    if(isDay){const de=endOfMonth(viewStart);let d=new Date(start);while(d<=de){days.push(new Date(d));d=addDays(d,1)}}
    return{timeStart:start,timeEnd:end,months,days,totalDays:Math.max(1,daysBetween(start,end)),isDay}
  },[scale,viewStart,allMin,allMax])

  const navigate=(dir:-1|1)=>setViewStart(s=>addMonths(s,dir*(SCALE_NAV[scale]||1)))
  const goToday=()=>setViewStart(startOfMonth(addMonths(TODAY,-1)))

  const rows=useMemo(()=>tasks.filter(t=>activeStatuses.has(t.status)),[tasks,activeStatuses])

  const calcBar=useCallback((t:WorkTask)=>{
    const hasTemp=tempDate?.id===t.id
    const s=hasTemp?tempDate?.start:parseDate(t.startDate)
    // 完了タスクは actualEndDate も終了日として使用
    const endStr=t.status==='完了'
      ?(t.actualEndDate||t.plannedEndDate)
      :t.plannedEndDate
    const e=hasTemp?tempDate?.end:parseDate(endStr??null)
    const hasDates=!!(s||e)  // 日付が設定されているかどうか
    if(!s&&!e)return{left:0,width:0,hasBar:false,noEnd:true,hasDates:false,rangeEnd:null,rangeStart:null}
    const bs=s??TODAY,be=e??addMonths(TODAY,1)
    const rawL=daysBetween(timeStart,bs)/totalDays*100,rawR=daysBetween(timeStart,be)/totalDays*100
    return{
      left:Math.max(0,rawL),
      width:Math.max(0.3,Math.min(100,rawR)-Math.max(0,rawL)),
      hasBar:rawR>0&&rawL<100,  // 現在の表示範囲に含まれるか
      noEnd:!e,
      hasDates,   // 日付設定あり（範囲外でもtrue）
      rangeStart:s,rangeEnd:e,  // 実際の日付（期間外表示用）
    }
  },[tempDate,timeStart,totalDays])

  // ★ ドラッグ
  useEffect(()=>{
    if(!drag)return
    const onMove=(e:MouseEvent)=>{
      const w=timelineContentRef.current?.clientWidth??1
      const delta=Math.round((e.clientX-drag.startX)/w*totalDays)
      let ns=drag.origStart,ne=drag.origEnd
      if(drag.type==='move'){if(ns)ns=addDays(ns,delta);if(ne)ne=addDays(ne,delta)}
      else if(drag.type==='left'){if(ns)ns=addDays(ns,delta);if(ns&&ne&&ns>=ne)ns=addDays(ne,-1)}
      else{if(ne)ne=addDays(ne,delta);if(ns&&ne&&ne<=ns)ne=addDays(ns,1)}
      setTempDate({id:drag.task.id,start:ns,end:ne})
    }
    const onUp=async()=>{
      if(tempDate){
        setSaving(true)
        try{
          const t=drag.task
          await workTasksApi.update(t.id,{No:t.no,Category:t.category,Assignees:t.assignees,CustomerName:t.customerName,TaskName:t.taskName,Status:t.status,Progress:t.progress,Priority:t.priority,Notes:t.notes,Deliverable:t.deliverable,ProjectId:t.projectId,
            StartDate:tempDate.start?fmt(tempDate.start):null,PlannedEndDate:tempDate.end?fmt(tempDate.end):null,ActualEndDate:t.actualEndDate})
          onTaskChange()
        }catch{alert('日程の更新に失敗しました')}finally{setSaving(false)}
      }
      setDrag(null);setTempDate(null);document.body.style.cursor=''
    }
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp)
    return()=>{document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp)}
  },[drag,tempDate,totalDays,onTaskChange])

  const startDrag=(e:React.MouseEvent,task:WorkTask,type:'move'|'left'|'right')=>{
    e.preventDefault();e.stopPropagation()
    document.body.style.cursor=type==='move'?'grabbing':type==='left'?'w-resize':'e-resize'
    let origEnd=parseDate(task.plannedEndDate)
    if(type==='right'&&!origEnd&&timelineContentRef.current){
      const rect=timelineContentRef.current.getBoundingClientRect()
      const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/timelineContentRef.current.clientWidth))
      origEnd=addDays(timeStart,Math.round(pct*totalDays))
    }
    setDrag({type,task,startX:e.clientX,origStart:parseDate(task.startDate),origEnd})
  }

  // ★ 右パネルスクロール → 左行コンテナを同期
  const handleRightScroll=useCallback(()=>{
    if(leftRowsRef.current&&rightPanelRef.current)
      leftRowsRef.current.scrollTop=rightPanelRef.current.scrollTop
  },[])

  const todayPct=Math.max(0,Math.min(100,daysBetween(timeStart,TODAY)/totalDays*100))
  const hdrH=isDay?HDR_H_DAY:HDR_H
  const contentH=rows.length*ROW_H
  const dayColW=isDay?Math.max(28,Math.floor(1100/Math.max(1,days.length))):0
  const monColW=isDay?0:Math.max(70,Math.floor(1100/Math.max(1,months.length)))
  const minW=isDay?`${days.length*dayColW}px`:`${months.length*monColW}px`
  const stats2=useMemo(()=>DEF_STATUSES.reduce((a,s)=>({...a,[s]:tasks.filter(t=>t.status===s).length}),{} as Record<string,number>),[tasks])

  const weekGroups=useMemo(()=>{
    if(!isDay||days.length===0)return[]
    const g:{label:string;count:number}[]=[];let wn=1,cnt=0
    days.forEach((d,i)=>{cnt++;if(d.getDay()===6||i===days.length-1){g.push({label:`第${wn}週`,count:cnt});wn++;cnt=0}})
    return g
  },[days,isDay])

  return(
    <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden',fontFamily:'"Noto Sans JP",sans-serif',userSelect:'none'}}>
      {/* ツールバー */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',background:'#f8fafc'}}>
        <div style={{display:'flex',border:'1px solid #e2e8f0',borderRadius:7,overflow:'hidden',flexShrink:0}}>
          {(['1m','3m','6m','1y','all'] as Scale[]).map(s=>(
            <button key={s} onClick={()=>setScale(s)} style={{padding:'5px 11px',border:'none',borderRight:'1px solid #e2e8f0',background:scale===s?'#0f172a':'white',color:scale===s?'white':'#475569',fontWeight:600,fontSize:'0.76rem',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>{SCALE_LABELS[s]}</button>
          ))}
        </div>
        {scale!=='all'&&<div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
          <button onClick={()=>navigate(-1)} style={{width:28,height:28,border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.85rem',outline:'none'}}>◀</button>
          <button onClick={goToday} style={{padding:'4px 12px',border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#0f172a',fontWeight:600,fontSize:'0.76rem',cursor:'pointer',fontFamily:'inherit'}}>今日</button>
          <button onClick={()=>navigate(1)} style={{width:28,height:28,border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.85rem',outline:'none'}}>▶</button>
          <span style={{fontSize:'0.73rem',color:'#64748b'}}>{isDay?`${viewStart.getFullYear()}年${viewStart.getMonth()+1}月`:`${formatMonth(timeStart)} 〜 ${formatMonth(addMonths(timeEnd,-1))}`}</span>
        </div>}
        {saving&&<span style={{fontSize:'0.72rem',color:'#0369a1',fontWeight:600}}>保存中...</span>}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginLeft:'auto'}}>
          {DEF_STATUSES.map(s=>{const active=activeStatuses.has(s),st=STATUS_STYLE[s];return(
            <button key={s} onClick={()=>setActiveStatuses(prev=>{const n=new Set(prev);n.has(s)?n.delete(s):n.add(s);return n})} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 9px',border:`1px solid ${active?st.bar:st.border}`,borderRadius:99,background:active?st.bg:'white',color:active?st.color:'#94a3b8',fontWeight:active?700:500,fontSize:'0.7rem',cursor:'pointer',fontFamily:'inherit'}}>
              <span style={{width:7,height:7,borderRadius:2,background:active?st.bar:'#d1d5db',flexShrink:0}}/>{s}{stats2[s]>0&&<span style={{fontSize:'0.62rem',opacity:.8}}>({stats2[s]})</span>}
            </button>
          )})}
        </div>
      </div>
      <div style={{padding:'5px 16px',background:'#fffbeb',borderBottom:'1px solid #fef3c7',fontSize:'0.68rem',color:'#92400e',display:'flex',gap:16}}>
        <span>💡 バークリック: 詳細・編集</span><span>中央ドラッグ: 移動</span><span>端ドラッグ: 期間変更</span>
      </div>

      {/* ★ ガント本体（左右分離構造） */}
      <div style={{display:'flex',height:'calc(100vh - 360px)',overflow:'hidden'}}>

        {/* ★ 左カラム（独立・スクロールなし） */}
        <div style={{flexShrink:0,width:NAME_COL,display:'flex',flexDirection:'column',borderRight:'2px solid #e2e8f0',background:'white',zIndex:20,boxShadow:'2px 0 6px rgba(0,0,0,0.04)'}}>
          {/* ヘッダー（常時固定） */}
          <div style={{flexShrink:0,height:hdrH,borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'flex-end',padding:'0 14px 8px',background:'#f8fafc'}}>
            <span style={{fontSize:'0.72rem',fontWeight:700,color:'#475569'}}>顧客・案件 / タスク名</span>
          </div>
          {/* ★ 行コンテナ（overflow hidden、JS同期） */}
          <div ref={leftRowsRef} style={{flex:1,overflow:'hidden'}}>
            {rows.map((t,i)=>{
              const proj=t.projectId?allProjects.find(p=>p.id===t.projectId):null
              const as=assigneeList(t.assignees)
              const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
              const pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
              return(
                <div key={t.id} style={{height:ROW_H,borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',padding:'6px 10px',gap:5,background:i%2===0?'white':'#fafafa',flexShrink:0}}>
                  <div style={{flex:1,minWidth:0}}>
                    {(t.customerName||proj)&&<div style={{fontSize:'0.63rem',color:'#0369a1',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:2}}>{t.customerName&&<span>{t.customerName}</span>}{proj&&<span style={{marginLeft:4}}>↪ {proj.projectName}</span>}</div>}
                    <div style={{fontSize:'0.78rem',fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:3}}>{t.taskName}</div>
                    <div style={{display:'flex',gap:3,flexWrap:'nowrap'}}>
                      {as.slice(0,3).map(a=><span key={a} style={{fontSize:'0.6rem',padding:'1px 5px',borderRadius:99,background:'#f1f5f9',color:'#475569',whiteSpace:'nowrap'}}>{a.split(' ')[0]}</span>)}
                      {as.length>3&&<span style={{fontSize:'0.6rem',color:'#94a3b8'}}>+{as.length-3}</span>}
                    </div>
                  </div>
                  <span style={{fontSize:'0.58rem',padding:'1px 5px',borderRadius:99,background:st.bg,color:st.color,fontWeight:700,border:`1px solid ${st.border}`,flexShrink:0}}>{t.status}</span>
                  <span style={{fontSize:'0.6rem',padding:'1px 4px',borderRadius:3,background:pt.bg,color:pt.color,fontWeight:700,flexShrink:0}}>{t.priority}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* ★ 右タイムライン（メインスクロール） */}
        <div ref={rightPanelRef} style={{flex:1,overflow:'auto'}} onScroll={handleRightScroll}>
          {/* ★ 月/日ヘッダー（position sticky top:0 が右パネル内で正常動作） */}
          <div style={{position:'sticky',top:0,zIndex:10,background:'#f8fafc',minWidth:minW}}>
            {!isDay&&<div style={{display:'flex',height:hdrH,borderBottom:'1px solid #e2e8f0'}}>
              {months.map((m,i)=>{const isCur=m.getMonth()===TODAY.getMonth()&&m.getFullYear()===TODAY.getFullYear();return(
                <div key={i} style={{width:monColW,flexShrink:0,borderRight:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',background:isCur?'#eff6ff':undefined}}>
                  <span style={{fontSize:'0.72rem',fontWeight:isCur?700:500,color:isCur?'#1d4ed8':'#64748b'}}>{formatMonth(m)}</span>
                </div>
              )})}
            </div>}
            {isDay&&<div style={{borderBottom:'1px solid #e2e8f0'}}>
              <div style={{display:'flex',height:28,borderBottom:'1px solid #e2e8f0'}}>
                {weekGroups.map((wg,i)=><div key={i} style={{width:wg.count*dayColW,flexShrink:0,borderRight:'2px solid #d1d5db',display:'flex',alignItems:'center',justifyContent:'center',background:i%2===0?'#f8fafc':'#f1f5f9'}}><span style={{fontSize:'0.65rem',fontWeight:700,color:'#64748b'}}>{wg.label}</span></div>)}
              </div>
              <div style={{display:'flex',height:44}}>
                {days.map((d,i)=>{const wd=d.getDay(),isToday=daysBetween(d,TODAY)===0,isMon=wd===1&&i>0;return(
                  <div key={i} style={{width:dayColW,flexShrink:0,borderRight:isMon?'2px solid #d1d5db':'1px solid #e2e8f0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:isToday?'#dbeafe':wd===0?'#fef2f2':wd===6?'#f0f9ff':'white'}}>
                    <span style={{fontSize:Math.min(11,dayColW-4)+'px',fontWeight:isToday?700:500,color:isToday?'#1d4ed8':wd===0?'#dc2626':wd===6?'#2563eb':'#334155'}}>{d.getDate()}</span>
                    <span style={{fontSize:Math.min(9,dayColW-6)+'px',color:isToday?'#3b82f6':wd===0?'#ef4444':wd===6?'#3b82f6':'#94a3b8'}}>{WEEKDAY_JA[wd]}</span>
                  </div>
                )})}
              </div>
            </div>}
          </div>

          {/* ★ コンテンツ（行+バー）- ヘッダーとは別コンテナ */}
          <div ref={timelineContentRef} style={{position:'relative',height:contentH,minWidth:minW}}>
            {/* TODAY ライン */}
            {todayPct>=0&&todayPct<=100&&<div style={{position:'absolute',left:`${todayPct}%`,top:0,height:'100%',width:2,background:'#ef4444',opacity:0.75,zIndex:8,pointerEvents:'none'}}><div style={{position:'absolute',top:4,left:-16,background:'#ef4444',color:'white',fontSize:'0.55rem',padding:'1px 5px',borderRadius:3,fontWeight:700,whiteSpace:'nowrap'}}>TODAY</div></div>}

            {/* グリッドライン（z:1） */}
            {!isDay&&months.map((m,i)=>{const left=daysBetween(timeStart,m)/totalDays*100,isCur=m.getMonth()===TODAY.getMonth()&&m.getFullYear()===TODAY.getFullYear();return<div key={i} style={{position:'absolute',left:`${left}%`,top:0,height:'100%',width:isCur?monColW:1,background:isCur?'#eff6ff60':'#f1f5f9',zIndex:1,pointerEvents:'none'}}/>})}
            {isDay&&days.map((d,i)=>{const left=daysBetween(timeStart,d)/totalDays*100,wd=d.getDay(),isMon=wd===1&&i>0,isToday=daysBetween(d,TODAY)===0;if(isToday)return null;return<div key={i} style={{position:'absolute',left:`${left}%`,top:0,height:'100%',width:isMon?2:1,background:wd===0?'#fee2e240':wd===6?'#dbeafe40':isMon?'#d1d5db':'#f1f5f9',zIndex:1,pointerEvents:'none'}}/>})}

            {/* ★ 行（z:2）＋バー（z:5）- top = i*ROW_H（hdrH不要） */}
            {rows.map((t,i)=>{
              const top=i*ROW_H
              const bar=calcBar(t),st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
              const isDragging=drag?.task.id===t.id
              return(
                <div key={t.id} style={{position:'absolute',left:0,right:0,top,height:ROW_H,borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa',zIndex:2}}>
                  {bar.hasBar&&(
                    <div style={{position:'absolute',left:`${bar.left}%`,width:`${bar.width}%`,top:'50%',transform:'translateY(-50%)',height:26,background:isDragging?`${st.bar}dd`:`linear-gradient(135deg,${st.bar},${st.bar}cc)`,borderRadius:5,display:'flex',alignItems:'center',overflow:'hidden',boxShadow:isDragging?`0 4px 12px ${st.bar}60`:`0 1px 4px ${st.bar}40`,zIndex:5,border:isDragging?'2px solid white':undefined}}>
                      <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${t.progress*100}%`,background:'rgba(255,255,255,0.2)',pointerEvents:'none'}}/>
                      <div onMouseDown={e=>startDrag(e,t,'left')} style={{width:8,height:'100%',cursor:'w-resize',background:'rgba(255,255,255,0.25)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:6}}><div style={{width:2,height:12,background:'rgba(255,255,255,0.7)',borderRadius:1}}/></div>
                      <div onMouseDown={e=>startDrag(e,t,'move')} onClick={()=>!drag&&setSelected(t)} style={{flex:1,height:'100%',cursor:'grab',display:'flex',alignItems:'center',paddingLeft:4,overflow:'hidden',zIndex:6}}>
                        <span style={{fontSize:'0.64rem',color:'white',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',pointerEvents:'none'}}>{bar.width>5?t.taskName:''}</span>
                      </div>
                      <div onMouseDown={e=>startDrag(e,t,'right')} style={{width:8,height:'100%',cursor:'e-resize',background:bar.noEnd?'rgba(255,255,100,0.4)':'rgba(255,255,255,0.25)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:6}}><div style={{width:2,height:12,background:'rgba(255,255,255,0.7)',borderRadius:1}}/></div>
                    </div>
                  )}
                  {!bar.hasBar&&(bar.hasDates?(
                  // 日付はあるが現在の表示期間外（過去に完了など）
                  <div style={{position:'absolute',left:4,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:4,zIndex:5}}>
                    <span style={{fontSize:'0.62rem',color:'#64748b',whiteSpace:'nowrap',background:'#f1f5f9',border:'1px solid #e2e8f0',borderRadius:4,padding:'1px 6px'}}>
                      ◀ {bar.rangeStart?fmt(bar.rangeStart):''}{bar.rangeEnd?` 〜 ${fmt(bar.rangeEnd)}`:''}
                    </span>
                  </div>
                ):(
                  // 本当に日付未設定
                  <div style={{position:'absolute',left:`${todayPct}%`,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:4,zIndex:5}}>
                    <div style={{width:8,height:8,borderRadius:2,background:st.bar,transform:'rotate(45deg)'}}/>
                    <span style={{fontSize:'0.6rem',color:'#94a3b8',whiteSpace:'nowrap'}}>日程未設定</span>
                  </div>
                ))}
                  {isDragging&&tempDate&&<div style={{position:'absolute',left:`${Math.min(bar.left+2,70)}%`,top:'calc(50% + 17px)',background:'#0f172a',color:'white',fontSize:'0.62rem',padding:'3px 8px',borderRadius:5,whiteSpace:'nowrap',zIndex:20,pointerEvents:'none'}}>{tempDate.start?fmt(tempDate.start):'―'} 〜 {tempDate.end?fmt(tempDate.end):'―'}</div>}
                </div>
              )
            })}
          </div>
        </div>
      </div>

      <div style={{padding:'8px 16px',borderTop:'1px solid #f1f5f9',display:'flex',gap:14,flexWrap:'wrap',alignItems:'center',background:'#f8fafc'}}>
        {DEF_STATUSES.filter(s=>stats2[s]>0).map(s=><div key={s} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:STATUS_STYLE[s].bar}}/><span style={{fontSize:'0.7rem',color:'#64748b'}}>{s} {stats2[s]}件</span></div>)}
        <span style={{fontSize:'0.7rem',color:'#94a3b8',marginLeft:'auto'}}>バークリック: 詳細 ／ 端ドラッグ: 期間変更 ／ 中央ドラッグ: 移動</span>
      </div>

      {selected&&<TaskDetailModal task={selected} allProjects={allProjects} customers={customers} onClose={()=>setSelected(null)} onSave={async dto=>{await workTasksApi.update(selected.id,dto);onTaskChange();setSelected(null)}} onDelete={async()=>{await workTasksApi.delete(selected.id);onTaskChange();setSelected(null)}}/>}
    </div>
  )
}

// ─── タスク詳細・編集・ファイル添付モーダル ──────────────────
function TaskDetailModal({task:t,allProjects,customers,onClose,onSave,onDelete}:{task:WorkTask;allProjects:CustomerProject[];customers:Customer[];onClose:()=>void;onSave:(dto:WorkTaskDto)=>Promise<void>;onDelete:()=>Promise<void>}){
  const[tab,setTab]=useState<'detail'|'edit'|'files'>('detail')
  const[form,setForm]=useState<WorkTaskDto>({No:t.no,Category:t.category,Assignees:t.assignees,CustomerName:t.customerName,TaskName:t.taskName,Status:t.status,StartDate:t.startDate,PlannedEndDate:t.plannedEndDate,ActualEndDate:t.actualEndDate,Progress:t.progress,Priority:t.priority,Notes:t.notes,Deliverable:t.deliverable,ProjectId:t.projectId})
  const[saving,setSaving]=useState(false)
  const[confirmDel,setConfirmDel]=useState(false)
  const[assigneeSet,setAssigneeSet]=useState(new Set(assigneeList(t.assignees)))
  // ProjectId が設定済みなら allProjects から直接取得（名前マッチ不要）
  const currentLinkedProj=form.ProjectId?allProjects.find(p=>p.id===form.ProjectId):null
  const linkedCustomer=customers.find(cu=>
    cu.name===form.CustomerName ||
    (currentLinkedProj&&cu.id===currentLinkedProj.customerId)
  )
  const relatedProjects=linkedCustomer?allProjects.filter(p=>p.customerId===linkedCustomer.id):[]
  // currentLinkedProj が relatedProjects に含まれない場合も先頭に追加して必ず表示
  const displayProjects=currentLinkedProj&&!relatedProjects.find(p=>p.id===currentLinkedProj.id)
    ?[currentLinkedProj,...relatedProjects]
    :relatedProjects
  // ファイル関連
  const[taskFiles,setTaskFiles]=useState<WorkTaskFileItem[]>([])
  const[uploading,setUploading]=useState(false)
  const[delFile,setDelFile]=useState<WorkTaskFileItem|null>(null)
  const fileInputRef=useRef<HTMLInputElement>(null)

  useEffect(()=>{if(tab==='files'){wtFilesApi.getByTask(t.id).then(setTaskFiles).catch(()=>setTaskFiles([]))}},[ tab,t.id])

  const handleUpload=async(fl:FileList|null)=>{
    if(!fl||fl.length===0)return;setUploading(true)
    try{for(const f of Array.from(fl))await wtFilesApi.upload(t.id,f,'');const d=await wtFilesApi.getByTask(t.id);setTaskFiles(d)}
    catch{alert('アップロードに失敗しました')}finally{setUploading(false);if(fileInputRef.current)fileInputRef.current.value=''}
  }
  const handleDelFile=async()=>{if(!delFile)return;await wtFilesApi.delete(delFile.id);setTaskFiles(prev=>prev.filter(f=>f.id!==delFile.id));setDelFile(null)}

  const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手'],pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
  const linkedProj=t.projectId?allProjects.find(p=>p.id===t.projectId):null
  const set=(k:keyof WorkTaskDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))
  const toggleA=(a:string)=>{const n=new Set(assigneeSet);n.has(a)?n.delete(a):n.add(a);setAssigneeSet(n);setForm(p=>({...p,Assignees:Array.from(n).join(',')}))}
  const handleSave=async()=>{setSaving(true);try{await onSave({...form,Assignees:Array.from(assigneeSet).join(',')})}catch{alert('保存に失敗しました');setSaving(false)}}
  const inp:React.CSSProperties={width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:'0.82rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.68rem',fontWeight:700,color:'#64748b',marginBottom:3}
  const fld:React.CSSProperties={marginBottom:'0.75rem'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>tab!=='edit'&&onClose()}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:480,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'1rem 1.25rem 0.75rem',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8}}>
            <div>
              <div style={{fontSize:'0.68rem',color:'#94a3b8',marginBottom:2}}>{t.category} {t.customerName&&`/ ${t.customerName}`} {linkedProj&&`/ ${linkedProj.projectName}`}</div>
              <h3 style={{margin:0,fontSize:'0.95rem',fontWeight:700,color:'#0f172a'}}>{t.taskName}</h3>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#94a3b8',outline:'none'}}>✕</button>
          </div>
          <div style={{display:'flex',gap:0}}>
            {[{key:'detail',label:'詳細'},{key:'edit',label:'✏ 編集'},{key:'files',label:`📎 ファイル${taskFiles.length>0?` (${taskFiles.length})`:''}`}].map((tb,i,arr)=>(
              <button key={tb.key} onClick={()=>setTab(tb.key as any)}
                style={{padding:'5px 14px',border:'1px solid #e2e8f0',borderRight:i<arr.length-1?'none':undefined,borderRadius:i===0?'6px 0 0 6px':i===arr.length-1?'0 6px 6px 0':'0',background:tab===tb.key?'#0f172a':'white',color:tab===tb.key?'white':'#475569',fontWeight:600,fontSize:'0.75rem',cursor:'pointer',fontFamily:'inherit'}}>
                {tb.label}
              </button>
            ))}
          </div>
        </div>

        <div style={{overflowY:'auto',flex:1,padding:'1rem 1.25rem'}}>
          {/* 詳細タブ */}
          {tab==='detail'&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:'0.75rem'}}>
                {[{label:'ステータス',value:<span style={{padding:'2px 8px',borderRadius:99,background:st.bg,color:st.color,fontWeight:700,fontSize:'0.78rem',border:`1px solid ${st.border}`}}>{t.status}</span>},{label:'優先度',value:<span style={{padding:'2px 8px',borderRadius:99,background:pt.bg,color:pt.color,fontWeight:700,fontSize:'0.78rem'}}>{t.priority}</span>},{label:'開始日',value:t.startDate??'未設定'},{label:'完了予定日',value:t.plannedEndDate??'未設定'},{label:'進捗',value:`${Math.round(t.progress*100)}%`},{label:'分類',value:t.category}].map(item=>(
                  <div key={item.label}><div style={{fontSize:'0.63rem',color:'#94a3b8',marginBottom:2}}>{item.label}</div><div style={{fontSize:'0.82rem',color:'#0f172a',fontWeight:500}}>{item.value}</div></div>
                ))}
              </div>
              {t.assignees&&<div style={{marginBottom:'0.75rem'}}><div style={{fontSize:'0.63rem',color:'#94a3b8',marginBottom:4}}>担当者</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{assigneeList(t.assignees).map(a=><span key={a} style={{fontSize:'0.72rem',padding:'2px 8px',borderRadius:99,background:'#f1f5f9',color:'#334155',fontWeight:600}}>{a}</span>)}</div></div>}
              {t.notes&&<div style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px',fontSize:'0.78rem',color:'#475569',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{t.notes}</div>}
              {t.deliverable&&<div style={{marginTop:8}}><a href={t.deliverable} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.78rem',color:'#0369a1',textDecoration:'none'}}>🔗 成果物リンク</a></div>}
            </div>
          )}

          {/* 編集タブ */}
          {tab==='edit'&&(
            <div>
              <div style={fld}><label style={lbl}>タスク名</label><input style={inp} value={form.TaskName} onChange={e=>set('TaskName',e.target.value)}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
                <div style={fld}>
                  <label style={lbl}>顧客名</label>
                  <select style={inp} value={form.CustomerName||linkedCustomer?.name||''} onChange={e=>{set('CustomerName',e.target.value);set('ProjectId',null)}}>
                    <option value="">（顧客なし）</option>
                    {customers.map(cu=><option key={cu.id}>{cu.name}</option>)}
                  </select>
                </div>
                <div style={fld}>
                  <label style={lbl}>紐づく案件</label>
                  <select style={inp} value={form.ProjectId??''} onChange={e=>set('ProjectId',e.target.value?+e.target.value:null)} disabled={displayProjects.length===0}>
                    <option value="">（案件なし）</option>
                    {displayProjects.map(p=><option key={p.id} value={p.id}>[{p.status}] {p.projectName}</option>)}
                  </select>
                  {form.CustomerName&&displayProjects.length===0&&<div style={{fontSize:'0.62rem',color:'#94a3b8',marginTop:2}}>この顧客の案件がありません</div>}
                </div>
              </div>
              <div style={fld}>
                <label style={lbl}>担当者（複数選択可）</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,background:'#f8fafc'}}>
                  {DEF_CONTACTS.map(a=>{const checked=assigneeSet.has(a);return(
                    <label key={a} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:5,cursor:'pointer',background:checked?'#eff6ff':'white',border:`1px solid ${checked?'#bfdbfe':'#e2e8f0'}`}}>
                      <input type="checkbox" checked={checked} onChange={()=>toggleA(a)} style={{width:13,height:13,accentColor:'#1d4ed8',cursor:'pointer',flexShrink:0}}/>
                      <span style={{fontSize:'0.72rem',fontWeight:checked?700:400,color:checked?'#1d4ed8':'#334155'}}>{a}</span>
                    </label>
                  )})}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
                <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.Status} onChange={e=>set('Status',e.target.value)}>{DEF_STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
                <div style={fld}><label style={lbl}>優先度</label><select style={inp} value={form.Priority} onChange={e=>set('Priority',e.target.value)}>{DEF_PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
                <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} type="date" value={toDateInput(form.StartDate)} onChange={e=>set('StartDate',fromDateInput(e.target.value))}/></div>
                <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} type="date" value={toDateInput(form.PlannedEndDate)} onChange={e=>set('PlannedEndDate',fromDateInput(e.target.value))}/></div>
                <div style={{...fld,gridColumn:'1/-1'}}>
                  <label style={lbl}>進捗 ({Math.round((form.Progress||0)*100)}%)</label>
                  <input type="range" min={0} max={1} step={0.05} value={form.Progress||0} onChange={e=>set('Progress',+e.target.value)} style={{width:'100%',accentColor:'#1d4ed8'}}/>
                </div>
              </div>
              <div style={fld}><label style={lbl}>備考</label><textarea style={{...inp,resize:'vertical',minHeight:60}} value={form.Notes||''} onChange={e=>set('Notes',e.target.value)}/></div>
            </div>
          )}

          {/* ★ ファイルタブ（実ファイル添付） */}
          {tab==='files'&&(
            <div>
              <input ref={fileInputRef} type="file" multiple style={{display:'none'}} onChange={e=>handleUpload(e.target.files)}/>
              <div style={{marginBottom:10}}>
                <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
                  style={{display:'flex',alignItems:'center',gap:4,padding:'7px 14px',border:'1px dashed #d1d5db',borderRadius:7,background:'white',color:'#64748b',cursor:'pointer',fontSize:'0.78rem',fontWeight:600,outline:'none',fontFamily:'inherit',width:'100%',justifyContent:'center'}}>
                  {uploading?'アップロード中...':'📎 ファイルを追加　（クリックして選択）'}
                </button>
                <div style={{textAlign:'center',fontSize:'0.62rem',color:'#94a3b8',marginTop:4}}>PDF・Word・Excel・画像など（最大20MB）</div>
              </div>
              {taskFiles.length===0?(
                <div style={{textAlign:'center',padding:'1.5rem',color:'#94a3b8',fontSize:'0.8rem',border:'1px dashed #e2e8f0',borderRadius:8}}>添付ファイルがありません</div>
              ):(
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {taskFiles.map(f=>(
                    <div key={f.id} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 10px',background:'#f8fafc',borderRadius:7,border:'1px solid #e2e8f0'}}>
                      <span style={{fontSize:'1rem',flexShrink:0}}>{fileIcon(f.fileType,f.fileName)}</span>
                      <a href={wtFilesApi.downloadUrl(f.id)} target="_blank" rel="noopener noreferrer" style={{flex:1,minWidth:0,fontSize:'0.75rem',fontWeight:600,color:'#0369a1',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onMouseEnter={e=>(e.currentTarget.style.textDecoration='underline')} onMouseLeave={e=>(e.currentTarget.style.textDecoration='none')}>{f.fileName}</a>
                      <span style={{fontSize:'0.62rem',color:'#94a3b8',flexShrink:0}}>{formatSize(f.fileSize)}</span>
                      <a href={wtFilesApi.downloadUrl(f.id)} target="_blank" rel="noopener noreferrer" style={{width:24,height:24,border:'1px solid #bae6fd',borderRadius:4,background:'#f0f9ff',color:'#0369a1',textDecoration:'none',fontSize:'0.7rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>↗</a>
                      <a href={wtFilesApi.downloadUrl(f.id)} download={f.fileName} style={{width:24,height:24,border:'1px solid #d1fae5',borderRadius:4,background:'#f0fdf4',color:'#059669',textDecoration:'none',fontSize:'0.7rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>↓</a>
                      <button onClick={()=>setDelFile(f)} style={{width:24,height:24,border:'1px solid #fecaca',borderRadius:4,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'0.65rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
                    </div>
                  ))}
                </div>
              )}
              {delFile&&(
                <div style={{marginTop:12,padding:'10px 12px',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,fontSize:'0.8rem',color:'#dc2626'}}>
                  「{delFile.fileName}」を削除しますか？
                  <div style={{display:'flex',gap:6,marginTop:8}}>
                    <button onClick={()=>setDelFile(null)} style={{padding:'4px 12px',border:'1px solid #fca5a5',borderRadius:5,background:'white',color:'#dc2626',cursor:'pointer',fontFamily:'inherit',outline:'none'}}>キャンセル</button>
                    <button onClick={handleDelFile} style={{padding:'4px 12px',border:'none',borderRadius:5,background:'#dc2626',color:'white',cursor:'pointer',fontFamily:'inherit',outline:'none',fontWeight:700}}>削除する</button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div style={{padding:'0.75rem 1.25rem',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,flexShrink:0}}>
          <button onClick={()=>setConfirmDel(true)} style={{padding:'8px 14px',border:'1px solid #fecaca',borderRadius:7,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontWeight:600,fontSize:'0.8rem',fontFamily:'inherit',outline:'none'}}>🗑 削除</button>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',fontFamily:'inherit',outline:'none'}}>閉じる</button>
          {tab==='edit'&&<button onClick={handleSave} disabled={saving} style={{padding:'8px 20px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontSize:'0.82rem',fontFamily:'inherit',outline:'none',opacity:saving?0.6:1}}>{saving?'保存中...':'✓ 保存'}</button>}
        </div>
      </div>

      {confirmDel&&(<div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setConfirmDel(false)}><div style={{background:'white',borderRadius:12,padding:'1.5rem',maxWidth:340,width:'90%'}} onClick={e=>e.stopPropagation()}><div style={{fontSize:'1.5rem',textAlign:'center',marginBottom:'0.5rem'}}>⚠️</div><h3 style={{margin:'0 0 0.5rem',textAlign:'center',fontSize:'0.95rem',color:'#0f172a'}}>タスクを削除しますか？</h3><p style={{margin:'0 0 1.25rem',textAlign:'center',color:'#475569',fontSize:'0.83rem',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>「{t.taskName}」を削除します。<br/>この操作は元に戻せません。</p><div style={{display:'flex',gap:8}}><button onClick={()=>setConfirmDel(false)} style={{flex:1,padding:'8px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button><button onClick={onDelete} style={{flex:1,padding:'8px',border:'none',borderRadius:7,background:'#dc2626',color:'white',cursor:'pointer',fontWeight:700,fontFamily:'inherit',outline:'none'}}>削除する</button></div></div></div>)}
    </div>
  )
}

// ─── 作業管理 詳細フィルターモーダル ─────────────────────────────
interface WTFilterState{statuses:string[];assignees:string[];categories:string[];priorities:string[];startFrom:string;startTo:string;endFrom:string;endTo:string;progressMin:number;progressMax:number;customer:string}
function WorkTaskFilterModal({wf,setWf,onClose,onClear,contacts,categories,statuses,priorities}:{
  wf:WTFilterState;setWf:(v:WTFilterState)=>void;onClose:()=>void;onClear:()=>void;
  contacts:string[];categories:string[];statuses:string[];priorities:string[]
}){
  const[local,setLocal]=useState({...wf})
  const toggle=(key:keyof WTFilterState,val:string)=>{
    const arr=local[key] as string[]
    setLocal(p=>({...p,[key]:arr.includes(val)?arr.filter(x=>x!==val):[...arr,val]}))
  }
  const apply=()=>{setWf(local);onClose()}
  const inp:React.CSSProperties={width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:'0.82rem',fontFamily:'inherit',outline:'none',boxSizing:'border-box' as const}
  const sect=(title:string)=><div style={{fontSize:'0.68rem',fontWeight:700,color:'#64748b',letterSpacing:'0.06em',textTransform:'uppercase' as const,marginBottom:6,marginTop:16}}>{title}</div>
  const chip=(label:string,active:boolean,onClick:()=>void,color='#1d4ed8')=>(
    <button onClick={onClick} style={{padding:'4px 12px',border:`1px solid ${active?color:'#e2e8f0'}`,borderRadius:99,background:active?`${color}15`:'white',color:active?color:'#64748b',fontSize:'0.75rem',fontWeight:active?700:400,cursor:'pointer',fontFamily:'inherit',outline:'none',transition:'all .1s'}}>
      {active&&'✓ '}{label}
    </button>
  )
  const activeCount=[local.statuses.length>0,local.assignees.length>0,local.categories.length>0,local.priorities.length>0,!!(local.startFrom||local.startTo),!!(local.endFrom||local.endTo),local.progressMin>0||local.progressMax<100,!!local.customer].filter(Boolean).length
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:4000,display:'flex',alignItems:'flex-start',justifyContent:'flex-end',padding:'60px 16px 16px'}} onClick={onClose}>
      <div style={{background:'white',borderRadius:14,width:480,maxHeight:'calc(100vh - 80px)',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)',overflow:'hidden'}} onClick={e=>e.stopPropagation()}>
        <div style={{padding:'14px 18px',borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',justifyContent:'space-between',flexShrink:0}}>
          <div>
            <div style={{fontWeight:700,fontSize:'0.95rem',color:'#0f172a'}}>詳細フィルター</div>
            {activeCount>0&&<div style={{fontSize:'0.72rem',color:'#1d4ed8'}}>{activeCount}件の条件が設定されています</div>}
          </div>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#94a3b8',outline:'none'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'4px 18px 18px'}}>
          {sect('ステータス')}
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {statuses.map(s=>chip(s,local.statuses.includes(s),()=>toggle('statuses',s),'#1d4ed8'))}
          </div>
          {sect('優先度')}
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {priorities.map(p=>{const c={'高':'#dc2626','中':'#d97706','低':'#64748b'}[p]||'#64748b';return chip(p,local.priorities.includes(p),()=>toggle('priorities',p),c)})}
          </div>
          {sect('担当者（複数選択可）')}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5}}>
            {contacts.map(a=>{const active=local.assignees.includes(a);return(
              <label key={a} style={{display:'flex',alignItems:'center',gap:6,padding:'6px 8px',borderRadius:7,border:`1px solid ${active?'#1d4ed8':'#e2e8f0'}`,background:active?'#eff6ff':'white',cursor:'pointer'}}>
                <input type="checkbox" checked={active} onChange={()=>toggle('assignees',a)} style={{accentColor:'#1d4ed8',width:13,height:13,cursor:'pointer',flexShrink:0}}/>
                <span style={{fontSize:'0.78rem',fontWeight:active?700:400,color:active?'#1d4ed8':'#334155'}}>{a}</span>
              </label>
            )})}
          </div>
          {sect('作業分類（複数選択可）')}
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {categories.map(cat=>chip(cat,local.categories.includes(cat),()=>toggle('categories',cat),'#6d28d9'))}
          </div>
          {sect('顧客名')}
          <input style={inp} placeholder="顧客名で絞り込み" value={local.customer} onChange={e=>setLocal(p=>({...p,customer:e.target.value}))}/>
          {sect('開始日')}
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center'}}>
            <input type="date" style={inp} value={local.startFrom} onChange={e=>setLocal(p=>({...p,startFrom:e.target.value}))}/>
            <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>〜</span>
            <input type="date" style={inp} value={local.startTo} onChange={e=>setLocal(p=>({...p,startTo:e.target.value}))}/>
          </div>
          {sect('完了予定日')}
          <div style={{display:'grid',gridTemplateColumns:'1fr auto 1fr',gap:8,alignItems:'center'}}>
            <input type="date" style={inp} value={local.endFrom} onChange={e=>setLocal(p=>({...p,endFrom:e.target.value}))}/>
            <span style={{fontSize:'0.75rem',color:'#94a3b8'}}>〜</span>
            <input type="date" style={inp} value={local.endTo} onChange={e=>setLocal(p=>({...p,endTo:e.target.value}))}/>
          </div>
          {sect(`進捗率　${local.progressMin}% 〜 ${local.progressMax}%`)}
          <div style={{display:'flex',gap:12,alignItems:'center'}}>
            <input type="range" min={0} max={100} step={5} value={local.progressMin} onChange={e=>setLocal(p=>({...p,progressMin:Math.min(+e.target.value,p.progressMax)}))} style={{flex:1,accentColor:'#1d4ed8'}}/>
            <span style={{fontSize:'0.72rem',color:'#64748b',width:50,textAlign:'center'}}>{local.progressMin}%〜</span>
            <input type="range" min={0} max={100} step={5} value={local.progressMax} onChange={e=>setLocal(p=>({...p,progressMax:Math.max(+e.target.value,p.progressMin)}))} style={{flex:1,accentColor:'#1d4ed8'}}/>
            <span style={{fontSize:'0.72rem',color:'#64748b',width:50,textAlign:'center'}}>{local.progressMax}%</span>
          </div>
        </div>
        <div style={{display:'flex',gap:8,padding:'12px 18px',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
          <button onClick={onClear} style={{padding:'8px 14px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',fontFamily:'inherit',outline:'none'}}>クリア</button>
          <button onClick={apply} style={{flex:1,padding:'8px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:'pointer',fontWeight:700,fontSize:'0.85rem',fontFamily:'inherit',outline:'none'}}>
            この条件で絞り込む{activeCount>0?` (${activeCount}件の条件)`:''}
          </button>
        </div>
      </div>
    </div>
  )
}


// ─── タスクフォームモーダル ───────────────────────────────────
function TaskFormModal({task,customers,allProjects,contacts,categories,statuses,priorities,onClose,onSave}:{
  task:WorkTask|null;customers:Customer[];allProjects:CustomerProject[];contacts:string[];categories:string[];statuses:string[];priorities:string[]
  onClose:()=>void;onSave:(dto:WorkTaskDto)=>Promise<void>
}){
  const[form,setForm]=useState<WorkTaskDto>(task?{No:task.no,Category:task.category,Assignees:task.assignees,CustomerName:task.customerName,TaskName:task.taskName,Status:task.status,StartDate:task.startDate,PlannedEndDate:task.plannedEndDate,ActualEndDate:task.actualEndDate,Progress:task.progress,Priority:task.priority,Notes:task.notes,Deliverable:task.deliverable,ProjectId:task.projectId}:{...EMPTY_TASK})
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const[assigneeSet,setAssigneeSet]=useState(new Set(task?assigneeList(task.assignees):[]))
  const set=(k:keyof WorkTaskDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))
  const toggleA=(a:string)=>{const n=new Set(assigneeSet);n.has(a)?n.delete(a):n.add(a);setAssigneeSet(n);setForm(p=>({...p,Assignees:Array.from(n).join(',')}))}
  const linkedCustomer=customers.find(c=>c.name===form.CustomerName)
  const relatedProjects=linkedCustomer?allProjects.filter(p=>p.customerId===linkedCustomer.id):[]
  const currentLinkedProj=form.ProjectId?allProjects.find(p=>p.id===form.ProjectId):null
  const displayProjects=currentLinkedProj&&!relatedProjects.find(p=>p.id===currentLinkedProj.id)
    ?[currentLinkedProj,...relatedProjects]
    :relatedProjects
  const handleSave=async()=>{if(!form.TaskName.trim()){setError('タスク名は必須です');return};setSaving(true);try{await onSave({...form,Assignees:Array.from(assigneeSet).join(',')})}catch{setError('保存に失敗しました');setSaving(false)}}
  const inp:React.CSSProperties={width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:'0.83rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.7rem',fontWeight:700,color:'#64748b',marginBottom:3}
  const fld:React.CSSProperties={marginBottom:'0.75rem'}
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:580,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem 1.25rem',borderBottom:'1px solid #f1f5f9',flexShrink:0}}><h3 style={{margin:0,fontSize:'0.95rem',fontWeight:700,color:'#0f172a'}}>{task?'タスクを編集':'タスクを追加'}</h3><button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#94a3b8',outline:'none'}}>✕</button></div>
        <div style={{overflowY:'auto',flex:1,padding:'1rem 1.25rem'}}>
          {error&&<div style={{background:'#fef2f2',color:'#dc2626',padding:'7px 10px',borderRadius:6,fontSize:'0.78rem',marginBottom:'0.75rem',border:'1px solid #fecaca'}}>{error}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div style={fld}><label style={lbl}>タスク名 *</label><input style={inp} value={form.TaskName} onChange={e=>set('TaskName',e.target.value)} placeholder="例：サーバーリプレイス提案資料作成"/></div>
            <div style={fld}><label style={lbl}>分類</label><select style={inp} value={form.Category} onChange={e=>set('Category',e.target.value)}>{categories.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={fld}>
            <label style={lbl}>担当者（複数選択可）</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,background:'#f8fafc'}}>
              {contacts.map(a=>{const checked=assigneeSet.has(a);return(
                <label key={a} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:5,cursor:'pointer',background:checked?'#eff6ff':'white',border:`1px solid ${checked?'#bfdbfe':'#e2e8f0'}`}}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleA(a)} style={{width:13,height:13,accentColor:'#1d4ed8',cursor:'pointer',flexShrink:0}}/>
                  <span style={{fontSize:'0.73rem',fontWeight:checked?700:400,color:checked?'#1d4ed8':'#334155'}}>{a}</span>
                </label>
              )})}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div style={fld}><label style={lbl}>顧客名</label><select style={inp} value={form.CustomerName} onChange={e=>{set('CustomerName',e.target.value);set('ProjectId',null)}}><option value="">（顧客なし）</option>{customers.map(c=><option key={c.id}>{c.name}</option>)}</select></div>
            <div style={fld}><label style={lbl}>紐づく案件</label><select style={inp} value={form.ProjectId??''} onChange={e=>set('ProjectId',e.target.value?+e.target.value:null)} disabled={displayProjects.length===0}><option value="">（案件なし）</option>{displayProjects.map(p=><option key={p.id} value={p.id}>[{p.status}] {p.projectName}</option>)}</select></div>
            <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.Status} onChange={e=>set('Status',e.target.value)}>{statuses.map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={fld}><label style={lbl}>優先度</label><select style={inp} value={form.Priority} onChange={e=>set('Priority',e.target.value)}>{priorities.map(p=><option key={p}>{p}</option>)}</select></div>
            <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} type="date" value={toDateInput(form.StartDate)} onChange={e=>set('StartDate',fromDateInput(e.target.value))}/></div>
            <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} type="date" value={toDateInput(form.PlannedEndDate)} onChange={e=>set('PlannedEndDate',fromDateInput(e.target.value))}/></div>
            <div style={{...fld,gridColumn:'1/-1'}}><label style={lbl}>進捗率 ({Math.round((form.Progress||0)*100)}%)</label><input type="range" min={0} max={1} step={0.05} value={form.Progress||0} onChange={e=>set('Progress',+e.target.value)} style={{width:'100%',accentColor:'#1d4ed8'}}/></div>
          </div>
          <div style={fld}><label style={lbl}>備考</label><textarea style={{...inp,resize:'vertical',minHeight:60}} value={form.Notes||''} onChange={e=>set('Notes',e.target.value)} placeholder="進捗メモ・連絡事項など"/></div>
        </div>
        <div style={{display:'flex',gap:8,padding:'0.85rem 1.25rem',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:'9px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,padding:'9px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontFamily:'inherit',outline:'none',opacity:saving?0.6:1}}>{saving?'保存中...':'保存する'}</button>
        </div>
      </div>
    </div>
  )
}
