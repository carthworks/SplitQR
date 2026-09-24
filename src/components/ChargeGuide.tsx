import { ArrowUpRight, Check, Info } from "lucide-react";
import {
  estimateMdr,
  MDR_EFFECTIVE_DATE,
  NPCI_FAQ_URL,
  PIB_RELEASE_URL,
} from "../lib/mdr";
import { formatPaise } from "../lib/upi";

const ROWS = [
  {
    type: "P2P",
    detail: "Personal transfers",
    condition: "Any permitted amount",
    rate: "₹0",
    bearer: "No MDR",
  },
  {
    type: "P2M",
    detail: "Standard merchant",
    condition: "Up to and including ₹2,000",
    rate: "₹0",
    bearer: "No MDR",
  },
  {
    type: "P2M",
    detail: "Standard merchant",
    condition: "Above ₹2,000",
    rate: "0.4%, max ₹300",
    bearer: "Merchant / ecosystem",
  },
  {
    type: "P2PM",
    detail: "Eligible small merchant",
    condition: "Provider-confirmed; up to ₹1L/month QR receipts",
    rate: "₹0",
    bearer: "No MDR",
  },
  {
    type: "SECTOR",
    detail: "Notified essentials",
    condition: "Rail, fuel, telecom, insurance, etc.; over ₹2,000",
    rate: "₹5 flat",
    bearer: "Merchant / ecosystem",
  },
  {
    type: "RURAL",
    detail: "Qualifying rural QR",
    condition: "Eligible P2PM in rural / semi-urban areas",
    rate: "₹0",
    bearer: "No MDR",
  },
  {
    type: "MARKET",
    detail: "Capital markets",
    condition: "Qualifying payments above ₹2,000",
    rate: "0.02%, max ₹300",
    bearer: "Merchant / ecosystem",
  },
];

const EXAMPLES = [500, 2000, 2001, 5000, 10_000, 75_000, 100_000];

export function ChargeGuide() {
  return (
    <section id="guide" className="no-print border-y border-[#dce5df] bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-12">
        <div className="mb-10 max-w-2xl">
          <div className="section-index">02 / THE RATE CARD</div>
          <h2 className="section-heading mt-4">The poster, decoded.</h2>
          <p className="section-copy mt-4">
            From 15 October 2026, the new rate depends on the real payment type and
            the merchant classification held by the bank or PSP. MDR is a merchant-side
            processing charge, not a tax and not an added fee for the customer.
          </p>
        </div>

        <div className="overflow-x-auto border-t border-[#dce5df]">
          <table className="w-full min-w-[720px] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-[#dce5df] text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7b84]">
                <th className="py-4 pr-6 font-semibold">Payment type</th>
                <th className="py-4 pr-6 font-semibold">When it applies</th>
                <th className="py-4 pr-6 font-semibold">Merchant MDR</th>
                <th className="py-4 font-semibold">Who bears it</th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, index) => (
                <tr
                  key={`${row.type}-${index}`}
                  className="border-b border-[#e8eeea] align-middle transition-colors hover:bg-[#f7faf8]"
                >
                  <td className="py-4 pr-6">
                    <div className="flex items-center gap-4">
                      <span className="w-16 shrink-0 font-mono text-[11px] font-bold tracking-wide text-[#087b68]">
                        {row.type}
                      </span>
                      <span className="font-semibold text-[#152b39]">{row.detail}</span>
                    </div>
                  </td>
                  <td className="max-w-[330px] py-4 pr-6 text-[#62747d]">{row.condition}</td>
                  <td className="py-4 pr-6 font-bold tabular-nums text-[#162d3d]">
                    {row.rate}
                  </td>
                  <td className="py-4 text-[#62747d]">{row.bearer}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-2 text-xs text-[#83948d] sm:hidden">
          Swipe sideways to see the full rate card.
        </p>

        <div className="mt-5 flex items-start gap-2 text-xs leading-6 text-[#687a82]">
          <Info size={15} className="mt-1 shrink-0 text-[#0b836d]" />
          <p>
            Rural location by itself is not an exemption. P2PM and special-sector rates
            require the right provider classification. Wallet-funded and RuPay
            credit-on-UPI payments may follow separate rules.
          </p>
        </div>

        <div className="mt-16 grid gap-12 border-t border-[#dce5df] pt-12 lg:grid-cols-2 lg:gap-20">
          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#172d3d]">
              Keep costs accurate, not hidden.
            </h3>
            <p className="mt-3 max-w-md text-sm leading-7 text-[#62747d]">
              The legitimate way to pay the right rate is to make sure your actual
              merchant category is recorded correctly.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                "Ask your PSP if your real monthly QR receipts qualify you for P2PM.",
                "If you operate a notified service, confirm its sector coding with your acquirer.",
                "Keep one sale on the books at its full value, even when payment is collected in parts.",
                "Use P2P only for personal transfers, never to disguise a business sale.",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm leading-6 text-[#4c636f]">
                  <Check size={17} className="mt-1 shrink-0 text-[#0b9478]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-2xl font-semibold tracking-tight text-[#172d3d]">
              A few real numbers.
            </h3>
            <p className="mt-3 text-sm leading-7 text-[#62747d]">
              Standard P2M examples for one payment on or after 15 October 2026.
            </p>
            <div className="mt-6 border-t border-[#dce5df]">
              {EXAMPLES.map((rupees) => {
                const fee = estimateMdr(
                  rupees * 100,
                  "p2m",
                  MDR_EFFECTIVE_DATE,
                  false,
                ).feePaise;
                return (
                  <div
                    key={rupees}
                    className="flex items-center justify-between border-b border-[#e8eeea] py-2.5 text-sm tabular-nums"
                  >
                    <span className="text-[#62747d]">{formatPaise(rupees * 100)}</span>
                    <span className="font-semibold text-[#172d3d]">
                      {formatPaise(fee)} <span className="font-normal text-[#7d8d92]">MDR</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-4 text-xs leading-6 text-[#71828a]">
              The payer still pays the purchase price. These are estimates before any
              provider-specific charges or taxes on the processing fee.
            </p>
          </div>
        </div>

        <div className="mt-14 flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#e8eeea] pt-6 text-xs text-[#71828a]">
          <span>Source material, dated 15 September 2026:</span>
          <a
            href={NPCI_FAQ_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#087b68] hover:underline"
          >
            NPCI FAQs <ArrowUpRight size={13} />
          </a>
          <a
            href={PIB_RELEASE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-[#087b68] hover:underline"
          >
            Ministry of Finance / PIB <ArrowUpRight size={13} />
          </a>
        </div>
      </div>
    </section>
  );
}