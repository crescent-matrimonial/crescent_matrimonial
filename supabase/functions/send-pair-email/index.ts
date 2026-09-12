const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')

if (!RESEND_API_KEY) {
  throw new Error('RESEND_API_KEY is required')
}

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

Deno.serve(async (request: Request): Promise<Response> => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  let payload: Record<string, unknown>
  try {
    payload = await request.json()
  } catch {
    return jsonResponse({ error: 'Request body must be valid JSON' }, 400)
  }

  const { to, subject, html, text, from } = payload

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

  if (typeof from !== 'undefined' && typeof from !== 'string') {
    return jsonResponse({ error: 'from must be a string' }, 400)
  }

  const emailPayload: Record<string, unknown> = {
    from: from ?? 'onboarding@resend.dev',
    to,
    subject,
  }

  if (html) emailPayload.html = html
  if (text) emailPayload.text = text

  const resendResponse = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(emailPayload),
  })

  const responseBody = await resendResponse.json().catch(() => ({
    error: 'Invalid response from Resend',
  }))

  return jsonResponse(responseBody, resendResponse.status)
})
