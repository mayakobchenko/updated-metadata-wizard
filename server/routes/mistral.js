// Calls the Mistral API server-side to help draft Data Descriptor text.
// The API key must never be sent to the browser — this route is the only
// place that talks to api.mistral.ai; the frontend only ever calls this.
import express from 'express'
import dotenv from 'dotenv'
import logger from '../logger.js'

dotenv.config()

const router = express.Router()

const MISTRAL_URL = 'https://api.mistral.ai/v1/chat/completions'
const MODEL = 'mistral-small-latest'

router.post('/generate-summary', generateSummary)

// Builds a short "Q: ... \n A: ..." style transcript from whichever
// wizard answers are present, so the model has real content to work from
// rather than a wall of empty fields.
function buildAnswersBlock(fields) {
  return fields
    .filter(({ answer }) => answer && String(answer).trim() !== '')
    .map(({ question, answer }) => `Q: ${question}\nA: ${answer}`)
    .join('\n\n')
}

async function generateSummary(req, res) {
  if (!process.env.MISTRAL_API_KEY) {
    logger.error('MISTRAL_API_KEY is not set')
    return res.status(500).json({ error: 'Mistral is not configured on the server' })
  }

  const { title, briefSummary, whatAreTheData, scientificContext, motivation, hypothesis } = req.body || {}

  const answersBlock = buildAnswersBlock([
    { question: 'Dataset title', answer: title },
    { question: 'Brief summary (from the wizard intake form)', answer: briefSummary },
    { question: 'What are the data?', answer: whatAreTheData },
    { question: 'Scientific background and context', answer: scientificContext },
    { question: 'Motivation for creating and sharing this dataset', answer: motivation },
    { question: 'Central hypothesis or research question', answer: hypothesis },
  ])

  if (!answersBlock) {
    return res.status(400).json({
      error: 'Not enough information yet — fill in at least "What are the data?" or "Scientific context" first.',
    })
  }

  try {
    const response = await fetch(MISTRAL_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: MODEL,
        temperature: 0.3,
        messages: [
          {
            role: 'system',
            content:
              'You write the SUMMARY paragraph of an EBRAINS neuroscience Data Descriptor. ' +
              'You are given the researcher\'s own answers to several wizard questions. ' +
              'Combine them into a single, coherent, well-written paragraph (3-6 sentences) ' +
              'in the third person, past or present tense as appropriate for a dataset summary. ' +
              'Do not invent facts, numbers, or details that are not present in the answers. ' +
              'Do not add headings, labels, or bullet points. Return only the paragraph text.',
          },
          {
            role: 'user',
            content: `Here are the researcher's answers:\n\n${answersBlock}\n\nWrite the summary paragraph.`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      logger.error(`Mistral API error ${response.status}: ${errText}`)
      return res.status(502).json({ error: 'Mistral request failed' })
    }

    const data = await response.json()
    const summary = data.choices?.[0]?.message?.content?.trim()

    if (!summary) {
      logger.error('Mistral response had no content')
      return res.status(502).json({ error: 'Mistral returned an empty response' })
    }

    res.json({ summary })
  } catch (err) {
    logger.error(`Error calling Mistral: ${err}`)
    res.status(500).json({ error: 'Internal error calling Mistral' })
  }
}

export default router
