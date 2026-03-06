import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

export default async function handler(req, res) {
  const { token, uid } = req.query

  if (!token || !uid) {
    return res.status(400).send(page('Missing parameters', false))
  }

  // Verify HMAC token
  const expected = crypto
    .createHmac('sha256', process.env.UNSUBSCRIBE_SECRET)
    .update(uid)
    .digest('hex')

  if (token !== expected) {
    return res.status(403).send(page('Invalid unsubscribe link', false))
  }

  const { error } = await supabase
    .from('notification_preferences')
    .update({ digest_enabled: false })
    .eq('user_id', uid)

  if (error) {
    return res.status(500).send(page('Something went wrong. Please try again.', false))
  }

  return res.status(200).send(page("You've been unsubscribed from WildCamp weekly digests.", true))
}

function page(message, success) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>WildCamp – Unsubscribe</title>
</head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;">
  <div style="text-align:center;padding:32px;">
    <h1 style="color:#fb923c;font-size:24px;margin:0 0 16px;">WildCamp</h1>
    <p style="color:${success ? '#d1d5db' : '#f87171'};font-size:16px;margin:0 0 24px;">${message}</p>
    <a href="https://wildcamp.nickwontquit.com" style="color:#fb923c;text-decoration:none;font-size:14px;">Back to WildCamp</a>
  </div>
</body>
</html>`
}
