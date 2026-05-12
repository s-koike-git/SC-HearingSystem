import { useState, useMemo, useEffect, useCallback, useRef } from 'react'
import Layout from '../components/Layout'
import { workTasksApi, customerProjectsApi, customersApi, type WorkTask, type WorkTaskDto, type Customer, type CustomerProject } from '../services/api'

const CONTACTS = ['永田 暁洋','岸本 健二','小池 慎郁','成清 祐介','西山 悠太','赤星 美和子']
const CATEGORIES = ['自社','NBS','内田洋行','その他']
const STATUSES = ['未着手','進行中','完了']
const PRIORITIES = ['高','中','低']
const TODAY = new Date('2026-05-11')

const STATUS_STYLE: Record<string,{bg:string;color:string;border:string}> = {
  '未着手':{bg:'#f1f5f9',color:'#64748b',border:'#e2e8f0'},
  '進行中':{bg:'#eff6ff',color:'#1d4ed8',border:'#bfdbfe'},
  '完了':  {bg:'#f0fdf4',color:'#15803d',border:'#bbf7d0'},
}
const PRIORITY_STYLE: Record<string,{bg:string;color:string}> = {
  '高':{bg:'#fef2f2',color:'#dc2626'},
  '中':{bg:'#fffbeb',color:'#d97706'},
  '低':{bg:'#f8fafc',color:'#94a3b8'},
}
const CATEGORY_COLOR: Record<string,string> = {'自社':'#1e40af','NBS':'#6d28d9','内田洋行':'#0369a1','その他':'#475569'}

function parseDate(s:string|null):Date|null{if(!s)return null;const p=s.split('/');return p.length===3?new Date(+p[0],+p[1]-1,+p[2]):null}
function daysLeft(s:string|null):number|null{const d=parseDate(s);if(!d)return null;return Math.round((d.getTime()-TODAY.getTime())/86400000)}
function assigneeList(s:string):string[]{return s.split(',').map(a=>a.trim()).filter(Boolean)}

const EMPTY_TASK: WorkTaskDto = {
  No:0,Category:'自社',Assignees:'',CustomerName:'',TaskName:'',Status:'未着手',
  StartDate:null,PlannedEndDate:null,ActualEndDate:null,Progress:0,Priority:'中',Notes:'',Deliverable:'',ProjectId:null,
}

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
      // 全顧客の案件を取得
      const projectsAll: CustomerProject[]=[]
      for(const c of cr.data){
        try{const r=await customerProjectsApi.getByCustomer(c.id);projectsAll.push(...r.data)}catch{}
      }
      setAllProjects(projectsAll)
    }catch(e){console.error(e)}finally{setLoading(false)}
  },[])
  useEffect(()=>{load()},[load])

  const filtered=useMemo(()=>{
    return tasks.filter(t=>{
      const q=search.toLowerCase()
      if(q&&!t.taskName.toLowerCase().includes(q)&&!t.customerName.toLowerCase().includes(q)&&!t.assignees.toLowerCase().includes(q))return false
      if(fStatus!=='all'&&t.status!==fStatus)return false
      if(fAssignee!=='all'&&!t.assignees.includes(fAssignee))return false
      if(fCategory!=='all'&&t.category!==fCategory)return false
      if(fPriority!=='all'&&t.priority!==fPriority)return false
      return true
    }).sort((a,b)=>{
      const pOrd=['高','中','低'];return pOrd.indexOf(a.priority)-pOrd.indexOf(b.priority)||a.no-b.no
    })
  },[tasks,search,fStatus,fAssignee,fCategory,fPriority])

  const stats=useMemo(()=>({
    total:tasks.length,
    inProgress:tasks.filter(t=>t.status==='進行中').length,
    done:tasks.filter(t=>t.status==='完了').length,
    overdue:tasks.filter(t=>{const dl=daysLeft(t.plannedEndDate);return t.status!=='完了'&&dl!==null&&dl<0}).length,
    avgProgress:tasks.length?Math.round(tasks.filter(t=>t.status!=='完了').reduce((s,t)=>s+t.progress,0)/Math.max(1,tasks.filter(t=>t.status!=='完了').length)*100):0,
  }),[tasks])

  const sel:React.CSSProperties={padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:8,fontSize:'0.8rem',color:'#0f172a',background:'white',outline:'none',cursor:'pointer'}

  return(
    <Layout>
      <div style={{maxWidth:1600,margin:'0 auto',padding:'1.5rem 2rem',fontFamily:'"Noto Sans JP",sans-serif'}}>

        {/* ヘッダー */}
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
        <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:10,marginBottom:'1.25rem'}}>
          {[
            {label:'総タスク数',value:`${stats.total}`,unit:'件',color:'#0f172a'},
            {label:'進行中',value:`${stats.inProgress}`,unit:'件',color:'#1d4ed8'},
            {label:'完了',value:`${stats.done}`,unit:'件',color:'#15803d'},
            {label:'期限超過',value:`${stats.overdue}`,unit:'件',color:'#dc2626'},
            {label:'進行中の平均進捗',value:`${stats.avgProgress}`,unit:'%',color:'#7c3aed'},
          ].map(s=>(
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
          <span style={{fontSize:'0.78rem',color:'#94a3b8',display:'flex',alignItems:'center'}}>{filtered.length}件表示</span>
        </div>

        {loading?<div style={{textAlign:'center',padding:'4rem',color:'#94a3b8'}}>読み込み中...</div>
          :viewMode==='gantt'?<GanttView tasks={filtered}/>
          :(
          <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
            <table style={{width:'100%',borderCollapse:'collapse',fontSize:'0.82rem'}}>
              <thead>
                <tr style={{background:'#f8fafc',borderBottom:'2px solid #e2e8f0'}}>
                  {['No','分類','担当者','顧客名','タスク名','ステータス','開始日','完了予定日','進捗','優先度','操作'].map(h=>(
                    <th key={h} style={{padding:'10px 12px',textAlign:'left',fontSize:'0.7rem',fontWeight:700,color:'#64748b',whiteSpace:'nowrap',letterSpacing:'0.04em'}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length===0&&<tr><td colSpan={11} style={{padding:'3rem',textAlign:'center',color:'#94a3b8'}}>タスクがありません</td></tr>}
                {filtered.map((t,i)=>{
                  const dl=daysLeft(t.plannedEndDate)
                  const overdue=t.status!=='完了'&&dl!==null&&dl<0
                  const assignees=assigneeList(t.assignees)
                  const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
                  const pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
                  const catColor=CATEGORY_COLOR[t.category]??'#475569'
                  const linkedProj=t.projectId?allProjects.find(p=>p.id===t.projectId):null
                  return(
                    <tr key={t.id} style={{borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa',opacity:t.status==='完了'?0.7:1}}>
                      <td style={{padding:'10px 12px',color:'#94a3b8',fontSize:'0.7rem'}}>{t.no||t.id}</td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:4,background:`${catColor}15`,color:catColor,fontWeight:700}}>{t.category}</span>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <div style={{display:'flex',gap:3,flexWrap:'wrap'}}>
                          {assignees.map(a=>(
                            <span key={a} style={{fontSize:'0.65rem',padding:'1px 6px',borderRadius:99,background:'#f1f5f9',color:'#334155',fontWeight:600,whiteSpace:'nowrap'}}>{a}</span>
                          ))}
                          {assignees.length===0&&<span style={{color:'#94a3b8',fontSize:'0.7rem'}}>―</span>}
                        </div>
                      </td>
                      <td style={{padding:'10px 12px',color:'#475569',maxWidth:100,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                        {t.customerName||'―'}
                        {linkedProj&&<div style={{fontSize:'0.62rem',color:'#0369a1',marginTop:1}}>↪ {linkedProj.projectName}</div>}
                      </td>
                      <td style={{padding:'10px 12px',maxWidth:200}}>
                        <div style={{fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.taskName}</div>
                        {t.notes&&<div style={{fontSize:'0.65rem',color:'#94a3b8',marginTop:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.notes}</div>}
                        {t.deliverable&&<a href={t.deliverable} target="_blank" rel="noopener noreferrer" style={{fontSize:'0.62rem',color:'#0369a1',textDecoration:'none',display:'block',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>📎 成果物リンク</a>}
                      </td>
                      <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                        <span style={{fontSize:'0.7rem',padding:'2px 8px',borderRadius:99,background:st.bg,color:st.color,border:`1px solid ${st.border}`,fontWeight:700}}>{t.status}</span>
                      </td>
                      <td style={{padding:'10px 12px',color:'#64748b',fontSize:'0.73rem',whiteSpace:'nowrap'}}>{t.startDate||'―'}</td>
                      <td style={{padding:'10px 12px',whiteSpace:'nowrap'}}>
                        <div style={{fontSize:'0.73rem',color:overdue?'#dc2626':'#64748b',fontWeight:overdue?600:400}}>
                          {t.status==='完了'?t.actualEndDate||t.plannedEndDate||'―':t.plannedEndDate||'―'}
                        </div>
                        {overdue&&<div style={{fontSize:'0.62rem',color:'#dc2626'}}>⚠ {Math.abs(dl!)}日超過</div>}
                        {!overdue&&dl!==null&&t.status!=='完了'&&dl<=7&&<div style={{fontSize:'0.62rem',color:'#d97706'}}>あと{dl}日</div>}
                      </td>
                      <td style={{padding:'10px 12px',minWidth:100}}>
                        <div style={{display:'flex',alignItems:'center',gap:6}}>
                          <div style={{flex:1,height:6,background:'#f1f5f9',borderRadius:99,overflow:'hidden'}}>
                            <div style={{height:'100%',width:`${Math.round(t.progress*100)}%`,background:t.progress>=1?'#10b981':t.progress>=0.5?'#3b82f6':'#f59e0b',borderRadius:99,transition:'width .3s'}}/>
                          </div>
                          <span style={{fontSize:'0.68rem',color:'#64748b',flexShrink:0}}>{Math.round(t.progress*100)}%</span>
                        </div>
                      </td>
                      <td style={{padding:'10px 12px'}}>
                        <span style={{fontSize:'0.68rem',padding:'2px 7px',borderRadius:99,background:pt.bg,color:pt.color,fontWeight:700}}>{t.priority}</span>
                      </td>
                      <td style={{padding:'10px 12px'}}>
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

      {(isCreating||editTask)&&(
        <TaskFormModal task={editTask} customers={customers} allProjects={allProjects}
          onClose={()=>{setIsCreating(false);setEditTask(null)}}
          onSave={async dto=>{
            if(editTask)await workTasksApi.update(editTask.id,dto)
            else await workTasksApi.create(dto)
            await load();setIsCreating(false);setEditTask(null)
          }}
          onCreateAndLink={async(customerName,projectDto)=>{
            // 案件を作成して紐づけ
            const proj=await customerProjectsApi.create(projectDto)
            return proj.data.id
          }}/>
      )}
      {delTarget&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center'}}>
          <div style={{background:'white',borderRadius:12,padding:'1.75rem',maxWidth:360,width:'90%',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
            <div style={{fontSize:'1.5rem',textAlign:'center',marginBottom:'0.75rem'}}>⚠️</div>
            <h3 style={{margin:'0 0 0.5rem',fontSize:'0.95rem',textAlign:'center',color:'#0f172a'}}>タスクを削除しますか？</h3>
            <p style={{margin:'0 0 1.25rem',textAlign:'center',color:'#475569',fontSize:'0.83rem',lineHeight:1.6,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>「{delTarget.taskName}」を削除します。{'\n'}この操作は元に戻せません。</p>
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

// ─── タスクフォームモーダル ───────────────────────────────────
function TaskFormModal({task,customers,allProjects,onClose,onSave,onCreateAndLink}:{
  task:WorkTask|null;customers:Customer[];allProjects:CustomerProject[]
  onClose:()=>void
  onSave:(dto:WorkTaskDto)=>Promise<void>
  onCreateAndLink:(customerName:string,dto:any)=>Promise<number>
}){
  const[form,setForm]=useState<WorkTaskDto>(task?{
    No:task.no,Category:task.category,Assignees:task.assignees,CustomerName:task.customerName,
    TaskName:task.taskName,Status:task.status,StartDate:task.startDate,PlannedEndDate:task.plannedEndDate,
    ActualEndDate:task.actualEndDate,Progress:task.progress,Priority:task.priority,Notes:task.notes,
    Deliverable:task.deliverable,ProjectId:task.projectId,
  }:{...EMPTY_TASK})
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const[assigneeSet,setAssigneeSet]=useState<Set<string>>(new Set(task?assigneeList(task.assignees):[]))
  const[showCreateProject,setShowCreateProject]=useState(false)
  const[newProjectName,setNewProjectName]=useState('')

  // 担当者を変更するたびにformを更新
  const updateAssignees=(s:Set<string>)=>{
    setAssigneeSet(s)
    setForm(p=>({...p,Assignees:Array.from(s).join(',')}))
  }
  const toggleAssignee=(a:string)=>{
    const next=new Set(assigneeSet)
    next.has(a)?next.delete(a):next.add(a)
    updateAssignees(next)
  }

  // 選択中顧客の案件一覧
  const linkedCustomer=customers.find(c=>c.name===form.CustomerName)
  const relatedProjects=linkedCustomer?allProjects.filter(p=>p.customerId===linkedCustomer.id):[]

  const set=(k:keyof WorkTaskDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))

  const handleSave=async()=>{
    if(!form.TaskName.trim()){setError('タスク名は必須です');return}
    setSaving(true)
    try{
      let dto={...form,Assignees:Array.from(assigneeSet).join(',')}
      // 案件新規作成して紐づけ
      if(showCreateProject&&newProjectName&&linkedCustomer){
        const pid=await onCreateAndLink(form.CustomerName,{
          customerId:linkedCustomer.id,projectName:newProjectName,
          projectType:'その他',status:'提案中',description:form.Notes,
          startDate:form.StartDate,expectedEndDate:form.PlannedEndDate,amount:null,
        })
        dto={...dto,ProjectId:pid}
      }
      await onSave(dto)
    }catch{setError('保存に失敗しました');setSaving(false)}
  }

  const inp:React.CSSProperties={width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:'0.83rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.7rem',fontWeight:700,color:'#64748b',marginBottom:3}
  const fld:React.CSSProperties={marginBottom:'0.75rem'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:2000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:600,maxHeight:'92vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
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

          {/* 担当者（複数選択チェックボックス） */}
          <div style={fld}>
            <label style={lbl}>担当者（複数選択可）</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:6,padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:6,background:'#f8fafc'}}>
              {CONTACTS.map(a=>{
                const checked=assigneeSet.has(a)
                return(
                  <label key={a} style={{display:'flex',alignItems:'center',gap:5,padding:'4px 6px',borderRadius:5,cursor:'pointer',background:checked?'#eff6ff':'white',border:`1px solid ${checked?'#bfdbfe':'#e2e8f0'}`}}>
                    <input type="checkbox" checked={checked} onChange={()=>toggleAssignee(a)} style={{width:13,height:13,accentColor:'#1d4ed8',cursor:'pointer',flexShrink:0}}/>
                    <span style={{fontSize:'0.73rem',fontWeight:checked?700:400,color:checked?'#1d4ed8':'#334155'}}>{a}</span>
                  </label>
                )
              })}
            </div>
          </div>

          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 12px'}}>
            <div style={fld}><label style={lbl}>顧客名</label>
              <select style={inp} value={form.CustomerName} onChange={e=>{set('CustomerName',e.target.value);set('ProjectId',null);setShowCreateProject(false)}}>
                <option value="">（顧客なし）</option>
                {customers.map(c=><option key={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.Status} onChange={e=>set('Status',e.target.value)}>{STATUSES.map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} value={form.StartDate??''} onChange={e=>set('StartDate',e.target.value)} placeholder="例：2026/05/01"/></div>
            <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} value={form.PlannedEndDate??''} onChange={e=>set('PlannedEndDate',e.target.value)} placeholder="例：2026/06/30"/></div>
            {form.Status==='完了'&&<div style={fld}><label style={lbl}>完了日 (YYYY/MM/DD)</label><input style={inp} value={form.ActualEndDate??''} onChange={e=>set('ActualEndDate',e.target.value)}/></div>}
            <div style={fld}>
              <label style={lbl}>進捗率 ({Math.round((form.Progress||0)*100)}%)</label>
              <input type="range" min={0} max={1} step={0.05} value={form.Progress||0} onChange={e=>set('Progress',+e.target.value)}
                style={{width:'100%',accentColor:'#1d4ed8'}}/>
            </div>
            <div style={fld}><label style={lbl}>優先度</label><select style={inp} value={form.Priority} onChange={e=>set('Priority',e.target.value)}>{PRIORITIES.map(p=><option key={p}>{p}</option>)}</select></div>
          </div>

          {/* 案件との紐づけ */}
          {linkedCustomer&&(
            <div style={{borderTop:'1px solid #f1f5f9',paddingTop:'0.75rem',marginBottom:'0.75rem'}}>
              <div style={{fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',marginBottom:'0.5rem',letterSpacing:'0.05em'}}>案件との紐づけ</div>
              {relatedProjects.length>0&&(
                <div style={fld}>
                  <label style={lbl}>既存の案件に紐づける</label>
                  <select style={inp} value={form.ProjectId??''} onChange={e=>{set('ProjectId',e.target.value?+e.target.value:null);setShowCreateProject(false)}}>
                    <option value="">（紐づけなし）</option>
                    {relatedProjects.map(p=><option key={p.id} value={p.id}>[{p.status}] {p.projectName}</option>)}
                  </select>
                </div>
              )}
              {!form.ProjectId&&(
                <label style={{display:'flex',alignItems:'center',gap:6,cursor:'pointer',marginBottom:'0.5rem'}}>
                  <input type="checkbox" checked={showCreateProject} onChange={e=>{setShowCreateProject(e.target.checked);if(e.target.checked)set('ProjectId',null)}} style={{accentColor:'#1d4ed8'}}/>
                  <span style={{fontSize:'0.78rem',color:'#0369a1',fontWeight:600}}>新しい案件を作成して紐づける</span>
                </label>
              )}
              {showCreateProject&&(
                <input style={inp} value={newProjectName} onChange={e=>setNewProjectName(e.target.value)} placeholder="案件名を入力（例：サーバーリプレイス提案）"/>
              )}
            </div>
          )}

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

// ─── シンプルなガントビュー ───────────────────────────────────
function GanttView({tasks}:{tasks:WorkTask[]}){
  const TODAY_DATE=new Date('2026-05-11')
  const tasksWithDates=tasks.filter(t=>t.startDate||t.plannedEndDate)

  const{timeStart,timeEnd,months,totalDays}=useMemo(()=>{
    let min:Date|null=null,max:Date|null=null
    tasksWithDates.forEach(t=>{
      const s=parseDate(t.startDate),e=parseDate(t.plannedEndDate||t.actualEndDate)
      if(s&&(!min||s<min))min=s;if(e&&(!max||e>max))max=e
    })
    const start=min?new Date(min.getFullYear(),min.getMonth()-1,1):new Date(TODAY_DATE.getFullYear(),TODAY_DATE.getMonth()-1,1)
    const end=max?new Date(max.getFullYear(),max.getMonth()+2,1):new Date(TODAY_DATE.getFullYear(),TODAY_DATE.getMonth()+3,1)
    const months:Date[]=[],cur=new Date(start)
    while(cur<end){months.push(new Date(cur));cur.setMonth(cur.getMonth()+1)}
    return{timeStart:start,timeEnd:end,months,totalDays:Math.max(1,(end.getTime()-start.getTime())/86400000)}
  },[tasksWithDates])

  const todayPct=Math.max(0,Math.min(100,(TODAY_DATE.getTime()-timeStart.getTime())/86400000/totalDays*100))
  const ROW_H=38,HDR_H=36

  return(
    <div style={{background:'white',borderRadius:12,border:'1px solid #e2e8f0',overflow:'hidden'}}>
      <div style={{display:'flex',overflowX:'auto'}}>
        <div style={{flexShrink:0,width:320,borderRight:'2px solid #e2e8f0',position:'sticky',left:0,zIndex:10,background:'white'}}>
          <div style={{height:HDR_H,borderBottom:'1px solid #e2e8f0',background:'#f8fafc',display:'flex',alignItems:'center',padding:'0 12px'}}>
            <span style={{fontSize:'0.7rem',fontWeight:700,color:'#475569'}}>担当者 / タスク名</span>
          </div>
          {tasksWithDates.map((t,i)=>{
            const assignees=assigneeList(t.assignees)
            const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
            const pt=PRIORITY_STYLE[t.priority]??PRIORITY_STYLE['中']
            return(
              <div key={t.id} style={{height:ROW_H,borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',padding:'0 10px',gap:6,background:i%2===0?'white':'#fafafa'}}>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontSize:'0.72rem',fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{t.taskName}</div>
                  <div style={{display:'flex',gap:3,marginTop:2}}>
                    {assignees.slice(0,2).map(a=><span key={a} style={{fontSize:'0.58rem',padding:'0 4px',borderRadius:99,background:'#f1f5f9',color:'#475569'}}>{a}</span>)}
                    {assignees.length>2&&<span style={{fontSize:'0.58rem',color:'#94a3b8'}}>+{assignees.length-2}</span>}
                  </div>
                </div>
                <span style={{fontSize:'0.58rem',padding:'1px 5px',borderRadius:99,background:st.bg,color:st.color,border:`1px solid ${st.border}`,fontWeight:700,flexShrink:0}}>{t.status}</span>
                <span style={{fontSize:'0.6rem',padding:'1px 4px',borderRadius:3,background:pt.bg,color:pt.color,fontWeight:700,flexShrink:0}}>{t.priority}</span>
              </div>
            )
          })}
        </div>
        <div style={{flex:1,minWidth:`${months.length*80}px`,position:'relative',height:HDR_H+tasksWithDates.length*ROW_H}}>
          <div style={{display:'flex',height:HDR_H,borderBottom:'1px solid #e2e8f0',background:'#f8fafc',position:'sticky',top:0,zIndex:5}}>
            {months.map((m,i)=>{const isCur=m.getMonth()===TODAY_DATE.getMonth()&&m.getFullYear()===TODAY_DATE.getFullYear();return(
              <div key={i} style={{flex:1,borderRight:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'center',background:isCur?'#eff6ff':undefined}}>
                <span style={{fontSize:'0.68rem',fontWeight:isCur?700:400,color:isCur?'#1d4ed8':'#64748b'}}>{m.getFullYear()}/{String(m.getMonth()+1).padStart(2,'0')}</span>
              </div>
            )})}
          </div>
          {/* 今日ライン */}
          <div style={{position:'absolute',left:`${todayPct}%`,top:HDR_H,height:tasksWithDates.length*ROW_H,width:2,background:'#ef4444',opacity:0.7,zIndex:4,pointerEvents:'none'}}/>
          {/* グリッド */}
          {months.map((m,i)=>{const left=(m.getTime()-timeStart.getTime())/86400000/totalDays*100;return<div key={i} style={{position:'absolute',left:`${left}%`,top:HDR_H,height:tasksWithDates.length*ROW_H,width:1,background:'#f1f5f9',zIndex:1}}/>})}
          {/* バー */}
          {tasksWithDates.map((t,i)=>{
            const top=HDR_H+i*ROW_H
            const s=parseDate(t.startDate),e=parseDate(t.plannedEndDate||t.actualEndDate)
            if(!s&&!e)return<div key={t.id} style={{position:'absolute',top,left:0,right:0,height:ROW_H,borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}/>
            const bs=s??TODAY_DATE,be=e??new Date(TODAY_DATE.getFullYear(),TODAY_DATE.getMonth()+1,1)
            const left=Math.max(0,(bs.getTime()-timeStart.getTime())/86400000/totalDays*100)
            const right=Math.min(100,(be.getTime()-timeStart.getTime())/86400000/totalDays*100)
            const w=Math.max(0.5,right-left)
            const st=STATUS_STYLE[t.status]??STATUS_STYLE['未着手']
            const barColor=t.status==='完了'?'#6b7280':t.status==='進行中'?'#3b82f6':'#94a3b8'
            return(
              <div key={t.id} style={{position:'absolute',top,left:0,right:0,height:ROW_H,borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                <div style={{position:'absolute',left:`${left}%`,width:`${w}%`,top:'50%',transform:'translateY(-50%)',height:20,background:`linear-gradient(135deg,${barColor},${barColor}cc)`,borderRadius:4,overflow:'hidden',display:'flex',alignItems:'center',paddingLeft:5,boxShadow:`0 1px 3px ${barColor}50`}}>
                  <div style={{position:'absolute',left:0,top:0,height:'100%',width:`${t.progress*100}%`,background:'rgba(255,255,255,0.25)',borderRadius:4}}/>
                  <span style={{fontSize:'0.58rem',color:'white',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',position:'relative',zIndex:1}}>{w>8?t.taskName:''}</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>
      {tasksWithDates.length===0&&<div style={{textAlign:'center',padding:'2rem',color:'#94a3b8',fontSize:'0.82rem'}}>日程が設定されているタスクがありません</div>}
    </div>
  )
}

