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

const hostOf = (u) => { try { return new URL(u).host } catch { return String(u || '') } }

// A key that clearly belongs to another provider is the most common mistake.
function keyHint(providerId, key) {
  if (providerId === 'anthropic' && !/^sk-ant-/.test(key)) return 'This does not look like an Anthropic key (they start with "sk-ant-"). Did you choose the right provider?'
  if (providerId === 'openai' && /^sk-ant-/.test(key)) return 'This looks like an Anthropic key, but OpenAI is selected. Did you choose the right provider?'
  return ''
}

// Turns what the provider answered into a message that says what to check. Returns { message, fatal }.
// fatal = the same problem would repeat for every section (wrong key, model, address, no credit), so stop.
export function describeProviderFailure({ status, bodyText = '', body = {}, providerId, provider, model, endpoint, key = '', hasAttachments = false }) {
  const label = provider?.label || 'The provider'
  const raw = body?.error?.message || (typeof body?.error === 'string' ? body.error : '') || body?.message || ''
  const says = raw ? ` The provider says: "${String(raw).replace(/\s+/g, ' ').slice(0, 220)}"` : ''
  const where = hostOf(endpoint)
  const code = ` (HTTP ${status})`
  if (/^\s*</.test(bodyText) && !raw) {
    return { fatal: true, message: `${where} answered with a web page, not with an API answer${code}. The provider address is probably wrong: ${endpoint}` }
  }
  if (status === 401) {
    return { fatal: true, message: `${label} did not accept the API key${code}. ${keyHint(providerId, key) || 'Check that the key is copied completely (no spaces) and has not expired or been deleted.'}${provider?.compatible ? ` Also check the provider address: ${where}.` : ''}${says}` }
  }
  if (status === 403) {
    return { fatal: true, message: `${label} refused the request${code}: the key is not allowed to use this model or service, the account is not active, or the service is not available in your country or network. ${keyHint(providerId, key)}${says}`.replace(/\s+/g, ' ') }
  }
  if (status === 404) {
    return { fatal: true, message: `${label} could not find the model "${model}" at ${where}${code}. Check the model name; for other providers also check that the address ends the way the provider documents (often …/v1).${says}` }
  }
  if (status === 402) {
    return { fatal: true, message: `${label} says the account has no credit or needs payment${code}. Add credit or check the billing page of your account.${says}` }
  }
  if (status === 413) {
    return { fatal: true, message: `The request is too large for ${label}${code}. Remove the uploaded manuscript or use shorter text.` }
  }
  if (status === 429) {
    if (/quota|billing|credit|insufficient|exceeded your current/i.test(raw)) {
      return { fatal: true, message: `${label} says the quota or credit of this account is used up${code}. Check the plan and billing of your account.${says}` }
    }
    return { fatal: false, message: `${label} is limiting the number of requests${code}. Wait a minute and try again.${says}` }
  }
  if (status === 400) {
    if (/context|too long|too large|maximum|token limit|max_tokens|exceed/i.test(raw)) {
      return { fatal: true, message: `The request is too large for this model${code}. Remove the uploaded manuscript or use shorter text.${says}` }
    }
    if (hasAttachments && /pdf|file|document|media|content/i.test(raw)) {
      return { fatal: true, message: `This model does not accept the uploaded manuscript${code}. Remove the manuscript, or choose a model that can read PDF files.${says}` }
    }
    if (/model/i.test(raw)) {
      return { fatal: true, message: `${label} does not accept the model "${model}"${code}. Check the model name.${says}` }
    }
    return { fatal: false, message: `${label} rejected the request${code}.${says}` }
  }
  if (status >= 500) {
    return { fatal: false, message: `${label} is temporarily unavailable${code}. Try again in a few minutes.${says}` }
  }
  return { fatal: false, message: `${label} answered with an error${code}.${says}` }
}

// attachments: [{ name, base64 }] PDF files sent to the provider together with the prompt.
export async function askAi(prompt, settings, { fetchImpl = fetch, timeoutMs = 120000, attachments = [], maxTokens = 4096 } = {}) {
  const apiKey = String(settings?.key || '').trim()
  if (!apiKey) throw Object.assign(new Error('No API key set.'), { fatal: true })
  if (/[^\x21-\x7E]/.test(apiKey)) {
    throw Object.assign(new Error('The API key contains a space or a character that is not allowed (often a line break or a curly quote from copy-paste). Please paste it again.'), { fatal: true })
  }
  const provider = PROVIDERS[settings.provider]
  if (!provider) throw Object.assign(new Error('Unknown AI provider.'), { fatal: true })
  const model = (settings.model || provider.model || '').trim()
  const baseUrl = ((provider.custom ? settings.baseUrl : provider.baseUrl) || '').trim().replace(/\/+$/, '')
  if (provider.compatible && !model) throw Object.assign(new Error('Please enter the model name for this provider.'), { fatal: true })
  if (provider.compatible && !/^https:\/\//.test(baseUrl)) throw Object.assign(new Error('Please enter the provider address (starting with https://).'), { fatal: true })
  if (provider.compatible && attachments.length) throw Object.assign(new Error('Reading an uploaded manuscript works with Anthropic and OpenAI keys. For this provider, remove the manuscript or paste the relevant text into the fields.'), { fatal: true })
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  const text = prompt + ONE_SHOT
  let endpoint = ''
  try {
    let res
    if (settings.provider === 'anthropic') {
      endpoint = 'https://api.anthropic.com/v1/messages'
      res = await fetchImpl(endpoint, {
        method: 'POST', signal: controller.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({ model, max_tokens: maxTokens, messages: [{ role: 'user', content: attachments.length
          ? [...attachments.map(a => ({ type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: a.base64 } })), { type: 'text', text }]
          : text }] }),
      })
    } else {
      endpoint = `${provider.compatible ? baseUrl : 'https://api.openai.com/v1'}/chat/completions`
      res = await fetchImpl(endpoint, {
        method: 'POST', signal: controller.signal,
        headers: { 'content-type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: attachments.length
          ? [...attachments.map(a => ({ type: 'file', file: { filename: a.name, file_data: `data:application/pdf;base64,${a.base64}` } })), { type: 'text', text }]
          : text }] }),
      })
    }
    const bodyText = await res.text().catch(() => '')
    let body = {}
    try { body = bodyText ? JSON.parse(bodyText) : {} } catch { /* not JSON, for example a web page */ }
    if (!res.ok) {
      const { message, fatal } = describeProviderFailure({ status: res.status, bodyText, body, providerId: settings.provider, provider, model, endpoint, key: apiKey, hasAttachments: attachments.length > 0 })
      throw Object.assign(new Error(message), { fatal, status: res.status })
    }
    if (!bodyText || (bodyText.trim()[0] !== '{' && bodyText.trim()[0] !== '[')) {
      throw Object.assign(new Error(`${provider.label} answered, but not with an API answer. The provider address is probably wrong: ${endpoint}`), { fatal: true })
    }
    const out = settings.provider === 'anthropic'
      ? (body.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n')
      : body.choices?.[0]?.message?.content
    if (!out) throw new Error(`${provider.label} returned an empty answer. Try again, or check the model name "${model}".`)
    return out.trim()
  } catch (e) {
    if (e.name === 'AbortError') throw new Error(`${provider.label} did not answer within ${Math.round(timeoutMs / 1000)} seconds. Try again, or use a faster model.`)
    if (e instanceof TypeError) {
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false
      throw Object.assign(new Error(offline
        ? 'You seem to be offline. Check your internet connection or VPN and try again.'
        : `Could not reach ${provider.label} at ${hostOf(endpoint)}. Possible reasons: no internet or VPN, a wrong provider address, or the provider does not allow requests from web pages (a browser security rule that only the provider can change). You can still copy the prompt into the provider's own chat.`), { fatal: true })
    }
    throw e
  } finally {
    clearTimeout(timer)
  }
}

// Sends a tiny request with the given settings, so a wrong key, model or address shows up when the key is entered.
export async function testAiSettings(settings, options = {}) {
  await askAi('Reply with the single word OK.', settings, { ...options, maxTokens: 16, timeoutMs: options.timeoutMs || 30000 })
  return true
}
