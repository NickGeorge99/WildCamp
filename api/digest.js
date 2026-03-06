import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
)

const RESEND_API_KEY = process.env.RESEND_API_KEY
const UNSUBSCRIBE_SECRET = process.env.UNSUBSCRIBE_SECRET
const SITE_URL = 'https://wildcamp.nickwontquit.com'
const RADIUS_MILES = 25

function makeUnsubToken(userId) {
  return crypto
    .createHmac('sha256', UNSUBSCRIBE_SECRET)
    .update(userId)
    .digest('hex')
}

async function sendEmail(to, subject, html, userId) {
  const unsubUrl = `${SITE_URL}/api/unsubscribe?token=${makeUnsubToken(userId)}&uid=${userId}`
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'WildCamp <digest@wildcamp.nickwontquit.com>',
      to: [to],
      subject,
      html: html.replace('{{UNSUB_URL}}', unsubUrl),
      headers: {
        'List-Unsubscribe': `<${unsubUrl}>`,
        'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
      },
    }),
  })
  return res.ok
}

function buildEmail(nearbySpots, updatedSpots) {
  const vehicleEmoji = { any: '🚗', '4wd': '🚙', 'hike-in': '🥾' }

  let nearbySectionHtml = ''
  if (nearbySpots.length > 0) {
    const rows = nearbySpots
      .map(
        (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #374151;">
          <span style="font-size:16px;">${vehicleEmoji[s.vehicle_type] || '🚗'}</span>
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #374151;">
          <a href="${SITE_URL}?spot=${s.share_token}" style="color:#fb923c;text-decoration:none;font-weight:500;">${escHtml(s.name)}</a>
          <br><span style="color:#9ca3af;font-size:12px;">${Math.round(s.distance_miles)} mi away</span>
        </td>
      </tr>`
      )
      .join('')

    nearbySectionHtml = `
      <h2 style="color:#f9fafb;font-size:18px;margin:24px 0 12px;">New Spots Near You</h2>
      <table style="width:100%;border-collapse:collapse;background:#1f2937;border-radius:8px;">
        ${rows}
      </table>`
  }

  let photoSectionHtml = ''
  if (updatedSpots.length > 0) {
    const rows = updatedSpots
      .map(
        (s) => `
      <tr>
        <td style="padding:8px 12px;border-bottom:1px solid #374151;">
          ${
            s.images && s.images.length > 0
              ? `<img src="${escHtml(s.images[s.images.length - 1])}" width="48" height="48" style="border-radius:6px;object-fit:cover;" />`
              : ''
          }
        </td>
        <td style="padding:8px 12px;border-bottom:1px solid #374151;">
          <a href="${SITE_URL}?spot=${s.share_token}" style="color:#fb923c;text-decoration:none;font-weight:500;">${escHtml(s.name)}</a>
          <br><span style="color:#9ca3af;font-size:12px;">${s.images ? s.images.length : 0} photo${s.images && s.images.length !== 1 ? 's' : ''}</span>
        </td>
      </tr>`
      )
      .join('')

    photoSectionHtml = `
      <h2 style="color:#f9fafb;font-size:18px;margin:24px 0 12px;">New Photos on Your Spots</h2>
      <table style="width:100%;border-collapse:collapse;background:#1f2937;border-radius:8px;">
        ${rows}
      </table>`
  }

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width"></head>
<body style="margin:0;padding:0;background:#111827;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:24px 16px;">
    <div style="text-align:center;margin-bottom:24px;">
      <h1 style="color:#fb923c;font-size:24px;margin:0;">WildCamp</h1>
      <p style="color:#9ca3af;font-size:13px;margin:4px 0 0;">Your weekly digest</p>
    </div>
    ${nearbySectionHtml}
    ${photoSectionHtml}
    <div style="margin-top:32px;padding-top:16px;border-top:1px solid #374151;text-align:center;">
      <a href="${SITE_URL}" style="color:#fb923c;text-decoration:none;font-size:13px;">Open WildCamp</a>
      <span style="color:#4b5563;margin:0 8px;">|</span>
      <a href="{{UNSUB_URL}}" style="color:#9ca3af;text-decoration:none;font-size:13px;">Unsubscribe</a>
    </div>
  </div>
</body>
</html>`
}

function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export default async function handler(req, res) {
  // Verify cron secret
  const authHeader = req.headers.authorization
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Get all opted-in users
  const { data: prefs, error: prefsErr } = await supabase
    .from('notification_preferences')
    .select('user_id, last_digest_sent_at')
    .eq('digest_enabled', true)

  if (prefsErr) {
    return res.status(500).json({ error: prefsErr.message })
  }

  let sent = 0

  for (const pref of prefs || []) {
    const { user_id, last_digest_sent_at } = pref

    // Get user email
    const {
      data: { user: authUser },
    } = await supabase.auth.admin.getUserById(user_id)
    if (!authUser?.email) continue

    // Get user's spot locations as search centroids
    const { data: userSpots } = await supabase
      .from('spots')
      .select('lat, lng')
      .eq('user_id', user_id)

    if (!userSpots || userSpots.length === 0) continue

    // Find new public spots by others near user's spots
    const { data: nearbySpots } = await supabase.rpc('get_nearby_new_spots', {
      p_user_id: user_id,
      p_since: last_digest_sent_at,
      p_radius_miles: RADIUS_MILES,
    })

    // Find user's own spots that got new photos
    const { data: updatedSpots } = await supabase
      .from('spots')
      .select('*')
      .eq('user_id', user_id)
      .gt('updated_at', last_digest_sent_at)
      .neq('images', '{}')

    const nearby = nearbySpots || []
    const updated = updatedSpots || []

    if (nearby.length === 0 && updated.length === 0) continue

    const subject = `WildCamp Weekly: ${nearby.length + updated.length} new ${nearby.length + updated.length === 1 ? 'update' : 'updates'} near you`
    const html = buildEmail(nearby, updated)
    const ok = await sendEmail(authUser.email, subject, html, user_id)

    if (ok) {
      await supabase
        .from('notification_preferences')
        .update({ last_digest_sent_at: new Date().toISOString() })
        .eq('user_id', user_id)
      sent++
    }
  }

  return res.status(200).json({ sent, total: prefs?.length || 0 })
}
