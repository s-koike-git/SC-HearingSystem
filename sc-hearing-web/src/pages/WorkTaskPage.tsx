import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import { workTasksApi, customerProjectsApi, customersApi, type WorkTask, type WorkTaskDto, type Customer, type CustomerProject } from '../services/api'

// ─── 定数 ────────────────────────────────────────────────────
const CONTACTS = ['永田 暁洋','岸本 健二','小池 慎郁','成清 祐介','西山 悠太','赤星 美和子']
const CATEGORIES = ['自社','NBS','内田洋行','その他']
const STATUSES = ['未着手','進行中','完了']
const PRIORITIES = ['高','中','低']
const TODAY = new Date('2026-05-11')
const ROW_H = 44, HDR_H = 44, HDR_H_DAY = 72, NAME_COL = 340

const STATUS_STYLE: Record<string,{bg:string;color:string;border:string;bar:string}> = {
  '未着手':{bg:'#f1f5f9',color:'#64748b',border:'#e2e8f0',bar:'#94a3b8'},
  '進行中':{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe',bar:'#3b82f6'},
  '完了':  {bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0',bar:'#10b981'},
}
const PRIORITY_STYLE: Record<string,{bg:string;color:string}> = {
  '高':{bg:'#fef2f2',color:'#dc2626'},
  '中':{bg:'#fffbeb',color:'#d97706'},
  '低':{bg:'#f8fafc',color:'#94a3b8'},
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
function formatSize(b:number){return b<1024?`${b}B`:b<1048576?`${(b/1024).toFixed(1)}KB`:`${(b/1048576).toFixed(1)}MB`}

const EMPTY_TASK: WorkTaskDto = {
  No:0,Category:'自社',Assignees:'',CustomerName:'',TaskName:'',Status:'未着手',
  StartDate:null,PlannedEndDate:null,ActualEndDate:null,Progress:0,Priority:'中',
  Notes:'',Deliverable:'',ProjectId:null,
}

// ═══════════════════════════════════════════════════════════════
// メインページ
// ═══════════════════════════════════════════════════════════════
export default function WorkTaskPage(){
  const[tasks,setTasks]=useState<WorkTask[]>([])
  const[customers,setCustomers]=useState<Customer[]>([])
  const[allProjects,setAllProjects]=useState<CustomerProject[]>([])
  const[loading,setLoading]=useState(true)
  const[viewMode,setViewMode]=useState<'table'|'gantt'>('table')
  const[search,setSearch]=useState('')
  const[fStatus,setFStatus]=useState('all')
  const[fAssignee,setFAssignee]=useState('all')
  const[fCategory,setFCategory]=useState('all')
  const[fPriority,setFPriority]=useState('all')
  const[editTask,setEditTask]=useState<WorkTask|null>(null)
  const[isCreating,setIsCreating]=useState(false)
  const[delTarget,setDelTarget]=useState<WorkTask|null>(null)

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
    if(fStatus!=='all'&&t.status!==fStatus)return false
    if(fAssignee!=='all'&&!t.assignees.includes(fAssignee))return false
    if(fCategory!=='all'&&t.category!==fCategory)return false
    if(fPriority!=='all'&&t.priority!==fPriority)return false
    return true
  }).sort((a,b)=>{const pO=['高','中','低'];return pO.indexOf(a.priority)-pO.indexOf(b.priority)||a.no-b.no}),[tasks,search,fStatus,fAssignee,fCategory,fPriority])

  const stats=useMemo(()=>({
    total:tasks.length,
    inProgress:tasks.filter(t=>t.status==='進行中').length,
    done:tasks.filter(t=>t.status==='完了').length,
    overdue:tasks.filter(t=>{const dl=daysLeft(t.plannedEndDate);return t.status!=='完了'&&dl!==null&&dl<0}).length,
  }),[tasks])

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

        {/* サマリ */}
        <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10,marginBottom:'1.25rem'}}>
          {[{label:'総タスク数',value:`${stats.total}`,unit:'件',color:'#0f172a'},{label:'進行中',value:`${stats.inProgress}`,unit:'件',color:'#1d4ed8'},{label:'完了',value:`${stats.done}`,unit:'件',color:'#15803d'},{label:'期限超過',value:`${stats.overdue}`,unit:'件',color:'#dc2626'}].map(s=>(
            <div key={s.label} style={{background:'white',borderRadius:10,border:'1px solid #e2e8f0',padding:'12px 14px'}}>
              <div style={{fontSize:'0.68rem',color:'#94a3b8',marginBottom:3}}>{s.label}</div>
              <div style={{fontSize:'1.3rem',fontWeight:700,color:s.color}}>{s.value}<span style={{fontSize:'0.75rem',fontWeight:500,marginLeft:2}}>{s.unit}</span></div>
            </div>
          ))}
        </div>

        {/* フィルター */}
        <div style={{display:'flex',gap:8,marginBottom:'1rem',flexWrap:'wrap'}}>
          <input style={{...sel,flex:1,minWidth:180,padding:'7px 12px'}} placeholder="タスク名・顧客名・担当者で検索..." value={search} onChange={e=>setSearch(e.target.value)}/>
          <select style={sel} value={fStatus} onChange={e=>setFStatus(e.target.value)}><option value="all">全ステータス</option>{STATUSES.map(s=><option key={s}>{s}</option>)}</select>
          <select style={sel} value={fAssignee} onChange={e=>setFAssignee(e.target.value)}><option value="all">全担当者</option>{CONTACTS.map(c=><option key={c}>{c}</option>)}</select>
          <select style={sel} value={fCategory} onChange={e=>setFCategory(e.target.value)}><option value="all">全分類</option>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select>
          <select style={sel} value={fPriority} onChange={e=>setFPriority(e.target.value)}><option value="all">全優先度</option>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select>
          <span style={{fontSize:'0.78rem',color:'#94a3b8',display:'flex',alignItems:'center'}}>{filtered.length}件</span>
        </div>

        {loading?<div style={{textAlign:'center',padding:'4rem',color:'#94a3b8'}}>読み込み中...</div>
          :viewMode==='gantt'?
            <WorkTaskGanttView tasks={filtered} customers={customers} allProjects={allProjects} onTaskChange={load}/>
          :(
          <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                  {['No','分類','担当者','顧客・案件','タスク名','ステータス','開始日','完了予定日','進捗','優先度','操作'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#64748b',whiteSpace:'nowrap'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={11} style={{padding:'3rem',textAlign:'center',color:'#94a3b8'}}>タスクがありません</td></tr>}
                {filtered.map((t,i)=>{
                  const dl=daysLeft(t.plannedEndDate),overdue=t.status!=='完了'&&dl!==null&&dl<0
                  const assignees=assigneeList(t.assignees)
                  const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
                  const pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
                  const catColor=CATEGORY_COLOR[t.category]??'#475569'
                  const linkedProj=t.projectId?allProjects.find(p=>p.id===t.projectId):null
                  return(
                    <tr key={t.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa',opacity:t.status==='完了'?0.7:1}}>
                      <td style={{padding:'9px 12px',color:'#94a3b8',fontSize:'0.7rem'}}>{t.no||t.id}</td>
                      <td style={{padding:'9px 12px'}}><span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:4,background:`${catColor}15`,color:catColor,fontWeight:700}}>{t.category}</span></td>
                      <td style={{padding:'9px 12px'}}>
                        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                          {assignees.map(a=><span key={a} style={{fontSize:'0.65rem',padding:'1px 6px',borderRadius:99,background:'#f1f5f9',color:'#334155',fontWeight:600,whiteSpace:'nowrap'}}>{a}</span>)}
                          {assignees.length===0&&<span style={{color:'#94a3b8',fontSize:'0.7rem'}}>―</span>}
                        </div>
                      </td>
                      <td style={{padding:'9px 12px',maxWidth:120}}>
                        <div style={{fontSize:'0.78rem',color:'#475569',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.customerName||'―'}</div>
                        {linkedProj&&<div style={{fontSize:'0.62rem',color:'#0369a1',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>↪ {linkedProj.projectName}</div>}
                      </td>
                      <td style={{padding:'9px 12px',maxWidth:200}}>
                        <div style={{fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.taskName}</div>
                        {t.notes&&<div style={{fontSize:'0.65rem',color:'#94a3b8',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes}</div>}
                        {t.deliverable&&<a href={t.deliverable} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.62rem',color:'#0369a1',textDecoration:'none'}}>📎 成果物</a>}
                      </td>
                      <td style={{padding:'9px 12px',whiteSpace:'nowrap'}}><span style={{fontSize:'0.7rem',padding:'2px 8px',borderRadius:99,background:st.bg,color:st.color,border:`1px solid ${st.border}`,fontWeight:700}}>{t.status}</span></td>
                      <td style={{padding:'9px 12px',color:'#64748b',fontSize:'0.73rem',whiteSpace:'nowrap'}}>{t.startDate||'―'}</td>
                      <td style={{padding:'9px 12px',whiteSpace:'nowrap'}}>
                        <div style={{fontSize:'0.73rem',color:overdue?'#dc2626':'#64748b',fontWeight:overdue?600:400}}>{t.status==='完了'?t.actualEndDate||t.plannedEndDate||'―':t.plannedEndDate||'―'}</div>
                        {overdue&&<div style={{fontSize:'0.62rem',color:'#dc2626'}}>⚠ {Math.abs(dl!)}日超過</div>}
                        {!overdue&&dl!==null&&t.status!=='完了'&&dl<=7&&<div style={{fontSize:'0.62rem',color:'#d97706'}}>あと{dl}日</div>}
                      </td>
                      <td style={{padding:'9px 12px',minWidth:90}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${Math.round(t.progress*100)}%`,background:t.progress>=1?'#10b981':t.progress>=0.5?'#3b82f6':'#f59e0b',borderRadius:99}}/>
                          </div>
                          <span style={{fontSize:'0.68rem',color:'#64748b',flexShrink:0}}>{Math.round(t.progress*100)}%</span>
                        </div>
                      </td>
                      <td style={{padding:'9px 12px'}}><span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:99,background:pt.bg,color:pt.color,fontWeight:700}}>{t.priority}</span></td>
                      <td style={{padding:'9px 12px'}}>
                        <div style={{display:'flex',gap:4}}>
                          <button onClick={()=>setEditTask(t)} style={{width:26,height:26,border:'1px solid #e2e8f0',borderRadius:5,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.7rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>✏</button>
                          <button onClick={()=>setDelTarget(t)} style={{width:26,height:26,border:'1px solid #fecaca',borderRadius:5,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'0.7rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center'}}>✕</button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {(isCreating||editTask)&&<TaskFormModal task={editTask} customers={customers} allProjects={allProjects} onClose={()=>{setIsCreating(false);setEditTask(null)}} onSave={async dto=>{if(editTask)await workTasksApi.update(editTask.id,dto);else await workTasksApi.create(dto);await load();setIsCreating(false);setEditTask(null)}}/>}
      {delTarget&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:12,padding:'1.75rem',maxWidth:360,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:'1.5rem',textAlign:'center',marginBottom:'0.75rem'}}>⚠️</div>
            <h3 style={{margin:'0 0 0.75rem',fontSize:'0.95rem',textAlign:'center',color:'#0f172a'}}>タスクを削除しますか？</h3>
            <p style={{margin:'0 0 1.25rem',textAlign:'center',color:'#475569',fontSize:'0.83rem',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>「{delTarget.taskName}」を削除します。<br/>この操作は元に戻せません。</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setDelTarget(null)} style={{flex:1,padding:'9px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button>
              <button onClick={async()=>{await workTasksApi.delete(delTarget.id);await load();setDelTarget(null)}} style={{flex:1,padding:'9px',border:'none',borderRadius:7,background:'#dc2626',color:'white',cursor:'pointer',fontWeight:700,fontFamily:'inherit',outline:'none'}}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}

// ═══════════════════════════════════════════════════════════════
// ★ 作業管理ガントチャート（CustomerGanttViewと同仕様）
// ═══════════════════════════════════════════════════════════════
interface DragInfo { type:'move'|'left'|'right'; task:WorkTask; startX:number; origStart:Date|null; origEnd:Date|null }

function WorkTaskGanttView({tasks,customers,allProjects,onTaskChange}:{
  tasks:WorkTask[];customers:Customer[];allProjects:CustomerProject[];onTaskChange:()=>void
}){
  const[scale,setScale]=useState<Scale>('6m')
  const[viewStart,setViewStart]=useState(()=>startOfMonth(addMonths(TODAY,-1)))
  const[activeStatuses,setActiveStatuses]=useState(new Set(['未着手','進行中']))
  const[selected,setSelected]=useState<WorkTask|null>(null)
  const[drag,setDrag]=useState<DragInfo|null>(null)
  const[tempDate,setTempDate]=useState<{id:number;start:Date|null;end:Date|null}|null>(null)
  const[saving,setSaving]=useState(false)
  const timelineRef=useRef<HTMLDivElement>(null)

  const{allMin,allMax}=useMemo(()=>{
    let min:Date|null=null,max:Date|null=null
    tasks.forEach(t=>{
      const s=parseDate(t.startDate),e=parseDate(t.plannedEndDate)
      if(s&&(!min||s<min))min=s;if(e&&(!max||e>max))max=e
    })
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
  const toggleStatus=(s:string)=>setActiveStatuses(prev=>{const n=new Set(prev);n.has(s)?n.delete(s):n.add(s);return n})

  // ── 表示行（案件でグルーピング）
  const rows=useMemo(()=>{
    const filtered=tasks.filter(t=>activeStatuses.has(t.status))
    // ProjectIdでグループ化
    const grouped:Map<string,WorkTask[]>=new Map()
    filtered.forEach(t=>{
      const key=t.projectId?`proj_${t.projectId}`:`cust_${t.customerName||'__'}`
      if(!grouped.has(key))grouped.set(key,[])
      grouped.get(key)!.push(t)
    })
    return Array.from(grouped.values()).flat()
  },[tasks,activeStatuses])

  // ── バー計算
  const calcBar=useCallback((t:WorkTask)=>{
    const hasTemp=tempDate?.id===t.id
    const s=hasTemp?tempDate?.start:parseDate(t.startDate)
    const e=hasTemp?tempDate?.end:parseDate(t.plannedEndDate)
    if(!s&&!e)return{left:0,width:0,hasBar:false,clipped:false,noEnd:!e}
    const bs=s??TODAY,be=e??addMonths(TODAY,1)
    const rawL=daysBetween(timeStart,bs)/totalDays*100,rawR=daysBetween(timeStart,be)/totalDays*100
    const left=Math.max(0,rawL),right=Math.min(100,rawR)
    return{left,width:Math.max(0.3,right-left),hasBar:right>0&&left<100,clipped:rawL<0||rawR>100,noEnd:!e}
  },[tempDate,timeStart,totalDays])

  // ── ドラッグ
  useEffect(()=>{
    if(!drag)return
    const onMove=(e:MouseEvent)=>{
      const w=timelineRef.current?.clientWidth??1
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
    if(type==='right'&&!origEnd&&timelineRef.current){
      const rect=timelineRef.current.getBoundingClientRect()
      const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/timelineRef.current.clientWidth))
      origEnd=addDays(timeStart,Math.round(pct*totalDays))
    }
    setDrag({type,task,startX:e.clientX,origStart:parseDate(task.startDate),origEnd})
  }

  const todayPct=Math.max(0,Math.min(100,daysBetween(timeStart,TODAY)/totalDays*100))
  const hdrH=isDay?HDR_H_DAY:HDR_H
  const contentH=rows.length*ROW_H
  const dayColW=isDay?Math.max(28,Math.floor(1100/Math.max(1,days.length))):0
  const monColW=isDay?0:Math.max(70,Math.floor(1100/Math.max(1,months.length)))

  const weekGroups=useMemo(()=>{
    if(!isDay||days.length===0)return[]
    const g:{label:string;count:number}[]=[];let wn=1,cnt=0
    days.forEach((d,i)=>{cnt++;if(d.getDay()===6||i===days.length-1){g.push({label:`第${wn}週`,count:cnt});wn++;cnt=0}})
    return g
  },[days,isDay])

  const stats2=useMemo(()=>STATUSES.reduce((a,s)=>({...a,[s]:tasks.filter(t=>t.status===s).length}),{} as Record<string,number>),[tasks])

  return(
    <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden',fontFamily:'"Noto Sans JP",sans-serif',userSelect:'none'}}>

      {/* ツールバー */}
      <div style={{padding:'10px 16px',borderBottom:'1px solid #f1f5f9',display:'flex',gap:10,flexWrap:'wrap',alignItems:'center',background:'#f8fafc'}}>
        <div style={{display:'flex',border:'1px solid #e2e8f0',borderRadius:7,overflow:'hidden',flexShrink:0}}>
          {(['1m','3m','6m','1y','all'] as Scale[]).map(s=>(
            <button key={s} onClick={()=>setScale(s)} style={{padding:'5px 11px',border:'none',borderRight:'1px solid #e2e8f0',background:scale===s?'#0f172a':'white',color:scale===s?'white':'#475569',fontWeight:600,fontSize:'0.76rem',cursor:'pointer',fontFamily:'inherit',whiteSpace:'nowrap'}}>{SCALE_LABELS[s]}</button>
          ))}
        </div>
        {scale!=='all'&&(
          <div style={{display:'flex',alignItems:'center',gap:6,flexShrink:0}}>
            <button onClick={()=>navigate(-1)} style={{width:28,height:28,border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.85rem',outline:'none'}}>◀</button>
            <button onClick={goToday} style={{padding:'4px 12px',border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#0f172a',fontWeight:600,fontSize:'0.76rem',cursor:'pointer',fontFamily:'inherit'}}>今日</button>
            <button onClick={()=>navigate(1)} style={{width:28,height:28,border:'1px solid #e2e8f0',borderRadius:6,background:'white',color:'#475569',cursor:'pointer',fontSize:'0.85rem',outline:'none'}}>▶</button>
            <span style={{fontSize:'0.73rem',color:'#64748b'}}>{isDay?`${viewStart.getFullYear()}年${viewStart.getMonth()+1}月`:`${formatMonth(timeStart)} 〜 ${formatMonth(addMonths(timeEnd,-1))}`}</span>
          </div>
        )}
        {saving&&<span style={{fontSize:'0.72rem',color:'#0369a1',fontWeight:600}}>保存中...</span>}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginLeft:'auto'}}>
          {STATUSES.map(s=>{const active=activeStatuses.has(s),st=STATUS_STYLE[s];return(
            <button key={s} onClick={()=>toggleStatus(s)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 9px',border:`1px solid ${active?st.bar:st.border}`,borderRadius:99,background:active?st.bg:'white',color:active?st.color:'#94a3b8',fontWeight:active?700:500,fontSize:'0.7rem',cursor:'pointer',fontFamily:'inherit'}}>
              <span style={{width:7,height:7,borderRadius:2,background:active?st.bar:'#d1d5db',flexShrink:0}}/>{s}{stats2[s]>0&&<span style={{fontSize:'0.62rem',opacity:.8}}>({stats2[s]})</span>}
            </button>
          )})}
        </div>
      </div>

      <div style={{padding:'5px 16px',background:'#fffbeb',borderBottom:'1px solid #fef3c7',fontSize:'0.68rem',color:'#92400e',display:'flex',gap:16}}>
        <span>💡 バークリック: 詳細・編集</span><span>バー中央ドラッグ: 日程移動</span><span>◀ 端ドラッグ ▶: 期間変更</span>
      </div>

      {/* ガント本体 */}
      <div style={{display:'flex',overflowX:'auto',overflowY:'auto',maxHeight:'calc(100vh - 340px)'}}>

        {/* 左固定カラム */}
        <div style={{flexShrink:0,width:NAME_COL,borderRight:'2px solid #e2e8f0',background:'white',position:'sticky',left:0,zIndex:20}}>
          <div style={{height:hdrH,borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'flex-end',padding:'0 14px 8px',background:'#f8fafc',position:'sticky',top:0,zIndex:21}}>
            <span style={{fontSize:'0.72rem',fontWeight:700,color:'#475569'}}>担当者 / 顧客・案件 / タスク名</span>
          </div>
          {rows.map((t,i)=>{
            const proj=t.projectId?allProjects.find(p=>p.id===t.projectId):null
            const assignees=assigneeList(t.assignees)
            const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
            const pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
            return(
              <div key={t.id} style={{height:ROW_H,borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',padding:'0 10px',gap:5,background:i%2===0?'white':'#fafafa'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{display:'flex',gap:3,flexWrap:'nowrap',marginBottom:2}}>
                    {assignees.slice(0,2).map(a=><span key={a} style={{fontSize:'0.6rem',padding:'0 5px',borderRadius:99,background:'#f1f5f9',color:'#475569',whiteSpace:'nowrap'}}>{a}</span>)}
                    {assignees.length>2&&<span style={{fontSize:'0.6rem',color:'#94a3b8'}}>+{assignees.length-2}</span>}
                  </div>
                  {(t.customerName||proj)&&<div style={{fontSize:'0.62rem',color:'#0369a1',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',marginBottom:1}}>{t.customerName&&<span>{t.customerName}</span>}{proj&&<span style={{marginLeft:4}}>↪ {proj.projectName}</span>}</div>}
                  <div style={{fontSize:'0.75rem',fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.taskName}</div>
                </div>
                <span style={{fontSize:'0.58rem',padding:'1px 5px',borderRadius:99,background:st.bg,color:st.color,fontWeight:700,border:`1px solid ${st.border}`,flexShrink:0}}>{t.status}</span>
                <span style={{fontSize:'0.6rem',padding:'1px 4px',borderRadius:3,background:pt.bg,color:pt.color,fontWeight:700,flexShrink:0}}>{t.priority}</span>
              </div>
            )
          })}
        </div>

        {/* タイムライン */}
        <div ref={timelineRef} style={{flex:1,minWidth:isDay?`${days.length*dayColW}px`:`${months.length*monColW}px`,position:'relative',height:hdrH+contentH}}>

          {/* 月ヘッダー */}
          {!isDay&&<div style={{display:'flex',height:hdrH,borderBottom:'1px solid #e2e8f0',background:'#f8fafc',position:'sticky',top:0,zIndex:10}}>
            {months.map((m,i)=>{const isCur=m.getMonth()===TODAY.getMonth()&&m.getFullYear()===TODAY.getFullYear();return(
              <div key={i} style={{width:monColW,flexShrink:0,borderRight:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',background:isCur?'#eff6ff':undefined}}>
                <span style={{fontSize:'0.72rem',fontWeight:isCur?700:500,color:isCur?'#1d4ed8':'#64748b'}}>{formatMonth(m)}</span>
              </div>
            )})}
          </div>}

          {/* 日スケールヘッダー */}
          {isDay&&<div style={{position:'sticky',top:0,zIndex:10,background:'#f8fafc',borderBottom:'1px solid #e2e8f0'}}>
            <div style={{display:'flex',height:28,borderBottom:'1px solid #e2e8f0'}}>
              {weekGroups.map((wg,i)=><div key={i} style={{width:wg.count*dayColW,flexShrink:0,borderRight:'2px solid #d1d5db',display:'flex',alignItems:'center',justifyContent:'center',background:i%2===0?'#f8fafc':'#f1f5f9'}}><span style={{fontSize:'0.65rem',fontWeight:700,color:'#64748b'}}>{wg.label}</span></div>)}
            </div>
            <div style={{display:'flex',height:44}}>
              {days.map((d,i)=>{const wd=d.getDay(),isSun=wd===0,isSat=wd===6,isToday=daysBetween(d,TODAY)===0,isMon=wd===1&&i>0;return(
                <div key={i} style={{width:dayColW,flexShrink:0,borderRight:isMon?'2px solid #d1d5db':'1px solid #e2e8f0',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',background:isToday?'#dbeafe':isSun?'#fef2f2':isSat?'#f0f9ff':'white'}}>
                  <span style={{fontSize:Math.min(11,dayColW-4)+'px',fontWeight:isToday?700:500,color:isToday?'#1d4ed8':isSun?'#dc2626':isSat?'#2563eb':'#334155'}}>{d.getDate()}</span>
                  <span style={{fontSize:Math.min(9,dayColW-6)+'px',color:isToday?'#3b82f6':isSun?'#ef4444':isSat?'#3b82f6':'#94a3b8'}}>{WEEKDAY_JA[wd]}</span>
                </div>
              )})}
            </div>
          </div>}

          {/* 今日ライン（z-index: 8 で必ずバーの上に表示） */}
          {todayPct>=0&&todayPct<=100&&(
            <div style={{position:'absolute',left:`${todayPct}%`,top:hdrH,height:contentH,width:2,background:'#ef4444',opacity:0.75,zIndex:8,pointerEvents:'none'}}>
              <div style={{position:'absolute',top:-16,left:-16,background:'#ef4444',color:'white',fontSize:'0.55rem',padding:'1px 5px',borderRadius:3,fontWeight:700,whiteSpace:'nowrap'}}>TODAY</div>
            </div>
          )}

          {/* グリッドライン（z-index: 1 = バーより後ろ） */}
          {!isDay&&months.map((m,i)=>{
            const left=daysBetween(timeStart,m)/totalDays*100
            const isCur=m.getMonth()===TODAY.getMonth()&&m.getFullYear()===TODAY.getFullYear()
            return<div key={i} style={{position:'absolute',left:`${left}%`,top:hdrH,height:contentH,width:isCur?monColW:1,background:isCur?'#eff6ff60':'#f1f5f9',zIndex:1,pointerEvents:'none'}}/>
          })}
          {isDay&&days.map((d,i)=>{
            const left=daysBetween(timeStart,d)/totalDays*100,wd=d.getDay(),isMon=wd===1&&i>0,isToday=daysBetween(d,TODAY)===0
            if(isToday)return null
            return<div key={i} style={{position:'absolute',left:`${left}%`,top:hdrH,height:contentH,width:isMon?2:1,background:wd===0?'#fee2e240':wd===6?'#dbeafe40':isMon?'#d1d5db':'#f1f5f9',zIndex:1,pointerEvents:'none'}}/>
          })}

          {/* ★ データ行（絶対配置・z-index: 2 = グリッドの上、バーは z-index: 5） */}
          {rows.map((t,i)=>{
            const top=hdrH+i*ROW_H
            const bar=calcBar(t)
            const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
            const isDragging=drag?.task.id===t.id

            return(
              <div key={t.id} style={{position:'absolute',left:0,right:0,top,height:ROW_H,borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa',zIndex:2}}>
                {bar.hasBar?(
                  <div style={{
                    position:'absolute',left:`${bar.left}%`,width:`${bar.width}%`,
                    top:'50%',transform:'translateY(-50%)',height:26,
                    background:isDragging?`${st.bar}dd`:`linear-gradient(135deg,${st.bar},${st.bar}cc)`,
                    borderRadius:5,display:'flex',alignItems:'center',overflow:'hidden',
                    boxShadow:isDragging?`0 4px 12px ${st.bar}60`:`0 1px 4px ${st.bar}40`,
                    zIndex:5,border:isDragging?'2px solid white':undefined,
                  }}>
                    {/* 進捗オーバーレイ */}
                    <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${t.progress*100}%`,background:'rgba(255,255,255,0.2)',pointerEvents:'none'}}/>
                    {/* 左リサイズハンドル */}
                    <div onMouseDown={e=>startDrag(e,t,'left')} style={{width:8,height:'100%',cursor:'w-resize',background:'rgba(255,255,255,0.25)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:6}} title="開始日を変更">
                      <div style={{width:2,height:12,background:'rgba(255,255,255,0.7)',borderRadius:1}}/>
                    </div>
                    {/* 本体（移動＋クリック） */}
                    <div onMouseDown={e=>startDrag(e,t,'move')} onClick={()=>!drag&&setSelected(t)}
                      style={{flex:1,height:'100%',cursor:'grab',display:'flex',alignItems:'center',paddingLeft:4,overflow:'hidden',zIndex:6}}>
                      <span style={{fontSize:'0.64rem',color:'white',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',pointerEvents:'none'}}>
                        {bar.width>5?t.taskName:''}
                      </span>
                    </div>
                    {/* 右リサイズハンドル */}
                    <div onMouseDown={e=>startDrag(e,t,'right')} style={{width:8,height:'100%',cursor:'e-resize',background:bar.noEnd?'rgba(255,255,100,0.4)':'rgba(255,255,255,0.25)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',zIndex:6}} title={bar.noEnd?'ドラッグで終了日を設定':'終了日を変更'}>
                      <div style={{width:2,height:12,background:'rgba(255,255,255,0.7)',borderRadius:1}}/>
                    </div>
                  </div>
                ):(
                  <div style={{position:'absolute',left:`${todayPct}%`,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:4,zIndex:5}}>
                    <div style={{width:8,height:8,borderRadius:2,background:st.bar,transform:'rotate(45deg)'}}/>
                    <span style={{fontSize:'0.6rem',color:'#94a3b8',whiteSpace:'nowrap'}}>日程未設定</span>
                  </div>
                )}
                {/* ドラッグ中ツールチップ */}
                {isDragging&&tempDate&&(
                  <div style={{position:'absolute',left:`${Math.min(bar.left+2,75)}%`,top:'calc(50% + 17px)',background:'#0f172a',color:'white',fontSize:'0.62rem',padding:'3px 8px',borderRadius:5,whiteSpace:'nowrap',zIndex:20,pointerEvents:'none'}}>
                    {tempDate.start?fmt(tempDate.start):'―'} 〜 {tempDate.end?fmt(tempDate.end):'―'}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* フッター */}
      <div style={{padding:'8px 16px',borderTop:'1px solid #f1f5f9',display:'flex',gap:14,flexWrap:'wrap',alignItems:'center',background:'#f8fafc'}}>
        {STATUSES.filter(s=>stats2[s]>0).map(s=><div key={s} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:STATUS_STYLE[s].bar}}/><span style={{fontSize:'0.7rem',color:'#64748b'}}>{s} {stats2[s]}件</span></div>)}
        <span style={{fontSize:'0.7rem',color:'#94a3b8',marginLeft:'auto'}}>バークリック: 詳細・編集 ／ 端ドラッグ: 期間変更 ／ 中央ドラッグ: 移動</span>
      </div>

      {/* 詳細・編集ポップアップ */}
      {selected&&<TaskDetailModal task={selected} allProjects={allProjects} onClose={()=>setSelected(null)} onSave={async dto=>{await workTasksApi.update(selected.id,dto);onTaskChange();setSelected(null)}} onDelete={async()=>{await workTasksApi.delete(selected.id);onTaskChange();setSelected(null)}}/>}
    </div>
  )
}

// ─── タスク詳細・編集モーダル ─────────────────────────────────
function TaskDetailModal({task:t,allProjects,onClose,onSave,onDelete}:{
  task:WorkTask;allProjects:CustomerProject[];onClose:()=>void;onSave:(dto:WorkTaskDto)=>Promise<void>;onDelete:()=>Promise<void>
}){
  const[editing,setEditing]=useState(false)
  const[form,setForm]=useState<WorkTaskDto>({No:t.no,Category:t.category,Assignees:t.assignees,CustomerName:t.customerName,TaskName:t.taskName,Status:t.status,StartDate:t.startDate,PlannedEndDate:t.plannedEndDate,ActualEndDate:t.actualEndDate,Progress:t.progress,Priority:t.priority,Notes:t.notes,Deliverable:t.deliverable,ProjectId:t.projectId})
  const[saving,setSaving]=useState(false)
  const[confirmDel,setConfirmDel]=useState(false)
  const[assigneeSet,setAssigneeSet]=useState(new Set(assigneeList(t.assignees)))
  const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
  const pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
  const linkedProj=t.projectId?allProjects.find(p=>p.id===t.projectId):null
  const set=(k:keyof WorkTaskDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))
  const toggleA=(a:string)=>{const n=new Set(assigneeSet);n.has(a)?n.delete(a):n.add(a);setAssigneeSet(n);setForm(p=>({...p,Assignees:Array.from(n).join(',')}))}
  const handleSave=async()=>{setSaving(true);try{await onSave({...form,Assignees:Array.from(assigneeSet).join(',')})}catch{alert('保存に失敗しました');setSaving(false)}}
  const inp:React.CSSProperties={width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:'0.82rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.68rem',fontWeight:700,color:'#64748b',marginBottom:3}
  const fld:React.CSSProperties={marginBottom:'0.75rem'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>!editing&&onClose()}>
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
            <button onClick={()=>setEditing(false)} style={{padding:'5px 14px',border:'1px solid #e2e8f0',borderRight:'none',borderRadius:'6px 0 0 6px',background:!editing?'#0f172a':'white',color:!editing?'white':'#475569',fontWeight:600,fontSize:'0.75rem',cursor:'pointer',fontFamily:'inherit'}}>詳細</button>
            <button onClick={()=>setEditing(true)} style={{padding:'5px 14px',border:'1px solid #e2e8f0',borderRadius:'0 6px 6px 0',background:editing?'#0f172a':'white',color:editing?'white':'#475569',fontWeight:600,fontSize:'0.75rem',cursor:'pointer',fontFamily:'inherit'}}>✏ 編集</button>
          </div>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'1rem 1.25rem'}}>
          {!editing?(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:'0.75rem'}}>
                {[
                  {label:'ステータス',value:<span style={{padding:'2px 8px',borderRadius:99,background:st.bg,color:st.color,fontWeight:700,fontSize:'0.78rem',border:`1px solid ${st.border}`}}>{t.status}</span>},
                  {label:'優先度',value:<span style={{padding:'2px 8px',borderRadius:99,background:pt.bg,color:pt.color,fontWeight:700,fontSize:'0.78rem'}}>{t.priority}</span>},
                  {label:'開始日',value:t.startDate??'未設定'},
                  {label:'完了予定日',value:t.plannedEndDate??'未設定'},
                  {label:'進捗',value:`${Math.round(t.progress*100)}%`},
                  {label:'分類',value:t.category},
                ].map(item=>(
                  <div key={item.label}><div style={{fontSize:'0.63rem',color:'#94a3b8',marginBottom:2}}>{item.label}</div><div style={{fontSize:'0.82rem',color:'#0f172a',fontWeight:500}}>{item.value}</div></div>
                ))}
              </div>
              {t.assignees&&<div style={{marginBottom:'0.75rem'}}><div style={{fontSize:'0.63rem',color:'#94a3b8',marginBottom:4}}>担当者</div><div style={{display:'flex',gap:4,flexWrap:'wrap'}}>{assigneeList(t.assignees).map(a=><span key={a} style={{fontSize:'0.72rem',padding:'2px 8px',borderRadius:99,background:'#f1f5f9',color:'#334155',fontWeight:600}}>{a}</span>)}</div></div>}
              {t.notes&&<div style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px',fontSize:'0.78rem',color:'#475569',lineHeight:1.6,whiteSpace:'pre-wrap'}}>{t.notes}</div>}
              {t.deliverable&&<div style={{marginTop:8}}><a href={t.deliverable} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.78rem',color:'#0369a1',textDecoration:'none'}}>📎 成果物リンク</a></div>}
            </div>
          ):(
            <div>
              <div style={fld}><label style={lbl}>タスク名</label><input style={inp} value={form.TaskName} onChange={e=>set('TaskName',e.target.value)}/></div>
              <div style={fld}>
                <label style={lbl}>担当者（複数選択可）</label>
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,background:'#f8fafc'}}>
                  {CONTACTS.map(a=>{const checked=assigneeSet.has(a);return(
                    <label key={a} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:5,cursor:'pointer',background:checked?'#eff6ff':'white',border:`1px solid ${checked?'#bfdbfe':'#e2e8f0'}`}}>
                      <input type="checkbox" checked={checked} onChange={()=>toggleA(a)} style={{width:13,height:13,accentColor:'#1d4ed8',cursor:'pointer',flexShrink:0}}/>
                      <span style={{fontSize:'0.72rem',fontWeight:checked?700:400,color:checked?'#1d4ed8':'#334155'}}>{a}</span>
                    </label>
                  )})}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
                <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.Status} onChange={e=>set('Status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
                <div style={fld}><label style={lbl}>優先度</label><select style={inp} value={form.Priority} onChange={e=>set('Priority',e.target.value)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
                <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} value={form.StartDate??''} onChange={e=>set('StartDate',e.target.value)} placeholder="例：2026/05/01"/></div>
                <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} value={form.PlannedEndDate??''} onChange={e=>set('PlannedEndDate',e.target.value)} placeholder="例：2026/06/30"/></div>
                <div style={{...fld,gridColumn:'1/-1'}}>
                  <label style={lbl}>進捗 ({Math.round((form.Progress||0)*100)}%)</label>
                  <input type="range" min={0} max={1} step={0.05} value={form.Progress||0} onChange={e=>set('Progress',+e.target.value)} style={{width:'100%',accentColor:'#1d4ed8'}}/>
                </div>
              </div>
              <div style={fld}><label style={lbl}>備考</label><textarea style={{...inp,resize:'vertical',minHeight:60}} value={form.Notes||''} onChange={e=>set('Notes',e.target.value)}/></div>
            </div>
          )}
        </div>
        <div style={{padding:'0.75rem 1.25rem',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,flexShrink:0}}>
          <button onClick={()=>setConfirmDel(true)} style={{padding:'8px 14px',border:'1px solid #fecaca',borderRadius:7,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontWeight:600,fontSize:'0.8rem',fontFamily:'inherit',outline:'none'}}>🗑 削除</button>
          <div style={{flex:1}}/>
          <button onClick={onClose} style={{padding:'8px 16px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',fontFamily:'inherit',outline:'none'}}>閉じる</button>
          {editing&&<button onClick={handleSave} disabled={saving} style={{padding:'8px 20px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontSize:'0.82rem',fontFamily:'inherit',outline:'none',opacity:saving?0.6:1}}>{saving?'保存中...':'✓ 保存'}</button>}
        </div>
      </div>
      {confirmDel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setConfirmDel(false)}>
          <div style={{background:'white',borderRadius:12,padding:'1.5rem',maxWidth:340,width:'90%'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'1.5rem',textAlign:'center',marginBottom:'0.5rem'}}>⚠️</div>
            <h3 style={{margin:'0 0 0.5rem',textAlign:'center',fontSize:'0.95rem',color:'#0f172a'}}>タスクを削除しますか？</h3>
            <p style={{margin:'0 0 1.25rem',textAlign:'center',color:'#475569',fontSize:'0.83rem',background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>「{t.taskName}」を削除します。<br/>この操作は元に戻せません。</p>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setConfirmDel(false)} style={{flex:1,padding:'8px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button>
              <button onClick={onDelete} style={{flex:1,padding:'8px',border:'none',borderRadius:7,background:'#dc2626',color:'white',cursor:'pointer',fontWeight:700,fontFamily:'inherit',outline:'none'}}>削除する</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── タスクフォームモーダル ───────────────────────────────────
function TaskFormModal({task,customers,allProjects,onClose,onSave}:{
  task:WorkTask|null;customers:Customer[];allProjects:CustomerProject[];onClose:()=>void;onSave:(dto:WorkTaskDto)=>Promise<void>
}){
  const[form,setForm]=useState<WorkTaskDto>(task?{No:task.no,Category:task.category,Assignees:task.assignees,CustomerName:task.customerName,TaskName:task.taskName,Status:task.status,StartDate:task.startDate,PlannedEndDate:task.plannedEndDate,ActualEndDate:task.actualEndDate,Progress:task.progress,Priority:task.priority,Notes:task.notes,Deliverable:task.deliverable,ProjectId:task.projectId}:{...EMPTY_TASK})
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const[assigneeSet,setAssigneeSet]=useState(new Set(task?assigneeList(task.assignees):[]))
  const set=(k:keyof WorkTaskDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))
  const toggleA=(a:string)=>{const n=new Set(assigneeSet);n.has(a)?n.delete(a):n.add(a);setAssigneeSet(n);setForm(p=>({...p,Assignees:Array.from(n).join(',')}))}
  const linkedCustomer=customers.find(c=>c.name===form.CustomerName)
  const relatedProjects=linkedCustomer?allProjects.filter(p=>p.customerId===linkedCustomer.id):[]
  const handleSave=async()=>{if(!form.TaskName.trim()){setError('タスク名は必須です');return};setSaving(true);try{await onSave({...form,Assignees:Array.from(assigneeSet).join(',')})}catch{setError('保存に失敗しました');setSaving(false)}}
  const inp:React.CSSProperties={width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:'0.83rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.7rem',fontWeight:700,color:'#64748b',marginBottom:3}
  const fld:React.CSSProperties={marginBottom:'0.75rem'}
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:580,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1rem 1.25rem',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <h3 style={{margin:0,fontSize:'0.95rem',fontWeight:700,color:'#0f172a'}}>{task?'タスクを編集':'タスクを追加'}</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#94a3b8',outline:'none'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'1rem 1.25rem'}}>
          {error&&<div style={{background:'#fef2f2',color:'#dc2626',padding:'7px 10px',borderRadius:6,fontSize:'0.78rem',marginBottom:'0.75rem',border:'1px solid #fecaca'}}>{error}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div style={fld}><label style={lbl}>タスク名 *</label><input style={inp} value={form.TaskName} onChange={e=>set('TaskName',e.target.value)} placeholder="例：サーバーリプレイス提案資料作成"/></div>
            <div style={fld}><label style={lbl}>分類</label><select style={inp} value={form.Category} onChange={e=>set('Category',e.target.value)}>{CATEGORIES.map(c=><option key={c}>{c}</option>)}</select></div>
          </div>
          <div style={fld}>
            <label style={lbl}>担当者（複数選択可）</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:5,padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,background:'#f8fafc'}}>
              {CONTACTS.map(a=>{const checked=assigneeSet.has(a);return(
                <label key={a} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:5,cursor:'pointer',background:checked?'#eff6ff':'white',border:`1px solid ${checked?'#bfdbfe':'#e2e8f0'}`}}>
                  <input type="checkbox" checked={checked} onChange={()=>toggleA(a)} style={{width:13,height:13,accentColor:'#1d4ed8',cursor:'pointer',flexShrink:0}}/>
                  <span style={{fontSize:'0.73rem',fontWeight:checked?700:400,color:checked?'#1d4ed8':'#334155'}}>{a}</span>
                </label>
              )})}
            </div>
          </div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div style={fld}>
              <label style={lbl}>顧客名</label>
              <select style={inp} value={form.CustomerName} onChange={e=>{set('CustomerName',e.target.value);set('ProjectId',null)}}>
                <option value="">（顧客なし）</option>
                {customers.map(c=><option key={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={fld}>
              <label style={lbl}>紐づく案件</label>
              <select style={inp} value={form.ProjectId??''} onChange={e=>set('ProjectId',e.target.value?+e.target.value:null)} disabled={relatedProjects.length===0}>
                <option value="">（案件なし）</option>
                {relatedProjects.map(p=><option key={p.id} value={p.id}>[{p.status}] {p.projectName}</option>)}
              </select>
              {relatedProjects.length===0&&form.CustomerName&&<div style={{fontSize:'0.62rem',color:'#94a3b8',marginTop:2}}>この顧客の案件がありません</div>}
            </div>
            <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.Status} onChange={e=>set('Status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={fld}><label style={lbl}>優先度</label><select style={inp} value={form.Priority} onChange={e=>set('Priority',e.target.value)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
            <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} value={form.StartDate??''} onChange={e=>set('StartDate',e.target.value)} placeholder="例：2026/05/01"/></div>
            <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} value={form.PlannedEndDate??''} onChange={e=>set('PlannedEndDate',e.target.value)} placeholder="例：2026/06/30"/></div>
            {form.Status==='完了'&&<div style={fld}><label style={lbl}>完了日 (YYYY/MM/DD)</label><input style={inp} value={form.ActualEndDate??''} onChange={e=>set('ActualEndDate',e.target.value)}/></div>}
            <div style={{...fld,gridColumn:'1/-1'}}>
              <label style={lbl}>進捗率 ({Math.round((form.Progress||0)*100)}%)</label>
              <input type="range" min={0} max={1} step={0.05} value={form.Progress||0} onChange={e=>set('Progress',+e.target.value)} style={{width:'100%',accentColor:'#1d4ed8'}}/>
            </div>
          </div>
          <div style={fld}><label style={lbl}>備考</label><textarea style={{...inp,resize:'vertical',minHeight:60}} value={form.Notes||''} onChange={e=>set('Notes',e.target.value)} placeholder="進捗メモ・連絡事項など"/></div>
          <div style={fld}><label style={lbl}>成果物URL</label><input style={inp} value={form.Deliverable||''} onChange={e=>set('Deliverable',e.target.value)} placeholder="https://..."/></div>
        </div>
        <div style={{display:'flex',gap:8,padding:'0.85rem 1.25rem',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:'9px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,padding:'9px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontFamily:'inherit',outline:'none',opacity:saving?0.6:1}}>{saving?'保存中...':'保存する'}</button>
        </div>
      </div>
    </div>
  )
}
