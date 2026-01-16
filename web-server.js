import express from 'express'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import morgan from 'morgan'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const app = express()
const PORT = process.env.PORT || 3050

// Logging middleware
app.use(morgan('combined'))

// Security headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('X-XSS-Protection', '1; mode=block')
  next()
})

// Serve static files from dist directory
app.use(express.static(join(__dirname, 'dist')))

// SPA fallback - serve index.html for all routes
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'))
})

app.listen(PORT, '0.0.0.0', () => {
  console.log(`✓ Server running on http://0.0.0.0:${PORT}`)
  console.log(`✓ Environment: ${process.env.NODE_ENV || 'development'}`)
})
