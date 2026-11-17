import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

export default function HousingChat() {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')
  const [turns, setTurns] = useState([])
  const [pending, setPending] = useState('')
  const [error, setError] = useState('')
  const trigger = useRef(null)
  const input = useRef(null)
  const log = useRef(null)
  const activeRequest = useRef(null)

  useEffect(() => () => activeRequest.current?.abort(), [])
  useEffect(() => {
    if (open) input.current?.focus()
  }, [open])
  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [open, pending, turns])

  function close() {
    setOpen(false)
    trigger.current?.focus()
  }

  async function submit(event) {
    event.preventDefault()
    const question = draft.trim()
    if (!question || activeRequest.current) return

    const controller = new AbortController()
    activeRequest.current = controller
    setError('')
    setPending(question)
    setDraft('')
    try {
      const { reply } = await api('/housing/chat', { method: 'POST', body: { question }, signal: controller.signal })
      setTurns((current) => [...current, { question, reply }])
    } catch (failure) {
      if (controller.signal.aborted) return
      setError(failure.status === 401 ? 'Sign in again to use housing chat.' : failure.message)
      setDraft((current) => current || question)
    } finally {
      activeRequest.current = null
      if (!controller.signal.aborted) setPending('')
    }
  }

  return (
    <div className="housing-chat" onKeyDown={(event) => {
      if (open && event.key === 'Escape') close()
    }}>
      <button
        ref={trigger}
        type="button"
        className="primary chat-trigger"
        aria-label="Ask about housing"
        aria-expanded={open}
        aria-controls="housing-chat-panel"
        title="Ask about housing"
        onClick={() => setOpen(!open)}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M20.5 11.5a8.5 8.5 0 0 1-8.5 8.5 9 9 0 0 1-3.5-.7L4 20.5l1.2-4.1a8.5 8.5 0 1 1 15.3-4.9Z" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
          <circle cx="8.5" cy="11.5" r="1" fill="currentColor" />
          <circle cx="12" cy="11.5" r="1" fill="currentColor" />
          <circle cx="15.5" cy="11.5" r="1" fill="currentColor" />
        </svg>
      </button>
      <section id="housing-chat-panel" className="panel housing-chat-panel" aria-labelledby="housing-chat-title" hidden={!open}>
        <div className="record-heading">
          <h2 id="housing-chat-title">Housing chat</h2>
          <button type="button" className="secondary chat-close" aria-label="Close housing chat" onClick={close}>×</button>
        </div>
        <div ref={log} className="housing-chat-log" role="log" aria-label="Housing conversation" tabIndex={0}>
          <p className="chat-reply">Ask what’s available at your campus or how to request a room or bed.</p>
          {turns.map(({ question, reply }, index) => (
            <div className="chat-turn" key={index}>
              <p className="chat-question">{question}</p>
              <p className="chat-reply">{reply}</p>
            </div>
          ))}
          {pending && <p className="chat-question">{pending}</p>}
        </div>
        {pending && <p className="muted detail" role="status">Checking housing information…</p>}
        {error && <p className="chat-error detail" role="alert">{error}</p>}
        <form className="housing-chat-form" onSubmit={submit}>
          <input
            ref={input}
            aria-label="Ask a housing question"
            placeholder="What rooms are available?"
            maxLength={500}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <button type="submit" className="primary" disabled={!draft.trim() || !!pending}>Send</button>
        </form>
      </section>
    </div>
  )
}
