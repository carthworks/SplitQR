# SplitQR ⚡

> **Privacy-first UPI MDR Charge Guide & Smart QR Studio**  
> Calculate upcoming October 2026 UPI Merchant Discount Rates (MDR), generate compliant UPI payment QR codes, and intelligently split payments across limits or installments — entirely client-side.

---

## 🌟 Overview

**SplitQR** is a fast, responsive, and 100% client-side tool tailored for Indian merchants, freelancers, and businesses navigating the evolving UPI fee landscape. It bridges two critical needs:

1. **Clear Policy Guidance**: An interactive calculator and transparent breakdown of the October 2026 bank-account UPI MDR structure announced by NPCI / PIB.
2. **Flexible QR Studio**: Instant QR generation supporting single payments, per-transaction bank limit capping, and installment/split collections with integer-level paise precision.

Everything runs directly in your browser without tracking, analytics, or external backend dependencies.

---

## ✨ Features

- **📊 October 2026 UPI MDR Estimator**
  - Instant MDR fee calculation and bearer identification (Merchant vs. No MDR).
  - Handles all classified categories:
    - **P2P** (Personal Transfers) — Always ₹0
    - **P2M** (Standard Merchant) — ₹0 up to ₹2,000; 0.4% (max ₹300 cap) above ₹2,000
    - **P2PM** (Eligible Small Merchant, up to ₹1L/month receipts) — ₹0
    - **Essential Services** (Notified Rail, Fuel, Utilities, Telecom, Insurance) — ₹5 flat over ₹2,000
    - **Capital Markets** (Mutual funds, AMC, brokers) — 0.02% (max ₹300 cap)
    - **Rural QR** — ₹0 for qualifying semi-urban / rural merchants
  - Direct links to official NPCI and PIB circulars.

- **✂️ Smart Payment Splitting Strategies**
  - **Single QR**: Standard fixed-amount UPI payment QR.
  - **Capped Breakdown**: Automatically split invoices exceeding single-transaction limits (e.g., bank caps or daily UPI transfer thresholds like ₹5,000 or ₹10,000).
  - **Even Split**: Divide amounts evenly across multiple installments or team members.
  - **Custom N Parts**: Flexible division with exact paise allocation and zero rounding errors.

- **🔒 100% Client-Side Privacy & Offline Support**
  - Zero server calls: all QR codes and UPI URIs (`upi://pay?...`) are generated locally.
  - Remembers your Payee VPA, Display Name, and defaults securely in browser `localStorage`.
  - Self-contained single-file build option for offline deployment.

- **🖨️ Export, Print & Payment Tracking**
  - Direct download as high-resolution PNG.
  - One-click copy for UPI deep-links.
  - Built-in print layout for receipts and counter billing.
  - Interactive payment checklist to track completed parts in multi-split payments.

---

## 🚀 Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) (version 18 or higher recommended)
- `npm`, `pnpm`, or `yarn`

### Installation

```bash
# Clone the repository
git clone https://github.com/carthworks/SplitQR.git
cd SplitQR

# Install dependencies
npm install
```

### Development

Start the local Vite development server with Hot Module Replacement (HMR):

```bash
npm run dev
```

Visit `http://localhost:5173` in your browser.

### Production Build

Compile the production-ready application:

```bash
npm run build
```

The output will be bundled into the `dist/` directory as a portable, standalone application powered by `vite-plugin-singlefile`.

### Preview Production Build

```bash
npm run preview
```

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Build Tool**: [Vite 7](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **QR Generation**: [qrcode](https://github.com/soldair/node-qrcode)
- **Single-File Bundler**: [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)

---

## 📂 Project Structure

```text
split-payment-qr-generator01/
├── src/
│   ├── components/
│   │   ├── ChargeGuide.tsx   # Comprehensive MDR policy table & calculator
│   │   └── QrCard.tsx        # QR card component with download, copy, and print
│   ├── lib/
│   │   ├── mdr.ts            # MDR rates, category models, and fee estimation logic
│   │   ├── upi.ts            # Paise-level math, VPA validation, and UPI URI builder
│   │   └── useQrCodes.ts     # Asynchronous QR code canvas generator hook
│   ├── utils/
│   │   └── cn.ts             # Tailwind class merging utility
│   ├── App.tsx               # Main application and interactive studio
│   ├── index.css             # Tailwind v4 directives and base styles
│   └── main.tsx              # React DOM root entrypoint
├── index.html                # App shell and SEO meta tags
├── package.json              # Scripts and dependencies
├── tsconfig.json             # TypeScript configuration
└── vite.config.ts            # Vite config with Tailwind & Singlefile plugins
```

---

## ⚖️ MDR Summary Reference (Effective Oct 15, 2026)

| Category | Type | Threshold / Condition | Rate / Cap | Bearer |
| :--- | :--- | :--- | :--- | :--- |
| **Personal (P2P)** | P2P | Any permitted amount | ₹0 (Free) | No MDR |
| **Standard Merchant (P2M)** | P2M | Up to ₹2,000 | ₹0 (Free) | No MDR |
| **Standard Merchant (P2M)** | P2M | Above ₹2,000 | 0.40% (Max ₹300) | Merchant / Ecosystem |
| **Eligible Small Merchant** | P2PM | Under ₹1 Lakh/mo receipts | ₹0 (Free) | No MDR |
| **Essential Services** | Sector | Rail, fuel, telecom, insurance (> ₹2,000) | ₹5 Flat | Merchant / Ecosystem |
| **Capital Markets** | Market | Mutual funds, brokers (> ₹2,000) | 0.02% (Max ₹300) | Merchant / Ecosystem |
| **Qualifying Rural QR** | Rural | Semi-urban / rural merchants | ₹0 (Free) | No MDR |

> *Note: Policy rules reflect the published NPCI FAQ and Press Information Bureau (PIB) circulars.*

---

## 🛡️ Disclaimer

SplitQR is provided for informational and convenience purposes only. MDR rates and category eligibility depend on acquiring bank classification and NPCI guidelines. Payment splitting should be utilized for legitimate operational requirements such as installments, separate group payers, or daily bank transfer limits.

---

## 📄 License

MIT © [carthworks](https://github.com/carthworks)
