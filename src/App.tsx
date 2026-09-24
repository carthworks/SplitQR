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

        <div id="top" className="relative mx-auto grid max-w-7xl items-center gap-8 px-5 pb-20 pt-16 sm:px-8 sm:pb-24 sm:pt-20 lg:grid-cols-[1.1fr_.9fr] lg:px-12 lg:pb-28 lg:pt-24">
          <div className="hero-content relative z-10 max-w-2xl">
            <p className="text-[11px] font-bold uppercase tracking-[0.24em] text-[#9be5c4]">
              The UPI charge guide + QR studio
            </p>
            <h1 className="mt-5 text-[clamp(72px,10vw,140px)] font-extrabold leading-[0.89] tracking-[-0.09em] text-white">
              Split<span className="text-[#a9ebc9]">QR</span><span className="text-[#68c6a2]">.</span>
            </h1>
            <h2 className="mt-8 text-2xl font-semibold tracking-[-0.035em] text-white sm:text-3xl">
              UPI charges, minus the guesswork.
            </h2>
            <p className="mt-4 max-w-xl text-[15px] leading-7 text-[#bbd0d1]">
              Check the merchant-side MDR for the real payment category, then make
              payment QRs when you genuinely need separate payers, instalments,
              or a bank transfer limit.
            </p>
            <a
              href="#calculator"
              className="mt-8 inline-flex items-center gap-3 rounded-xl bg-[#b0edcf] px-5 py-3.5 text-sm font-bold text-[#0b3039] transition-all hover:-translate-y-0.5 hover:bg-white"
            >
              Check a payment <ArrowDownRight size={18} />
            </a>
          </div>

          <div className="hero-art pointer-events-none relative hidden h-[420px] lg:block" aria-hidden="true">
            <svg viewBox="0 0 540 540" fill="none" className="absolute inset-0 h-full w-full">
              <circle cx="280" cy="270" r="218" stroke="#5b9a8b" strokeOpacity=".28" />
              <circle cx="280" cy="270" r="169" stroke="#5b9a8b" strokeOpacity=".38" />
              <circle cx="280" cy="270" r="118" stroke="#5b9a8b" strokeOpacity=".5" />
              <path d="M48 270H512M280 38V502" stroke="#5b9a8b" strokeOpacity=".19" />
              <path d="M90 398C177 301 262 315 332 222C371 169 422 151 486 139" stroke="#a9ebc9" strokeWidth="3" strokeLinecap="round" />
              <circle cx="90" cy="398" r="8" fill="#a9ebc9" />
              <circle cx="332" cy="222" r="8" fill="#a9ebc9" />
              <circle cx="486" cy="139" r="8" fill="#a9ebc9" />
              <rect x="215" y="211" width="136" height="136" rx="18" fill="#c7f6da" />
              <rect x="236" y="232" width="38" height="38" rx="5" fill="#102b3b" />
              <rect x="244" y="240" width="22" height="22" rx="2" fill="#c7f6da" />
              <rect x="291" y="232" width="38" height="38" rx="5" fill="#102b3b" />
              <rect x="299" y="240" width="22" height="22" rx="2" fill="#c7f6da" />
              <rect x="236" y="287" width="38" height="38" rx="5" fill="#102b3b" />
              <rect x="244" y="295" width="22" height="22" rx="2" fill="#c7f6da" />
              <path d="M294 292h13v13h-13zm22 0h13v13h-13zm-22 22h13v13h-13zm22 0h13v13h-13z" fill="#102b3b" />
            </svg>
            <div className="absolute -bottom-8 -right-16 h-40 w-40 rounded-full bg-[#59c99c]/15 blur-[80px]" />
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

        <section id="calculator" className="no-print mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
          <div className="max-w-2xl">
            <div className="section-index">01 / CHECK THE CHARGE</div>
            <h2 className="section-heading mt-4">What does this payment cost?</h2>
            <p className="section-copy mt-4">
              Choose the type of payment it actually is. The estimate is for one
              purchase at its full amount, not a fee prediction from a stack of QRs.
            </p>
          </div>

          <div className="mt-9 grid items-start gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(320px,.8fr)]">
            <div className="rounded-[26px] border border-[#dce6df] bg-white p-5 shadow-[0_12px_40px_rgba(13,54,43,.035)] sm:p-8">
              <div className="grid gap-6 sm:grid-cols-[1fr_205px]">
                <div>
                  <label htmlFor="estimate-amount" className="field-label">
                    Purchase amount
                  </label>
                  <div className="flex items-baseline border-b-2 border-[#c8dbd0] transition-colors focus-within:border-[#128c70]">
                    <span className="pb-2 text-2xl font-medium text-[#57736a]">₹</span>
                    <input
                      id="estimate-amount"
                      type="text"
                      inputMode="decimal"
                      value={amount}
                      onChange={(event) => setAmount(event.target.value)}
                      maxLength={18}
                      placeholder="10000"
                      className="w-full min-w-0 bg-transparent px-2 pb-2 text-4xl font-semibold tracking-[-0.05em] tabular-nums text-[#173243] outline-none placeholder:text-[#bdcbc2]"
                    />
                  </div>
                  {amount && !totalPaise && (
                    <p className="mt-1.5 text-xs text-[#ad523b]">Enter a valid amount in rupees.</p>
                  )}
                </div>
                <div>
                  <label htmlFor="estimate-date" className="field-label">
                    Date for estimate
                  </label>
                  <div className="flex items-center gap-2 border-b-2 border-[#c8dbd0] py-2.5 text-[#67817b] focus-within:border-[#128c70]">
                    <CalendarDays size={17} className="shrink-0" />
                    <input
                      id="estimate-date"
                      type="date"
                      value={paymentDate}
                      onChange={(event) =>
                        setPaymentDate(event.target.value || MDR_EFFECTIVE_DATE)
                      }
                      className="date-input min-w-0 w-full bg-transparent text-sm font-semibold text-[#173243] outline-none"
                    />
                  </div>
                  <p className="mt-1.5 text-[11px] text-[#879791]">
                    Poster rate starts 15 Oct 2026.
                  </p>
                </div>
              </div>

              <fieldset className="mt-9">
                <legend className="field-label mb-4">Actual payment type</legend>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PAYMENT_CATEGORIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={category === item.id}
                      onClick={() => {
                        setCategory(item.id);
                        setProviderConfirmed(false);
                      }}
                      className={cn(
                        "category-choice group flex min-h-[90px] items-start gap-3 rounded-2xl border p-3.5 text-left transition-all duration-200",
                        category === item.id
                          ? "border-[#238c70] bg-[#eaf6ef] shadow-[0_4px_16px_rgba(12,113,83,.08)]"
                          : "border-[#e2eae4] bg-white hover:border-[#accdbb] hover:bg-[#fafcf9]",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 inline-flex min-w-[53px] justify-center rounded-md px-1.5 py-1 text-[10px] font-bold tracking-[0.06em]",
                          category === item.id
                            ? "bg-[#c6e8d3] text-[#06684f]"
                            : "bg-[#edf2ee] text-[#597069]",
                        )}
                      >
                        {item.code}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-[13px] font-bold leading-5 text-[#1a3440]">
                          {item.name}
                        </span>
                        <span className="mt-0.5 block text-xs leading-5 text-[#70827d]">
                          {item.description}
                        </span>
                      </span>
                    </button>
                  ))}
                </div>
              </fieldset>

              {isSpecialCategory && (
                <label className="mt-6 flex cursor-pointer items-start gap-3 border-t border-[#e7eee8] pt-5">
                  <input
                    type="checkbox"
                    checked={providerConfirmed}
                    onChange={(event) => setProviderConfirmed(event.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 accent-[#087b68]"
                  />
                  <span>
                    <span className="block text-[13px] font-semibold text-[#1d3946]">
                      My bank or PSP confirms this classification
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-[#71837e]">
                      If not confirmed, the estimate uses the standard P2M rate. A
                      selection here cannot change the category of a real payment.
                    </span>
                  </span>
                </label>
              )}

              {category === "p2p" && (
                <p className="mt-5 border-t border-[#e7eee8] pt-4 text-xs leading-5 text-[#71837e]">
                  P2P means a personal transfer. Money received for goods or services
                  is a merchant payment, even when sent to a personal-looking UPI ID.
                </p>
              )}
            </div>

            <div className="result-panel flex min-h-[440px] flex-col rounded-[26px] bg-[#123545] p-6 text-white sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <span className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#a9d8cc]">
                  Estimated merchant MDR
                </span>
                <span className="font-mono text-[11px] text-[#80adab]">
                  {selectedCategory?.code}
                </span>
              </div>
              <div aria-live="polite" className="result-number mt-8 text-[clamp(48px,5vw,72px)] font-semibold leading-none tracking-[-0.075em] tabular-nums text-white">
                {formatPaise(estimate.feePaise)}
              </div>
              <p className="mt-4 min-h-[48px] max-w-sm text-sm leading-6 text-[#afced0]">
                {estimate.basis}
              </p>

              {estimate.awaitingConfirmation && estimate.feePaise > 0 && !estimate.beforeEffectiveDate && (
                <div className="mt-5 flex items-start gap-2 border-l-2 border-[#d5c67d] pl-3 text-xs leading-5 text-[#e4dbb2]">
                  <Info size={15} className="mt-0.5 shrink-0" />
                  The special rate is not applied until you confirm your provider's classification.
                </div>
              )}

              <div className="mt-auto pt-10">
                <div className="border-t border-white/15 py-4 text-sm">
                  <div className="flex justify-between gap-5">
                    <span className="text-[#aac9ca]">Customer pays</span>
                    <strong className="font-semibold tabular-nums text-white">
                      {formatPaise(totalPaise)}
                    </strong>
                  </div>
                  <div className="mt-3 flex justify-between gap-5">
                    <span className="text-[#aac9ca]">After estimated MDR</span>
                    <strong className="font-semibold tabular-nums text-[#a9ebc9]">
                      {formatPaise(Math.max(0, totalPaise - estimate.feePaise))}
                    </strong>
                  </div>
                </div>
                <p className="border-t border-white/15 pt-4 text-xs leading-5 text-[#8eafb2]">
                  Indicative only for bank-account UPI. Your acquirer's classification
                  and settlement terms control the actual charge. MDR is not GST.
                </p>
              </div>
            </div>
          </div>
        </section>

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