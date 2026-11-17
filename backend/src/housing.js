import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { Sequelize } from 'sequelize'
import { housingChatReply } from './housingChat.js'
import { HttpError, positiveId, requiredText } from './http.js'
import { intakeInput, summarizeIntake } from './intake.js'
import { Campus, HousingPlacement, HousingRequest, HousingUnit, Student, sequelize } from './models.js'
import { requireRole, requireSession } from './session.js'

const unitTypes = ['SINGLE_ROOM', 'SHARED_ROOM_BED']
const studentFields = ['studentId', 'firstName', 'lastName', 'campusId']
const studentOnly = requireRole('student')
const staffOnly = requireRole('staff')
const limitIntake = rateLimit({
  windowMs: 60_000,
  limit: 15,
  message: { error: 'Too many intake submissions. Try again in a minute.' },
})
const limitChat = rateLimit({
  windowMs: 60_000,
  limit: 12,
  keyGenerator: (request) => String(request.identity.studentId),
  message: { error: 'Too many chat messages. Try again in a minute.' },
})

function unitType(value) {
  if (!unitTypes.includes(value)) throw new HttpError(400, 'Choose a valid housing type.')
  return value
}

async function lockStudent(studentId, transaction) {
  const student = await Student.findByPk(studentId, { transaction, lock: true })
  if (!student) throw new HttpError(404, 'Student record not found.')
  return student
}

async function pendingRequest(requestId, studentId, transaction) {
  const record = await HousingRequest.findByPk(requestId, { transaction, lock: true })
  if (!record || record.studentId !== studentId) throw new HttpError(404, 'Request not found.')
  if (record.status !== 'PENDING') throw new HttpError(409, 'This request has already been reviewed.')
  return record
}

async function ensureStudentHasNoPlacement(studentId, transaction) {
  const placement = await HousingPlacement.findOne({
    where: { endedAt: null },
    include: { association: 'request', attributes: [], where: { studentId } },
    transaction,
  })
  if (placement) throw new HttpError(409, 'The student already has an active placement.')
}

async function lockHousingUnit(housingUnitId, transaction) {
  const unit = await HousingUnit.findByPk(housingUnitId, { transaction, lock: true })
  if (!unit) throw new HttpError(404, 'Housing unit not found.')
  return unit
}

function hasActivePlacement(housingUnitId, transaction) {
  return HousingPlacement.findOne({ where: { housingUnitId, endedAt: null }, transaction })
}

async function availableUnit(student, housingUnitId, transaction) {
  const unit = await lockHousingUnit(housingUnitId, transaction)
  if (unit.campusId !== student.campusId) throw new HttpError(409, 'Choose a unit at the student’s campus.')
  if (!unit.isActive || await hasActivePlacement(housingUnitId, transaction)) {
    throw new HttpError(409, 'That unit is no longer available.')
  }
  return unit
}

async function saveIntakeSummary(requestId, intake) {
  const intakeSummary = await summarizeIntake(intake)
  if (!intakeSummary) return

  try {
    await HousingRequest.update({ intakeSummary }, {
      where: { requestId, ...intake, status: 'PENDING' },
    })
  } catch {
    // The saved answers can still be reviewed if the optional summary cannot be stored.
    console.error('Could not save the housing intake summary.')
  }
}

async function unitInput(body) {
  const campusId = positiveId(body?.campusId, 'Campus')
  const buildingName = requiredText(body?.buildingName, 'Building name', 120)
  const unitLabel = requiredText(body?.unitLabel, 'Room or bed label', 40)
  const type = unitType(body?.unitType)
  const isActive = body?.isActive ?? true
  if (typeof isActive !== 'boolean') throw new HttpError(400, 'Choose an inventory status.')
  if (!await Campus.findByPk(campusId)) throw new HttpError(400, 'Choose an existing campus.')
  return { campusId, buildingName, unitLabel, unitType: type, isActive }
}

async function listUnits(student) {
  const units = await HousingUnit.findAll({
    where: student ? { campusId: student.campusId, isActive: true } : undefined,
    include: [
      {
        association: 'placements',
        attributes: ['requestId', 'endedAt'],
        where: student ? { endedAt: null } : undefined,
        separate: true,
      },
      ...(student ? [] : [
        { association: 'campus' },
        { association: 'incomingRequests', attributes: ['requestId'], separate: true },
      ]),
    ],
    order: [['buildingName', 'ASC'], ['unitLabel', 'ASC']],
  })
  const inventory = units.map((record) => {
    const { placements, incomingRequests, ...unit } = record.get({ plain: true })
    const occupied = placements.some((placement) => placement.endedAt === null)
    return { ...unit, occupied, available: unit.isActive && !occupied, hasHistory: placements.length > 0 || !!incomingRequests?.length }
  })
  if (!student) return inventory
  return inventory.filter((unit) => unit.available).map(({ housingUnitId, buildingName, unitLabel, unitType }) => (
    { housingUnitId, buildingName, unitLabel, unitType }
  ))
}

export const housingRoutes = Router()
housingRoutes.use(requireSession)

housingRoutes.get('/dashboard', async (request, response) => {
  const isStudent = request.identity.role === 'student'
  const student = isStudent ? await Student.findByPk(request.identity.studentId, {
    attributes: studentFields,
    include: { association: 'campus' },
  }) : null
  if (isStudent && !student) throw new HttpError(401, 'Your student record is unavailable.')

  const [requests, units, campuses] = await Promise.all([
    HousingRequest.findAll({
      where: student ? { studentId: student.studentId } : undefined,
      attributes: isStudent ? { exclude: ['intakeSummary'] } : undefined,
      include: [
        { association: 'requestedUnit' },
        { association: 'placement', include: { association: 'unit', include: { association: 'campus' } } },
        ...(!isStudent ? [{ association: 'student', attributes: studentFields, include: { association: 'campus' } }] : []),
      ],
      order: [['submittedAt', 'DESC'], ['requestId', 'DESC']],
    }),
    listUnits(student),
    isStudent ? [] : Campus.findAll({ order: [['name', 'ASC']] }),
  ])
  response.json({ user: { role: request.identity.role, student }, requests, units, campuses })
})

housingRoutes.post('/housing/chat', studentOnly, limitChat, async (request, response) => {
  const question = requiredText(request.body?.question, 'Question', 500)
  const student = await Student.findByPk(request.identity.studentId, {
    attributes: ['campusId'],
    include: { association: 'campus', attributes: ['name'] },
  })
  if (!student) throw new HttpError(401, 'Your student record is unavailable.')

  const units = await listUnits(student)
  const reply = await housingChatReply(question, student.campus.name, units)
  response.json({ reply })
})

housingRoutes.post('/requests', studentOnly, limitIntake, async (request, response) => {
  const intake = intakeInput(request.body)
  const studentId = request.identity.studentId
  const record = await sequelize.transaction(async (transaction) => {
    const student = await lockStudent(studentId, transaction)
    await ensureStudentHasNoPlacement(studentId, transaction)
    await availableUnit(student, intake.requestedUnitId, transaction)
    return HousingRequest.create({ studentId, ...intake }, { transaction })
  })
  await saveIntakeSummary(record.requestId, intake)
  response.status(201).json(record)
})

housingRoutes.patch('/requests/:id', studentOnly, limitIntake, async (request, response) => {
  const requestId = positiveId(request.params.id)
  const intake = intakeInput(request.body)
  await sequelize.transaction(async (transaction) => {
    const student = await lockStudent(request.identity.studentId, transaction)
    const pending = await pendingRequest(requestId, student.studentId, transaction)
    await availableUnit(student, intake.requestedUnitId, transaction)
    await pending.update({ ...intake, preferredUnitType: null, intakeSummary: null }, { transaction })
  })
  await saveIntakeSummary(requestId, intake)
  response.sendStatus(204)
})

housingRoutes.delete('/requests/:id', studentOnly, async (request, response) => {
  const requestId = positiveId(request.params.id)
  await sequelize.transaction(async (transaction) => {
    const record = await pendingRequest(requestId, request.identity.studentId, transaction)
    await record.destroy({ transaction })
  })
  response.sendStatus(204)
})

housingRoutes.post('/requests/:id/decision', staffOnly, async (request, response) => {
  const requestId = positiveId(request.params.id)
  const status = request.body?.status
  if (status !== 'APPROVED' && status !== 'DENIED') throw new HttpError(400, 'Choose approve or deny.')
  const denialReason = status === 'DENIED' ? requiredText(request.body?.denialReason, 'Denial reason', 500) : null

  await sequelize.transaction(async (transaction) => {
    const candidate = await HousingRequest.findByPk(requestId, { transaction })
    if (!candidate) throw new HttpError(404, 'Request not found.')
    const student = await lockStudent(candidate.studentId, transaction)
    const record = await pendingRequest(requestId, student.studentId, transaction)

    if (status === 'APPROVED') {
      await ensureStudentHasNoPlacement(student.studentId, transaction)
      const housingUnitId = record.requestedUnitId ?? positiveId(request.body?.housingUnitId, 'Housing unit')
      await availableUnit(student, housingUnitId, transaction)
      await HousingPlacement.create({ requestId, housingUnitId }, { transaction })
    }

    await record.update({ status, decidedAt: Sequelize.literal('clock_timestamp()'), denialReason }, { transaction })
  })
  response.sendStatus(204)
})

housingRoutes.post('/placements/:id/:action', staffOnly, async (request, response) => {
  const requestId = positiveId(request.params.id)
  const action = request.params.action
  if (!['check-in', 'end'].includes(action)) throw new HttpError(404, 'Placement action not found.')

  await sequelize.transaction(async (transaction) => {
    const placement = await HousingPlacement.findByPk(requestId, { transaction, lock: true })
    if (!placement) throw new HttpError(404, 'Placement not found.')
    if (placement.endedAt) throw new HttpError(409, 'This placement has already ended.')
    if (action === 'check-in' && placement.checkedInAt) throw new HttpError(409, 'The student is already checked in.')

    const timeField = action === 'check-in' ? 'checkedInAt' : 'endedAt'
    await placement.update({ [timeField]: Sequelize.literal('clock_timestamp()') }, { transaction })
  })
  response.sendStatus(204)
})

housingRoutes.post('/units', staffOnly, async (request, response) => {
  const unit = await HousingUnit.create(await unitInput(request.body))
  response.status(201).json(unit)
})

housingRoutes.patch('/units/:id', staffOnly, async (request, response) => {
  const housingUnitId = positiveId(request.params.id)
  const values = await unitInput(request.body)
  await sequelize.transaction(async (transaction) => {
    const unit = await lockHousingUnit(housingUnitId, transaction)
    if (!values.isActive && await hasActivePlacement(housingUnitId, transaction)) {
      throw new HttpError(409, 'End the active placement before retiring this unit.')
    }
    const detailsChanged = ['campusId', 'buildingName', 'unitLabel', 'unitType'].some((key) => values[key] !== unit[key])
    if (detailsChanged && (await HousingPlacement.findOne({ where: { housingUnitId }, transaction }) ||
        await HousingRequest.findOne({ where: { requestedUnitId: housingUnitId }, transaction }))) {
      throw new HttpError(409, 'Unit details are preserved once the unit appears in a request or placement.')
    }
    await unit.update(values, { transaction })
  })
  response.sendStatus(204)
})

housingRoutes.delete('/units/:id', staffOnly, async (request, response) => {
  const housingUnitId = positiveId(request.params.id)
  const deleted = await HousingUnit.destroy({ where: { housingUnitId } })
  if (!deleted) throw new HttpError(404, 'Housing unit not found.')
  response.sendStatus(204)
})
