import type { BusinessProcessInfo } from './HearingSidebar'

interface BusinessStat {
  total: number
  answered: number
  l1Skipped: boolean
}

interface HearingTimelineProps {
  processes: BusinessProcessInfo[]
  stats: Record<string, BusinessStat>
  activeBusiness: string
  onSelect: (stepId: string) => void
}

function HearingTimeline({ processes, stats, activeBusiness, onSelect }: HearingTimelineProps) {
  const sorted = [...processes].sort((a, b) => a.displayOrder - b.displayOrder)

  return (
    <div style={{
      backgroundColor: 'white',
      borderRadius: 8,
      border: '1px solid #e2e8f0',
      padding: '8px 12px',
      overflowX: 'auto',
      whiteSpace: 'nowrap',
    }}>
      <div style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        {sorted.map((p, idx) => {
          const stat = stats[p.stepId] || { total: 0, answered: 0, l1Skipped: false }
          const isActive = activeBusiness === p.stepId
          const isDone = stat.answered === stat.total && stat.total > 0
          const progress = stat.total > 0 ? Math.round(stat.answered * 100 / stat.total) : 0

          let status: 'done' | 'active' | 'progress' | 'skipped' | 'todo' = 'todo'
          if (stat.l1Skipped) status = 'skipped'
          else if (isDone) status = 'done'
          else if (isActive) status = 'active'
          else if (progress > 0) status = 'progress'

          const styleByStatus = {
            done:     { bg: '#1D9E75', text: 'white', dot: '✓' },
            active:   { bg: '#185FA5', text: 'white', dot: String(idx + 1) },
            progress: { bg: '#E6F1FB', text: '#0C447C', dot: String(idx + 1) },
            skipped:  { bg: '#f1f5f9', text: '#94a3b8', dot: '⊘' },
            todo:     { bg: '#f8fafc', text: '#94a3b8', dot: String(idx + 1) },
          }[status]

          return (
            <div
              key={p.stepId}
              onClick={() => onSelect(p.stepId)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: 'pointer',
                padding: '4px 6px',
                borderRadius: 6,
                backgroundColor: isActive ? '#E6F1FB' : 'transparent',
                minWidth: 60,
                transition: 'background-color 0.15s',
              }}
              onMouseEnter={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = '#f8fafc'
              }}
              onMouseLeave={e => {
                if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title={`${p.stepName} (${stat.answered}/${stat.total})`}
            >
              <div style={{
                width: 26,
                height: 26,
                borderRadius: '50%',
                backgroundColor: styleByStatus.bg,
                color: styleByStatus.text,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 11,
                fontWeight: 500,
                marginBottom: 3,
                border: isActive ? '2px solid #185FA5' : 'none',
              }}>
                {styleByStatus.dot}
              </div>
              <div style={{
                fontSize: 10,
                color: isActive ? '#0C447C' : '#5F5E5A',
                fontWeight: isActive ? 500 : 400,
                whiteSpace: 'nowrap',
                maxWidth: 80,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}>
                {p.stepName.replace(/プロセス$/, '')}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export default HearingTimeline
