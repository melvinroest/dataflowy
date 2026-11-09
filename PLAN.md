# Plan: standalone DFD editor, copied from Precogly's guest editor

Written 2026-11-06. Status: built and verified the same day. See Result.

## Result

It runs at https://dfd.m1 (m1 app `dfd`, port 8425, `npm run dev`; see `~/PersonalApps/m1/m1.toml`).
By hand: `npm install`, then `npm run dev -- --port 5174 --strictPort` (5173 is taken by
spoorkaart). Build: `npm run build`. A sample file to open: `examples/valid-diagram.cdx.json`.

### What differs from the plan below

1. **Upstream bug found and fixed: exported PNG and SVG had no flow lines.** Arrowheads and
   labels were drawn, the lines were not. Cause: `html-to-image` 1.11.13 deep clones every
   `<svg>` and never copies computed styles onto its children
   (`node_modules/html-to-image/es/clone-node.js`, `cloneSingleNode` and `cloneChildren`), and
   a flow line gets its color only from a CSS class (`DataFlowEdge.tsx`, `!stroke-gray-400`).
   The boundary line survived because it sets its color inline. Control: an untouched build of
   the original, same file, same export, shows the same missing stroke. Fix: one inline
   `stroke: '#99a1af'` in `src/features/dfd-editor/components/edges/DataFlowEdge.tsx`
   (the sRGB value of that class, measured in the browser). In the editor the `!important`
   classes still win, so selected lines stay blue. 1.11.13 is the newest release, so there is
   no upgrade that fixes it.
2. `index.html` has `<link rel="icon" href="data:," />`. Without any icon link the browser
   requests `/favicon.ico` and logs a 404.
3. Tailwind exclusion is `@source not "../reference";` in `src/index.css`, per
   https://tailwindcss.com/docs/detecting-classes-in-source-files. Checked: of 80 size classes
   that occur only in `reference/`, 0 are in the built CSS.
4. Two more copied files became unreachable after the cuts and were removed:
   `src/components/ui/switch.tsx`, `src/features/guest-editor/lib/guest-targets.ts`.
5. Step 8 (m1) was done on 2026-11-09: `[dfd]` in `m1.toml`, port 8425, and
   `server.allowedHosts: ['.m1']` in `vite.config.ts`, the fix the m1 README describes.

### What was verified, and how

- `npm run build` passes (type check with unused import checks, then the Vite build).
- Browser test, open and round trip, 44 checks, on the production build and on the dev server:
  open the fixture, edit description of a node, a flow and a boundary, Save, reload, Open the
  saved file, read the three descriptions back, export PNG and SVG. Also: no request to
  `/api/`, no console errors, none of the removed buttons present, and the threats and
  controls already in the fixture (4 threats, 4 scenarios, 2 controls) are identical in the
  saved file.
- Browser test, draw from scratch, 12 checks, production build: place two zones, a human
  actor and a process from the palette, draw a flow and a boundary, name and describe them,
  Save, inspect the file. A new diagram contains no threats, scenarios or controls.
- Looked at: the empty editor, the boundary panel, the drawn diagram, the exported PNG, the
  exported SVG rendered in Chrome.
- `diff -rq src reference/precogly-main/frontend/src`: 77 of the 96 files in `src` are byte
  identical to the original. The 19 that differ, as lines added / removed (after all three
  rounds of fixes below):

  | File | Added | Removed |
  |---|---|---|
  | `src/App.tsx` | 2 | 7 |
  | `src/features/dfd-editor/api/component-library.ts` | 2 | 0 |
  | `src/features/dfd-editor/components/edges/DataFlowEdge.tsx` | 12 | 3 |
  | `src/features/dfd-editor/components/nodes/InlineEditableLabel.tsx` | 7 | 3 |
  | `src/features/dfd-editor/components/nodes/TableNode.tsx` | 5 | 1 |
  | `src/features/dfd-editor/components/panels/ComponentPanel.tsx` | 1 | 1 |
  | `src/features/dfd-editor/lib/export-diagram-image.ts` | 11 | 1 |
  | `src/features/guest-editor/GuestDFDEditor.tsx` | 36 | 102 |
  | `src/features/guest-editor/GuestLayout.tsx` | 1 | 22 |
  | `src/features/guest-editor/components/GuestEdgeEditPanel.tsx` | 1 | 8 |
  | `src/features/guest-editor/components/GuestEditorHeader.tsx` | 19 | 83 |
  | `src/features/guest-editor/components/GuestNodeEditPanel.tsx` | 0 | 13 |
  | `src/features/guest-editor/components/GuestTrustBoundaryEdgeEditPanel.tsx` | 14 | 9 |
  | `src/features/guest-editor/components/guestNodeTypes.ts` | 16 | 21 |
  | `src/features/guest-editor/hooks/useGuestDiagramState.ts` | 152 | 13 |
  | `src/features/guest-editor/lib/cyclonedx-canvas.ts` | 2 | 1 |
  | `src/features/guest-editor/lib/cyclonedx-guest.ts` | 10 | 4 |
  | `src/index.css` | 8 | 0 |
  | `src/routes.tsx` | 5 | 101 |

  Outside `src`: `package.json`, `package-lock.json`, `vite.config.ts`, `eslint.config.js` and
  `index.html` were trimmed as described in step 1.
- `npm run lint` reports 4 errors (`react-hooks/set-state-in-effect`), all in 3 files that
  are byte identical to the original: `ProcessNode.tsx`, `useBoundaryMode.ts`,
  `useConnectionMode.ts`. Left as is.

### Audit by a second agent, and what it led to

The first build was made after reading 13 of the 96 files in full. A second agent then read
all 96 (684,640 bytes; it used 592,814 tokens) and reported what was missed. Its findings were
checked in a browser before anything was changed. Each line below was reproduced first and
passes after the fix.

Fixed, all upstream bugs in the guest editor unless marked:

1. **Undo after Open destroyed the opened diagram.** The undo history survived Open, so one
   Undo put the previous canvas (in the test: an empty one) under the new file, and Save would
   have overwritten that file. Fix: `loadFromFile` now calls the existing `clearHistory`
   (`useGuestDiagramState.ts`).
2. **Deleting with the keyboard could not be undone.** The guest delete handler used setters
   that skip the undo history. Fix: it uses React Flow's setters, like the default handler in
   `useKeyboardShortcuts.ts` (`GuestDFDEditor.tsx`).
3. **A stray key renamed a selected boundary.** Typing any character with a boundary selected
   set its name to that character, with no editor shown. Fix: the type to rename handler is
   limited to data flows, as its own comment in `useKeyboardShortcuts.ts` says.
4. **Undo could not get past a rename.** Undo restored a state with the label editor open, and
   leaving that editor committed again. This also made a name lost to a stray key
   unrecoverable. Fix: restored history states close the label editor, and type to rename now
   records the old name (`useGuestDiagramState.ts`, `GuestDFDEditor.tsx`).
5. **"Export only selected elements" kept the lines of unselected flows.** Same library
   behaviour as the flow line bug, and made visible by that fix. Fix: the export filter also
   catches the `<svg>` wrapper React Flow puts around each edge (`export-diagram-image.ts`).
6. **Mine: the highlight of a flow's start point no longer pulsed.** `CanvasOverlays.tsx` uses
   Tailwind's `pulse` keyframes through an inline style, and Tailwind only emits them when some
   file uses the utility. In Precogly other files did. Fix: `@source inline("animate-pulse")`
   in `src/index.css`.
7. **Open did not ask before discarding unsaved work.** Fixed at the owner's request: with
   unsaved changes, Open first asks through `window.confirm`, the same mechanism the removed
   back button used (`GuestEditorHeader.tsx`, `handleOpen`). No question when nothing changed.

Third round, at the owner's request: the eight bugs that were still open. All are upstream
behaviour except where noted. Tested in a browser on the production build and the dev server
(27 checks), plus every earlier test again.

8. **Undo now removes a flow or boundary you just drew.** They were created through setters
   that skip the undo history. Fix: `GuestDFDEditor.tsx` passes React Flow's own setter to
   `useConnectionMode` and `useBoundaryMode`, and uses it for drag to connect and reconnect.
9. **A flow named exactly like "<source> to <target>" keeps its name on reopen.** The reader
   cleared any label that matched the name it generates for unnamed flows. Fix: it only clears
   a label that disagrees with the file (`cyclonedx-guest.ts`, flow reader).
10. **A cleared name stays cleared on reopen.** The format needs a name on every element, so
    the writer makes one up ("Data store", "Zone", the node type) and the reader took it back
    as a rename. Fix: `reconcileLabel` leaves an unnamed element unnamed when the name is the
    generated one. The generated name is still in the standard part of the file.
11. **Escape after typing over a name restores the old name.** Type to rename put the typed
    character in the label before the editor remembered the original, so Escape "restored"
    the first typed letter. Fix: the replaced name travels in a transient field,
    `labelBeforeInlineEdit`, that both label editors read (`InlineEditableLabel.tsx`,
    `DataFlowEdge.tsx`); it is never written to a file (`cyclonedx-canvas.ts`).
12. **Undo works in whole edits.** Rewritten history rules in `useGuestDiagramState.ts`:
    - an edit in a label editor is one step, recorded when the editor closes, and a cancelled
      edit is no step;
    - typing in a side panel field is one step until it pauses for a second
      (`TYPING_PAUSE_MS`);
    - a change that only touches view state is no step. Before, the "just inserted" highlight
      switching off two seconds after placing a shape was an empty undo step;
    - a delete reported by both the node and the edge handler is one step, not two;
    - a restored state has its view flags removed, so Undo cannot reopen a label editor.
13. **Delete with table cells selected no longer removes the table.** The code returned before
    stopping the event, against its own comment. Fix: `TableNode.tsx` stops the key for any
    selection inside the table. A range of cells removes nothing, as that comment intends.
14. **Deleting an element no longer deletes threats behind your back.** Threats are outside
    the undo history, so Undo could not bring them back. Fix: nothing removes them at delete
    time; `GuestEditorHeader.tsx` applies the same rule (a threat goes with its last target)
    when it builds the file. The custom keyboard delete handler in `GuestDFDEditor.tsx` is
    gone; the default one in `useKeyboardShortcuts.ts` does the canvas work.

Known and left as is:

- **The exported SVG is HTML wrapped in an SVG** (measured: 1 `foreignObject`, 102 `div`, no
  `text` elements). Browsers render it. Most vector tools will not; not tested in any.
- **Typing with a node or flow selected still starts a rename.** That is the upstream feature.
  Escape now cancels it and one Undo reverts it.
- **Two edits to the same element within one second are one undo step.** That is how typing
  is grouped. The history holds 30 steps (`useUndoHistory.ts:38`).
- **Security marking is still drawn:** the padlock on flows (accepted by the owner), "TL: 50"
  on new zones, red for new boundaries, and the sensitivity, trust level, authentication and
  session fields in the side panels.
- **In Precogly's docs but not in this app:** the "Show flows" type filter, the "Crosses
  boundary" field, autosave, and a description for the diagram as a whole. The last one lived
  in the removed context dialog.

### Not verified

- Saving through the native file picker. Native pickers cannot be automated, so both tests
  remove the File System Access API and drive the fallback (file input and download), the same
  way Precogly's own e2e tests do. "Save writes silently to the file you opened" is untested.
- Any browser other than Chrome.
- Placing a System Actor, Data Store, System Scope or Sticky Note; editing table cells; copy
  and paste; switching notation; the "transparent" export option.
- The test scripts were throwaway and live in the session scratchpad, not in this project.

## Goal

A frontend that only draws data flow diagrams:

- name and description on every entity (nodes, flows, boundaries)
- draw connections between entities
- save to JSON, export PNG and SVG, using the save options Precogly already has
- open a saved diagram and continue working on it

Constraints: copy Precogly's frontend code as much as possible, invent new code only when
strictly necessary. No backend. No threat modeling features.

## Source

A copy of the Precogly repository, https://github.com/precogly/precogly, main branch as
downloaded on 2026-10-30 (release 0.4.0 of 2026-09-15 is the newest entry in its CHANGELOG;
`frontend/package.json` says 0.3.0). It sat in `reference/precogly-main/` while the work was
done and was removed on 2026-11-09. All paths below are relative to its `frontend/` folder
unless they start with `reference/`.

Precogly already ships an editor that runs without login or backend: the "guest editor" at
route `/guest` (`src/routes.tsx`, `src/features/guest-editor/`). It reuses the canvas, nodes,
edges and hooks of the signed in editor in `src/features/dfd-editor/`. This plan extracts
that guest editor and removes the threat modeling parts from it.

How the facts below were established:

- READ: `GuestLayout.tsx`, `GuestDFDEditor.tsx`, `GuestEditorHeader.tsx`, `cyclonedx-canvas.ts`,
  `App.tsx`, `main.tsx`, `routes.tsx`, `package.json`, `vite.config.ts`, `tsconfig.app.json`,
  `reference/precogly-main/docs/guides/guest-editor.md`
- TRACED: the file list in the appendix comes from following import statements starting at
  `GuestLayout.tsx` and `GuestDFDEditor.tsx`. Those 98 files were not all read.
- GREP: everything cited with a line number in a file not listed under READ.

## What the guest editor already does

| Requirement | Where | Status |
|---|---|---|
| Open, Save, Save As | `src/features/guest-editor/lib/file-system-access.ts`, handlers in `GuestEditorHeader.tsx:193-299` | present |
| PNG and SVG export | `src/features/dfd-editor/lib/export-diagram-image.ts`, `ExportImageDialog.tsx` | present |
| Name and description on nodes | `GuestNodeEditPanel.tsx:160-175` | present |
| Name and description on flows | `GuestEdgeEditPanel.tsx:98-117` | present |
| Name on boundaries | `GuestTrustBoundaryEdgeEditPanel.tsx:111-119` | present |
| Description on boundaries | | MISSING, step 5 |
| Draw flows and boundaries | `GuestDFDEditor.tsx:113-133` and `284-309` | present |
| Undo, redo, copy, paste, duplicate | shortcut list in `GuestEditorHeader.tsx:610-619` | present |
| DFD3 and Yourdon notation | `GuestEditorHeader.tsx:433-448` | present |

Two things to know about saving:

- The file is `.cdx.json`: CycloneDX, an open standard JSON format for describing systems.
  Zones, components, data stores and flows are written as standard CycloneDX entries with
  name and description (`cyclonedx-guest.ts:492-587`). The drawing itself (positions, sizes,
  every node and edge field) is one base64 encoded attachment of type
  `application/vnd.precogly.dfd+json` (`cyclonedx-canvas.ts:4-8`). So the file is valid JSON,
  but the layout part is not readable by eye.
- There is no autosave and no browser storage. The diagram lives in memory until Save
  (grep for `localStorage` in the guest editor finds nothing). Continuing later means Open.
  Silent save to the same file needs the File System Access API, which Chrome has; other
  browsers fall back to a download and a file picker (`file-system-access.ts:4`).

## Decisions

1. **Keep the folder layout of the original `src/`.** Every import uses the `@/` alias
   (`vite.config.ts`, `tsconfig.app.json`). Same layout means zero import edits.
2. **Keep react-router with a single route.** `GuestLayout` hands the diagram state to
   `GuestDFDEditorPage` through the router's outlet context (`GuestLayout.tsx:191`,
   `GuestDFDEditor.tsx:65`). Removing the router would mean rewriting that hand over.
3. **Remove the threat modeling UI, keep the threat data layer untouched.** The serializer
   takes threats, countermeasures and system context as inputs
   (`GuestEditorHeader.tsx:168-177`). With no UI they are empty for a new diagram. For a file
   that already contains them, they are loaded (`GuestLayout.tsx:141-146`) and written back
   on save, so nothing is lost. Cutting threat handling out of the 98 KB serializer would
   mean rewriting it, which is the opposite of copying.
4. **Keep the CycloneDX format as is.** No new file format.
5. **Tests are not copied**, except one fixture to test Open:
   `src/features/guest-editor/__tests__/e2e/fixtures/valid-diagram.cdx.json`.

## Steps

### 1. Scaffold in the project root, next to `reference/`

Copy and adjust:

- `package.json`: then remove dependencies the build no longer needs. Candidates:
  `@dnd-kit/helpers`, `@dnd-kit/react`, `@radix-ui/react-avatar`, `@radix-ui/react-tabs`,
  `@vercel/analytics`, `date-fns`, `docx`, `react-resizable-panels`, `@tailwindcss/cli`,
  `@playwright/test`, `ajv`, `ajv-formats`, `vitest`. `@tanstack/react-query` stays (step 6).
- `vite.config.ts`: remove the `/api` and `/media` proxy.
- `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`, `eslint.config.js`, `components.json`
- `index.html`: new title, drop the favicon link (it points at a 6.4 MB logo PNG).
- `src/main.tsx`, `src/index.css`, `src/theme.css`, `src/types/file-system-access.d.ts`
- `reference/precogly-main/LICENSE` (Apache 2.0, keep it with the copied code)

Keep `reference/` out of the build. `tsconfig.app.json` already includes only `src`.
Tailwind 4 scans the project folder for class names, so `reference/` must be excluded there
too. How (a `.gitignore` entry or an `@source not` rule) is to be checked against the
Tailwind docs at setup; this is from memory, not verified.

### 2. Copy the traced files verbatim

The 98 files in the appendix, same relative paths. Plus `src/components/ui/sonner.tsx`
(the toast container used by `App.tsx`; it needs the `next-themes` package).

### 3. Entry point: the only new file content

- `src/App.tsx`: copy, then remove `AuthProvider` and `Analytics`. Keep `RouterProvider`,
  `Toaster` and the `QueryClientProvider` block (needed, see step 6).
- `src/routes.tsx`: one route. `/` renders `GuestLayout`, its index child renders
  `GuestDFDEditorPage`.

### 4. Remove the threat modeling UI

Delete:

- `guest-editor/components/GuestThreatSection.tsx`
- `guest-editor/components/GuestAddThreatDialog.tsx`
- `guest-editor/components/GuestTargetPicker.tsx`
- `guest-editor/components/GuestSystemContextModal.tsx` (session, data assets, assumptions)
- `guest-editor/components/GuestNodeWrapper.tsx` (threat count badges on nodes and edges)
- `guest-editor/lib/guestWordExport.ts` and `features/reports/utils/wordHelpers.ts` (Word report)

Never copied, because only the `/guest/threats` page uses them:
`GuestThreatAnalysis.tsx`, `GuestCountermeasureDialog.tsx`.

Trim:

- `GuestDFDEditor.tsx`: imports at lines 37-38; the `renderExtra` threat section at 494-503;
  the capture effect at 185-194 (it only feeds the Word report).
- `GuestEdgeEditPanel.tsx`: import at 33, threat section at 251.
- `GuestTrustBoundaryEdgeEditPanel.tsx`: import at 29, threat section at 226.
- `guestNodeTypes.ts`: point at the plain node and edge components instead of the badge
  wrapped ones.
- `GuestEditorHeader.tsx`: Analyze Threats button (575-585), Report button (587-597) and
  `handleDownloadReport` (313-326), Add / Edit Context button (401-409) and its modal
  (665-669), the back arrow with the "Guest" badge (359-369; it navigates to `/`, which was
  the signed in app).
- `GuestLayout.tsx`: `handleAnalyzeThreats` (154-158), the cached image state, and the props
  that carried them.
- `src/features/dfd-editor/components/panels/ComponentPanel.tsx:180`: the heading above the
  shape list reads "Threat Modeling". Rename it to "Shapes".

Then run the import trace again from the two entry files and delete every copied file that is
no longer reachable.

### 5. Add a description to boundaries

Copy the Description block from `GuestEdgeEditPanel.tsx:108-117` into
`GuestTrustBoundaryEdgeEditPanel.tsx` after the Name field (line 119), with its `Textarea`
import.

Why this should persist: `TrustBoundaryEdgeData` accepts extra keys
(`src/features/dfd-editor/types/diagram.ts:764`) and the file writer copies every data key of
an edge into the canvas attachment (`edgeForFile` in `cyclonedx-canvas.ts`). Not verified:
that the value comes back on Open. Step 7 tests exactly that. If it does not, the reader in
`cyclonedx-guest.ts` needs a look before anything is written.

### 6. Component palette without a backend

Finding (subagent report, the four cited lines checked in the source by the main session):
the palette already works without a backend. It shows 8 shapes that are defined in the
frontend (`ComponentPanel.tsx:35-45`): Human Actor, System Actor, Process, Data Store, Zone,
System Scope, Sticky Note, Table, plus the Flow and Boundary toggles. The pack sections with
tech icons are hidden whenever no threat model id is passed (`showLibrary = !!threatModelId`,
`ComponentPanel.tsx:111`), and the guest editor passes none (`GuestDFDEditor.tsx:426-434`).
So the guest editor never shows tech icons, with or without a backend.

The one defect: the panel still fires a request to `/component-library/` that nothing uses
(`src/features/dfd-editor/api/component-library.ts:168-176`). With no backend it fails
silently, twice per load (`retry: 1` in `App.tsx:8-17`).

Fix: in `useGroupedComponentLibrary`, copy the guard that `useTechnologyInfo` already has in
the same file (line 137, `const hasAuth = !!getAccessToken()`) and pass `enabled: hasAuth`.
Two lines, one file, same pattern as their own code. Result: same panel, zero requests.

Consequences:

- `@tanstack/react-query` and `src/lib/api.ts` stay. The four node components call
  `useTechnologyInfo`, which calls `useQuery` even when the fetch is disabled.
- Tech icon packs (175 components in 7 packs under `reference/precogly-main/libraries/packs/`,
  counted by the subagent) are out of scope. They are loaded by backend code, and a version
  without backend would need a new generator script.
- The technology of a node is a plain text field in the side panel (subagent,
  `GuestNodeEditPanel.tsx:229-232`).

### 7. Verify

- `npm run build`. It runs `tsc -b` with unused import checks switched on
  (`tsconfig.app.json`), so a leftover import from step 4 fails the build.
- Screenshot the running editor with headless Chrome and look at it.
- In Chrome: open `valid-diagram.cdx.json`, edit a node, set a boundary description, Save,
  reload the page, Open the saved file, check everything is back. Export PNG and SVG and
  look at both.
- `diff -rq src reference/precogly-main/frontend/src`: the files reported as different must be
  exactly the ones named in steps 3 to 6. Everything else is then proven to be a verbatim copy.

### 8. Optional: keep it running under m1

Port 5173 is taken by spoorkaart (`portless list`, 2026-11-06). Pick a free port after
checking `portless list` and `~/PersonalApps/m1/m1.toml`, add a table to `m1.toml`, run
`m1 sync`.

## Open points

None. Both earlier points are settled, see Result: Tailwind excludes `reference/` through
`@source not`, and a boundary description survives Save and Open.

## Appendix: the 98 traced files

`*` = deleted in step 4.

`src/components/ui/` (20): alert-dialog, badge, button, checkbox, command, context-menu,
dialog, dropdown-menu, input, label, multi-select-combobox, popover, radio-group,
scroll-area, select, separator, slider, switch, textarea, tooltip (all `.tsx`)

`src/features/dfd-editor/` (40):

- `api/component-library.ts`
- `components/`: CanvasOverlays.tsx, ExportImageDialog.tsx, SvgIcon.tsx, suggestion-combobox.tsx
- `components/edges/`: DataFlowEdge.tsx, TrustBoundaryEdge.tsx
- `components/nodes/`: DataStoreNode.tsx, HumanActorNode.tsx, InlineEditableLabel.tsx,
  ProcessNode.tsx, StickyNoteNode.tsx, SystemActorNode.tsx, SystemScopeNode.tsx, TableNode.tsx,
  TrustZoneNode.tsx, table-chrome-sizes.ts, table-chrome.tsx
- `components/panels/`: ComponentPanel.tsx, TableGridPicker.tsx, TableSizeFields.tsx
- `context/DFDNotationContext.tsx`
- `hooks/`: useBoundaryMode.ts, useConnectionMode.ts, useCreateNode.ts, useKeyboardShortcuts.ts,
  useParentRelationships.ts, useTableDrag.ts, useTableSelection.ts, useUndoHistory.ts
- `lib/`: authentication-selection.ts, canvas-defaults.ts, export-diagram-image.ts,
  flow-visibility.ts, technology-registry.ts, zone-trust-level.ts
- `types/`: diagram.ts, index.ts, notation.ts, threat-analysis.ts

`src/features/guest-editor/` (30):

- GuestDFDEditor.tsx, GuestLayout.tsx, types.ts
- `components/`: GuestAddThreatDialog.tsx*, GuestEdgeEditPanel.tsx, GuestEditorHeader.tsx,
  GuestFileNotices.tsx, GuestNodeEditPanel.tsx, GuestNodeWrapper.tsx*,
  GuestSystemContextModal.tsx*, GuestTargetPicker.tsx*, GuestThreatSection.tsx*,
  GuestTrustBoundaryEdgeEditPanel.tsx, guestNodeTypes.ts
- `context/`: GuestEditorContext.tsx, GuestEditorProvider.tsx
- `hooks/`: useFileHandle.ts, useGuestDiagramState.ts, useGuestModel.ts, useGuestSystemContext.ts
- `lib/`: cyclonedx-canvas.ts, cyclonedx-guest.ts, cyclonedx-properties.ts,
  cyclonedx-spec.generated.ts, cyclonedx-types.ts, file-system-access.ts, guest-model.ts,
  guest-targets.ts, guestWordExport.ts*, legacy-guest-file.ts

Other (8): `src/features/reports/utils/wordHelpers.ts`*, `src/lib/api.ts`,
`src/lib/authentication.ts`, `src/lib/normalize-tags.ts`, `src/lib/utils.ts`,
`src/types/domain.ts`, `src/types/risk.ts`, `src/types/triage.ts`
