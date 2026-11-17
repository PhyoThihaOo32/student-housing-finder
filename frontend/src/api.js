export async function api(path, { method = 'GET', body, signal } = {}) {
  const response = await fetch(`/api${path}`, {
    method,
    signal,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  if (response.status === 204) return null

  const data = await response.json().catch(() => null)
  if (!response.ok || !data) {
    const error = new Error(data?.error ?? 'The API is unavailable. Try again in a moment.')
    error.status = response.status
    throw error
  }
  return data
}
