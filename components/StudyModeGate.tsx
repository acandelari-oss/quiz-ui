import { useEffect, useRef } from "react"

type Props = {
  open: boolean
  activity: string
  modules: Array<{ id: string; name: string; taxonomy_status?: string }>
  moduleId: string
  onModuleChange: (id: string) => void
  busy: boolean
  error: string
  onClose: () => void
  onUpload: () => void
  onReview: () => void
  onEnter: () => void
}

export default function StudyModeGate(props: Props) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (props.open && !dialog.current?.open) dialog.current?.showModal()
    if (!props.open && dialog.current?.open) dialog.current?.close()
  }, [props.open])

  return (
    <dialog ref={dialog} aria-labelledby="study-gate-title" onCancel={event => {
      event.preventDefault()
      if (!props.busy) props.onClose()
    }}>
      <button className="close" aria-label="Close" disabled={props.busy} onClick={props.onClose}>×</button>
      <h2 id="study-gate-title">Start studying this module?</h2>
      <p>Entering Study Mode locks this module’s files and topic structure and enables progress tracking. You can always add new modules to this project later, each with its own topic structure.</p>
      {props.modules.length > 0 && (
        <label style={{ display: "block", margin: "18px 0" }}>
          Module to approve
          <select value={props.moduleId} disabled={props.busy} onChange={event => props.onModuleChange(event.target.value)} style={{ display: "block", width: "100%", marginTop: 8, padding: 12, background: "#243047", color: "white", borderRadius: 8 }}>
            <option value="" disabled>Choose a module</option>
            {props.modules.map(module => <option key={module.id} value={module.id}>{module.name}</option>)}
          </select>
        </label>
      )}
      <p>Other modules stay unchanged. You can study approved modules while continuing to build the others.</p>
      <p>You can start now, upload another file, or review your topics first.</p>
      {props.error && <p role="alert" className="error">{props.error}</p>}
      <div className="actions">
        <button disabled={props.busy} onClick={props.onUpload}>Upload another file</button>
        <button disabled={props.busy} onClick={props.onReview}>Review topics</button>
        <button className="primary" disabled={props.busy || (props.modules.length > 0 && !props.moduleId)} onClick={props.onEnter}>
          {props.busy ? "Entering Study Mode…" : `Enter Study Mode & start ${props.activity}`}
        </button>
      </div>
      <style jsx>{`
        dialog { box-sizing: border-box; width: min(600px, calc(100vw - 32px)); max-height: calc(100dvh - 32px); overflow-y: auto; padding: 28px; border: 1px solid #475569; border-radius: 20px; background: #111827; color: white; }
        dialog::backdrop { background: rgba(2, 6, 23, 0.78); }
        h2 { margin: 0 32px 16px 0; }
        p { color: #cbd5e1; line-height: 1.6; }
        .close { position: absolute; top: 12px; right: 12px; background: transparent; font-size: 24px; padding: 4px 10px; }
        .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 24px; }
        .actions button { flex: 1 1 180px; min-height: 48px; white-space: normal; background: #243047; }
        .actions .primary { flex-basis: 100%; background: linear-gradient(135deg, #7c3aed, #2563eb); }
        button:disabled { opacity: 0.6; cursor: wait; }
        .error { color: #fca5a5; }
      `}</style>
    </dialog>
  )
}
