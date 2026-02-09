import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function igdbProxy() {
  let env
  return {
    name: 'igdb-proxy',
    configResolved(config) {
      env = loadEnv(config.mode, config.root, '')
    },
    configureServer(server) {
      server.middlewares.use('/api/igdb', async (req, res) => {
        try {
          const { handler } = await import('./api/igdb.js')
          const games = await handler(env.TWITCH_CLIENT_ID, env.TWITCH_CLIENT_SECRET)
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(games))
        } catch (err) {
          res.statusCode = 500
          res.end(JSON.stringify({ error: err.message }))
        }
      })
    },
  }
}

function imageProxyPlugin() {
  return {
    name: 'image-proxy',
    configureServer(server) {
      server.middlewares.use('/api/image-proxy', async (req, res) => {
        try {
          const { handler } = await import('./api/image-proxy.js')
          const url = new URL(req.url, 'http://localhost').searchParams.get('url')
          const { buffer, contentType } = await handler(url)
          res.setHeader('Content-Type', contentType)
          res.setHeader('Access-Control-Allow-Origin', '*')
          res.end(buffer)
        } catch (err) {
          const status = err.status || 500
          res.statusCode = status
          res.end(JSON.stringify({ error: err.message || 'Internal error' }))
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), igdbProxy(), imageProxyPlugin()],
})
