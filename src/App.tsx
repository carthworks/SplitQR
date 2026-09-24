import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  CalendarDays,
  Copy,
  Info,
  LockKeyhole,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { ChargeGuide } from "./components/ChargeGuide";
import { QrCard } from "./components/QrCard";
import { useQrCodes } from "./lib/useQrCodes";
import {
  estimateMdr,
  MDR_EFFECTIVE_DATE,
  PAYMENT_CATEGORIES,
  SPECIAL_CATEGORIES,
  type PaymentCategory,
} from "./lib/mdr";
import {
  MAX_PARTS,
  buildUpiLink,
  clamp,
  formatPaise,
  isValidVpa,
  parseAmountToPaise,
  splitAmount,
  type Strategy,
} from "./lib/upi";
import { cn } from "./utils/cn";

type CollectionPlan = "single" | Strategy;

interface SavedDetails {
  vpa: string;
  name: string;
  note: string;
  cap: string;
  plan: CollectionPlan;
}

const STORAGE_KEY = "splitqr.v2";

function loadSaved(): Partial<SavedDetails> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

export default function App() {
  const saved = useMemo(loadSaved, []);

  const [amount, setAmount] = useState("10000");
  const [paymentDate, setPaymentDate] = useState(MDR_EFFECTIVE_DATE);
  const [category, setCategory] = useState<PaymentCategory>("p2m");
  const [providerConfirmed, setProviderConfirmed] = useState(false);

  const [vpa, setVpa] = useState(saved.vpa ?? "");
  const [name, setName] = useState(saved.name ?? "");
  const [note, setNote] = useState(saved.note ?? "Payment");
  const [cap, setCap] = useState(saved.cap ?? "5000");
  const [plan, setPlan] = useState<CollectionPlan>(saved.plan ?? "single");
  const [fixedCount, setFixedCount] = useState(3);
  const [paid, setPaid] = useState<Record<number, boolean>>({});
  const [copyStatus, setCopyStatus] = useState("");

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ vpa, name, note, cap, plan }),
      );
    } catch {
      // Storage may be disabled in a private browser window.
    }
  }, [vpa, name, note, cap, plan]);

  const totalPaise = parseAmountToPaise(amount);
  const capPaise = parseAmountToPaise(cap);
  const isSpecialCategory = SPECIAL_CATEGORIES.includes(category);
  const estimate = estimateMdr(
    totalPaise,
    category,
    paymentDate,
    providerConfirmed,
  );
  const selectedCategory = PAYMENT_CATEGORIES.find((item) => item.id === category);
  const vpaIsValid = isValidVpa(vpa);
  const usesCap = plan === "cap" || plan === "even";
  const exceedsQrLimit =
    usesCap && capPaise > 0 && Math.ceil(totalPaise / capPaise) > MAX_PARTS;

  const parts = useMemo(() => {
    if (totalPaise <= 0) return [];
    if (plan === "single") return [totalPaise];
    return splitAmount({
      totalPaise,
      capPaise,
      parts: fixedCount,
      strategy: plan,
    });
  }, [totalPaise, capPaise, fixedCount, plan]);

  const links = useMemo(() => {
    if (!vpaIsValid) return [];
    return parts.map((part, index) =>
      buildUpiLink({
        payee: { vpa, name, note },
        amountPaise: part,
        index,
        count: parts.length,
      }),
    );
  }, [parts, vpaIsValid, vpa, name, note]);

  const qrImages = useQrCodes(links);
  const paymentSignature = `${vpa}|${name}|${note}|${parts.join(",")}`;
  useEffect(() => setPaid({}), [paymentSignature]);

  const paidPaise = parts.reduce((sum, part, index) => sum + (paid[index] ? part : 0), 0);
  const paidCount = parts.filter((_, index) => paid[index]).length;
  const progress = totalPaise > 0 ? (paidPaise / totalPaise) * 100 : 0;
  const qrsReady = links.length > 0 && links.every((link) => !!qrImages[link]);

  async function copyAllLinks() {
    if (links.length === 0) return;
    const text = parts
      .map((part, index) => `${index + 1}. ${formatPaise(part)}  ${links[index]}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Links copied to clipboard.");
    } catch {
      setCopyStatus("Clipboard unavailable. Try copying an individual link.");
    }
    window.setTimeout(() => setCopyStatus(""), 2500);
  }

  return (
    <div className="min-h-screen bg-[#f5f7f4] text-[#172f3d]">
      <header className="no-print overflow-hidden bg-[#102b3b] text-white">
        <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between border-b border-white/10 px-5 py-5 sm:px-8 lg:px-12">
          <a href="#top" className="flex items-center gap-2.5" aria-label="SplitQR home">
            <span className="flex h-8 w-8 items-center justify-center rounded-[9px] bg-[#b0edcf] text-[#102b3b]">
              <QrCode size={18} strokeWidth={2.5} />
            </span>
            <span className="text-[18px] font-bold tracking-[-0.05em]">SplitQR</span>
          </a>
          <div className="hidden items-center gap-8 text-sm font-medium text-[#bed0d0] sm:flex">
            <a href="#calculator" className="transition-colors hover:text-white">
              Fee check
            </a>
            <a href="#guide" className="transition-colors hover:text-white">
              Rate guide
            </a>
            <a href="#collect" className="transition-colors hover:text-white">
              QR studio
            </a>
          </div>
          <a
            href="#collect"
            className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-xs font-semibold transition-colors hover:border-[#b0edcf] hover:text-[#b0edcf] sm:px-4"
          >
            Create a QR <ArrowUpRight size={14} />
          </a>
        </nav>

        <div id="top" className="relative mx-auto grid max-w-7xl items-start gap-10 px-5 pb-16 pt-12 sm:px-8 sm:pb-20 sm:pt-16 lg:grid-cols-[1fr_1.15fr] lg:gap-12 lg:px-12 lg:pb-24 lg:pt-16">
          <div className="hero-content relative z-10 max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#5b9a8b]/35 bg-[#163c4e]/70 px-3.5 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#a9ebc9]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#59c99c] animate-pulse" />
              The UPI charge guide + QR studio
            </div>
            <h1 className="mt-5 text-[clamp(60px,8vw,112px)] font-extrabold leading-[0.92] tracking-[-0.08em] text-white">
              Split<span className="text-[#a9ebc9]">QR</span><span className="text-[#68c6a2]">.</span>
            </h1>
            <h2 className="mt-6 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">
              UPI charges, minus the guesswork.
            </h2>
            <p className="mt-4 max-w-lg text-[15px] leading-7 text-[#bbd0d1]">
              Check the merchant-side MDR for the real payment category, then make
              payment QRs when you genuinely need separate payers, instalments,
              or a bank transfer limit.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3.5">
              <a
                href="#collect"
                className="inline-flex items-center gap-2.5 rounded-xl bg-[#b0edcf] px-5 py-3 text-sm font-bold text-[#0b3039] transition-all hover:-translate-y-0.5 hover:bg-white shadow-[0_4px_20px_rgba(176,237,207,0.22)]"
              >
                Create a QR <ArrowRight size={16} />
              </a>
              <a
                href="#guide"
                className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white transition-all hover:bg-white/10 hover:border-white/30"
              >
                Rate card <ArrowDownRight size={16} />
              </a>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-4 border-t border-white/10 pt-6 text-xs text-[#9bb3b5]">
              <div>
                <div className="font-semibold text-white">100% Client-Side</div>
                <div className="mt-0.5 text-[#829e9f]">Zero server tracking or logs</div>
              </div>
              <div>
                <div className="font-semibold text-white">Oct 15, 2026 MDR</div>
                <div className="mt-0.5 text-[#829e9f]">Official NPCI &amp; PIB rates</div>
              </div>
            </div>
          </div>

          <div
            id="calculator"
            className="hero-art relative z-10 w-full rounded-[28px] border border-white/15 bg-[#0b2432]/95 p-5 shadow-[0_20px_50px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-7"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 pb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#1b5042] text-[10px] font-bold text-[#a9ebc9]">
                  01
                </span>
                <span className="text-[11px] font-extrabold tracking-[0.16em] uppercase text-[#a9ebc9]">
                  CHECK THE CHARGE
                </span>
              </div>
              <span className="rounded-md bg-white/10 px-2 py-0.5 font-mono text-[10px] text-[#93c1b6]">
                {selectedCategory?.code || "P2M"}
              </span>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_175px]">
              <div>
                <label htmlFor="estimate-amount" className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#94b0a8]">
                  Purchase amount
                </label>
                <div className="mt-1.5 flex items-baseline border-b-2 border-white/20 pb-1.5 transition-colors focus-within:border-[#a9ebc9]">
                  <span className="text-2xl font-medium text-[#7fa397]">₹</span>
                  <input
                    id="estimate-amount"
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    maxLength={18}
                    placeholder="10000"
                    className="w-full min-w-0 bg-transparent px-2 text-3xl font-semibold tracking-tight tabular-nums text-white outline-none placeholder:text-white/30"
                  />
                </div>
                {amount && !totalPaise && (
                  <p className="mt-1 text-xs text-[#f68f7b]">Enter a valid amount in rupees.</p>
                )}
              </div>

              <div>
                <label htmlFor="estimate-date" className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#94b0a8]">
                  Estimate date
                </label>
                <div className="mt-1.5 flex items-center gap-2 border-b-2 border-white/20 pb-2 text-[#9bb0aa] focus-within:border-[#a9ebc9]">
                  <CalendarDays size={16} className="shrink-0 text-[#a9ebc9]" />
                  <input
                    id="estimate-date"
                    type="date"
                    value={paymentDate}
                    onChange={(event) =>
                      setPaymentDate(event.target.value || MDR_EFFECTIVE_DATE)
                    }
                    className="date-input w-full min-w-0 bg-transparent text-xs font-semibold text-white outline-none [color-scheme:dark]"
                  />
                </div>
                <p className="mt-1 text-[10px] text-[#78938c]">
                  Poster starts 15 Oct 2026.
                </p>
              </div>
            </div>

            <div className="mt-5">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-[0.12em] text-[#94b0a8]">
                  Actual payment category
                </span>
                <span className="text-[10px] text-[#7e9992]">Choose real sale type</span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {PAYMENT_CATEGORIES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-pressed={category === item.id}
                    onClick={() => {
                      setCategory(item.id);
                      setProviderConfirmed(false);
                    }}
                    title={item.description}
                    className={cn(
                      "group relative flex flex-col justify-between rounded-xl border p-2.5 text-left transition-all duration-150",
                      category === item.id
                        ? "border-[#59c99c] bg-[#16473b]/70 shadow-[0_0_15px_rgba(89,201,156,0.15)] ring-1 ring-[#59c99c]"
                        : "border-white/10 bg-white/5 hover:border-white/25 hover:bg-white/10"
                    )}
                  >
                    <div className="flex items-center justify-between gap-1 w-full">
                      <span
                        className={cn(
                          "rounded px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider",
                          category === item.id ? "bg-[#59c99c] text-[#0b2432]" : "bg-white/10 text-[#a0b8b2]"
                        )}
                      >
                        {item.code}
                      </span>
                    </div>
                    <span className="mt-1.5 block text-xs font-semibold leading-tight text-white">
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {isSpecialCategory && (
              <label className="mt-3.5 flex cursor-pointer items-start gap-2.5 rounded-xl border border-[#d5c67d]/30 bg-[#2b3525]/60 p-2.5 text-xs text-[#e4dbb2]">
                <input
                  type="checkbox"
                  checked={providerConfirmed}
                  onChange={(event) => setProviderConfirmed(event.target.checked)}
                  className="mt-0.5 h-3.5 w-3.5 shrink-0 accent-[#59c99c]"
                />
                <span className="text-[11px] leading-4">
                  <strong className="text-white">Bank/PSP confirmed this classification.</strong> Without confirmation, standard P2M applies.
                </span>
              </label>
            )}

            {category === "p2p" && (
              <p className="mt-3 text-[11px] leading-4 text-[#8ea49d]">
                P2P applies only to personal transfers. Sale proceeds to a personal UPI ID remain merchant transactions under guidelines.
              </p>
            )}

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#071822] p-4 text-white">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#93c1b6]">
                    Estimated Merchant MDR
                  </span>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="text-3xl sm:text-4xl font-extrabold tracking-tight tabular-nums text-[#a9ebc9]">
                      {formatPaise(estimate.feePaise)}
                    </span>
                    <span className="text-xs text-[#8aa69e]">
                      {estimate.feePaise === 0 ? "(Zero Fee)" : `(${selectedCategory?.code || "MDR"})`}
                    </span>
                  </div>
                </div>
                <a
                  href="#collect"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-lg bg-[#59c99c] px-3 py-2 text-xs font-bold text-[#0b2432] transition hover:bg-[#a9ebc9]"
                >
                  Collect <ArrowRight size={13} />
                </a>
              </div>

              <p className="mt-2 text-xs leading-5 text-[#88a9a4]">
                {estimate.basis}
              </p>

              {estimate.awaitingConfirmation && estimate.feePaise > 0 && !estimate.beforeEffectiveDate && (
                <div className="mt-2.5 flex items-start gap-1.5 text-[11px] leading-4 text-[#e0cf85]">
                  <Info size={14} className="mt-0.5 shrink-0" />
                  Special rate pending provider classification confirmation.
                </div>
              )}

              <div className="mt-3.5 grid grid-cols-2 gap-3 border-t border-white/10 pt-3 text-xs">
                <div>
                  <span className="text-[11px] text-[#7e9992]">Customer Pays</span>
                  <div className="font-semibold tabular-nums text-white">
                    {formatPaise(totalPaise)}
                  </div>
                </div>
                <div>
                  <span className="text-[11px] text-[#7e9992]">Net to Merchant</span>
                  <div className="font-semibold tabular-nums text-[#a9ebc9]">
                    {formatPaise(Math.max(0, totalPaise - estimate.feePaise))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main>
        <div className="no-print border-b border-[#dce5df] bg-[#eaf3ec]">
          <div className="mx-auto flex max-w-7xl items-start gap-3 px-5 py-4 text-sm text-[#31584e] sm:items-center sm:px-8 lg:px-12">
            <ShieldCheck size={18} className="mt-0.5 shrink-0 text-[#13816b] sm:mt-0" />
            <p>
              <strong className="font-semibold">Customers pay no new UPI charge.</strong>{" "}
              The poster describes merchant-side MDR from 15 October 2026. It is not
              a tax or a reason to re-label a sale as P2P.
            </p>
          </div>
        </div>

        <ChargeGuide />

        <section id="collect" className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="no-print max-w-2xl">
            <div className="section-index">03 / CREATE A PAYMENT</div>
            <h2 className="section-heading mt-4">Collect with clarity.</h2>
            <p className="section-copy mt-4">
              Generate a UPI QR for the amount above. Multiple requests are for
              genuine payment limits, separate payers or instalments, not for
              avoiding MDR or tax.
            </p>
          </div>

          <div className="mt-9 grid items-start gap-8 lg:grid-cols-[minmax(330px,.8fr)_minmax(0,1.2fr)]">
            <div className="no-print rounded-[26px] border border-[#dce6df] bg-white p-5 shadow-[0_12px_40px_rgba(13,54,43,.035)] sm:p-8">
              <h3 className="text-lg font-semibold tracking-tight text-[#173243]">
                Payment details
              </h3>
              <p className="mt-1 text-xs leading-5 text-[#778982]">
                Only use a UPI ID you control. Details stay in this browser.
              </p>

              <div className="mt-6 space-y-5">
                <div>
                  <label htmlFor="collect-amount" className="field-label">
                    Amount to collect
                  </label>
                  <div className="input-shell flex items-center gap-2">
                    <span className="font-medium text-[#68807a]">₹</span>
                    <input
                      id="collect-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      maxLength={18}
                      placeholder="10000"
                      className="w-full min-w-0 bg-transparent text-sm font-semibold tabular-nums outline-none placeholder:text-[#a5b5ae]"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="upi-id" className="field-label">
                    Your UPI ID <span className="text-[#bb674c]">*</span>
                  </label>
                  <input
                    id="upi-id"
                    type="text"
                    value={vpa}
                    onChange={(event) => setVpa(event.target.value)}
                    autoCapitalize="none"
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={96}
                    placeholder="yourname@upi"
                    aria-invalid={!!vpa && !vpaIsValid}
                    className={cn("input-shell w-full text-sm", vpa && !vpaIsValid && "border-[#c67660]")}
                  />
                  {vpa && !vpaIsValid && (
                    <p className="mt-1.5 text-xs text-[#ac523d]">
                      Use a valid UPI ID, such as name@bank.
                    </p>
                  )}
                </div>

                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
                  <div>
                    <label htmlFor="payee-name" className="field-label">
                      Payee name
                    </label>
                    <input
                      id="payee-name"
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      maxLength={60}
                      placeholder="Your business name"
                      className="input-shell w-full text-sm"
                    />
                  </div>
                  <div>
                    <label htmlFor="payment-note" className="field-label">
                      Payment note
                    </label>
                    <input
                      id="payment-note"
                      type="text"
                      value={note}
                      onChange={(event) => setNote(event.target.value)}
                      maxLength={50}
                      placeholder="Invoice 104"
                      className="input-shell w-full text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 border-t border-[#e7eee8] pt-6">
                <div className="field-label">Collection plan</div>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    aria-pressed={plan === "single"}
                    onClick={() => setPlan("single")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors",
                      plan === "single"
                        ? "border-[#23936f] bg-[#e9f6ed] text-[#096951]"
                        : "border-[#dce6df] text-[#587168] hover:border-[#96c8aa]",
                    )}
                  >
                    One QR
                  </button>
                  <button
                    type="button"
                    aria-pressed={plan !== "single"}
                    onClick={() => plan === "single" && setPlan("cap")}
                    className={cn(
                      "rounded-xl border px-3 py-3 text-left text-sm font-semibold transition-colors",
                      plan !== "single"
                        ? "border-[#23936f] bg-[#e9f6ed] text-[#096951]"
                        : "border-[#dce6df] text-[#587168] hover:border-[#96c8aa]",
                    )}
                  >
                    Multiple payments
                  </button>
                </div>

                {plan !== "single" && (
                  <div className="mt-5 animate-reveal">
                    <p className="text-xs leading-5 text-[#647d75]">
                      For a real bank cap, planned instalments, or genuinely
                      separate payers. This does not change the original sale's
                      classification, tax or amount in your records.
                    </p>
                    <div className="mt-4 grid grid-cols-3 gap-1 rounded-xl bg-[#edf2ed] p-1">
                      {([
                        ["cap", "Fill to cap"],
                        ["even", "Balance"],
                        ["parts", "Fixed count"],
                      ] as const).map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setPlan(value)}
                          aria-pressed={plan === value}
                          className={cn(
                            "rounded-lg px-1 py-2 text-[11px] font-semibold transition-colors",
                            plan === value
                              ? "bg-white text-[#176b56] shadow-sm"
                              : "text-[#688078] hover:text-[#174436]",
                          )}
                        >
                          {label}
                        </button>
                      ))}
                    </div>

                    {usesCap ? (
                      <div className="mt-5">
                        <label htmlFor="per-transfer-cap" className="field-label">
                          Your actual per-transfer limit
                        </label>
                        <div className="input-shell flex items-center gap-2">
                          <span className="font-medium text-[#68807a]">₹</span>
                          <input
                            id="per-transfer-cap"
                            type="text"
                            inputMode="decimal"
                            value={cap}
                            onChange={(event) => setCap(event.target.value)}
                            maxLength={18}
                            placeholder="Enter your bank limit"
                            className="w-full min-w-0 bg-transparent text-sm font-semibold tabular-nums outline-none"
                          />
                        </div>
                        <p className="mt-1.5 text-[11px] leading-5 text-[#81938c]">
                          Enter a real bank or app limit. ₹2,000 in the poster is
                          an MDR threshold, not a universal transfer limit.
                        </p>
                      </div>
                    ) : (
                      <div className="mt-5">
                        <label htmlFor="part-count" className="field-label">
                          Number of people or instalments
                        </label>
                        <input
                          id="part-count"
                          type="number"
                          min="1"
                          max="20"
                          value={fixedCount}
                          onChange={(event) =>
                            setFixedCount(
                              clamp(Math.trunc(Number(event.target.value)) || 1, 1, 20),
                            )
                          }
                          className="input-shell w-full text-sm font-semibold tabular-nums"
                        />
                        <p className="mt-1.5 text-[11px] leading-5 text-[#81938c]">
                          Remainder paise are spread across the first requests.
                        </p>
                        {totalPaise > 0 && parts.length < fixedCount && (
                          <p className="mt-1.5 text-[11px] leading-5 text-[#aa583e]">
                            This amount can make only {parts.length} non-zero payment
                            {parts.length === 1 ? "" : "s"}.
                          </p>
                        )}
                      </div>
                    )}

                    {usesCap && capPaise <= 0 && (
                      <p role="alert" className="mt-3 text-xs text-[#aa583e]">
                        Enter a valid per-transfer limit to generate QRs.
                      </p>
                    )}
                    {exceedsQrLimit && (
                      <p role="alert" className="mt-3 text-xs leading-5 text-[#aa583e]">
                        This limit needs more than {MAX_PARTS} payments. Use a higher
                        genuine transfer limit or ask your bank for another option.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-7 flex items-start gap-2 border-t border-[#e7eee8] pt-5 text-xs leading-5 text-[#778b83]">
                <LockKeyhole size={15} className="mt-0.5 shrink-0 text-[#17846c]" />
                QRs are generated on your device. The bank or PSP, not this
                form, determines whether the payee is P2P, P2M or P2PM. Use a
                PSP-issued merchant QR if your provider requires one.
              </div>
            </div>

            <div className="min-w-0 print-output">
              <div className="no-print flex flex-wrap items-end justify-between gap-4 border-b border-[#dce5df] pb-4">
                <div>
                  <h3 className="text-xl font-semibold tracking-tight text-[#173243]">
                    Your payment sheet
                  </h3>
                  <p className="mt-1 text-xs text-[#7a8d85]">
                    {parts.length > 0
                      ? `${parts.length} QR ${parts.length === 1 ? "code" : "codes"} for ${formatPaise(totalPaise)}`
                      : "Enter payment details to begin"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={copyAllLinks}
                    disabled={links.length === 0}
                    className="toolbar-button"
                  >
                    <Copy size={14} /> {links.length === 1 ? "Copy link" : "Copy links"}
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    disabled={!qrsReady}
                    className="toolbar-button"
                  >
                    <Printer size={14} /> Print
                  </button>
                </div>
              </div>

              <div className="print-title hidden">
                SplitQR payment sheet<br />
                <span>
                  {name || vpa} | {formatPaise(totalPaise)} | {parts.length} payment
                  {parts.length === 1 ? "" : "s"}
                </span>
              </div>

              {copyStatus && (
                <p role="status" className="no-print mt-3 text-xs font-medium text-[#087b68]">
                  {copyStatus}
                </p>
              )}

              {links.length > 0 && (
                <div className="no-print mt-5">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#6c8179]">
                    <span>
                      Marked paid: <strong className="font-semibold text-[#183c34]">{formatPaise(paidPaise)}</strong>
                    </span>
                    <span>{paidCount} of {parts.length} marked</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e3ebe4]">
                    <div
                      className="h-full rounded-full bg-[#159672] transition-[width] duration-500 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-[11px] leading-5 text-[#87978f]">
                    This is a manual checklist, not payment verification. Confirm every
                    receipt in your UPI or bank statement.
                  </p>
                </div>
              )}

              {links.length > 0 ? (
                <div className="mt-6 grid gap-3 sm:grid-cols-2">
                  {parts.map((part, index) => (
                    <QrCard
                      key={`${index}-${part}`}
                      index={index}
                      count={parts.length}
                      amountPaise={part}
                      link={links[index]}
                      dataUrl={qrImages[links[index]]}
                      paid={!!paid[index]}
                      onTogglePaid={() =>
                        setPaid((previous) => ({
                          ...previous,
                          [index]: !previous[index],
                        }))
                      }
                      payeeName={name || vpa}
                      upiId={vpa}
                    />
                  ))}
                </div>
              ) : (
                <div className="no-print mt-6 flex min-h-[330px] flex-col items-center justify-center rounded-[24px] border border-dashed border-[#c8d8cc] bg-white/60 px-8 text-center">
                  <div className="flex h-16 w-16 items-center justify-center rounded-[18px] bg-[#e6f2e9] text-[#198568]">
                    <QrCode size={30} />
                  </div>
                  <h4 className="mt-5 text-lg font-semibold tracking-tight text-[#173243]">
                    {exceedsQrLimit
                      ? "Too many requests for that limit"
                      : usesCap && capPaise <= 0
                        ? "Add a valid transfer limit"
                        : totalPaise <= 0
                          ? "Add an amount to collect"
                          : "Your QR will appear here"}
                  </h4>
                  <p className="mt-2 max-w-xs text-sm leading-6 text-[#7b8d85]">
                    {vpa && !vpaIsValid
                      ? "Check the UPI ID format, for example name@bank."
                      : "Enter your UPI ID to create a scannable payment request. No details are sent to a server."}
                  </p>
                </div>
              )}

              {links.length > 0 && (
                <p className="no-print mt-5 flex items-start gap-2 text-xs leading-5 text-[#71847b]">
                  <Info size={15} className="mt-0.5 shrink-0 text-[#0e8168]" />
                  The MDR estimate above stays based on the full original purchase.
                  Multiple QRs do not automatically qualify for a lower charge.
                  Ask the payer to verify the UPI ID and amount before entering a PIN.
                </p>
              )}
            </div>
          </div>
        </section>
      </main>

      <footer className="no-print border-t border-[#dce5df] bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 px-5 py-8 text-xs leading-6 text-[#748880] sm:flex-row sm:items-center sm:justify-between sm:px-8 lg:px-12">
          <div className="flex items-center gap-2 font-bold text-[#183c35]">
            <QrCode size={18} className="text-[#0d8c6d]" /> SplitQR
          </div>
          <p className="max-w-2xl">
            Indicative MDR guidance for bank-account UPI, not tax or legal advice.
            Always verify current NPCI and provider terms. Your full sale remains
            reportable regardless of how payment is collected.
          </p>
          <a href="#top" className="inline-flex shrink-0 items-center gap-1 font-semibold text-[#087b68] hover:underline">
            Back to top <ArrowRight size={14} className="-rotate-90" />
          </a>
        </div>
      </footer>
    </div>
  );
}