import { useCallback, useRef, useState, type DragEvent, type ReactNode } from 'react'

interface Props {
  onFile: (file: File) => void
  accept?: string
  children?: ReactNode
  busy?: boolean
}

export function DropZone({ onFile, accept = '.csv,text/csv', children, busy }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const take = useCallback(
    (file: File | undefined) => {
      if (!file) return
      if (!file.name.toLowerCase().endsWith('.csv') && file.type && !file.type.includes('csv')) {
        // still allow — VersaTuner sometimes has odd MIME
      }
      onFile(file)
    },
    [onFile],
  )

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setOver(false)
    take(e.dataTransfer.files?.[0])
  }

  return (
    <div
      className={`dropzone ${over ? 'over' : ''} ${busy ? 'busy' : ''}`}
      onDragEnter={(e) => {
        e.preventDefault()
        setOver(true)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDragLeave={() => setOver(false)}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click()
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        hidden
        onChange={(e) => take(e.target.files?.[0])}
      />
      {children ?? (
        <>
          <strong>Drop VersaTuner CSV</strong>
          <span>or click to browse</span>
        </>
      )}
    </div>
  )
}
