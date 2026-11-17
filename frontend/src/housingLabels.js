export const housingTypes = [
  ['SINGLE_ROOM', 'Single room'],
  ['SHARED_ROOM_BED', 'Bed in a shared room'],
]

export function housingTypeLabel(value) {
  return housingTypes.find(([type]) => type === value)?.[1] ?? 'No preference'
}

const yesNo = [['YES', 'Yes'], ['NO', 'No']]
const unsure = ['UNSURE', 'I’m not sure']

export const intakeQuestions = [
  {
    key: 'reportsEnrollment',
    prompt: 'Are you currently enrolled at this CUNY campus?',
    summaryLabel: 'Enrollment (self-reported)',
    options: [[true, 'Yes'], [false, 'No']],
  },
  {
    key: 'moveInTimeframe',
    prompt: 'How soon do you need to move in?',
    summaryLabel: 'Requested move-in',
    options: [
      ['WITHIN_WEEK', 'Within 7 days'],
      ['WITHIN_MONTH', 'In 8–30 days'],
      ['LATER', 'More than 30 days'],
      ['UNSURE', 'Not sure yet'],
    ],
  },
  {
    key: 'stayThroughMoveIn',
    prompt: 'Do you have a place to stay until you need to move in?',
    summaryLabel: 'Has a place to stay until move-in',
    options: [...yesNo, unsure, ['PREFER_NOT_TO_SAY', 'Prefer not to say']],
  },
  {
    key: 'expectedStayLength',
    prompt: 'How long do you expect to need housing?',
    summaryLabel: 'Expected stay',
    options: [
      ['LESS_THAN_SEMESTER', 'Less than one semester'],
      ['ONE_SEMESTER', 'One semester'],
      ['MORE_THAN_SEMESTER', 'More than one semester'],
      unsure,
    ],
  },
  {
    key: 'openToAnotherUnit',
    prompt: 'If this room or bed becomes unavailable, would you consider another one at your campus?',
    summaryLabel: 'Would consider another unit on campus',
    options: [...yesNo, unsure],
  },
]
