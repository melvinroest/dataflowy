import { ProcessNode } from '@/features/dfd-editor/components/nodes/ProcessNode'
import { DataStoreNode } from '@/features/dfd-editor/components/nodes/DataStoreNode'
import { HumanActorNode } from '@/features/dfd-editor/components/nodes/HumanActorNode'
import { SystemActorNode } from '@/features/dfd-editor/components/nodes/SystemActorNode'
import { TrustZoneNode } from '@/features/dfd-editor/components/nodes/TrustZoneNode'
import { SystemScopeNode } from '@/features/dfd-editor/components/nodes/SystemScopeNode'
import { DataFlowEdge as DataFlowEdgeComponent } from '@/features/dfd-editor/components/edges/DataFlowEdge'
import { TrustBoundaryEdge as TrustBoundaryEdgeComponent } from '@/features/dfd-editor/components/edges/TrustBoundaryEdge'
import { StickyNoteNode } from '@/features/dfd-editor/components/nodes/StickyNoteNode'
import { TableNode } from '@/features/dfd-editor/components/nodes/TableNode'
import type { DiagramNodeType } from '@/features/dfd-editor/types'

export const guestNodeTypes = {
  process: ProcessNode,
  datastore: DataStoreNode,
  humanActor: HumanActorNode,
  systemActor: SystemActorNode,
  trustZone: TrustZoneNode,
  systemScope: SystemScopeNode,
  stickyNote: StickyNoteNode,
  table: TableNode,
  // `satisfies` makes a missing node type a build error. React Flow's own
  // behaviour for an unregistered type is to silently substitute its default
  // node, which renders as a small box containing the label and reads as a
  // broken component rather than a missing registration.
} as const satisfies Record<DiagramNodeType, unknown>

export const guestEdgeTypes = {
  dataFlow: DataFlowEdgeComponent,
  trustBoundary: TrustBoundaryEdgeComponent,
} as const
