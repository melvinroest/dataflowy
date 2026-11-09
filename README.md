# dataflowy

A small web app for drawing data flow diagrams. Processes, data stores, actors, zones, flows
and boundaries, each with a name and a description. Save to a file, open it again later,
export PNG and SVG. No account, no server, no threat modeling.

It is a cut down copy of the guest editor of [Precogly](https://github.com/precogly/precogly),
an open source threat modeling tool. Precogly's editor does much more (threats,
countermeasures, reports, a backend with organisations and libraries); this repository keeps
only the part that draws the diagram. Precogly is licensed under Apache 2.0, and so is this.
See [LICENSE](LICENSE) and the section on changes below.

## What it does

- Draw the usual DFD shapes: process, data store, human actor, system actor, zone, system
  scope, plus sticky notes and tables.
- Connect them with flows, and draw boundaries between zones.
- Give every shape, flow and boundary a name and a description.
- Two notations: Yourdon (round processes) and DFD3.
- Undo and redo, copy and paste, keyboard shortcuts (press `?` in the editor).
- Save and open `.cdx.json` files. Export the drawing as PNG or SVG.

## What it does not do

- No autosave and no browser storage. The diagram lives in memory until you press Save.
- No threat modeling. Threats already inside a file you open are kept and written back
  unchanged, but nothing shows them.
- The SVG export is HTML wrapped in an SVG. Browsers render it; most vector tools will not.

## Run it

```
npm install
npm run dev
```

Vite prints the address. `npm run build` makes a production build in `dist/`, and
`npm run preview` serves it. A sample diagram to open: `examples/valid-diagram.cdx.json`.

Save writes to the file you opened without a dialog in Chrome and other Chromium browsers,
through the File System Access API. Other browsers download a new file each time.

## The file format

Diagrams are saved as CycloneDX JSON (`.cdx.json`), the format Precogly uses. The shapes,
flows and boundaries are listed as standard CycloneDX entries with their names and
descriptions. The drawing itself (positions, sizes, every field) is stored as one base64
encoded attachment, so the layout is not readable by eye. According to Precogly's
documentation the same file opens in Precogly; that was not tested here.

## Changes from Precogly

The code under `src/` was copied from `frontend/src/` of Precogly. 77 of the 96 files are
byte identical to the original. The others were changed to:

- remove the threat modeling screens, dialogs, badges and the Word report
- run without a backend
- add a description field to boundaries
- fix a number of bugs in the editor, most of them present in Precogly as well: exported
  images without flow lines, undo not covering deletes and new flows, undo reaching back into
  a previously opened file, a stray key renaming a selected element, and others

[PLAN.md](PLAN.md) lists every changed file with line counts, every fix with its cause, and
what was tested how.

The Apache 2.0 license asks that changed files carry a notice that they were changed. This
repository records the changes in PLAN.md rather than in each file.
