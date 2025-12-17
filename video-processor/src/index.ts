/**
 * Video Processor Server
 * Express server for video rendering API
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import renderRouter from './routes/render'

const app = express()
const PORT = process.env.PORT || 3001

// Ensure temp directory exists
const tempDir = path.join(__dirname, '../temp')
if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true })
}

// Middleware
app.use(cors({
    origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps, Postman, or curl)
        // or from localhost on any port (for development)
        if (!origin || origin.startsWith('http://localhost:') || origin.startsWith('http://127.0.0.1:')) {
            callback(null, true)
        } else {
            callback(new Error('Not allowed by CORS'))
        }
    },
    methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({ limit: '50mb' }))

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Routes
app.use('/api/render', renderRouter)

// Error handler
app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Server error:', err)
    res.status(500).json({ error: 'Internal server error' })
})

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`
╔════════════════════════════════════════════════════╗
║     Video Processor Server                         ║
║     Running on http://localhost:${PORT}              ║
║     Also accessible at http://127.0.0.1:${PORT}      ║
╠════════════════════════════════════════════════════╣
║  Endpoints:                                        ║
║  GET    /health              - Health check        ║
║  POST   /api/render          - Start render job    ║
║  GET    /api/render/:id/status - Check status      ║
║  GET    /api/render/:id/download - Download video  ║
║  DELETE /api/render/:id      - Cleanup job         ║
╚════════════════════════════════════════════════════╝
  `)
})

export default app
