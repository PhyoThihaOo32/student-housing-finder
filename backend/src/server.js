import express from 'express'
import { ForeignKeyConstraintError, UniqueConstraintError, ValidationError } from 'sequelize'
import { housingRoutes } from './housing.js'
import { HttpError } from './http.js'
import { Campus, sequelize } from './models.js'
import { sessionRoutes } from './session.js'

const app = express()
const port = Number(process.env.PORT ?? 3000)
const host = process.env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'

app.disable('x-powered-by')
if (process.env.TRUST_PROXY_HOPS) app.set('trust proxy', Number(process.env.TRUST_PROXY_HOPS))
app.use('/api', (_request, response, next) => {
  response.set('Cache-Control', 'no-store')
  next()
})
app.use(express.json({ limit: '8kb' }))

app.get('/api/health', async (_request, response) => {
  try {
    await sequelize.authenticate()
  } catch {
    throw new HttpError(503, 'The database is unavailable.')
  }
  response.json({ status: 'ok' })
})

app.get('/api/campuses', async (_request, response) => {
  response.json(await Campus.findAll({ order: [['name', 'ASC']] }))
})
app.use('/api/session', sessionRoutes)
app.use('/api', housingRoutes)
app.use((_request, _response, next) => next(new HttpError(404, 'Endpoint not found.')))

const conflictMessages = {
  housing_request_one_pending: 'You already have a pending housing request.',
  housing_placement_one_active: 'That unit is no longer available.',
  housing_unit_location_unique: 'A unit already uses that label in this building.',
  student_email_unique: 'This email is already in use.',
}

app.use((error, _request, response, next) => {
  if (response.headersSent) return next(error)
  if (error instanceof HttpError) return response.status(error.status).json({ error: error.message })
  if (error instanceof UniqueConstraintError) {
    const message = conflictMessages[error.parent?.constraint] ?? 'This record conflicts with an existing record.'
    return response.status(409).json({ error: message })
  }
  if (error instanceof ForeignKeyConstraintError || error.parent?.code === '23001') {
    return response.status(409).json({ error: 'This record has related records. Preserve housing history by retiring used units.' })
  }
  if (error instanceof ValidationError || error.parent?.code === '23514') {
    return response.status(400).json({ error: 'The update violates a housing rule.' })
  }
  if (error.status === 400 || error.status === 413) {
    return response.status(error.status).json({ error: 'The request body is invalid.' })
  }
  console.error('API request failed', error.name, error.parent?.code)
  return response.status(500).json({ error: 'The server could not complete the request.' })
})

await Campus.count()
app.listen(port, host, () => {
  console.log(`Student Housing API listening on ${host}:${port}`)
})
