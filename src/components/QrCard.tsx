import { useState } from "react";
import { Check, Copy, Download, ExternalLink } from "lucide-react";
import { cn } from "../utils/cn";
import { formatPaise, paiseToAmountString } from "../lib/upi";

interface QrCardProps {
  index: number;
  count: number;
  amountPaise: number;
  link: string;
  dataUrl?: string;
  paid: boolean;
  onTogglePaid: () => void;
  payeeName: string;
  upiId: string;
}

export function QrCard({
  index,
  count,
  amountPaise,
  link,
  dataUrl,
  paid,
  onTogglePaid,
  payeeName,
  upiId,
}: QrCardProps) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  function downloadQr() {
    if (!dataUrl) return;
    const anchor = document.createElement("a");
    anchor.href = dataUrl;
    anchor.download = `splitqr-${index + 1}-of-${count}-${paiseToAmountString(amountPaise)}.png`;
    anchor.click();
  }

  return (
    <article
      className={cn(
        "qr-card flex min-w-0 flex-col overflow-hidden rounded-[20px] border bg-white transition-colors duration-300",
        paid ? "border-[#92cdb8]" : "border-[#dce6e0] hover:border-[#9bc7b5]",
      )}
    >
      <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-4">
        <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-[#688089]">
          {count > 1 ? `Payment ${index + 1} / ${count}` : "Payment QR"}
        </span>
        <button
          type="button"
          onClick={onTogglePaid}
          aria-pressed={paid}
          className={cn(
            "no-print inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold transition-colors",
            paid
              ? "bg-[#dff4e9] text-[#087b68]"
              : "bg-[#eef2ef] text-[#62747d] hover:bg-[#e2eee7]",
          )}
        >
          {paid && <Check size={11} strokeWidth={3} />}
          {paid ? "Marked paid" : "Mark paid"}
        </button>
      </div>

      <div className="flex flex-1 flex-col items-center px-4 pb-4">
        <div className="rounded-xl border border-[#eaf0eb] bg-white p-2">
          {dataUrl ? (
            <img
              src={dataUrl}
              alt={`UPI QR code for ${formatPaise(amountPaise)}`}
              className="h-36 w-36 object-contain sm:h-40 sm:w-40"
            />
          ) : (
            <div className="h-36 w-36 animate-pulse rounded-md bg-[#edf2ee] sm:h-40 sm:w-40" />
          )}
        </div>
        <div className="mt-3 text-center text-2xl font-semibold tracking-[-0.04em] tabular-nums text-[#142d3e]">
          {formatPaise(amountPaise)}
        </div>
        <div className="mt-0.5 max-w-full truncate text-xs text-[#778991]">
          to {payeeName || "your payee"}
        </div>
        <div className="mt-1 max-w-full truncate text-[10px] text-[#859790]">
          UPI ID: {upiId}
        </div>
      </div>

      <div className="no-print flex border-t border-[#e8eee9] text-[#4b6571]">
        <button
          type="button"
          onClick={copyLink}
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors hover:bg-[#f4f8f5] hover:text-[#087b68]"
          aria-label={`Copy link for payment ${index + 1}`}
        >
          <Copy size={13} /> {copied ? "Copied" : "Copy"}
        </button>
        <button
          type="button"
          onClick={downloadQr}
          disabled={!dataUrl}
          className="flex flex-1 items-center justify-center gap-1.5 border-x border-[#e8eee9] py-3 text-xs font-semibold transition-colors hover:bg-[#f4f8f5] hover:text-[#087b68] disabled:cursor-not-allowed disabled:opacity-40"
          aria-label={`Download QR code for payment ${index + 1}`}
        >
          <Download size={13} /> PNG
        </button>
        <a
          href={link}
          className="flex flex-1 items-center justify-center gap-1.5 py-3 text-xs font-semibold transition-colors hover:bg-[#f4f8f5] hover:text-[#087b68]"
          aria-label={`Open payment ${index + 1} in a UPI app`}
        >
          <ExternalLink size={13} /> Open
        </a>
      </div>
    </article>
  );
}