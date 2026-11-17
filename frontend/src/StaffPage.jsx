import { useState } from 'react'
import { HousingTypeSelect, RequestDetails, Status } from './HousingDetails.jsx'
import { housingTypeLabel } from './housingLabels.js'

function ReviewForm({ record, units, busy, change, close }) {
  const [decision, setDecision] = useState('APPROVED')
  const options = units.filter((unit) => unit.campusId === record.student.campusId && unit.available)
  const approving = decision === 'APPROVED'
  const requested = record.requestedUnit
  const canApprove = requested ? options.some((unit) => unit.housingUnitId === requested.housingUnitId) : options.length > 0

  function submit(event) {
    event.preventDefault()
    const values = Object.fromEntries(new FormData(event.currentTarget))
    change(`/requests/${record.requestId}/decision`, {
      method: 'POST',
      body: { ...values, status: decision },
    }, approving ? 'Request approved and housing reserved.' : 'Request denied.', close)
  }

  return (
    <form className="form-stack inset" onSubmit={submit}>
      <label>Decision
        <select value={decision} onChange={(event) => setDecision(event.target.value)}>
          <option value="APPROVED">Approve and reserve housing</option>
          <option value="DENIED">Deny request</option>
        </select>
      </label>
      {approving ? (
        requested ? <p className="muted">{canApprove
          ? `Approval will reserve ${requested.buildingName}, ${requested.unitLabel}.`
          : 'The requested unit is currently unavailable.'}</p> : <label>Available unit
          <select name="housingUnitId" required defaultValue="">
            <option value="" disabled>{options.length ? 'Choose a room or bed' : 'No available units at this campus'}</option>
            {options.map((unit) => <option key={unit.housingUnitId} value={unit.housingUnitId}>
              {unit.buildingName} · {unit.unitLabel} ({housingTypeLabel(unit.unitType)})
            </option>)}
          </select>
        </label>
      ) : (
        <label>Denial reason
          <textarea name="denialReason" rows={3} required maxLength={500} />
        </label>
      )}
      <div className="actions">
        <button className="primary" disabled={busy || (approving && !canApprove)}>
          {approving ? 'Approve request' : 'Confirm denial'}
        </button>
        <button type="button" className="secondary" onClick={close}>Cancel</button>
      </div>
    </form>
  )
}

function RequestQueue({ requests, units, busy, change }) {
  const [reviewing, setReviewing] = useState(null)
  const [filter, setFilter] = useState('pending')
  const pending = requests.filter((record) => record.status === 'PENDING')
  const active = requests.filter((record) => record.placement && !record.placement.endedAt)
  const records = { pending, active, history: requests }[filter]
  const filters = [['pending', `Pending (${pending.length})`], ['active', `Active placements (${active.length})`], ['history', 'All requests']]

  return (
    <section aria-label="Housing requests">
      <div className="section-bar">
        <h2>Review queue</h2>
        <div className="segments" role="group" aria-label="Filter requests">
          {filters.map(([value, label]) => (
            <button type="button" key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>{label}</button>
          ))}
        </div>
      </div>
      {records.length === 0 ? <p className="panel muted">There are no requests in this view.</p> :
        <div className="record-list">
          {records.map((record) => (
            <article className="panel" key={record.requestId}>
              <RequestDetails record={record} />
              {record.status === 'PENDING' && (reviewing === record.requestId
                ? <ReviewForm record={record} units={units} busy={busy} change={change} close={() => setReviewing(null)} />
                : <button className="secondary" disabled={busy} onClick={() => setReviewing(record.requestId)}>Review request</button>)}
              {record.placement && !record.placement.endedAt && (
                <div className="actions">
                  {!record.placement.checkedInAt && (
                    <button className="primary" disabled={busy} onClick={() => change(
                      `/placements/${record.requestId}/check-in`, { method: 'POST' }, 'Check-in recorded.',
                    )}>Check in</button>
                  )}
                  <button className="secondary" disabled={busy} onClick={() => {
                    if (window.confirm('End this placement and release the unit?')) {
                      change(`/placements/${record.requestId}/end`, { method: 'POST' }, 'Placement ended.')
                    }
                  }}>{record.placement.checkedInAt ? 'Check out' : 'Release reservation'}</button>
                </div>
              )}
            </article>
          ))}
        </div>}
    </section>
  )
}

function UnitEditor({ unit, campuses, busy, change, close }) {
  function submit(event) {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const body = {
      campusId: Number(values.get('campusId') ?? unit?.campusId),
      buildingName: values.get('buildingName') ?? unit?.buildingName,
      unitLabel: values.get('unitLabel') ?? unit?.unitLabel,
      unitType: values.get('unitType') ?? unit?.unitType,
      isActive: values.get('isActive') === 'on',
    }
    change(unit ? `/units/${unit.housingUnitId}` : '/units', { method: unit ? 'PATCH' : 'POST', body },
      unit ? 'Housing unit updated.' : 'Housing unit added.', close)
  }

  return (
    <section className="panel unit-editor">
      <h2>{unit ? 'Edit housing unit' : 'Add housing unit'}</h2>
      {unit?.hasHistory && <p className="muted">Requests or placements reference this unit. You can change its inventory status.</p>}
      <form className="form-stack" onSubmit={submit}>
        <fieldset className="form-grid" disabled={unit?.hasHistory}>
          <label>CUNY campus
            <select name="campusId" required defaultValue={unit?.campusId ?? ''}>
              <option value="" disabled>Choose a CUNY campus</option>
              {campuses.map((campus) => <option value={campus.campusId} key={campus.campusId}>{campus.name}</option>)}
            </select>
          </label>
          <label>Building name<input name="buildingName" defaultValue={unit?.buildingName} maxLength={120} required /></label>
          <label>Room or bed label<input name="unitLabel" defaultValue={unit?.unitLabel} maxLength={40} required /></label>
          <label>Housing type<HousingTypeSelect name="unitType" value={unit?.unitType ?? 'SINGLE_ROOM'} /></label>
        </fieldset>
        <label className="checkbox"><input type="checkbox" name="isActive" defaultChecked={unit?.isActive ?? true} /> Active inventory</label>
        <div className="actions">
          <button className="primary" disabled={busy}>{unit ? 'Save changes' : 'Add unit'}</button>
          <button className="secondary" type="button" onClick={close}>Cancel</button>
        </div>
      </form>
    </section>
  )
}

function Inventory({ units, campuses, busy, change }) {
  const [editing, setEditing] = useState(null)
  const unit = units.find((candidate) => candidate.housingUnitId === editing)
  return (
    <>
      <div className="section-bar">
        <h2>Housing units</h2>
        <button className="primary" disabled={busy} onClick={() => setEditing('new')}>Add housing unit</button>
      </div>
      {editing !== null && <UnitEditor key={editing} unit={unit} campuses={campuses} busy={busy} change={change} close={() => setEditing(null)} />}
      {units.length === 0 ? <p className="panel muted">No housing units have been added.</p> :
        <div className="table-wrap">
          <table>
            <thead><tr><th scope="col">Unit</th><th scope="col">CUNY campus</th><th scope="col">Type</th><th scope="col">Status</th><th scope="col">Actions</th></tr></thead>
            <tbody>{units.map((item) => (
              <tr key={item.housingUnitId}>
                <th scope="row">{item.buildingName} · {item.unitLabel}</th>
                <td>{item.campus.name}</td>
                <td>{housingTypeLabel(item.unitType)}</td>
                <td><Status type={item.available ? 'approved' : 'neutral'}>{item.available ? 'Available' : item.occupied ? 'Assigned' : 'Retired'}</Status></td>
                <td><div className="actions">
                  <button className="secondary" disabled={busy} onClick={() => setEditing(item.housingUnitId)}>Edit</button>
                  {!item.hasHistory && <button className="text-button" disabled={busy} onClick={() => {
                    if (window.confirm(`Delete ${item.buildingName}, ${item.unitLabel}?`)) {
                      change(`/units/${item.housingUnitId}`, { method: 'DELETE' }, 'Housing unit deleted.',
                        () => { if (editing === item.housingUnitId) setEditing(null) })
                    }
                  }}>Delete</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>}
    </>
  )
}

export default function StaffPage({ dashboard, busy, change, section }) {
  const { requests, units, campuses } = dashboard

  return (
    <>
      <div className="page-heading">
        <h1>{section === 'requests' ? 'Review housing requests' : 'Manage housing units'}</h1>
        <p className="muted">{section === 'requests' ? 'Review student intake answers, make decisions, and record stays.' : 'Manage demo rooms and beds by CUNY campus.'}</p>
      </div>
      {section === 'requests' ? <RequestQueue requests={requests} units={units} busy={busy} change={change} />
        : <Inventory units={units} campuses={campuses} busy={busy} change={change} />}
    </>
  )
}
