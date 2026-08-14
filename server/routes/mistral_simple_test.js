import express from 'express'
import dotenv from 'dotenv'
dotenv.config()

const MISTRAL_SECRET = process.env.MISTRAL_API_KEY
const router = express.Router()

router.post('/improve-text', async (req, res) => {
  const { text, instruction } = req.body
  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'text is required' })
  }

  try {
    const response = await fetch('https://api.mistral.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${MISTRAL_SECRET}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'mistral-small-latest',
        messages: [
          {
            role: 'system',
            content: 'You improve scientific data-descriptor text for neuroscience ' +
              'datasets. Keep the same meaning and any technical facts exactly as given. ' +
              'Improve clarity, grammar, and flow. Return only the improved text, no preamble.',
          },
          {
            role: 'user',
            content: instruction
              ? `${instruction}\n\nText:\n${text}`
              : `Improve this text:\n\n${text}`,
          },
        ],
        temperature: 0.3,
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Mistral API error:', response.status, errText)
      return res.status(502).json({ error: 'Mistral request failed' })
    }

    const data = await response.json()
    const improved = data.choices?.[0]?.message?.content?.trim()
    res.json({ improved })
  } catch (err) {
    console.error('Error calling Mistral:', err)
    res.status(500).json({ error: 'Internal error' })
  }
})

export default router