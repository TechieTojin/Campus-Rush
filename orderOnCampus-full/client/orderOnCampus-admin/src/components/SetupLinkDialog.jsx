import { useState } from 'react';
import { FiCheck, FiCopy } from 'react-icons/fi';
import Button from './ui/Button';
import { Banner } from './ui/Feedback';
import { Dialog } from './ui/Overlay';
import { formatDateTime } from '../lib/format';

// Shows a one-time setup link exactly once. It is not stored anywhere readable afterwards.
export default function SetupLinkDialog({ link, onClose, who }) {
  const [copied, setCopied] = useState(false);
  if (!link) return null;
  const copy = async () => {
    try { await navigator.clipboard.writeText(link.url); setCopied(true); } catch { setCopied(false); }
  };
  return (
    <Dialog open onClose={onClose} size="sm" title="Share this setup link" footer={<Button onClick={onClose}>Done</Button>}>
      <p className="text-body">Send this link to <strong className="text-ink">{who}</strong> privately. They’ll choose their own password — nobody else ever sees it.</p>
      <div className="mt-4 rounded-xl border border-line bg-sunken p-3 flex items-center gap-2">
        <code className="flex-1 min-w-0 truncate text-[12.5px] font-mono text-ink" data-setup-link>{link.url}</code>
        <Button size="sm" variant="secondary" icon={copied ? FiCheck : FiCopy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
      </div>
      <Banner tone="warning" className="mt-4">This link is shown only once and works once. It expires {formatDateTime(link.expires)}. Campus Rush doesn’t send emails.</Banner>
    </Dialog>
  );
}
