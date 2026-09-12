import { createClient } from "npm:@supabase/supabase-js@2.112.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

const SENDER_EMAIL = "crescentmatrimonial@gmail.com";
const ADMIN_EMAIL = "crescentmatrimonial@gmail.com";

interface EmailRequest {
  recipientName: string;
  recipientEmail: string;
  partnerName: string;
  partnerBioDataUrl: string | null;
  partnerPhotoUrls: string[];
  isTest: boolean;
}

function buildEmailHtml(recipientName: string, partnerName: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <style>
    body { margin: 0; padding: 0; background: #f4f6f9; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; }
    .header { background: linear-gradient(135deg, #0f766e, #115e59); padding: 32px 24px; text-align: center; }
    .header h1 { margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; }
    .header p { margin: 8px 0 0; color: #99f6e4; font-size: 14px; }
    .body { padding: 32px 24px; }
    .body p { color: #334155; font-size: 15px; line-height: 1.7; margin: 0 0 16px; }
    .highlight { background: #f0fdfa; border-left: 4px solid #14b8a6; padding: 16px 20px; border-radius: 0 8px 8px 0; margin: 24px 0; }
    .highlight p { margin: 0; color: #0f766e; font-weight: 600; font-size: 16px; }
    .cta { text-align: center; margin: 32px 0 16px; }
    .cta p { color: #475569; font-size: 14px; }
    .note { background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 16px; margin: 24px 0; }
    .note p { color: #92400e; font-size: 13px; margin: 0; }
    .footer { background: #f8fafc; padding: 24px; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0 0 4px; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>Crescent Matrimonial</h1>
        <p>A New Match for You</p>
      </div>
      <div class="body">
        <p>Assalamu Alaikum ${recipientName},</p>
        <p>We hope this message finds you in the best of health and Iman. We are pleased to let you know that after carefully reviewing profiles, we have identified a potential match for you.</p>

        <div class="highlight">
          <p>You have been paired with: ${partnerName}</p>
        </div>

        <p>Attached to this email, you will find:</p>
        <ul style="color: #334155; font-size: 15px; line-height: 1.7; padding-left: 20px;">
          <li>Your potential match's <strong>Bio Data</strong> for your review</li>
          <li>Photos submitted by your potential match</li>
        </ul>

        <p>Please take your time to review the information provided. We kindly ask that you respond to this email letting us know whether you would like to proceed with exchanging contact information.</p>

        <div class="note">
          <p><strong>Important:</strong> All information shared is confidential and should be treated with the utmost respect and discretion. Please do not share the attached materials with anyone outside of your immediate family members involved in the decision-making process.</p>
        </div>

        <div class="cta">
          <p>Simply reply to this email with one of the following:</p>
          <p style="font-weight: 600; color: #0f766e;">"Yes, I would like to exchange contacts"</p>
          <p style="color: #64748b;">or</p>
          <p style="font-weight: 600; color: #dc2626;">"No, I would like to pass on this match"</p>
        </div>

        <p>If you have any questions or need more information before making a decision, please don't hesitate to reach out to us.</p>

        <p>May Allah guide you in this journey and bless you with a righteous spouse.</p>

        <p style="margin-top: 24px;">Warm regards,<br /><strong>Crescent Matrimonial Team</strong></p>
      </div>
      <div class="footer">
        <p>Crescent Matrimonial</p>
        <p>This is a confidential communication. Please do not forward.</p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function buildEmailText(recipientName: string, partnerName: string): string {
  return `Assalamu Alaikum ${recipientName},

We hope this message finds you in the best of health and Iman. We are pleased to let you know that after carefully reviewing profiles, we have identified a potential match for you.

You have been paired with: ${partnerName}

Attached to this email, you will find:
- Your potential match's Bio Data for your review
- Photos submitted by your potential match

Please take your time to review the information provided. We kindly ask that you respond to this email letting us know whether you would like to proceed with exchanging contact information.

Important: All information shared is confidential and should be treated with the utmost respect and discretion. Please do not share the attached materials with anyone outside of your immediate family members involved in the decision-making process.

Simply reply to this email with one of the following:
- "Yes, I would like to exchange contacts"
- "No, I would like to pass on this match"

If you have any questions or need more information before making a decision, please don't hesitate to reach out to us.

May Allah guide you in this journey and bless you with a righteous spouse.

Warm regards,
Crescent Matrimonial Team`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({
          error:
            "Email service not configured. Please add a RESEND_API_KEY secret.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body: EmailRequest = await req.json();
    const {
      recipientName,
      recipientEmail,
      partnerName,
      partnerBioDataUrl,
      partnerPhotoUrls,
      isTest,
    } = body;

    if (!recipientName || !recipientEmail || !partnerName) {
      return new Response(
        JSON.stringify({ error: "Missing required fields." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const toEmail = isTest ? ADMIN_EMAIL : recipientEmail;
    const subjectPrefix = isTest ? "[TEST] " : "";

    const attachments: Array<{
      filename: string;
      content: string;
    }> = [];

    if (partnerBioDataUrl) {
      try {
        const bioRes = await fetch(partnerBioDataUrl);
        if (bioRes.ok) {
          const buf = await bioRes.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(buf))
          );
          const ext = partnerBioDataUrl.includes(".pdf") ? "pdf" : "html";
          attachments.push({
            filename: `${partnerName.replace(/\s+/g, "_")}_BioData.${ext}`,
            content: base64,
          });
        }
      } catch {
        // Skip attachment if fetch fails
      }
    }

    for (let i = 0; i < (partnerPhotoUrls ?? []).length; i++) {
      const url = partnerPhotoUrls[i];
      try {
        const photoRes = await fetch(url);
        if (photoRes.ok) {
          const buf = await photoRes.arrayBuffer();
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(buf))
          );
          const urlLower = url.toLowerCase();
          const ext = urlLower.includes(".png")
            ? "png"
            : urlLower.includes(".webp")
            ? "webp"
            : "jpg";
          attachments.push({
            filename: `${partnerName.replace(/\s+/g, "_")}_Photo_${
              i + 1
            }.${ext}`,
            content: base64,
          });
        }
      } catch {
        // Skip photo if fetch fails
      }
    }

    const emailPayload: Record<string, unknown> = {
      from: `Crescent Matrimonial <${SENDER_EMAIL}>`,
      to: [toEmail],
      subject: `${subjectPrefix}A New Match Has Been Found - Crescent Matrimonial`,
      html: buildEmailHtml(
        isTest ? `${recipientName} (TEST)` : recipientName,
        partnerName
      ),
      text: buildEmailText(
        isTest ? `${recipientName} (TEST)` : recipientName,
        partnerName
      ),
    };

    if (attachments.length > 0) {
      emailPayload.attachments = attachments;
    }

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailPayload),
    });

    const resendData = await resendRes.json();

    if (!resendRes.ok) {
      return new Response(
        JSON.stringify({
          error: `Email service error: ${
            resendData.message ?? JSON.stringify(resendData)
          }`,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        emailId: resendData.id,
        sentTo: toEmail,
        isTest,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
