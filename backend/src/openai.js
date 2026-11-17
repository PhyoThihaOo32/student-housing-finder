export async function openAiText({ instructions, input, maxCharacters }) {
  const { OPENAI_API_KEY: key, OPENAI_MODEL: model } = process.env
  if (!key || !model) return null

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model, instructions, input, max_output_tokens: 384, store: false }),
      signal: AbortSignal.timeout(6000),
    })
    if (!response.ok) return null

    const data = await response.json()
    if (data.status !== 'completed') return null
    const text = data.output?.filter((item) => item.type === 'message')
      .flatMap((item) => item.content)
      .filter((item) => item.type === 'output_text')
      .map((item) => item.text)
      .join(' ').trim()
    return text?.slice(0, maxCharacters) || null
  } catch {
    return null
  }
}
