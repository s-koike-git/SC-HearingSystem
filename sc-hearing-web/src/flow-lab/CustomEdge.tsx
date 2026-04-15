import { memo } from 'react'
import { getStraightPath, getBezierPath } from 'reactflow'
import type { EdgeProps } from 'reactflow'
import type { FlowEdgeData } from './types'

export const FlowEdge = memo(({
  id,
  sourceX, sourceY,
  targetX, targetY,
  sourcePosition, targetPosition,
  data,
  selected,
  markerEnd,
  style,
}: EdgeProps<FlowEdgeData>) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX, sourceY, sourcePosition,
    targetX, targetY, targetPosition,
  })

  const edgeStyle = data?.edgeStyle ?? 'solid'
  const strokeDasharray =
    edgeStyle === 'dotted' ? '4 4'
    : edgeStyle === 'dashed' ? '10 4'
    : undefined

  const strokeColor = selected ? '#f0abfc' : '#60a5fa'
  const strokeWidth = selected ? 2.5 : 1.8

  return (
    <g>
      <path
        id={id}
        d={edgePath}
        fill="none"
        stroke={strokeColor}
        strokeWidth={strokeWidth}
        strokeDasharray={strokeDasharray}
        markerEnd={markerEnd as string}
        style={{ transition: 'stroke 0.15s', cursor: 'pointer' }}
      />
      {data?.conditionLabel && (
        <foreignObject
          width={120}
          height={30}
          x={labelX - 60}
          y={labelY - 15}
          style={{ overflow: 'visible', pointerEvents: 'all' }}
        >
          <div
            style={{
              background: '#1e293b',
              border: `1px solid ${strokeColor}`,
              borderRadius: 4,
              padding: '2px 8px',
              fontSize: 11,
              color: '#93c5fd',
              fontFamily: '"Noto Sans JP", sans-serif',
              fontWeight: 600,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
              display: 'inline-block',
            }}
          >
            {data.conditionLabel}
          </div>
        </foreignObject>
      )}
    </g>
  )
})

export const edgeTypes = {
  flowEdge: FlowEdge,
}
