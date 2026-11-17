import { HttpError, positiveId } from './http.js'
import { openAiText } from './openai.js'

const questions = {
  moveInTimeframe: {
    label: 'Requested move-in timing',
    options: { WITHIN_WEEK: 'Within 7 days', WITHIN_MONTH: 'In 8–30 days', LATER: 'More than 30 days', UNSURE: 'Not sure yet' },
  },
  stayThroughMoveIn: {
    label: 'Has a place to stay until move-in',
    options: { YES: 'Yes', NO: 'No', UNSURE: 'I’m not sure', PREFER_NOT_TO_SAY: 'Prefer not to say' },
  },
  expectedStayLength: {
    label: 'Expected stay',
    options: {
      LESS_THAN_SEMESTER: 'Less than one semester',
      ONE_SEMESTER: 'One semester',
      MORE_THAN_SEMESTER: 'More than one semester',
      UNSURE: 'I’m not sure',
    },
  },
  openToAnotherUnit: {
    label: 'Would consider another unit on campus',
    options: { YES: 'Yes', NO: 'No', UNSURE: 'I’m not sure' },
  },
}

export function intakeInput(body) {
  const requestedUnitId = positiveId(body?.requestedUnitId, 'Housing unit')
  const { reportsEnrollment } = body
  if (typeof reportsEnrollment !== 'boolean') {
    throw new HttpError(400, 'Answer all five intake questions before submitting.')
  }
  const intake = { requestedUnitId, reportsEnrollment }
  for (const [field, { options }] of Object.entries(questions)) {
    const answer = body[field]
    if (typeof answer !== 'string' || !Object.hasOwn(options, answer)) {
      throw new HttpError(400, 'Answer all five intake questions before submitting.')
    }
    intake[field] = answer
  }
  return intake
}

export function summarizeIntake(intake) {
  const input = [
    `Self-reported enrollment at selected campus: ${intake.reportsEnrollment ? 'Yes' : 'No'}`,
    ...Object.entries(questions).map(([field, { label, options }]) => `${label}: ${options[intake[field]]}`),
  ].join('\n')
  return openAiText({
    instructions: 'Summarize the self-reported answers in plain language for campus housing staff. Preserve the stated details and uncertainty. Respect any answer the student declined to provide. Do not infer eligibility or urgency, recommend a decision, assign a priority, or add other facts. Use at most three short sentences.',
    input,
    maxCharacters: 600,
  })
}
