import { useCallback, useState } from 'react'

/**
 * React hook managing the FileSystemFileHandle lifecycle.
 * Tracks the current file handle and derived filename.
 */
export function useFileHandle() {
  const [fileHandle, setFileHandle] = useState<FileSystemFileHandle | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)

  const updateHandle = useCallback((handle: FileSystemFileHandle) => {
    setFileHandle(handle)
    setFileName(handle.name)
  }, [])

  const clearHandle = useCallback(() => {
    setFileHandle(null)
    setFileName(null)
  }, [])

  return {
    fileHandle,
    fileName,
    updateHandle,
    clearHandle,
  }
}
