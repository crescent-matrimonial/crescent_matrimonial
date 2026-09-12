import { useState } from 'react';
import { Mail, Send, TestTube, Loader2, CheckCircle2, AlertCircle, Paperclip } from 'lucide-react';
import { Modal } from '@/components/Modal';
import type { PersonWithDetails } from '@/lib/types';
import { getSupabase } from '@/lib/supabaseClient';

interface EmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  recipient: PersonWithDetails | null;
  partner: PersonWithDetails | null;
}

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

type SendStatus = 'idle' | 'sending' | 'success' | 'error';

export function EmailPreviewModal({ open, onClose, recipient, partner }: EmailPreviewModalProps) {
  const [sendStatus, setSendStatus] = useState<SendStatus>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [lastAction, setLastAction] = useState<'test' | 'send' | null>(null);

  if (!recipient || !partner) return null;

  const previewText = buildPreviewText(recipient.full_name, partner.full_name);
  const attachmentCount =
    (partner.bio_data_url ? 1 : 0) + (partner.photo_urls?.length ?? 0);

  const handleSend = async (isTest: boolean) => {
    setSendStatus('sending');
    setLastAction(isTest ? 'test' : 'send');
    setErrorMsg('');

    try {
      const supabase = getSupabase();
      const { data, error } = await supabase.functions.invoke('send-pair-email', {
        body: {
          recipientName: recipient.full_name,
          recipientEmail: recipient.email,
          partnerName: partner.full_name,
          partnerBioDataUrl: partner.bio_data_url,
          partnerPhotoUrls: partner.photo_urls ?? [],
          isTest,
        },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSendStatus('success');
    } catch (err) {
      setSendStatus('error');
      setErrorMsg(err instanceof Error ? err.message : 'Failed to send email');
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
            <span className="text-slate-200">crescentmatrimonial@gmail.com</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-semibold text-slate-400 w-16 shrink-0">To:</span>
            <span className="text-slate-200">{recipient.email}</span>
          </div>
          <div className="flex gap-2 text-xs">
            <span className="font-semibold text-slate-400 w-16 shrink-0">Subject:</span>
            <span className="text-slate-200">A New Match Has Been Found - Crescent Matrimonial</span>
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
