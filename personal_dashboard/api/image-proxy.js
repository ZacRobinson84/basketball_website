// Vercel serverless function — also used by the Vite dev plugin via shared handler

const ALLOWED_HOSTS = ['image.tmdb.org', 'images.igdb.com']

export async function handler(url) {
  if (!url) {
    throw { status: 400, message: 'Missing "url" query parameter' }
  }

  let parsed
  try {
    parsed = new URL(url)
  } catch {
    throw { status: 400, message: 'Invalid URL' }
  }

  if (!ALLOWED_HOSTS.includes(parsed.hostname)) {
    throw { status: 400, message: 'Domain not allowed' }
  }

  const upstream = await fetch(url)
  if (!upstream.ok) {
    throw { status: 502, message: 'Upstream fetch failed' }
  }

  const buffer = Buffer.from(await upstream.arrayBuffer())
  const contentType = upstream.headers.get('content-type') || 'application/octet-stream'

  return { buffer, contentType }
}

// Vercel serverless entry point
export default async function (req, res) {
  try {
    const { buffer, contentType } = await handler(req.query.url)
    res.setHeader('Content-Type', contentType)
    res.setHeader('Access-Control-Allow-Origin', '*')
    res.status(200).send(buffer)
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({ error: err.message || 'Internal error' })
  }
}
