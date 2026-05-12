import { useMemo, useState, useEffect, useRef, useCallback } from 'react'
import type { Customer, CustomerProject, CustomerProjectDto, CustomerFileItem } from '../services/api'
import { customerProjectsApi, customerFilesApi } from '../services/api'

type Scale = '1m'|'3m'|'6m'|'1y'|'all'

const SCALE_LABELS: Record<Scale,string> = {'1m':'1ヶ月(日)','3m':'3ヶ月','6m':'6ヶ月','1y':'1年','all':'全期間'}
const SCALE_MONTHS: Record<Scale,number> = {'1m':1,'3m':3,'6m':6,'1y':12,'all':0}
const SCALE_NAV: Record<Scale,number>   = {'1m':1,'3m':1,'6m':3,'1y':6,'all':0}
const WEEKDAY_JA = ['日','月','火','水','木','金','土']
const ALL_STATUSES = ['提案中','商談中','受注','対応中','完了','失注']
const PROJECT_TYPES = ['サーバーリプレイス','SCカスタマイズ','バージョンアップ','商品購入','保守契約更新','その他']
const PROJECT_STATUSES = ['提案中','商談中','受注','対応中','完了','失注']

const SC: Record<string,{bar:string;bg:string;text:string;border:string}> = {
  '提案中':{bar:'#3b82f6',bg:'#eff6ff',text:'#1d4ed8',border:'#bfdbfe'},
  '商談中':{bar:'#8b5cf6',bg:'#f5f3ff',text:'#6d28d9',border:'#ddd6fe'},
  '受注':  {bar:'#10b981',bg:'#f0fdf4',text:'#065f46',border:'#a7f3d0'},
  '対応中':{bar:'#f59e0b',bg:'#fffbeb',text:'#92400e',border:'#fcd34d'},
  '完了':  {bar:'#6b7280',bg:'#f9fafb',text:'#374151',border:'#d1d5db'},
  '失注':  {bar:'#ef4444',bg:'#fef2f2',text:'#991b1b',border:'#fca5a5'},
}
const TYPE_ICON: Record<string,string> = {
  'サーバーリプレイス':'🖥','SCカスタマイズ':'⚙️','バージョンアップ':'⬆️','商品購入':'🛒','保守契約更新':'🔄','その他':'📌',
}

const TODAY = new Date(); TODAY.setHours(0,0,0,0)
const ROW_H=44, HDR_H=44, HDR_H_DAY=72, NAME_COL=250

function parseDate(s:string|null):Date|null{if(!s)return null;const p=s.split('/');return p.length===3?new Date(+p[0],+p[1]-1,+p[2]):null}
function addMonths(d:Date,n:number){return new Date(d.getFullYear(),d.getMonth()+n,1)}
function addDays(d:Date,n:number){const r=new Date(d);r.setDate(r.getDate()+n);return r}
function startOfMonth(d:Date){return new Date(d.getFullYear(),d.getMonth(),1)}
function endOfMonth(d:Date){return new Date(d.getFullYear(),d.getMonth()+1,0)}
function daysBetween(a:Date,b:Date){return(b.getTime()-a.getTime())/86400000}
function formatMonth(d:Date){return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}`}
function fmt(d:Date){return`${d.getFullYear()}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}`}

interface DragInfo { type:'move'|'left'|'right'; project:CustomerProject; startX:number; origStart:Date|null; origEnd:Date|null }
interface Props { customers:Customer[]; projects:Record<number,CustomerProject[]>; onProjectChange:(customerId:number)=>void }

export default function CustomerGanttView({customers,projects,onProjectChange}:Props){
  const[scale,setScale]=useState<Scale>('6m')
  const[viewStart,setViewStart]=useState(()=>startOfMonth(addMonths(TODAY,-1)))
  const[activeStatuses,setActiveStatuses]=useState(new Set(['提案中','商談中','受注','対応中']))
  const[selected,setSelected]=useState<{project:CustomerProject;name:string}|null>(null)
  const[addModal,setAddModal]=useState<{customerId:number|null}|null>(null)
  const[drag,setDrag]=useState<DragInfo|null>(null)
  const[tempDate,setTempDate]=useState<{id:number;start:Date|null;end:Date|null}|null>(null)
  const[saving,setSaving]=useState(false)
  const timelineRef=useRef<HTMLDivElement>(null)

  const{allMin,allMax}=useMemo(()=>{
    let min:Date|null=null,max:Date|null=null
    Object.values(projects).flat().forEach(p=>{const s=parseDate(p.startDate),e=parseDate(p.expectedEndDate);if(s&&(!min||s<min))min=s;if(e&&(!max||e>max))max=e})
    return{allMin:min?startOfMonth(addMonths(min,-1)):startOfMonth(addMonths(TODAY,-2)),allMax:max?new Date(max.getFullYear(),max.getMonth()+2,0):startOfMonth(addMonths(TODAY,10))}
  },[projects])

  const{timeStart,timeEnd,months,days,totalDays,isDay}=useMemo(()=>{
    const isDay=scale==='1m',start=scale==='all'?allMin:viewStart,end=scale==='all'?allMax:addMonths(viewStart,SCALE_MONTHS[scale])
    const months:Date[]=[],days:Date[]=[];let c=new Date(start);while(c<end){months.push(new Date(c));c=addMonths(c,1)}
    if(isDay){const de=endOfMonth(viewStart);let d=new Date(start);while(d<=de){days.push(new Date(d));d=addDays(d,1)}}
    return{timeStart:start,timeEnd:end,months,days,totalDays:Math.max(1,daysBetween(start,end)),isDay}
  },[scale,viewStart,allMin,allMax])

  const navigate=(dir:-1|1)=>setViewStart(s=>addMonths(s,dir*(SCALE_NAV[scale]||1)))
  const goToday=()=>setViewStart(startOfMonth(addMonths(TODAY,-1)))
  const toggleStatus=(s:string)=>setActiveStatuses(prev=>{const n=new Set(prev);n.has(s)?n.delete(s):n.add(s);return n})

  const rows=useMemo(()=>{
    const r:{customerId:number;customerName:string;project:CustomerProject|null;isFirstRow:boolean;rowCount:number}[]=[]
    customers.forEach(c=>{
      const ps=(projects[c.id]??[]).filter(p=>activeStatuses.has(p.status))
      if(ps.length===0){r.push({customerId:c.id,customerName:c.name,project:null,isFirstRow:true,rowCount:0});return}
      ps.forEach((p,i)=>r.push({customerId:c.id,customerName:c.name,project:p,isFirstRow:i===0,rowCount:ps.length}))
    })
    return r
  },[customers,projects,activeStatuses])

  const calcBar=useCallback((p:CustomerProject)=>{
    const hasTemp=tempDate?.id===p.id
    const s=hasTemp?tempDate?.start:parseDate(p.startDate)
    const e=hasTemp?tempDate?.end:parseDate(p.expectedEndDate)
    const bs=s??TODAY,be=e??addMonths(TODAY,1)
    if(!s&&!e)return{left:0,width:0,hasBar:false,clipped:false,noEndDate:true}
    const rawL=daysBetween(timeStart,bs)/totalDays*100,rawR=daysBetween(timeStart,be)/totalDays*100
    const left=Math.max(0,rawL),right=Math.min(100,rawR)
    return{left,width:Math.max(0.3,right-left),hasBar:right>0&&left<100,clipped:rawL<0||rawR>100,noEndDate:!e}
  },[tempDate,timeStart,totalDays])

  // ドラッグイベント
  useEffect(()=>{
    if(!drag)return
    const onMove=(e:MouseEvent)=>{
      const w=timelineRef.current?.clientWidth??1
      const deltaDays=Math.round((e.clientX-drag.startX)/w*totalDays)
      let ns=drag.origStart,ne=drag.origEnd
      if(drag.type==='move'){if(ns)ns=addDays(ns,deltaDays);if(ne)ne=addDays(ne,deltaDays)}
      else if(drag.type==='left'){if(ns)ns=addDays(ns,deltaDays);if(ns&&ne&&ns>=ne)ns=addDays(ne,-1)}
      else{if(ne)ne=addDays(ne,deltaDays);if(ns&&ne&&ne<=ns)ne=addDays(ns,1)}
      setTempDate({id:drag.project.id,start:ns,end:ne})
    }
    const onUp=async()=>{
      if(tempDate){
        setSaving(true)
        try{
          const p=drag.project
          await customerProjectsApi.update(p.id,{customerId:p.customerId,projectName:p.projectName,projectType:p.projectType,status:p.status,description:p.description,amount:p.amount,startDate:tempDate.start?fmt(tempDate.start):null,expectedEndDate:tempDate.end?fmt(tempDate.end):null})
          onProjectChange(p.customerId)
        }catch{alert('日程の更新に失敗しました')}
        finally{setSaving(false)}
      }
      setDrag(null);setTempDate(null);document.body.style.cursor=''
    }
    document.addEventListener('mousemove',onMove);document.addEventListener('mouseup',onUp)
    return()=>{document.removeEventListener('mousemove',onMove);document.removeEventListener('mouseup',onUp)}
  },[drag,tempDate,totalDays,onProjectChange])

  const startDrag=(e:React.MouseEvent,project:CustomerProject,type:'move'|'left'|'right')=>{
    e.preventDefault();e.stopPropagation()
    document.body.style.cursor=type==='move'?'grabbing':type==='left'?'w-resize':'e-resize'
    const origStart=parseDate(project.startDate)
    let origEnd=parseDate(project.expectedEndDate)
    // ★ 終了日未設定の右端ドラッグ: カーソル位置の日付を初期終了日にする
    if(type==='right'&&!origEnd&&timelineRef.current){
      const rect=timelineRef.current.getBoundingClientRect()
      const pct=Math.max(0,Math.min(1,(e.clientX-rect.left)/rect.width))
      origEnd=addDays(timeStart,Math.round(pct*totalDays))
    }
    setDrag({type,project,startX:e.clientX,origStart,origEnd})
  }

  const todayPct=Math.max(0,Math.min(100,daysBetween(timeStart,TODAY)/totalDays*100))
  const hdrH=isDay?HDR_H_DAY:HDR_H,contentH=rows.length*ROW_H
  const dayColW=isDay?Math.max(28,Math.floor(1100/Math.max(1,days.length))):0
  const monColW=isDay?0:Math.max(70,Math.floor(1100/Math.max(1,months.length)))

  const weekGroups=useMemo(()=>{
    if(!isDay||days.length===0)return[]
    const g:{label:string;count:number}[]=[];let wn=1,cnt=0
    days.forEach((d,i)=>{cnt++;if(d.getDay()===6||i===days.length-1){g.push({label:`第${wn}週`,count:cnt});wn++;cnt=0}})
    return g
  },[days,isDay])

  const stats=useMemo(()=>ALL_STATUSES.reduce((a,s)=>({...a,[s]:Object.values(projects).flat().filter(p=>p.status===s).length}),{} as Record<string,number>),[projects])

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
        <button onClick={()=>setAddModal({customerId:null})} style={{padding:'5px 14px',border:'none',borderRadius:7,background:'#0f172a',color:'white',fontWeight:700,fontSize:'0.78rem',cursor:'pointer',fontFamily:'inherit'}}>＋ 案件を追加</button>
        {saving&&<span style={{fontSize:'0.72rem',color:'#0369a1',fontWeight:600}}>保存中...</span>}
        <div style={{display:'flex',gap:5,flexWrap:'wrap',marginLeft:'auto'}}>
          {ALL_STATUSES.map(s=>{const active=activeStatuses.has(s),sc=SC[s];return(
            <button key={s} onClick={()=>toggleStatus(s)} style={{display:'flex',alignItems:'center',gap:4,padding:'3px 9px',border:`1px solid ${active?sc.bar:sc.border}`,borderRadius:99,background:active?sc.bg:'white',color:active?sc.text:'#94a3b8',fontWeight:active?700:500,fontSize:'0.7rem',cursor:'pointer',fontFamily:'inherit'}}>
              <span style={{width:7,height:7,borderRadius:2,background:active?sc.bar:'#d1d5db',flexShrink:0}}/>{s}{stats[s]>0&&<span style={{fontSize:'0.62rem',opacity:.8}}>({stats[s]})</span>}
            </button>
          )})}
        </div>
      </div>

      <div style={{padding:'5px 16px',background:'#fffbeb',borderBottom:'1px solid #fef3c7',fontSize:'0.68rem',color:'#92400e',display:'flex',gap:16}}>
        <span>💡 バークリック: 詳細・編集</span><span>バー中央ドラッグ: 日程移動</span><span>◀ 端ドラッグ ▶: 期間変更（終了日未設定でも右端ドラッグで設定可）</span>
      </div>

      {/* ガント本体 */}
      <div style={{display:'flex',overflowX:'auto',overflowY:'auto',maxHeight:'calc(100vh - 340px)'}}>
        {/* 左固定 */}
        <div style={{flexShrink:0,width:NAME_COL,borderRight:'2px solid #e2e8f0',background:'white',position:'sticky',left:0,zIndex:20}}>
          <div style={{height:hdrH,borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'flex-end',padding:'0 14px 8px',background:'#f8fafc',position:'sticky',top:0,zIndex:21}}>
            <span style={{fontSize:'0.72rem',fontWeight:700,color:'#475569'}}>顧客 / 案件</span>
          </div>
          {rows.map((row,i)=>(
            <div key={`n-${row.customerId}-${row.project?.id??'x'}-${i}`}
              style={{height:ROW_H,borderBottom:'1px solid #f1f5f9',display:'flex',alignItems:'center',padding:'0 10px',gap:5,background:i%2===0?'white':'#fafafa'}}>
              <div style={{flex:1,minWidth:0}}>
                {row.rowCount===0?(
                  <div style={{fontSize:'0.82rem',fontWeight:700,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.customerName}</div>
                ):(
                  <>
                    {row.isFirstRow&&<div style={{fontSize:'0.62rem',fontWeight:700,color:'#94a3b8',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.customerName}</div>}
                    <div style={{display:'flex',alignItems:'center',gap:4}}>
                      <span style={{fontSize:'0.78rem',flexShrink:0}}>{TYPE_ICON[row.project!.projectType]??'📌'}</span>
                      <span style={{fontSize:'0.74rem',fontWeight:600,color:'#0f172a',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{row.project!.projectName}</span>
                    </div>
                  </>
                )}
              </div>
              {row.rowCount===0&&<button onClick={()=>setAddModal({customerId:row.customerId})} style={{width:20,height:20,border:'1px solid #e2e8f0',borderRadius:4,background:'white',color:'#64748b',cursor:'pointer',fontSize:'0.7rem',outline:'none',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}}>＋</button>}
              {row.project&&<span style={{fontSize:'0.58rem',padding:'1px 5px',borderRadius:99,background:SC[row.project.status]?.bg,color:SC[row.project.status]?.text,fontWeight:700,border:`1px solid ${SC[row.project.status]?.border}`,flexShrink:0}}>{row.project.status}</span>}
            </div>
          ))}
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
                  <span style={{fontSize:Math.min(11,dayColW-4)+'px',fontWeight:isToday?700:500,color:isToday?'#1d4ed8':isSun?'#dc2626':isSat?'#2563eb':'#334155',lineHeight:1.2}}>{d.getDate()}</span>
                  <span style={{fontSize:Math.min(9,dayColW-6)+'px',color:isToday?'#3b82f6':isSun?'#ef4444':isSat?'#3b82f6':'#94a3b8',lineHeight:1}}>{WEEKDAY_JA[wd]}</span>
                </div>
              )})}
            </div>
          </div>}

          {/* 今日ライン */}
          {todayPct>=0&&todayPct<=100&&<div style={{position:'absolute',left:`${todayPct}%`,top:hdrH,height:contentH,width:2,background:'#ef4444',opacity:0.75,zIndex:8,pointerEvents:'none'}}><div style={{position:'absolute',top:-16,left:-16,background:'#ef4444',color:'white',fontSize:'0.55rem',padding:'1px 5px',borderRadius:3,fontWeight:700,whiteSpace:'nowrap'}}>TODAY</div></div>}

          {/* グリッド（月） */}
          {!isDay&&months.map((m,i)=>{const left=daysBetween(timeStart,m)/totalDays*100,isCur=m.getMonth()===TODAY.getMonth()&&m.getFullYear()===TODAY.getFullYear();return<div key={i} style={{position:'absolute',left:`${left}%`,top:hdrH,height:contentH,width:isCur?monColW:1,background:isCur?'#eff6ff80':'#f1f5f9',zIndex:1,pointerEvents:'none'}}/>})}

          {/* グリッド（日） */}
          {isDay&&days.map((d,i)=>{const left=daysBetween(timeStart,d)/totalDays*100,wd=d.getDay(),isSun=wd===0,isSat=wd===6,isMon=wd===1&&i>0,isToday=daysBetween(d,TODAY)===0;if(isToday)return null;return<div key={i} style={{position:'absolute',left:`${left}%`,top:hdrH,height:contentH,width:isMon?2:1,background:isSun?'#fee2e240':isSat?'#dbeafe40':isMon?'#d1d5db':'#f1f5f9',zIndex:1,pointerEvents:'none'}}/>})}

          {/* データ行 */}
          {rows.map((row,i)=>{
            const top=hdrH+i*ROW_H
            if(!row.project)return<div key={`r-${row.customerId}-x-${i}`} style={{position:'absolute',left:0,right:0,top,height:ROW_H,borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}/>
            const bar=calcBar(row.project),sc=SC[row.project.status]??SC['提案中']
            const isDragging=drag?.project.id===row.project.id
            return(
              <div key={`r-${row.customerId}-${row.project.id}-${i}`} style={{position:'absolute',left:0,right:0,top,height:ROW_H,borderBottom:'1px solid #f1f5f9',background:i%2===0?'white':'#fafafa'}}>
                {bar.hasBar?(
                  <div style={{position:'absolute',left:`${bar.left}%`,width:`${bar.width}%`,top:'50%',transform:'translateY(-50%)',height:26,background:isDragging?`${sc.bar}dd`:`linear-gradient(135deg,${sc.bar},${sc.bar}cc)`,borderRadius:5,display:'flex',alignItems:'center',overflow:'hidden',boxShadow:isDragging?`0 4px 12px ${sc.bar}60`:`0 1px 4px ${sc.bar}40`,zIndex:isDragging?10:5,border:isDragging?'2px solid white':undefined}}>
                    {/* 左ハンドル */}
                    <div onMouseDown={e=>startDrag(e,row.project!,'left')} style={{width:8,height:'100%',cursor:'w-resize',background:'rgba(255,255,255,0.25)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}} title="開始日を変更"><div style={{width:2,height:12,background:'rgba(255,255,255,0.7)',borderRadius:1}}/></div>
                    {/* 本体（移動） */}
                    <div onMouseDown={e=>startDrag(e,row.project!,'move')} onClick={()=>!drag&&setSelected({project:row.project!,name:row.customerName})} style={{flex:1,height:'100%',cursor:'grab',display:'flex',alignItems:'center',paddingLeft:4,overflow:'hidden'}}>
                      <span style={{fontSize:'0.64rem',color:'white',fontWeight:600,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',pointerEvents:'none'}}>{bar.width>5?row.project.projectName:''}</span>
                    </div>
                    {/* 右ハンドル（終了日未設定でも操作可） */}
                    <div onMouseDown={e=>startDrag(e,row.project!,'right')} style={{width:8,height:'100%',cursor:'e-resize',background:bar.noEndDate?'rgba(255,255,100,0.4)':'rgba(255,255,255,0.25)',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center'}} title={bar.noEndDate?'ドラッグで終了日を設定':'終了日を変更'}><div style={{width:2,height:12,background:'rgba(255,255,255,0.7)',borderRadius:1}}/></div>
                  </div>
                ):(
                  <div style={{position:'absolute',left:`${todayPct}%`,top:'50%',transform:'translateY(-50%)',display:'flex',alignItems:'center',gap:4,zIndex:5}}>
                    <div style={{width:8,height:8,borderRadius:2,background:sc.bar,transform:'rotate(45deg)'}}/>
                    <span style={{fontSize:'0.6rem',color:'#94a3b8',whiteSpace:'nowrap'}}>日程未設定</span>
                  </div>
                )}
                {isDragging&&tempDate&&(
                  <div style={{position:'absolute',left:`${Math.min(bar.left+5,80)}%`,top:hdrH===HDR_H?'calc(50% + 18px)':'calc(50% + 18px)',background:'#0f172a',color:'white',fontSize:'0.62rem',padding:'3px 8px',borderRadius:5,whiteSpace:'nowrap',zIndex:20,pointerEvents:'none'}}>
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
        <span style={{fontSize:'0.72rem',fontWeight:700,color:'#475569'}}>集計:</span>
        {ALL_STATUSES.filter(s=>stats[s]>0).map(s=><div key={s} style={{display:'flex',alignItems:'center',gap:4}}><div style={{width:8,height:8,borderRadius:2,background:SC[s].bar}}/><span style={{fontSize:'0.7rem',color:'#64748b'}}>{s} {stats[s]}件</span></div>)}
      </div>

      {/* ── 詳細・編集ポップアップ */}
      {selected&&(
        <ProjectDetailModal
          project={selected.project}
          customerName={selected.name}
          onClose={()=>setSelected(null)}
          onSave={async dto=>{
            await customerProjectsApi.update(selected.project.id,dto)
            onProjectChange(selected.project.customerId)
            setSelected(null)
          }}
          onDelete={async()=>{
            await customerProjectsApi.delete(selected.project.id)
            onProjectChange(selected.project.customerId)
            setSelected(null)
          }}/>
      )}

      {/* 案件追加モーダル */}
      {addModal&&<AddProjectModal customers={customers} initialCustomerId={addModal.customerId} onClose={()=>setAddModal(null)} onSave={async dto=>{await customerProjectsApi.create(dto);onProjectChange(dto.customerId);setAddModal(null)}}/>}
    </div>
  )
}

// ─── 詳細・編集ポップアップ ───────────────────────────────────
function ProjectDetailModal({project:p,customerName,onClose,onSave,onDelete}:{
  project:CustomerProject;customerName:string
  onClose:()=>void;onSave:(dto:CustomerProjectDto)=>Promise<void>;onDelete:()=>Promise<void>
}){
  const[editing,setEditing]=useState(false)
  const[fileTab,setFileTab]=useState(false)
  const[projFiles,setProjFiles]=useState<CustomerFileItem[]>([])
  const[filesLoading,setFilesLoading]=useState(false)
  const[uploading,setUploading]=useState(false)
  const fileInputRef=useRef<HTMLInputElement>(null)
  const[form,setForm]=useState<CustomerProjectDto>({
    customerId:p.customerId,projectName:p.projectName,projectType:p.projectType,
    status:p.status,description:p.description,startDate:p.startDate,expectedEndDate:p.expectedEndDate,amount:p.amount,
  })
  const[saving,setSaving]=useState(false)
  const[confirmDel,setConfirmDel]=useState(false)

  // ファイル読み込み
  useEffect(()=>{
    if(!fileTab)return
    setFilesLoading(true)
    customerFilesApi.getByCustomer(p.customerId)
      .then(r=>setProjFiles(r.data.filter(f=>f.projectId===p.id)))
      .catch(()=>setProjFiles([]))
      .finally(()=>setFilesLoading(false))
  },[fileTab,p.customerId,p.id])

  const handleUpload=async(fl:FileList|null)=>{
    if(!fl||fl.length===0)return;setUploading(true)
    try{for(const f of Array.from(fl))await customerFilesApi.upload(p.customerId,f,undefined,'',p.id)
      const r=await customerFilesApi.getByCustomer(p.customerId)
      setProjFiles(r.data.filter(f=>f.projectId===p.id))
    }catch{alert('アップロードに失敗しました')}finally{setUploading(false);if(fileInputRef.current)fileInputRef.current.value=''}
  }
  const handleFileDelete=async(fid:number)=>{
    await customerFilesApi.delete(fid)
    setProjFiles(prev=>prev.filter(f=>f.id!==fid))
  }
  const sc=SC[p.status]??SC['提案中']
  const set=(k:keyof CustomerProjectDto,v:unknown)=>setForm(prev=>({...prev,[k]:v===''?null:v}))

  const handleSave=async()=>{
    setSaving(true)
    try{await onSave(form)}catch{alert('保存に失敗しました');setSaving(false)}
  }

  const inp:React.CSSProperties={width:'100%',padding:'7px 10px',border:'1px solid #e2e8f0',borderRadius:6,fontSize:'0.82rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.68rem',fontWeight:700,color:'#64748b',marginBottom:3}
  const fld:React.CSSProperties={marginBottom:'0.75rem'}

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>!editing&&onClose()}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:440,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}} onClick={e=>e.stopPropagation()}>

        {/* ヘッダー */}
        <div style={{padding:'1rem 1.25rem 0.75rem',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
            <div>
              <div style={{fontSize:'0.68rem',color:'#94a3b8',marginBottom:3}}>{customerName}</div>
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <span style={{fontSize:'1rem'}}>{TYPE_ICON[p.projectType]??'📌'}</span>
                <h3 style={{margin:0,fontSize:'0.98rem',fontWeight:700,color:'#0f172a'}}>{p.projectName}</h3>
              </div>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#94a3b8',outline:'none'}}>✕</button>
          </div>
          {/* モード切り替えタブ */}
          <div style={{display:'flex',gap:0,marginTop:8}}>
            <button onClick={()=>{setEditing(false);setFileTab(false)}} style={{padding:'5px 14px',border:'1px solid #e2e8f0',borderRight:'none',borderRadius:'6px 0 0 6px',background:!editing&&!fileTab?'#0f172a':'white',color:!editing&&!fileTab?'white':'#475569',fontWeight:600,fontSize:'0.75rem',cursor:'pointer',fontFamily:'inherit'}}>詳細</button>
            <button onClick={()=>{setEditing(true);setFileTab(false)}} style={{padding:'5px 14px',border:'1px solid #e2e8f0',borderRight:'none',background:editing?'#0f172a':'white',color:editing?'white':'#475569',fontWeight:600,fontSize:'0.75rem',cursor:'pointer',fontFamily:'inherit'}}>✏ 編集</button>
            <button onClick={()=>{setEditing(false);setFileTab(true)}} style={{padding:'5px 14px',border:'1px solid #e2e8f0',borderRadius:'0 6px 6px 0',background:fileTab?'#0369a1':'white',color:fileTab?'white':'#475569',fontWeight:600,fontSize:'0.75rem',cursor:'pointer',fontFamily:'inherit'}}>📎 資料{projFiles.length>0&&<span style={{marginLeft:4,background:'white',color:'#0369a1',borderRadius:99,padding:'0 4px',fontSize:'0.62rem',fontWeight:700}}>{projFiles.length}</span>}</button>
          </div>
        </div>

        <div style={{overflowY:'auto',flex:1,padding:'1rem 1.25rem'}}>

          {/* 詳細表示モード */}
          {!editing&&(
            <div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:'0.75rem'}}>
                {[
                  {label:'ステータス',value:<span style={{padding:'2px 8px',borderRadius:99,background:sc.bg,color:sc.text,fontWeight:700,fontSize:'0.78rem',border:`1px solid ${sc.border}`}}>{p.status}</span>},
                  {label:'種別',value:p.projectType},
                  {label:'開始日',value:p.startDate??'未設定',color:!p.startDate?'#94a3b8':undefined},
                  {label:'完了予定日',value:p.expectedEndDate??'未設定',color:!p.expectedEndDate?'#94a3b8':undefined},
                  {label:'金額',value:p.amount?`¥${p.amount.toLocaleString()}`:'未設定',color:!p.amount?'#94a3b8':undefined},
                ].map(item=>(
                  <div key={item.label}>
                    <div style={{fontSize:'0.63rem',color:'#94a3b8',marginBottom:3}}>{item.label}</div>
                    <div style={{fontSize:'0.82rem',color:(item as any).color||'#0f172a',fontWeight:500}}>{item.value}</div>
                  </div>
                ))}
              </div>
              {p.description&&<div style={{background:'#f8fafc',borderRadius:8,padding:'10px 12px',fontSize:'0.78rem',color:'#475569',lineHeight:1.6}}>{p.description}</div>}

          {/* 資料タブ */}
          {fileTab&&(
            <div>
              <input ref={fileInputRef} type="file" multiple style={{display:'none'}} onChange={e=>handleUpload(e.target.files)}/>
              <div style={{marginBottom:10,display:'flex',alignItems:'center',gap:8}}>
                <button onClick={()=>fileInputRef.current?.click()} disabled={uploading}
                  style={{display:'flex',alignItems:'center',gap:4,padding:'5px 12px',border:'1px dashed #d1d5db',borderRadius:6,background:'white',color:'#64748b',cursor:'pointer',fontSize:'0.75rem',fontWeight:600,outline:'none',fontFamily:'inherit'}}>
                  {uploading?'アップロード中...':'📎 ファイルを追加'}
                </button>
                <span style={{fontSize:'0.65rem',color:'#94a3b8'}}>最大20MB</span>
              </div>
              {filesLoading?<div style={{textAlign:'center',padding:'1rem',color:'#94a3b8',fontSize:'0.8rem'}}>読み込み中...</div>
                :projFiles.length===0?<div style={{textAlign:'center',padding:'1rem',color:'#94a3b8',fontSize:'0.8rem',border:'1px dashed #e2e8f0',borderRadius:8}}>添付ファイルがありません</div>
                :(
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {projFiles.map(f=>{
                    const ext=f.fileName.split('.').pop()?.toLowerCase()??''
                    const icon=f.fileType.includes('pdf')||ext==='pdf'?'📄':['docx','doc'].includes(ext)?'📝':['xlsx','xls'].includes(ext)?'📊':['pptx','ppt'].includes(ext)?'📋':f.fileType.includes('image')||['jpg','jpeg','png','webp'].includes(ext)?'🖼️':'📎'
                    const sz=f.fileSize<1024?f.fileSize+'B':f.fileSize<1048576?(f.fileSize/1024).toFixed(1)+'KB':(f.fileSize/1048576).toFixed(1)+'MB'
                    return(
                      <div key={f.id} style={{display:'flex',alignItems:'center',gap:7,padding:'6px 10px',background:'#f8fafc',borderRadius:7,border:'1px solid #e2e8f0'}}>
                        <span style={{fontSize:'1rem',flexShrink:0}}>{icon}</span>
                        <a href={customerFilesApi.getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer" style={{flex:1,minWidth:0,fontSize:'0.75rem',fontWeight:600,color:'#0369a1',textDecoration:'none',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} onMouseEnter={e=>(e.currentTarget.style.textDecoration='underline')} onMouseLeave={e=>(e.currentTarget.style.textDecoration='none')}>{f.fileName}</a>
                        <span style={{fontSize:'0.62rem',color:'#94a3b8',flexShrink:0}}>{sz}</span>
                        <a href={customerFilesApi.getDownloadUrl(f.id)} target="_blank" rel="noopener noreferrer" style={{width:24,height:24,border:'1px solid #bae6fd',borderRadius:4,background:'#f0f9ff',color:'#0369a1',textDecoration:'none',fontSize:'0.7rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>↗</a>
                        <a href={customerFilesApi.getDownloadUrl(f.id)} download={f.fileName} style={{width:24,height:24,border:'1px solid #d1fae5',borderRadius:4,background:'#f0fdf4',color:'#059669',textDecoration:'none',fontSize:'0.7rem',fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>↓</a>
                        <button onClick={()=>handleFileDelete(f.id)} style={{width:24,height:24,border:'1px solid #fecaca',borderRadius:4,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontSize:'0.65rem',outline:'none',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

            </div>
          )}

          {/* 編集モード */}
          {editing&&(
            <div>
              <div style={fld}><label style={lbl}>案件名</label><input style={inp} value={form.projectName} onChange={e=>set('projectName',e.target.value)}/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 10px'}}>
                <div style={fld}><label style={lbl}>種別</label><select style={inp} value={form.projectType} onChange={e=>set('projectType',e.target.value)}>{(['サーバーリプレイス','SCカスタマイズ','バージョンアップ','商品購入','保守契約更新','その他']).map(t=><option key={t}>{t}</option>)}</select></div>
                <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.status} onChange={e=>set('status',e.target.value)}>{(['提案中','商談中','受注','対応中','完了','失注']).map(s=><option key={s}>{s}</option>)}</select></div>
                <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} value={form.startDate??''} onChange={e=>set('startDate',e.target.value)} placeholder="例：2026/05/01"/></div>
                <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} value={form.expectedEndDate??''} onChange={e=>set('expectedEndDate',e.target.value)} placeholder="例：2026/09/30"/></div>
                <div style={fld}><label style={lbl}>金額（円）</label><input style={inp} type="number" value={form.amount??''} onChange={e=>set('amount',e.target.value?+e.target.value:null)}/></div>
              </div>
              <div style={fld}><label style={lbl}>詳細・メモ</label><textarea style={{...inp,resize:'vertical',minHeight:70}} value={form.description??''} onChange={e=>set('description',e.target.value)}/></div>
            </div>
          )}
        </div>

        {/* フッター */}
        <div style={{padding:'0.75rem 1.25rem',borderTop:'1px solid #f1f5f9',display:'flex',gap:8,flexShrink:0}}>
          <button onClick={()=>setConfirmDel(true)} style={{padding:'8px 14px',border:'1px solid #fecaca',borderRadius:7,background:'#fef2f2',color:'#dc2626',cursor:'pointer',fontWeight:600,fontSize:'0.8rem',fontFamily:'inherit',outline:'none'}}>🗑 削除</button>
          <div style={{flex:1}}/>
          <button onClick={()=>{setEditing(false);onClose()}} style={{padding:'8px 16px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontSize:'0.82rem',fontFamily:'inherit',outline:'none'}}>閉じる</button>
          {editing&&<button onClick={handleSave} disabled={saving} style={{padding:'8px 20px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontSize:'0.82rem',fontFamily:'inherit',outline:'none',opacity:saving?0.6:1}}>{saving?'保存中...':'✓ 保存'}</button>}
        </div>
      </div>

      {/* 削除確認 */}
      {confirmDel&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.5)',zIndex:4000,display:'flex',alignItems:'center',justifyContent:'center'}} onClick={()=>setConfirmDel(false)}>
          <div style={{background:'white',borderRadius:12,padding:'1.5rem',maxWidth:340,width:'90%'}} onClick={e=>e.stopPropagation()}>
            <div style={{fontSize:'1.5rem',textAlign:'center',marginBottom:'0.5rem'}}>⚠️</div>
            <h3 style={{margin:'0 0 0.5rem',textAlign:'center',fontSize:'0.95rem',color:'#0f172a'}}>案件を削除しますか？</h3>
            <p style={{margin:'0 0 1.25rem',textAlign:'center',color:'#475569',fontSize:'0.83rem',lineHeight:1.6,background:'#fef2f2',border:'1px solid #fecaca',borderRadius:8,padding:'8px 12px'}}>「{p.projectName}」を削除します。{'\n'}この操作は元に戻せません。</p>
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

// ─── 案件追加モーダル ─────────────────────────────────────────
function AddProjectModal({customers,initialCustomerId,onClose,onSave}:{customers:Customer[];initialCustomerId:number|null;onClose:()=>void;onSave:(dto:CustomerProjectDto)=>Promise<void>}){
  const[form,setForm]=useState<CustomerProjectDto>({customerId:initialCustomerId??customers[0]?.id??0,projectName:'',projectType:'その他',status:'提案中',description:null,startDate:null,expectedEndDate:null,amount:null})
  const[saving,setSaving]=useState(false)
  const[error,setError]=useState('')
  const set=(k:keyof CustomerProjectDto,v:unknown)=>setForm(p=>({...p,[k]:v===''?null:v}))
  const handleSave=async()=>{if(!form.projectName.trim()){setError('案件名は必須です');return};if(!form.customerId){setError('顧客を選択してください');return};setSaving(true);try{await onSave(form)}catch{setError('保存に失敗しました');setSaving(false)}}
  const inp:React.CSSProperties={width:'100%',padding:'8px 10px',border:'1px solid #e2e8f0',borderRadius:7,fontSize:'0.85rem',color:'#0f172a',background:'white',outline:'none',boxSizing:'border-box',fontFamily:'inherit'}
  const lbl:React.CSSProperties={display:'block',fontSize:'0.72rem',fontWeight:700,color:'#64748b',marginBottom:4}
  const fld:React.CSSProperties={marginBottom:'0.85rem'}
  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.45)',zIndex:3000,display:'flex',alignItems:'center',justifyContent:'center',padding:'1rem'}}>
      <div style={{background:'white',borderRadius:14,width:'100%',maxWidth:500,maxHeight:'90vh',display:'flex',flexDirection:'column',boxShadow:'0 20px 60px rgba(0,0,0,0.2)'}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'1.1rem 1.4rem',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <h3 style={{margin:0,fontSize:'0.95rem',fontWeight:700,color:'#0f172a'}}>案件を追加</h3>
          <button onClick={onClose} style={{background:'none',border:'none',fontSize:'1.1rem',cursor:'pointer',color:'#94a3b8',outline:'none'}}>✕</button>
        </div>
        <div style={{overflowY:'auto',flex:1,padding:'1.1rem 1.4rem'}}>
          {error&&<div style={{background:'#fef2f2',color:'#dc2626',padding:'8px 12px',borderRadius:6,fontSize:'0.8rem',marginBottom:'1rem',border:'1px solid #fecaca'}}>{error}</div>}
          <div style={fld}><label style={{...lbl,fontSize:'0.8rem',color:'#0f172a'}}>顧客 *</label><select style={{...inp,background:'#f8fafc',fontWeight:600}} value={form.customerId} onChange={e=>set('customerId',+e.target.value)}><option value={0} disabled>顧客を選択</option>{customers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
          <div style={{borderTop:'1px solid #f1f5f9',paddingTop:'0.75rem',marginBottom:'0.75rem',fontSize:'0.7rem',fontWeight:700,color:'#94a3b8',letterSpacing:'0.06em'}}>案件情報</div>
          <div style={fld}><label style={lbl}>案件名 *</label><input style={inp} value={form.projectName} onChange={e=>set('projectName',e.target.value)} placeholder="例：サーバーリプレイス提案"/></div>
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:'0 1rem'}}>
            <div style={fld}><label style={lbl}>種別</label><select style={inp} value={form.projectType} onChange={e=>set('projectType',e.target.value)}>{['サーバーリプレイス','SCカスタマイズ','バージョンアップ','商品購入','保守契約更新','その他'].map(t=><option key={t}>{t}</option>)}</select></div>
            <div style={fld}><label style={lbl}>ステータス</label><select style={inp} value={form.status} onChange={e=>set('status',e.target.value)}>{['提案中','商談中','受注','対応中','完了','失注'].map(s=><option key={s}>{s}</option>)}</select></div>
            <div style={fld}><label style={lbl}>開始日 (YYYY/MM/DD)</label><input style={inp} value={form.startDate??''} onChange={e=>set('startDate',e.target.value)} placeholder="例：2026/05/01"/></div>
            <div style={fld}><label style={lbl}>完了予定日 (YYYY/MM/DD)</label><input style={inp} value={form.expectedEndDate??''} onChange={e=>set('expectedEndDate',e.target.value)} placeholder="例：2026/09/30"/></div>
            <div style={fld}><label style={lbl}>金額（円）</label><input style={inp} type="number" value={form.amount??''} onChange={e=>set('amount',e.target.value?+e.target.value:null)}/></div>
          </div>
          <div style={fld}><label style={lbl}>詳細・メモ</label><textarea style={{...inp,resize:'vertical',minHeight:80}} value={form.description??''} onChange={e=>set('description',e.target.value)} placeholder="提案内容・進捗メモ"/></div>
        </div>
        <div style={{display:'flex',gap:8,padding:'0.85rem 1.4rem',borderTop:'1px solid #f1f5f9',flexShrink:0}}>
          <button onClick={onClose} style={{flex:1,padding:'9px',border:'1px solid #e2e8f0',borderRadius:7,background:'white',color:'#475569',cursor:'pointer',fontWeight:600,fontFamily:'inherit',outline:'none'}}>キャンセル</button>
          <button onClick={handleSave} disabled={saving} style={{flex:2,padding:'9px',border:'none',borderRadius:7,background:'#0f172a',color:'white',cursor:saving?'not-allowed':'pointer',fontWeight:700,fontFamily:'inherit',outline:'none',opacity:saving?0.6:1}}>{saving?'保存中...':'＋ 案件を追加'}</button>
        </div>
      </div>
    </div>
  )
}
