// "Use my own AI key": the researcher's API key stays in THIS browser tab (sessionStorage,
// cleared when the tab is closed) and requests go straight from the browser to the provider
// they chose. The key is never sent to the wizard server and never saved in the wizard JSON.
import { useSyncExternalStore } from 'react'

export const PROVIDERS = {
  anthropic: { label: 'Anthropic (Claude)', model: 'claude-sonnet-5-5', keyHint: 'sk-ant-…' },
  openai:    { label: 'OpenAI',             model: 'gpt-4o',            keyHint: 'sk-…' },
  // Any provider with an OpenAI-compatible "chat/completions" API works through the same code path.
  mistral:   { label: 'Mistral',            model: 'mistral-large-latest', keyHint: 'your Mistral API key', baseUrl: 'https://api.mistral.ai/v1', compatible: true },
  compatible:{ label: 'Other (OpenAI-compatible API)', model: '', keyHint: 'your API key', baseUrl: '', compatible: true, custom: true },
}

const STORAGE_KEY = 'mw_ai_settings'
let memory = null
const listeners = new Set()

function read() {
  if (memory) return memory
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (raw) memory = JSON.parse(raw)
  } catch { /* storage unavailable */ }
  return memory
}
function emit() { listeners.forEach(l => l()) }

export function getAiSettings() { return read() }
export function setAiSettings(settings) {
  memory = settings
  try { settings ? sessionStorage.setItem(STORAGE_KEY, JSON.stringify(settings)) : sessionStorage.removeItem(STORAGE_KEY) } catch { /* ignore */ }
  emit()
}
export function useAiSettings() {
  return useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    read,
  )
}

const ONE_SHOT = `\n\n---\nThis is a single request, not a chat: do NOT ask me questions. Write the best draft you can from the facts above and put [TO COMPLETE: what is missing] where information is missing. Reply with the section text only.`

// attachments: [{ name, base64 }] PDF files sent to the provider together with the prompt.
export async function askAi(prompt, settings, { fetchImpl = fetch, timeoutMs = 120000, attachments = [] } = {}) {
  if (!settings?.key) throw new Error('No API key set.')
  const provider = PROVIDERS[settings.provider]
  if (!provider) throw new Error('Unknown AI provider.')
  const model = (settings.model || provider.model || '').trim()
  const baseUrl = ((provider.custom ? settings.baseUrl : provider.baseUrl) || '').trim().replace(/\/+$/, '')
  if (provider.compatible && !model) throw new Error('Please enter the model name for this provider.')
  if (provider.compatible && !/^https:\/\//.test(baseUrl)) throw new Error('Please enter the provider address (starting with https://).')
  if (provider.compatible && attachments.length) throw new Error('Reading an uploaded manuscript works with Anthropic and OpenAI keys. For this provider, remove the manuscript or paste the relevant text into the fields.')
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const text = prompt + ONE_SHOT
  try {
    let res
    if (settings.provider === 'anthropic') {
      res = await fetchImpl('https://api.anthropic.com/v1/messages', {
        method: 'POST', signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': settings.key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: 4096, messages: [{ role: 'user', content: attachments.length
          ? [...attachments.map(a => ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.base64 } })), { type: 'text', text }]
          : text }] }),
      })
    } else {
      res = await fetchImpl(`${provider.compatible ? baseUrl : 'https://api.openai.com/v1'}/chat/completions`, {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${settings.key}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: attachments.length
          ? [...attachments.map(a => ({ type: 'file', file: { filename: a.name, file_data: `data:application/pdf;base64,${a.base64}` } })), { type: 'text', text }]
          : text }] }),
      })
    }
    const body = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) throw new Error('The provider rejected the API key.')
      throw new Error(body?.error?.message || `The provider answered ${res.status}.`)
    }
    const out = settings.provider === 'anthropic'
      ? (body.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
      : body.choices?.[0]?.message?.content
    if (!out) throw new Error('The provider returned an empty answer.')
    return out.trim()
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('The request took too long. Please try again.')
    if (e instanceof TypeError) throw new Error('Could not reach the provider (network or browser restriction). You can still copy the prompt instead.')
    throw e
  } finally {
    clearTimeout(timer)
  }
}
