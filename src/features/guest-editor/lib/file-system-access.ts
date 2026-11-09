/**
 * Browser File System Access API abstraction with fallbacks.
 * Provides save/open operations using native file handles when available,
 * falling back to blob downloads and <input type="file"> for older browsers.
 */

const CDX_FILE_TYPES: FilePickerAcceptType[] = [
  {
    description: 'CycloneDX JSON',
    accept: { 'application/json': ['.cdx.json', '.json'] },
  },
]

/**
 * Returns true if the browser supports the File System Access API
 * (showSaveFilePicker / showOpenFilePicker).
 */
export function supportsFileSystemAccess(): boolean {
  return 'showSaveFilePicker' in window
}

/**
 * Opens the native save file picker, returning a handle to the chosen file.
 * Throws AbortError if the user cancels.
 */
export async function pickFileToSave(
  suggestedName: string
): Promise<FileSystemFileHandle> {
  return window.showSaveFilePicker({
    suggestedName,
    types: CDX_FILE_TYPES,
  })
}

/**
 * Opens the native file picker, reads the chosen file, and returns
 * both the handle and the file content.
 * Throws AbortError if the user cancels.
 */
export async function pickFileToOpen(): Promise<{
  handle: FileSystemFileHandle
  content: string
}> {
  const [handle] = await window.showOpenFilePicker({
    types: CDX_FILE_TYPES,
    multiple: false,
  })
  const file = await handle.getFile()
  const content = await file.text()
  return { handle, content }
}

/**
 * Writes content to an existing file handle.
 * Uses createWritable() -> write() -> close() pattern.
 */
export async function writeToHandle(
  handle: FileSystemFileHandle,
  content: string
): Promise<void> {
  const writable = await handle.createWritable()
  await writable.write(content)
  await writable.close()
}

/**
 * Downloads content as a file using the blob URL + anchor pattern.
 * Used as fallback when File System Access API is not available.
 */
export function downloadAsFallback(filename: string, content: string): void {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename.endsWith('.cdx.json') ? filename : `${filename}.cdx.json`
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Opens a file using a hidden <input type="file"> element.
 * Used as fallback when File System Access API is not available.
 * Returns the file content as a string.
 */
export function openFileViaInput(): Promise<string> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.cdx.json,.json'
    input.style.display = 'none'

    input.addEventListener('change', () => {
      const file = input.files?.[0]
      if (!file) {
        reject(new Error('No file selected'))
        return
      }

      const reader = new FileReader()
      reader.onload = () => {
        resolve(reader.result as string)
      }
      reader.onerror = () => reject(new Error('Failed to read file'))
      reader.readAsText(file)
    })

    input.addEventListener('cancel', () => {
      reject(new Error('File selection cancelled'))
    })

    document.body.appendChild(input)
    input.click()
    document.body.removeChild(input)
  })
}
