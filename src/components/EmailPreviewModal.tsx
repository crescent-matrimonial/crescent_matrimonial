import { useState } from 'react';
import { Send, TestTube, Loader2, CheckCircle2, AlertCircle, Paperclip } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { PersonWithDetails } from '@/lib/types';
import { getSupabase } from '@/lib/supabaseClient';

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  recipient: PersonWithDetails | null;
  partner: PersonWithDetails | null;
}

const ADMIN_EMAIL = 'crescentmatrimonial@gmail.com';
const FROM_EMAIL = 'crescentmatrimonial@gmail.com';
const SUBJECT = 'A New Match Has Been Found - Crescent Matrimonial';

function buildPreviewText(recipientName: string, partnerName: string): string {
  return `Assalamu Alaikum ${recipientName},

We hope this message finds you in the best of health and Iman. We are pleased to let you know that after carefully reviewing profiles, we have identified a potential match for you.

You have been paired with: ${partnerName}

Attached to this email, you will find:
• Your potential match's Bio Data for your review
• Photos submitted by your potential match

Please take your time to review the information provided. We kindly ask that you respond to this email letting us know whether you would like to proceed with exchanging contact information.

Important: All information shared is confidential and should be treated with the utmost respect and discretion. Please do not share the attached materials with anyone outside of your immediate family members involved in the decision-making process.

Simply reply to this email with one of the following:
• "Yes, I would like to exchange contacts"
• "No, I would like to pass on this match"

If you have any questions or need more information before making a decision, please don't hesitate to reach out to us.

May Allah guide you in this journey and bless you with a righteous spouse.

Warm regards,
Crescent Matrimonial Team`;
}

/**
 * Escape a value before it is interpolated into the HTML email body.
 * Candidate names come from a public Google Form, so they are untrusted and
 * must never be able to inject markup or links into an outgoing message.
 */
function escapeHtml(value: string): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtmlBody(rawRecipientName: string, rawPartnerName: string): string {
  const recipientName = escapeHtml(rawRecipientName);
  const partnerName = escapeHtml(rawPartnerName);
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:Georgia,'Times New Roman',serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
        <tr><td style="background:#0f172a;padding:32px 40px;">
          <h1 style="margin:0;color:#f8fafc;font-size:22px;font-weight:600;letter-spacing:0.5px;">Crescent Matrimonial</h1>
          <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">A New Match Has Been Found</p>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <p style="margin:0 0 20px;color:#1e293b;font-size:16px;line-height:1.8;">
            Assalamu Alaikum ${recipientName},
          </p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.8;">
            We hope this message finds you in the best of health and Iman. We are pleased to let you know that after carefully reviewing profiles, we have identified a potential match for you.
          </p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.8;">
            You have been paired with: <strong style="color:#0f172a;">${partnerName}</strong>
          </p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.8;">
            Attached to this email, you will find:
          </p>
          <ul style="margin:0 0 20px 20px;color:#334155;font-size:15px;line-height:1.8;">
            <li>Your potential match's Bio Data for your review</li>
            <li>Photos submitted by your potential match</li>
          </ul>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.8;">
            Please take your time to review the information provided. We kindly ask that you respond to this email letting us know whether you would like to proceed with exchanging contact information.
          </p>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.8;">
            <strong style="color:#0f172a;">Important:</strong> All information shared is confidential and should be treated with the utmost respect and discretion. Please do not share the attached materials with anyone outside of your immediate family members involved in the decision-making process.
          </p>
          <p style="margin:0 0 8px;color:#334155;font-size:15px;line-height:1.8;">
            Simply reply to this email with one of the following:
          </p>
          <ul style="margin:0 0 20px 20px;color:#334155;font-size:15px;line-height:1.8;">
            <li>"Yes, I would like to exchange contacts"</li>
            <li>"No, I would like to pass on this match"</li>
          </ul>
          <p style="margin:0 0 20px;color:#334155;font-size:15px;line-height:1.8;">
            If you have any questions or need more information before making a decision, please don't hesitate to reach out to us.
          </p>
          <p style="margin:0;color:#334155;font-size:15px;line-height:1.8;">
            May Allah guide you in this journey and bless you with a righteous spouse.
          </p>
        </td></tr>
        <tr><td style="padding:24px 40px 36px;border-top:1px solid #e2e8f0;">
          <p style="margin:0;color:#64748b;font-size:14px;line-height:1.6;">
            Warm regards,<br><strong style="color:#0f172a;">Crescent Matrimonial Team</strong>
          </p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

export function EmailPreviewModal({ open, onClose, recipient, partner }: EmailPreviewModalProps) {
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastAction, setLastAction] = useState<'test' | 'send' | null>(null);

  if (!recipient || !partner) return null;

  const previewText = buildPreviewText(recipient.full_name, partner.full_name);
  const htmlBody = buildHtmlBody(recipient.full_name, partner.full_name);
  const attachmentCount =
    (partner.bio_data_url ? 1 : 0) + (partner.photo_urls?.length ?? 0);

  const handleSend = async (isTest: boolean) => {
    setSendStatus('sending');
    setLastAction(isTest ? 'test' : 'send');
    setErrorMsg('');

    try {
      const supabase = getSupabase();

      // Build attachment list from partner's bio data and photos
      const attachments: { filename: string; url: string }[] = [];
      if (partner.bio_data_url) {
        attachments.push({
          filename: `${partner.full_name.replace(/\s+/g, '_')}_BioData.pdf`,
          url: partner.bio_data_url,
        });
      }
      for (let i = 0; i < (partner.photo_urls?.length ?? 0); i++) {
        const url = partner.photo_urls![i];
        const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
        attachments.push({
          filename: `${partner.full_name.replace(/\s+/g, '_')}_Photo_${i + 1}.${ext}`,
          url,
        });
      }

      const { data, error } = await supabase.functions.invoke('send-pair-email', {
        body: {
          from: FROM_EMAIL,
          to: isTest ? ADMIN_EMAIL : recipient.email,
          subject: SUBJECT,
          html: htmlBody,
          text: previewText,
          attachments,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSendStatus('success');
    } catch (err) {
      // Keep the technical detail in the console only; never render it.
      console.error('Send failed:', err);
      setSendStatus('error');
      setErrorMsg('The email could not be sent. Please try again.');
    }
  };

  const handleClose = () => {
    setSendStatus('idle');
    setErrorMsg('');
    setLastAction(null);
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title="Email Preview" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {/* Header info */}
        <div className="rounded-lg border border-slate-700/60 bg-slate-950/40 p-3 space-y-2">
          <div className="flex gap-2 text-xs">
            <span className="font-semibold text-slate-400 w-16 shrink-0">From:</span>
            <span className="text-slate-200">{FROM_EMAIL}</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-semibold text-slate-400 w-16 shrink-0">To:</span>
            <span className="text-slate-200">{recipient.email}</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-semibold text-slate-400 w-16 shrink-0">Subject:</span>
            <span className="text-slate-200">{SUBJECT}</span>
          </div>
          {attachmentCount > 0 && (
            <div className="flex gap-2 text-xs">
              <span className="font-semibold text-slate-400 w-16 shrink-0">Attach:</span>
              <span className="flex items-center gap-1 text-slate-300">
                <Paperclip className="h-3 w-3" />
                {partner.bio_data_url && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">
                    {partner.full_name.replace(/\s+/g, '_')}_BioData
                  </span>
                )}
                {(partner.photo_urls?.length ?? 0) > 0 && (
                  <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[11px]">
                    {partner.photo_urls.length} photo{partner.photo_urls.length > 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
          )}
        </div>

        {/* Email body preview */}
        <div className="max-h-[400px] overflow-y-auto rounded-lg border border-slate-700/60 bg-white/[0.03] p-4">
          <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-300">
            {previewText}
          </pre>
        </div>

        {/* Status messages */}
        {sendStatus === 'success' && (
          <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-4 py-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            <p className="text-sm text-emerald-300">
              {lastAction === 'test'
                ? 'Test email sent to crescentmatrimonial@gmail.com successfully!'
                : `Email sent to ${recipient.email} successfully!`}
            </p>
          </div>
        )}
        {sendStatus === 'error' && (
          <div className="flex items-start gap-2 rounded-lg border border-rose-500/30 bg-rose-500/10 px-4 py-3">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div>
              <p className="text-sm font-medium text-rose-300">Failed to send email</p>
              <p className="mt-0.5 text-xs text-rose-400/80">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Action buttons */}
        <div className="flex justify-end gap-2 border-t border-slate-700/60 pt-4">
          <button
            onClick={handleClose}
            className="rounded-lg border border-slate-700 px-4 py-2 text-sm text-slate-400 transition hover:bg-slate-800"
          >
            {sendStatus === 'success' ? 'Done' : 'Cancel'}
          </button>
          <button
            onClick={() => handleSend(true)}
            disabled={sendStatus === 'sending'}
            className="inline-flex items-center gap-1.5 rounded-lg border border-amber-500/40 px-4 py-2 text-sm font-medium text-amber-300 transition hover:bg-amber-500/10 disabled:opacity-50"
          >
            {sendStatus === 'sending' && lastAction === 'test' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <TestTube className="h-4 w-4" />
            )}
            Send Test to Admin
          </button>
          <button
            onClick={() => handleSend(false)}
            disabled={sendStatus === 'sending'}
            className="inline-flex items-center gap-1.5 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-500 disabled:opacity-50"
          >
            {sendStatus === 'sending' && lastAction === 'send' ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Send to {recipient.full_name}
          </button>
        </div>
      </div>
    </Modal>
  );
}
