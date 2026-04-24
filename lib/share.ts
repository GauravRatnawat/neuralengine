export interface ShareState {
  sys: string;
  a: string;
  b: string;
  ma: string;
  mb: string;
}

export function encodeShareState(state: ShareState): string {
  try {
    return btoa(encodeURIComponent(JSON.stringify(state)));
  } catch {
    return "";
  }
}

export function decodeShareState(encoded: string): ShareState | null {
  try {
    const parsed = JSON.parse(decodeURIComponent(atob(encoded))) as Partial<ShareState>;
    if (typeof parsed.a === "string" && typeof parsed.b === "string") {
      return {
        sys: parsed.sys ?? "",
        a: parsed.a,
        b: parsed.b,
        ma: parsed.ma ?? "",
        mb: parsed.mb ?? "",
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function readShareParam(): ShareState | null {
  if (typeof window === "undefined") return null;
  try {
    const p = new URLSearchParams(window.location.hash.slice(1));
    const enc = p.get("s");
    if (enc) return decodeShareState(enc);
  } catch {}
  return null;
}

export function writeShareHash(state: ShareState): void {
  if (typeof window === "undefined") return;
  const enc = encodeShareState(state);
  const nh = "#s=" + enc;
  if (window.location.hash !== nh) {
    window.history.replaceState(null, "", nh);
  }
}
