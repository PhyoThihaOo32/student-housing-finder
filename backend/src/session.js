import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { Router } from 'express'
import { rateLimit } from 'express-rate-limit'
import { SignJWT, jwtVerify } from 'jose'
import { Sequelize } from 'sequelize'
import { HttpError, positiveId, requiredText } from './http.js'
import { Campus, Student } from './models.js'

const derivePassword = promisify(scrypt)
const sessionName = 'student_housing_session'
const issuer = 'student-housing-email'
const duration = 8 * 60 * 60
const secret = process.env.SESSION_SECRET
const staffEmail = normalizeEmail(process.env.STAFF_EMAIL)
const staffPassword = process.env.STAFF_PASSWORD

if (!secret || secret.length < 32 || !staffEmail || !validPassword(staffPassword)) {
  throw new Error('Set SESSION_SECRET, STAFF_EMAIL, and STAFF_PASSWORD in backend/.env.')
}

const sessionKey = new TextEncoder().encode(secret)
const staffHash = await hashPassword(staffPassword)
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: process.env.NODE_ENV === 'production',
  path: '/api',
}

function normalizeEmail(input) {
  const email = typeof input === 'string' ? input.trim().toLowerCase() : ''
  return email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : ''
}

function validPassword(password) {
  return typeof password === 'string' && password.length >= 8 && password.length <= 128
}

async function hashPassword(password) {
  const salt = randomBytes(16)
  const hash = await derivePassword(password, salt, 64)
  return ['scrypt', salt.toString('hex'), hash.toString('hex')].join(':')
}

async function matchesPassword(password, encoded) {
  if (!encoded || !/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/.test(encoded)) return false
  const [, salt, expected] = encoded.split(':')
  const hash = await derivePassword(password, Buffer.from(salt, 'hex'), 64)
  return timingSafeEqual(hash, Buffer.from(expected, 'hex'))
}

async function startSession(response, identity) {
  const token = await new SignJWT(identity)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuer(issuer)
    .setIssuedAt()
    .setExpirationTime(`${duration}s`)
    .sign(sessionKey)

  response.cookie(sessionName, token, { ...cookieOptions, maxAge: duration * 1000 })
  response.sendStatus(204)
}

export const sessionRoutes = Router()
const limitSignIn = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 30,
  skipSuccessfulRequests: true,
  message: { error: 'Too many sign-in attempts. Try again in a few minutes.' },
})
const limitRegistration = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  message: { error: 'Too many registration attempts. Try again in a few minutes.' },
})

sessionRoutes.post('/', limitSignIn, async (request, response) => {
  const { email: input, password } = request.body ?? {}
  const email = normalizeEmail(input)
  if (!email || !validPassword(password)) throw new HttpError(401, 'Check your email and password.')

  if (email === staffEmail) {
    if (!await matchesPassword(password, staffHash)) throw new HttpError(401, 'Check your email and password.')
    return startSession(response, { role: 'staff' })
  }

  const student = await Student.findOne({
    attributes: ['studentId', 'passwordHash'],
    where: Sequelize.where(Sequelize.fn('lower', Sequelize.col('email')), email),
  })
  const passwordMatches = await matchesPassword(password, student?.passwordHash ?? staffHash)
  if (!student?.passwordHash || !passwordMatches) throw new HttpError(401, 'Check your email and password.')
  return startSession(response, { role: 'student', studentId: student.studentId })
})

sessionRoutes.post('/register', limitRegistration, async (request, response) => {
  const { firstName: givenName, lastName: familyName, campusId: selectedCampus, email: input, password } = request.body ?? {}
  const firstName = requiredText(givenName, 'First name', 80)
  const lastName = requiredText(familyName, 'Last name', 80)
  const campusId = positiveId(selectedCampus, 'Campus')
  const email = normalizeEmail(input)

  if (!email) throw new HttpError(400, 'Enter a valid email address.')
  if (email === staffEmail) throw new HttpError(409, 'This email is already in use.')
  if (!validPassword(password)) throw new HttpError(400, 'Use a password with 8–128 characters.')
  if (!await Campus.findByPk(campusId)) throw new HttpError(400, 'Choose a CUNY campus.')

  const student = await Student.create({
    firstName,
    lastName,
    campusId,
    email,
    studentNumber: randomUUID(),
    passwordHash: await hashPassword(password),
  })
  return startSession(response, { role: 'student', studentId: student.studentId })
})

sessionRoutes.delete('/', (_request, response) => {
  response.clearCookie(sessionName, cookieOptions)
  response.sendStatus(204)
})

export async function requireSession(request, _response, next) {
  const cookie = request.headers.cookie?.split(';')
    .map((entry) => entry.trim())
    .find((entry) => entry.startsWith(`${sessionName}=`))

  if (!cookie) throw new HttpError(401, 'Sign in to continue.')

  try {
    const { payload } = await jwtVerify(cookie.slice(sessionName.length + 1), sessionKey, {
      issuer,
      algorithms: ['HS256'],
    })
    request.identity = payload
  } catch {
    throw new HttpError(401, 'Your session expired. Sign in again.')
  }

  next()
}

export function requireRole(role) {
  return (request, _response, next) => {
    if (request.identity.role !== role) {
      throw new HttpError(403, 'This action is available to a different role.')
    }
    next()
  }
}
