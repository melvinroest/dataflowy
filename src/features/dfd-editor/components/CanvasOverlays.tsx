import { Panel } from '@xyflow/react'
import type { XYPosition } from '@xyflow/react'

interface CanvasOverlaysProps {
  viewportX: number
  viewportY: number
  zoom: number
  // Connection mode
  connectionMode: boolean
  connectionSourceId: string | null
  connectionSourcePosition: XYPosition | null
  mousePosition: XYPosition | null
  // Boundary mode
  boundaryMode: boolean
  boundarySourceId: string | null
  boundarySourceZoneInfo: {
    position: XYPosition
    width: number
    height: number
  } | null
}

export function CanvasOverlays({
  viewportX,
  viewportY,
  zoom,
  connectionMode,
  connectionSourceId,
  connectionSourcePosition,
  mousePosition,
  boundaryMode,
  boundarySourceId,
  boundarySourceZoneInfo,
}: CanvasOverlaysProps) {
  return (
    <>
      {/* SVG Definitions for edge markers */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#6b7280" />
          </marker>
          <marker
            id="arrow-selected"
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#3b82f6" />
          </marker>
        </defs>
      </svg>

      {/* Connection mode indicator */}
      {connectionMode && (
        <Panel position="top-center">
          <div className="bg-primary text-primary-foreground px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            {connectionSourceId
              ? 'Click another node to connect, or click empty space to cancel'
              : 'Click a node to start connecting'}
          </div>
        </Panel>
      )}

      {/* Connection line overlay - dashed line from source to cursor */}
      {connectionMode && connectionSourcePosition && mousePosition && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 1000,
            overflow: 'visible',
          }}
        >
          <g transform={`translate(${viewportX}, ${viewportY}) scale(${zoom})`}>
            <line
              x1={connectionSourcePosition.x + 75}
              y1={connectionSourcePosition.y + 40}
              x2={mousePosition.x}
              y2={mousePosition.y}
              stroke="#3b82f6"
              strokeWidth={2 / zoom}
              strokeDasharray={`${8 / zoom} ${4 / zoom}`}
              opacity="0.7"
            />
            <circle
              cx={mousePosition.x}
              cy={mousePosition.y}
              r={6 / zoom}
              fill="#3b82f6"
              opacity="0.7"
            />
          </g>
        </svg>
      )}

      {/* Boundary mode indicator */}
      {boundaryMode && (
        <Panel position="top-center">
          <div className="bg-orange-500 text-white px-4 py-2 rounded-full text-sm font-medium shadow-lg">
            {boundarySourceId
              ? 'Click another trust zone to create boundary'
              : 'Click a trust zone to start'}
          </div>
        </Panel>
      )}

      {/* Boundary source zone highlight overlay */}
      {boundarySourceZoneInfo && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 999,
            overflow: 'visible',
          }}
        >
          <g transform={`translate(${viewportX}, ${viewportY}) scale(${zoom})`}>
            <rect
              x={boundarySourceZoneInfo.position.x - 4}
              y={boundarySourceZoneInfo.position.y - 4}
              width={boundarySourceZoneInfo.width + 8}
              height={boundarySourceZoneInfo.height + 8}
              rx="12"
              fill="none"
              stroke="#f97316"
              strokeWidth={3 / zoom}
              opacity="0.8"
              style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            />
          </g>
        </svg>
      )}

      {/* Source node highlight overlay */}
      {connectionMode && connectionSourcePosition && (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            zIndex: 999,
            overflow: 'visible',
          }}
        >
          <g transform={`translate(${viewportX}, ${viewportY}) scale(${zoom})`}>
            <rect
              x={connectionSourcePosition.x - 4}
              y={connectionSourcePosition.y - 4}
              width="158"
              height="88"
              rx="12"
              fill="none"
              stroke="#3b82f6"
              strokeWidth={3 / zoom}
              opacity="0.8"
              style={{ animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
            />
          </g>
        </svg>
      )}
    </>
  )
}
