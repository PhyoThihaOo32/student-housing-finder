import { housingTypeLabel, housingTypes, intakeQuestions } from './housingLabels.js'

const dateFormat = new Intl.DateTimeFormat('en-US', {
  dateStyle: 'medium',
  timeZone: 'America/New_York',
})

export function HousingTypeSelect({ name, value }) {
  return (
    <select name={name} defaultValue={value} required>
      {housingTypes.map(([type, label]) => <option key={type} value={type}>{label}</option>)}
    </select>
  )
}

function formatDate(value) {
  return dateFormat.format(new Date(value))
}

export function Status({ children, type = 'neutral' }) {
  return <span className={`status status-${type}`}>{children}</span>
}

export function RequestDetails({ record }) {
  const placement = record.placement
  const status = { PENDING: 'Pending', APPROVED: 'Approved', DENIED: 'Denied' }[record.status]
  return (
    <>
      <div className="record-heading">
        <div>
          <h3>{record.student ? `${record.student.firstName} ${record.student.lastName}` : `Request #${record.requestId}`}</h3>
          <p className="muted detail">
            {record.student && `${record.student.campus.name} · Request #${record.requestId} · `}
            Submitted {formatDate(record.submittedAt)}
          </p>
        </div>
        <Status type={record.status.toLowerCase()}>{status}</Status>
      </div>
      <dl className="record-details">
        {record.requestedUnit ? (
          <>
            <div><dt>Requested unit</dt><dd>{record.requestedUnit.buildingName} · {record.requestedUnit.unitLabel}</dd></div>
            {intakeQuestions.map(({ key, summaryLabel, options }) => {
              const answer = options.find(([value]) => value === record[key])
              return answer && <div key={key}><dt>{summaryLabel}</dt><dd>{answer[1]}</dd></div>
            })}
            {record.student && record.intakeSummary && <div><dt>AI-assisted summary</dt><dd>{record.intakeSummary}</dd></div>}
          </>
        ) : <div><dt>Preference</dt><dd>{housingTypeLabel(record.preferredUnitType)}</dd></div>}
        {record.decidedAt && <div><dt>Decision date</dt><dd>{formatDate(record.decidedAt)}</dd></div>}
        {record.denialReason && <div><dt>Denial reason</dt><dd>{record.denialReason}</dd></div>}
        {placement && (
          <>
            <div><dt>Assignment</dt><dd>{placement.unit.buildingName} · {placement.unit.unitLabel}</dd></div>
            <div><dt>Placement status</dt><dd>{placement.endedAt
              ? placement.checkedInAt ? 'Checked out' : 'Released before check-in'
              : placement.checkedInAt ? 'Checked in' : 'Reserved'}</dd></div>
            {placement.checkedInAt && <div><dt>Check-in</dt><dd>{formatDate(placement.checkedInAt)}</dd></div>}
            {placement.endedAt && <div><dt>{placement.checkedInAt ? 'Check-out' : 'Released'}</dt><dd>{formatDate(placement.endedAt)}</dd></div>}
          </>
        )}
      </dl>
    </>
  )
}
