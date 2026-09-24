/**
 * Core money + UPI helpers.
 *
 * All internal math is done in PAISE (integers) so we never hit floating
 * point rounding problems like 0.1 + 0.2 !== 0.3.
 */

export type Strategy = "cap" | "even" | "parts";

export interface SplitConfig {
  totalPaise: number;
  capPaise: number;
  parts: number;
  strategy: Strategy;
}

export interface Payee {
  vpa: string;
  name: string;
  note: string;
}

export const MAX_PARTS = 60;

/* ------------------------------------------------------------------ */
/* Formatting                                                          */
/* ------------------------------------------------------------------ */

const inr = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatPaise(paise: number): string {
  return inr.format(paise / 100);
}

/** "1234.5" -> 123450 paise. Returns 0 for incomplete or invalid input. */
export function parseAmountToPaise(value: string): number {
  const cleaned = value.trim().replace(/,/g, "");
  if (!/^\d+(?:\.\d{0,2})?$/.test(cleaned)) return 0;
  const [rupees, paise = ""] = cleaned.split(".");
  const result = Number(rupees) * 100 + Number(paise.padEnd(2, "0"));
  return Number.isSafeInteger(result) ? result : 0;
}

/** 199900 -> "1999.00" (the exact string UPI apps expect in `am=`). */
export function paiseToAmountString(paise: number): string {
  return (paise / 100).toFixed(2);
}

/* ------------------------------------------------------------------ */
/* Validation                                                          */
/* ------------------------------------------------------------------ */

const VPA_RE = /^[a-zA-Z0-9._-]{2,64}@[a-zA-Z][a-zA-Z0-9.]{1,32}$/;

export function isValidVpa(vpa: string): boolean {
  return VPA_RE.test(vpa.trim());
}

/* ------------------------------------------------------------------ */
/* Splitting                                                           */
/* ------------------------------------------------------------------ */

/**
 * Split a total into a list of part amounts (paise).
 *
 * - `cap`   : fill each part to the cap, last part carries the remainder.
 * - `even`  : use the smallest number of parts that fits under the cap,
 *             then make every part as equal as possible.
 * - `parts` : user picks the number of parts, split as equally as possible.
 */
export function splitAmount(cfg: SplitConfig): number[] {
  const { totalPaise, capPaise, strategy } = cfg;
  if (totalPaise <= 0) return [];

  if (strategy === "parts") {
    const n = clamp(Math.round(cfg.parts) || 1, 1, Math.min(MAX_PARTS, totalPaise));
    return distributeEvenly(totalPaise, n);
  }

  if (capPaise <= 0) return [];

  const needed = Math.ceil(totalPaise / capPaise);
  if (needed > MAX_PARTS) return [];
  const n = clamp(needed, 1, MAX_PARTS);

  if (strategy === "even") return distributeEvenly(totalPaise, n);

  // strategy === "cap"
  const out: number[] = [];
  let left = totalPaise;
  for (let i = 0; i < n; i++) {
    const take = Math.min(capPaise, left);
    out.push(take);
    left -= take;
  }
  return out;
}

/** Split `total` across `n` parts, pushing leftover paise onto the first parts. */
function distributeEvenly(total: number, n: number): number[] {
  const base = Math.floor(total / n);
  const extra = total - base * n;
  return Array.from({ length: n }, (_, i) => base + (i < extra ? 1 : 0));
}

export function clamp(v: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, v));
}

/* ------------------------------------------------------------------ */
/* UPI deep link                                                       */
/* ------------------------------------------------------------------ */

export interface LinkParams {
  payee: Payee;
  amountPaise: number;
  index: number;
  count: number;
}

/**
 * Builds a NPCI UPI deep link:
 *   upi://pay?pa=<vpa>&pn=<name>&am=<amount>&cu=INR&tn=<note>
 * Any UPI app (GPay / PhonePe / Paytm / BHIM / bank apps) can scan this.
 */
export function buildUpiLink({ payee, amountPaise, index, count }: LinkParams): string {
  const params = new URLSearchParams();
  params.set("pa", payee.vpa.trim());
  params.set("pn", payee.name.trim() || payee.vpa.trim());
  params.set("am", paiseToAmountString(amountPaise));
  params.set("cu", "INR");
  const base = payee.note.trim() || "Payment";
  params.set("tn", count > 1 ? `${base} ${index + 1}/${count}` : base);
  // The UPI linking specification represents spaces as %20, not form-style +.
  return `upi://pay?${params.toString().replace(/\+/g, "%20")}`;
}
