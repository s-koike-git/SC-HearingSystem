import type { NodeKind } from './types'
import { NODE_KIND_META } from './types'

const PALETTE_ITEMS: NodeKind[] = ['start', 'process', 'decision', 'io', 'end', 'group']

interface Props {
  onAddNode: (kind: NodeKind) => void
}

export default function NodePalette({ onAddNode }: Props) {
  const onDragStart = (e: React.DragEvent, kind: NodeKind) => {
    e.dataTransfer.setData('application/flow-node-kind', kind)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div style={{
      width: 140,
      flexShrink: 0,
      background: '#0f172a',
      borderRight: '1px solid #1e3a5f',
      padding: '12px 10px',
      display: 'flex',
      flexDirection: 'column',
      gap: 8,
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#475569',
        marginBottom: 4,
        textTransform: 'uppercase',
      }}>
        ノードパレット
      </div>

      {PALETTE_ITEMS.map(kind => {
        const meta = NODE_KIND_META[kind]
        return (
          <div
            key={kind}
            draggable
            onDragStart={e => onDragStart(e, kind)}
            onClick={() => onAddNode(kind)}
            title={`${meta.label}ノードを追加（クリックまたはドラッグ）`}
            style={{
              background: meta.bg,
              border: `1.5px solid ${meta.border}`,
              borderRadius: kind === 'start' || kind === 'end' ? 999 : 6,
              padding: '7px 10px',
              color: meta.text,
              fontSize: 11,
              fontWeight: 600,
              cursor: 'grab',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              userSelect: 'none',
              transition: 'opacity 0.15s, transform 0.1s',
              boxShadow: '0 2px 6px rgba(0,0,0,0.3)',
            }}
            onMouseEnter={e => {
              ;(e.currentTarget as HTMLDivElement).style.opacity = '0.85'
              ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1.03)'
            }}
            onMouseLeave={e => {
              ;(e.currentTarget as HTMLDivElement).style.opacity = '1'
              ;(e.currentTarget as HTMLDivElement).style.transform = 'scale(1)'
            }}
          >
            <span style={{ fontSize: 14 }}>{meta.icon}</span>
            {meta.label}
          </div>
        )
      })}

      <div style={{
        marginTop: 8,
        fontSize: 10,
        color: '#334155',
        lineHeight: 1.5,
      }}>
        クリックまたは<br />
        キャンバスへ<br />
        ドラッグで追加
      </div>
    </div>
  )
}
