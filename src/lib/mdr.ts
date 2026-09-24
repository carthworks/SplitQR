/** Bank-account UPI MDR guide, based on the NPCI FAQ and PIB release of 15 Sep 2026. */

export const MDR_EFFECTIVE_DATE = "2026-10-15";

export type PaymentCategory =
  | "p2p"
  | "p2m"
  | "p2pm"
  | "essential"
  | "capital"
  | "rural";

export const PAYMENT_CATEGORIES: {
  id: PaymentCategory;
  code: string;
  name: string;
  description: string;
}[] = [
  {
    id: "p2p",
    code: "P2P",
    name: "Personal transfer",
    description: "Between people, not payment for a sale.",
  },
  {
    id: "p2m",
    code: "P2M",
    name: "Standard merchant",
    description: "A regular business or shop payment.",
  },
  {
    id: "p2pm",
    code: "P2PM",
    name: "Eligible small merchant",
    description: "Up to ₹1 lakh/month in UPI QR receipts.",
  },
  {
    id: "essential",
    code: "SECTOR",
    name: "Essential service",
    description: "Notified rail, fuel, telecom, insurance, etc.",
  },
  {
    id: "capital",
    code: "MARKET",
    name: "Capital markets",
    description: "Mutual funds, securities and brokers.",
  },
  {
    id: "rural",
    code: "RURAL",
    name: "Qualifying rural QR",
    description: "Eligible P2PM in rural or semi-urban areas.",
  },
];

export const SPECIAL_CATEGORIES: PaymentCategory[] = [
  "p2pm",
  "essential",
  "capital",
  "rural",
];

export const NPCI_FAQ_URL =
  "https://www.npci.org.in/uploads/FA_Qs_Merchant_Discount_Rate_MDR_on_Select_UPI_P2_M_Transactions_58dba1d39e.pdf";
export const PIB_RELEASE_URL =
  "https://www.pib.gov.in/PressReleasePage.aspx?PRID=2310586&reg=48&lang=2";

export interface MdrEstimate {
  feePaise: number;
  appliedCategory: PaymentCategory;
  basis: string;
  beforeEffectiveDate: boolean;
  awaitingConfirmation: boolean;
}

/**
 * Model one actual payment at its original value, not a list of generated QR
 * codes. The input category is informational: only the bank/PSP can assign it.
 */
export function estimateMdr(
  amountPaise: number,
  category: PaymentCategory,
  date: string,
  providerConfirmed: boolean,
): MdrEstimate {
  const awaitingConfirmation =
    SPECIAL_CATEGORIES.includes(category) && !providerConfirmed;
  const appliedCategory = awaitingConfirmation ? "p2m" : category;
  const beforeEffectiveDate = !!date && date < MDR_EFFECTIVE_DATE;

  if (!amountPaise || amountPaise < 0) {
    return {
      feePaise: 0,
      appliedCategory,
      basis: "Enter an amount to see the estimate.",
      beforeEffectiveDate,
      awaitingConfirmation,
    };
  }

  if (beforeEffectiveDate) {
    return {
      feePaise: 0,
      appliedCategory,
      basis: "Before 15 October 2026: the new bank-account UPI MDR has not started.",
      beforeEffectiveDate,
      awaitingConfirmation,
    };
  }

  if (appliedCategory === "p2p") {
    return {
      feePaise: 0,
      appliedCategory,
      basis: "A genuine person-to-person transfer has no MDR.",
      beforeEffectiveDate,
      awaitingConfirmation,
    };
  }

  if (appliedCategory === "p2pm" || appliedCategory === "rural") {
    return {
      feePaise: 0,
      appliedCategory,
      basis: "Zero MDR for a provider-confirmed eligible P2PM merchant.",
      beforeEffectiveDate,
      awaitingConfirmation,
    };
  }

  if (amountPaise <= 200_000) {
    return {
      feePaise: 0,
      appliedCategory,
      basis: "Payments of ₹2,000 or less have no merchant MDR.",
      beforeEffectiveDate,
      awaitingConfirmation,
    };
  }

  if (appliedCategory === "essential") {
    return {
      feePaise: 500,
      appliedCategory,
      basis: "Flat ₹5 for a provider-confirmed essential-sector payment above ₹2,000.",
      beforeEffectiveDate,
      awaitingConfirmation,
    };
  }

  if (appliedCategory === "capital") {
    return {
      feePaise: Math.min(Math.round(amountPaise * 0.0002), 30_000),
      appliedCategory,
      basis: "Capital-market MDR: 0.02%, capped at ₹300.",
      beforeEffectiveDate,
      awaitingConfirmation,
    };
  }

  return {
    feePaise: Math.min(Math.round(amountPaise * 0.004), 30_000),
    appliedCategory,
    basis: awaitingConfirmation
      ? "Standard P2M rate until your bank or PSP confirms the special category."
      : "Standard P2M: 0.4% of the payment, capped at ₹300.",
    beforeEffectiveDate,
    awaitingConfirmation,
  };
}