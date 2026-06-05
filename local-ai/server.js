import express from 'express'
import { createServer } from 'http'
import path from 'path'
import { fileURLToPath } from 'url'
import os from 'os'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const app = express()
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434'
const PORT = process.env.PORT || 3737

app.use(express.json({ limit: '4mb' }))
app.use(express.static(path.join(__dirname, 'public')))

// Get local IP for phone access
function getLocalIP() {
  const nets = os.networkInterfaces()
  for (const name of Object.keys(nets)) {
    for (const net of nets[name]) {
      if (net.family === 'IPv4' && !net.internal) return net.address
    }
  }
  return '127.0.0.1'
}

// List available Ollama models
app.get('/api/models', async (req, res) => {
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`)
    if (!r.ok) throw new Error('bad response')
    const data = await r.json()
    res.json(data)
  } catch {
    res.status(503).json({ error: 'Ollama is not running', hint: 'Run: ollama serve' })
  }
})

// Health / status
app.get('/api/health', async (req, res) => {
  let ollamaOk = false
  let models = []
  try {
    const r = await fetch(`${OLLAMA_URL}/api/tags`)
    const data = await r.json()
    ollamaOk = true
    models = (data.models || []).map(m => m.name)
  } catch {}
  res.json({ status: 'ok', ollama: ollamaOk ? 'connected' : 'disconnected', models })
})

// Streaming chat endpoint
app.post('/api/chat', async (req, res) => {
  const { messages, model = 'llama3.2', system } = req.body

  if (!messages || !Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages array required' })
  }

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.setHeader('X-Accel-Buffering', 'no')

  const payload = { model, messages, stream: true }
  if (system) payload.system = system

  let ollamaRes
  try {
    ollamaRes = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
  } catch {
    res.write(`data: ${JSON.stringify({ error: 'Cannot reach Ollama. Make sure it is running: ollama serve' })}\n\n`)
    return res.end()
  }

  if (!ollamaRes.ok) {
    const msg = await ollamaRes.text().catch(() => 'Unknown error')
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`)
    return res.end()
  }

  const reader = ollamaRes.body.getReader()
  const decoder = new TextDecoder()

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const raw = decoder.decode(value, { stream: true })
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue
        try {
          const chunk = JSON.parse(line)
          if (chunk.message?.content) {
            res.write(`data: ${JSON.stringify({ token: chunk.message.content })}\n\n`)
          }
          if (chunk.done) {
            res.write('data: [DONE]\n\n')
          }
        } catch {}
      }
    }
  } catch (err) {
    res.write(`data: ${JSON.stringify({ error: 'Stream interrupted' })}\n\n`)
  }

  res.end()
})

// Pull a model (so you can pull from the UI)
app.post('/api/pull', async (req, res) => {
  const { model } = req.body
  if (!model) return res.status(400).json({ error: 'model name required' })

  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')

  try {
    const r = await fetch(`${OLLAMA_URL}/api/pull`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: model, stream: true })
    })
    const reader = r.body.getReader()
    const decoder = new TextDecoder()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      const raw = decoder.decode(value, { stream: true })
      for (const line of raw.split('\n')) {
        if (!line.trim()) continue
        try {
          const data = JSON.parse(line)
          res.write(`data: ${JSON.stringify(data)}\n\n`)
        } catch {}
      }
    }
  } catch {
    res.write(`data: ${JSON.stringify({ error: 'Failed to pull model' })}\n\n`)
  }
  res.end()
})

const server = createServer(app)
const localIP = getLocalIP()

server.listen(PORT, '0.0.0.0', () => {
  console.log('\n╔══════════════════════════════════════════╗')
  console.log('║       Local AI Helper — Running          ║')
  console.log('╠══════════════════════════════════════════╣')
  console.log(`║  Computer : http://localhost:${PORT}        ║`)
  console.log(`║  Phone    : http://${localIP}:${PORT}   ║`)
  console.log('║                                          ║')
  console.log('║  Make sure Ollama is running:            ║')
  console.log('║    ollama serve                          ║')
  console.log('╚══════════════════════════════════════════╝\n')
})
