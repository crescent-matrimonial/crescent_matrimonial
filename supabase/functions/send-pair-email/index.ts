import { createClient } from 'npm:@supabase/supabase-js@2'

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!

if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required')
}

/** The only account permitted to send mail through this function. */
const ADMIN_EMAIL = 'crescentmatrimonial@gmail.com'

/** The sender address is fixed server-side; callers may not choose it. */
const FROM_ADDRESS = 'crescentmatrimonial@gmail.com'

/** Hosts an attachment may be fetched from. Anything else is rejected. */
const ALLOWED_ATTACHMENT_HOSTS = [
  'drive.google.com',
  'docs.google.com',
  'lh3.googleusercontent.com',
  'lh4.googleusercontent.com',
  'lh5.googleusercontent.com',
  'lh6.googleusercontent.com',
]

const MAX_ATTACHMENTS = 12
const MAX_ATTACHMENT_BYTES = 8 * 1024 * 1024 // 8 MB per file

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json',
    },
  })
}

interface AttachmentInput {
  filename: string
  url: string
}

/**
 * Only https URLs on a known Google Drive / user-content host may be fetched.
 * This prevents the function being used to reach the platform's internal
 * network (link-local metadata endpoints, private ranges, localhost).
 */
function isAllowedAttachmentUrl(raw: string): boolean {
  let parsed: URL
  try {
    parsed = new URL(raw)
  } catch {
    return false
  }
  if (parsed.protocol !== 'https:') return false
  if (parsed.username || parsed.password) return false
  if (parsed.port && parsed.port !== '443') return false
  return ALLOWED_ATTACHMENT_HOSTS.includes(parsed.hostname.toLowerCase())
}

async function fetchAsBase64(url: string): Promise<string> {
  const response = await fetch(url, { redirect: 'follow' })
  if (!response.ok) {
    throw new Error('attachment fetch failed')
  }

  const declaredLength = response.headers.get('content-length')
  if (declaredLength && Number(declaredLength) > MAX_ATTACHMENT_BYTES) {
    throw new Error('attachment too large')
  }

  const buffer = await response.arrayBuffer()
  if (buffer.byteLength > MAX_ATTACHMENT_BYTES) {
    throw new Error('attachment too large')
  }

  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}

/** Resolve the caller from the bearer token and confirm they are the admin. */
async function authorizeCaller(request: Request): Promise<string | null> {
  const authHeader = request.headers.get('Authorization') ?? ''
  const token = authHeader.replace(/^Bearer\s+/i, '').trim()
  if (!token) return null

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user?.email) return null
  if (data.user.email.toLowerCase() !== ADMIN_EMAIL) return null
  return data.user.email
}

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  // Only the signed-in admin account may send mail through this function.
  const caller = await authorizeCaller(request)
  if (!caller) {
    return jsonResponse({ error: 'Not authorized' }, 403)
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400)
  }

  const { to, subject, html, text, attachments } = payload

  const validTo =
    typeof to === 'string' ||
    (Array.isArray(to) && to.length > 0 && to.every((value) => typeof value === 'string'))

  if (!validTo || typeof subject !== 'string' || (!html && !text)) {
    return jsonResponse(
      {
        error: 'Required fields: to, subject, and html or text',
      },
      400,
    )
  }

  if (typeof html !== 'undefined' && typeof html !== 'string') {
    return jsonResponse({ error: 'html must be a string' }, 400)
  }

  if (typeof text !== 'undefined' && typeof text !== 'string') {
    return jsonResponse({ error: 'text must be a string' }, 400)
  }

  const emailPayload: Record<string, unknown> = {
    from: FROM_ADDRESS,
    to,
    subject,
  }

  if (html) emailPayload.html = html
  if (text) emailPayload.text = text

  // Process attachments: fetch each allowlisted URL and convert to base64.
  if (Array.isArray(attachments) && attachments.length > 0) {
    if (attachments.length > MAX_ATTACHMENTS) {
      return jsonResponse({ error: 'Too many attachments' }, 400)
    }

    const processedAttachments = []
    for (const att of attachments as AttachmentInput[]) {
      if (typeof att?.filename !== 'string' || typeof att?.url !== 'string') {
        continue
      }
      if (!isAllowedAttachmentUrl(att.url)) {
        return jsonResponse({ error: 'An attachment could not be attached' }, 400)
      }
      try {
        const content = await fetchAsBase64(att.url)
        processedAttachments.push({ filename: att.filename, content })
      } catch {
        // Deliberately generic: never echo the URL or upstream status back.
        return jsonResponse({ error: 'An attachment could not be attached' }, 400)
      }
    }
    if (processedAttachments.length > 0) {
      emailPayload.attachments = processedAttachments
    }
  }

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  })

  if (!resendResponse.ok) {
    const detail = await resendResponse.text().catch(() => '')
    console.error('Resend send failed:', resendResponse.status, detail)
    return jsonResponse({ error: 'The email could not be sent' }, 502)
  }

  const responseBody = await resendResponse.json().catch(() => ({}))
  return jsonResponse(responseBody, 200)
})
