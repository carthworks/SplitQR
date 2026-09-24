import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

const OPTIONS = {
  width: 512,
  margin: 4,
  errorCorrectionLevel: "M" as const,
  color: { dark: "#142d3e", light: "#ffffff" },
};

/**
 * Turns a list of UPI links into PNG data-URLs, generated locally in the
 * browser (nothing is ever uploaded anywhere). Results are cached by link
 * string so editing one field doesn't re-render every QR from scratch.
 */
export function useQrCodes(links: string[]): Record<string, string> {
  const cache = useRef<Map<string, string>>(new Map());
  const [, force] = useState(0);
  const key = links.join("\u0000");

  useEffect(() => {
    let cancelled = false;
    const todo = links.filter((l) => l && !cache.current.has(l));
    if (todo.length === 0) return;

    (async () => {
      for (const link of todo) {
        try {
          const url = await QRCode.toDataURL(link, OPTIONS);
          if (cancelled) return;
          cache.current.set(link, url);
        } catch {
          /* ignore a single bad payload */
        }
      }
      if (!cancelled) force((n) => n + 1);
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const out: Record<string, string> = {};
  for (const l of links) {
    const v = cache.current.get(l);
    if (v) out[l] = v;
  }
  return out;
}
