import { useCallback, useEffect, useRef, useState } from 'react'
import { applyNodeChanges, applyEdgeChanges } from '@xyflow/react'
import type { NodeChange, EdgeChange } from '@xyflow/react'
import type { DiagramNode, DiagramEdge } from '@/features/dfd-editor/types'
import type { DFDNotationStyle } from '@/features/dfd-editor/types/notation'
import { useUndoHistory } from '@/features/dfd-editor/hooks/useUndoHistory'
import { TRANSIENT_DATA_KEYS, edgeForFile, nodeForFile } from '../lib/cyclonedx-canvas'

interface LoadFromFileData {
  title: string
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  notationStyle?: DFDNotationStyle
}

interface UseGuestDiagramStateReturn {
  title: string
  setTitle: (title: string) => void
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>>
  setEdges: React.Dispatch<React.SetStateAction<DiagramEdge[]>>
  onNodesChange: (changes: NodeChange<DiagramNode>[]) => void
  onEdgesChange: (changes: EdgeChange<DiagramEdge>[]) => void
  undo: () => void
  redo: () => void
  canUndo: boolean
  canRedo: boolean
  hasUnsavedChanges: boolean
  markSaved: () => void
  loadFromFile: (data: LoadFromFileData) => void
}

interface DiagramState {
  nodes: DiagramNode[]
  edges: DiagramEdge[]
}

/** Typing in one field is one undo step until it pauses for this long. */
const TYPING_PAUSE_MS = 1000

/**
 * The diagram as a file would store it: no selection, no open label editor, no
 * animation flags. Two states with the same key differ only in view state, and
 * a change between them is not something to undo.
 */
function contentKey(state: DiagramState): string {
  return JSON.stringify(
    [state.nodes.map((node) => nodeForFile(node, null)), state.edges.map((edge) => edgeForFile(edge, null))],
    // `measured` is React Flow's own record of a node's rendered size.
    (key, value) => (key === 'measured' ? undefined : value)
  )
}

function hasOpenLabelEditor(state: DiagramState): boolean {
  return [...state.nodes, ...state.edges].some(
    (item) => (item.data as { isInlineEditing?: boolean } | undefined)?.isInlineEditing === true
  )
}

/**
 * Names the elements a change touched when it only replaced their data, which
 * is what typing in a field does. Null for anything structural.
 */
function replaceTarget(
  kind: string,
  changes: readonly (NodeChange<DiagramNode> | EdgeChange<DiagramEdge>)[]
): string | null {
  const real = changes.filter((change) => change.type !== 'select' && change.type !== 'dimensions')
  if (real.length === 0) return null
  const ids: string[] = []
  for (const change of real) {
    if (change.type !== 'replace') return null
    ids.push(change.id)
  }
  return `${kind}:${ids.join(',')}`
}

/**
 * Drop view-only flags from a restored history state. Snapshots are taken with
 * a label editor open or a "just inserted" highlight on. Restored as is, the
 * editor would reopen (and leaving it commits again, so Undo could never get
 * past a rename) and the highlight would stay on for good.
 */
function withoutTransientData<T extends DiagramNode | DiagramEdge>(items: T[]): T[] {
  return items.map((item) => {
    const data = (item.data ?? {}) as Record<string, unknown>
    if (!Object.keys(data).some((key) => TRANSIENT_DATA_KEYS.has(key))) return item
    const kept: Record<string, unknown> = {}
    for (const [key, value] of Object.entries(data)) {
      if (!TRANSIENT_DATA_KEYS.has(key)) kept[key] = value
    }
    return { ...item, data: kept } as T
  })
}

export function useGuestDiagramState(): UseGuestDiagramStateReturn {
  const [title, setTitleInternal] = useState('Untitled Diagram')
  const [nodes, setNodesInternal] = useState<DiagramNode[]>([])
  const [edges, setEdgesInternal] = useState<DiagramEdge[]>([])
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const { pushToHistory, undo: undoFromHistory, redo: redoFromHistory, canUndo, canRedo, clearHistory } = useUndoHistory()
  const nodesRef = useRef<DiagramNode[]>(nodes)
  const edgesRef = useRef<DiagramEdge[]>(edges)
  const nodeDragHistoryRef = useRef(false)
  // The state from before the edit in the label editor that is open now.
  const editStartRef = useRef<DiagramState | null>(null)
  // The last step that was typing in a field, so the next keystroke can join it.
  const lastTypingRef = useRef<{ target: string; at: number } | null>(null)
  // The content of the newest history entry, to drop a step reported twice.
  const lastPushedKeyRef = useRef<string | null>(null)

  useEffect(() => {
    nodesRef.current = nodes
    edgesRef.current = edges
  }, [nodes, edges])

  const setTitle = useCallback((newTitle: string) => {
    setTitleInternal(newTitle)
    setHasUnsavedChanges(true)
  }, [])

  const setNodes: React.Dispatch<React.SetStateAction<DiagramNode[]>> = useCallback(
    (value) => {
      setNodesInternal(value)
      setHasUnsavedChanges(true)
    },
    []
  )

  const setEdges: React.Dispatch<React.SetStateAction<DiagramEdge[]>> = useCallback(
    (value) => {
      setEdgesInternal(value)
      setHasUnsavedChanges(true)
    },
    []
  )

  const forgetSteps = useCallback(() => {
    editStartRef.current = null
    lastTypingRef.current = null
    lastPushedKeyRef.current = null
  }, [])

  const pushStep = useCallback(
    (state: DiagramState) => {
      // Deleting a node changes nodes and edges; both handlers report it, from
      // the same state before. One step, not two.
      const key = contentKey(state)
      if (key === lastPushedKeyRef.current) return
      lastPushedKeyRef.current = key
      pushToHistory(state)
    },
    [pushToHistory]
  )

  /**
   * Decide whether a change is an undo step, and record the state to go back to.
   * `typingTarget` comes from `replaceTarget`.
   */
  const recordStep = useCallback(
    (before: DiagramState, after: DiagramState, typingTarget: string | null) => {
      const editing = hasOpenLabelEditor(after)
      if (editStartRef.current === null && editing) {
        // An edit in a label editor is one step, recorded when the editor closes.
        editStartRef.current = before
        return
      }
      if (editStartRef.current !== null) {
        if (editing) return
        const start = editStartRef.current
        editStartRef.current = null
        lastTypingRef.current = null
        // A cancelled edit leaves the content as it was: nothing to undo.
        if (contentKey(start) !== contentKey(after)) pushStep(start)
        return
      }
      // Only view state changed, for example the "just inserted" highlight going off.
      if (contentKey(before) === contentKey(after)) return
      const now = Date.now()
      const last = lastTypingRef.current
      if (typingTarget !== null && last !== null && last.target === typingTarget && now - last.at < TYPING_PAUSE_MS) {
        // Still typing in the same field: part of the step already recorded.
        last.at = now
        return
      }
      lastTypingRef.current = typingTarget === null ? null : { target: typingTarget, at: now }
      pushStep(before)
    },
    [pushStep]
  )

  const handleNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) => {
      const hasRealChanges = changes.some(
        (c) => c.type !== 'select' && c.type !== 'dimensions'
      )
      const hasDraggingChange = changes.some(
        (c) => c.type === 'position' && c.dragging === true
      )
      const hasPositionChange = changes.some((c) => c.type === 'position')
      const endsDragging = changes.some(
        (c) => c.type === 'position' && c.dragging === false
      )
      if (hasRealChanges) {
        if (hasDraggingChange) {
          if (!nodeDragHistoryRef.current) {
            lastTypingRef.current = null
            pushStep({ nodes: nodesRef.current, edges: edgesRef.current })
          }
          nodeDragHistoryRef.current = true
        } else if (!hasPositionChange || !nodeDragHistoryRef.current) {
          recordStep(
            { nodes: nodesRef.current, edges: edgesRef.current },
            { nodes: applyNodeChanges(changes, nodesRef.current) as DiagramNode[], edges: edgesRef.current },
            replaceTarget('node', changes)
          )
        }
      }
      if (endsDragging) nodeDragHistoryRef.current = false
      setNodesInternal((nds) => applyNodeChanges(changes, nds) as DiagramNode[])
      if (hasRealChanges) {
        setHasUnsavedChanges(true)
      }
    },
    [pushStep, recordStep]
  )

  const handleEdgesChange = useCallback(
    (changes: EdgeChange<DiagramEdge>[]) => {
      const hasRealChanges = changes.some((c) => c.type !== 'select')
      if (hasRealChanges) {
        recordStep(
          { nodes: nodesRef.current, edges: edgesRef.current },
          { nodes: nodesRef.current, edges: applyEdgeChanges(changes, edgesRef.current) as DiagramEdge[] },
          replaceTarget('edge', changes)
        )
      }
      setEdgesInternal((eds) => applyEdgeChanges(changes, eds) as DiagramEdge[])
      if (hasRealChanges) {
        setHasUnsavedChanges(true)
      }
    },
    [recordStep]
  )

  const undo = useCallback(() => {
    const previousState = undoFromHistory({ nodes: nodesRef.current, edges: edgesRef.current })
    if (previousState) {
      forgetSteps()
      setNodes(withoutTransientData(previousState.nodes))
      setEdges(withoutTransientData(previousState.edges))
    }
  }, [undoFromHistory, forgetSteps, setNodes, setEdges])

  const redo = useCallback(() => {
    const nextState = redoFromHistory({ nodes: nodesRef.current, edges: edgesRef.current })
    if (nextState) {
      forgetSteps()
      setNodes(withoutTransientData(nextState.nodes))
      setEdges(withoutTransientData(nextState.edges))
    }
  }, [redoFromHistory, forgetSteps, setNodes, setEdges])

  const markSaved = useCallback(() => {
    setHasUnsavedChanges(false)
  }, [])

  const loadFromFile = useCallback((data: LoadFromFileData) => {
    // Undo must not reach back into the diagram that was open before: it
    // would put the old canvas under the new file, and Save would overwrite it.
    clearHistory()
    forgetSteps()
    setTitleInternal(data.title)
    setNodesInternal(data.nodes)
    setEdgesInternal(data.edges)
    setHasUnsavedChanges(false)
  }, [clearHistory, forgetSteps])

  // Warn before leaving with unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  return {
    title,
    setTitle,
    nodes,
    edges,
    setNodes,
    setEdges,
    onNodesChange: handleNodesChange,
    onEdgesChange: handleEdgesChange,
    undo,
    canUndo: canUndo(),
    redo,
    canRedo: canRedo(),
    hasUnsavedChanges,
    markSaved,
    loadFromFile,
  }
}
