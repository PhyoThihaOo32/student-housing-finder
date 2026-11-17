import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import HousingChat from './HousingChat.jsx'
import { RequestDetails, Status } from './HousingDetails.jsx'
import { housingTypeLabel, intakeQuestions } from './housingLabels.js'

function activePlacement(requests) {
  return requests.find((record) => record.placement && !record.placement.endedAt)?.placement
}

export function BrowseHousing({ dashboard }) {
  const { user, requests, units } = dashboard
  const placement = activePlacement(requests)
  const pending = requests.find((record) => record.status === 'PENDING')

  return (
    <>
      <div className="page-heading">
        <h1>Browse housing</h1>
        <p className="muted">{user.student.campus.name} · Demo inventory</p>
      </div>
      {placement && <p className="notice">You have an active placement. <Link to="/requests">View your placement</Link></p>}
      {pending && <p className="notice">You have a pending request. Choose a unit to update it or <Link to="/requests">view its status</Link>.</p>}
      {units.length === 0 ? <p className="panel muted">No demo units are currently available at your campus.</p> :
        <div className="housing-grid">
          {units.map((unit) => (
            <article className="panel housing-card" key={unit.housingUnitId}>
              <div className="record-heading">
                <h2>{unit.buildingName} · {unit.unitLabel}</h2>
                <Status type="approved">Available</Status>
              </div>
              <p className="muted">{housingTypeLabel(unit.unitType)}</p>
              {!placement && (
                <Link className="action-link" to={`/housing/${unit.housingUnitId}/request`}>
                  {pending ? 'Update request' : 'Request this unit'}
                </Link>
              )}
            </article>
          ))}
        </div>}
      <HousingChat />
    </>
  )
}

function IntakeChat({ unit, pending, busy, change }) {
  const navigate = useNavigate()
  const sameUnit = pending?.requestedUnitId === unit.housingUnitId
  const [answers, setAnswers] = useState(() => Object.fromEntries(
    intakeQuestions.map(({ key }) => [key, sameUnit ? pending[key] ?? null : null]),
  ))
  const firstUnanswered = intakeQuestions.findIndex(({ key }) => answers[key] === null)
  const complete = firstUnanswered === -1
  const visibleQuestions = complete ? intakeQuestions : intakeQuestions.slice(0, firstUnanswered + 1)

  function submit(event) {
    event.preventDefault()
    if (!complete) return
    change(pending ? `/requests/${pending.requestId}` : '/requests', {
      method: pending ? 'PATCH' : 'POST',
      body: { requestedUnitId: unit.housingUnitId, ...answers },
    }, pending ? 'Your pending request was updated.' : 'Request submitted. Staff will review it.', () => navigate('/requests'))
  }

  return (
    <section className="panel intake-panel">
      <h2>Housing intake chat</h2>
      <p className="muted">Your answers will help staff review your request.</p>
      <form className="form-stack chat-form" onSubmit={submit}>
        {visibleQuestions.map(({ key, prompt, options }) => (
          <fieldset key={key}>
            <legend>{prompt}</legend>
            <div className="actions">
              {options.map(([value, label]) => (
                <button
                  type="button"
                  key={label}
                  className="secondary"
                  aria-pressed={answers[key] === value}
                  onClick={() => setAnswers((current) => ({ ...current, [key]: value }))}
                >{label}</button>
              ))}
            </div>
          </fieldset>
        ))}
        <div>
          <button type="submit" className="primary" disabled={busy || !complete}>
            {pending ? 'Save request' : 'Submit for review'}
          </button>
        </div>
      </form>
    </section>
  )
}

export function HousingApplication({ dashboard, busy, change }) {
  const { unitId } = useParams()
  const unit = dashboard.units.find((item) => item.housingUnitId === Number(unitId))
  const pending = dashboard.requests.find((record) => record.status === 'PENDING')
  const placement = activePlacement(dashboard.requests)

  return (
    <>
      <Link className="back-link" to="/housing">Back to available housing</Link>
      {!unit || placement ? (
        <div className="panel">
          <h1>{placement ? 'You have an active placement' : 'This unit is unavailable'}</h1>
          <p className="muted">{placement ? 'You can request housing again when your placement ends.' : 'Return to Browse housing to choose an available unit.'}</p>
        </div>
      ) : (
        <>
          <div className="page-heading">
            <h1>{unit.buildingName} · {unit.unitLabel}</h1>
            <p className="muted">{dashboard.user.student.campus.name} · {housingTypeLabel(unit.unitType)}</p>
          </div>
          <IntakeChat key={unit.housingUnitId} unit={unit} pending={pending} busy={busy} change={change} />
        </>
      )}
    </>
  )
}

export function MyRequests({ dashboard, busy, change }) {
  return (
    <>
      <div className="page-heading">
        <h1>My requests</h1>
        <p className="muted">Track decisions, assignments, and completed stays.</p>
      </div>
      {dashboard.requests.length === 0 ? (
        <div className="panel">
          <p className="muted">Your housing requests will appear here after you apply.</p>
          <Link className="action-link primary" to="/housing">Browse housing</Link>
        </div>
      ) : (
        <div className="record-list">
          {dashboard.requests.map((record) => (
            <article className="panel" key={record.requestId}>
              <RequestDetails record={record} />
              {record.status === 'PENDING' && (
                <div className="actions">
                  <Link className="action-link secondary" to={record.requestedUnitId ? `/housing/${record.requestedUnitId}/request` : '/housing'}>Edit request</Link>
                  <button type="button" className="text-button" disabled={busy} onClick={() => {
                    if (window.confirm('Withdraw this pending housing request?')) {
                      change(`/requests/${record.requestId}`, { method: 'DELETE' })
                    }
                  }}>Withdraw</button>
                </div>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  )
}
