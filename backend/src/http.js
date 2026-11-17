export class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

export function positiveId(value, label = 'ID') {
  const id = typeof value === 'number' || typeof value === 'string' ? Number(value) : NaN
  if (!Number.isInteger(id) || id < 1 || id > 2147483647) {
    throw new HttpError(400, `Enter a valid ${label.toLowerCase()}.`)
  }
  return id
}

export function requiredText(value, label, limit) {
  const text = typeof value === 'string' ? value.trim() : ''
  if (!text || text.length > limit) {
    throw new HttpError(400, `${label} must contain 1–${limit} characters.`)
  }
  return text
}
