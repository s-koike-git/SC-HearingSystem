import { useState } from 'react'

export interface BusinessProcessInfo {
  stepId: string
  stepName: string
  category: string
  displayOrder: number
}

interface BusinessStat {
  total: number
  answered: number
  l1Skipped: boolean
}

interface HearingSidebarProps {
  processes: BusinessProcessInfo[]
  stats: Record<string, BusinessStat>
  activeBusiness: string
  onSelect: (stepId: string) => void
}

// カテゴリ別 色定義
const CATEGORY_COLORS: Record<string, { bg: string; bgHover: string; accent: string; text: string }> = {
  '販売':       { bg: '#E6F1FB', bgHover: '#D6E7F5', accent: '#185FA5', text: '#0C447C' }, // blue
  '請求売掛':   { bg: '#E1F5EE', bgHover: '#CDEBDF', accent: '#1D9E75', text: '#0F6E56' }, // teal
  '購買':       { bg: '#EEEDFE', bgHover: '#DEDBFA', accent: '#534AB7', text: '#3C3489' }, // purple
  '支払買掛':   { bg: '#FBEAF0', bgHover: '#F7D3DF', accent: '#D4537E', text: '#993556' }, // pink
  '在庫':       { bg: '#FAEEDA', bgHover: '#F4DEB8', accent: '#BA7517', text: '#854F0B' }, // amber
  '製造':       { bg: '#FAECE7', bgHover: '#F4D5C7', accent: '#D85A30', text: '#993C1D' }, // coral
  '原価':       { bg: '#EEEDFE', bgHover: '#DEDBFA', accent: '#7F77DD', text: '#26215C' }, // light purple
  '統計':       { bg: '#FCEBEB', bgHover: '#F7D5D5', accent: '#E24B4A', text: '#A32D2D' }, // red
  '管理':       { bg: '#F1EFE8', bgHover: '#E5E2D9', accent: '#888780', text: '#444441' }, // gray
  '月次':       { bg: '#F1EFE8', bgHover: '#E5E2D9', accent: '#5F5E5A', text: '#2C2C2A' }, // dark gray
  '物流OP':     { bg: '#EAF3DE', bgHover: '#D6E7BD', accent: '#639922', text: '#3B6D11' }, // green
}

const getCategoryColor = (cat: string) =>
  CATEGORY_COLORS[cat] || CATEGORY_COLORS['管理']

function HearingSidebar({ processes, stats, activeBusiness, onSelect }: HearingSidebarProps) {
  // カテゴリ別グループ化
  const grouped: Record<string, BusinessProcessInfo[]> = {}
  processes.forEach(p => {
    const cat = p.category || 'その他'
    if (!grouped[cat]) grouped[cat] = []
    grouped[cat].push(p)
  })
  Object.values(grouped).forEach(arr => arr.sort((a, b) => a.displayOrder - b.displayOrder))

  // カテゴリ表示順
  const CATEGORY_ORDER = ['販売', '請求売掛', '購買', '支払買掛', '在庫', '製造', '原価', '統計', '管理', '月次', '物流OP']
  const sortedCategories = Object.keys(grouped).sort((a, b) => {
    const ia = CATEGORY_ORDER.indexOf(a)
    const ib = CATEGORY_ORDER.indexOf(b)
    return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib)
  })

  // カテゴリの折りたたみ状態
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({})
  const toggle = (cat: string) => setCollapsed(prev => ({ ...prev, [cat]: !prev[cat] }))

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 8,
      border: '1px solid #e2e8f0',
      padding: 6,
      fontSize: 13,
      height: 'fit-content',
      maxHeight: 'calc(100vh - 180px)',
      overflowY: 'auto',
      position: 'sticky',
      top: 100,
    }}>
      {sortedCategories.map(cat => {
        const items = grouped[cat]
        const isCollapsed = collapsed[cat]
        const catTotal = items.reduce((s, p) => s + (stats[p.stepId]?.total || 0), 0)
        const catAnswered = items.reduce((s, p) => s + (stats[p.stepId]?.answered || 0), 0)
        const color = getCategoryColor(cat)
        const isCatDone = catAnswered === catTotal && catTotal > 0

        return (
          <div key={cat} style={{
            marginBottom: 6,
            borderRadius: 6,
            overflow: 'hidden',
          }}>
            {/* カテゴリヘッダー (色付き) */}
            <div
              onClick={() => toggle(cat)}
              style={{
                padding: '8px 10px',
                fontSize: 11,
                color: color.text,
                textTransform: 'uppercase',
                letterSpacing: 0.5,
                fontWeight: 700,
                cursor: 'pointer',
                userSelect: 'none',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                backgroundColor: color.bg,
                borderLeft: `3px solid ${color.accent}`,
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.backgroundColor = color.bgHover }}
              onMouseLeave={e => { e.currentTarget.style.backgroundColor = color.bg }}
            >
              <span>
                <span style={{ display: 'inline-block', width: 12, marginRight: 4 }}>
                  {isCollapsed ? '▶' : '▼'}
                </span>
                {cat} ({items.length})
              </span>
              <span style={{
                fontSize: 10,
                fontWeight: 500,
                padding: isCatDone ? '2px 6px' : 0,
                borderRadius: 3,
                backgroundColor: isCatDone ? color.accent : 'transparent',
                color: isCatDone ? 'white' : color.text,
              }}>
                {isCatDone ? '✓ 完了' : `${catAnswered}/${catTotal}`}
              </span>
            </div>

            {/* 業務プロセス一覧 */}
            {!isCollapsed && (
              <div style={{
                paddingTop: 2,
                paddingBottom: 2,
                borderLeft: `1px dashed ${color.accent}40`,
                marginLeft: 8,
              }}>
                {items.map(p => {
                  const stat = stats[p.stepId] || { total: 0, answered: 0, l1Skipped: false }
                  const isActive = activeBusiness === p.stepId
                  const isDone = stat.answered === stat.total && stat.total > 0

                  return (
                    <div
                      key={p.stepId}
                      onClick={() => onSelect(p.stepId)}
                      style={{
                        padding: '6px 10px',
                        marginLeft: 4,
                        marginBottom: 1,
                        borderRadius: 4,
                        cursor: 'pointer',
                        backgroundColor: isActive ? color.bg : 'transparent',
                        color: stat.l1Skipped ? '#bdc3c7' : (isActive ? color.text : '#444441'),
                        fontWeight: isActive ? 600 : 400,
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        gap: 8,
                        borderLeft: isActive ? `2px solid ${color.accent}` : '2px solid transparent',
                        transition: 'all 0.1s',
                      }}
                      onMouseEnter={e => {
                        if (!isActive) e.currentTarget.style.backgroundColor = color.bg + '80'
                      }}
                      onMouseLeave={e => {
                        if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
                      }}
                    >
                      <span style={{
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        flex: 1,
                        textDecoration: stat.l1Skipped ? 'line-through' : 'none',
                      }}>
                        {p.stepName.replace(/プロセス$/, '')}
                      </span>
                      <span style={{
                        fontSize: 10,
                        padding: '2px 6px',
                        borderRadius: 3,
                        backgroundColor: stat.l1Skipped ? '#f1f5f9' : isDone ? color.accent : (stat.answered > 0 ? color.bg : '#f8fafc'),
                        color: stat.l1Skipped ? '#94a3b8' : isDone ? 'white' : (stat.answered > 0 ? color.text : '#94a3b8'),
                        fontWeight: 500,
                        whiteSpace: 'nowrap',
                      }}>
                        {stat.l1Skipped ? '⊘ 不要' : isDone ? '✓' : `${stat.answered}/${stat.total}`}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export default HearingSidebar
