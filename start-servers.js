import { spawn } from 'child_process'

console.log('Starting Okta + Socure Demo servers...')

// Start web server
const webServer = spawn('node', ['web-server.js'], {
  stdio: 'inherit',
  env: { ...process.env, PORT: '3050' }
})

// Start API server
const apiServer = spawn('node', ['api-server.js'], {
  stdio: 'inherit',
  env: { ...process.env, API_PORT: '3051' }
})

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Shutting down servers...')
  webServer.kill()
  apiServer.kill()
  process.exit(0)
})

process.on('SIGINT', () => {
  console.log('Shutting down servers...')
  webServer.kill()
  apiServer.kill()
  process.exit(0)
})

webServer.on('error', (err) => {
  console.error('Web server error:', err)
})

apiServer.on('error', (err) => {
  console.error('API server error:', err)
})
