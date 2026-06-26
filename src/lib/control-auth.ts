const COOKIE_NAME = "ax_control";
const COOKIE_TTL_MS = 12 * 60 * 60 * 1000;
const enc = new TextEncoder();

function getPassword(): string {
  const p = process.env.CONTROL_PASSWORD;
  if (!p || p.length === 0) {
    throw new Error("CONTROL_PASSWORD 환경변수가 설정되지 않았습니다.");
  }
  return p;
}

let _keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!_keyPromise) {
    const seed = `ax-control::${getPassword()}`;
    _keyPromise = crypto.subtle.importKey(
      "raw",
      enc.encode(seed),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return _keyPromise;
}

function bytesToBase64Url(bytes: ArrayBuffer): string {
  const u8 = new Uint8Array(bytes);
  let s = "";
  for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(payload: string): Promise<string> {
  const key = await getKey();
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(payload));
  return bytesToBase64Url(sig);
}

export async function createControlToken(): Promise<string> {
  const expiresAt = Date.now() + COOKIE_TTL_MS;
  const payload = `control.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export async function verifyControlToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expiresAtStr, sig] = parts;
  if (role !== "control") return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await sign(`${role}.${expiresAtStr}`);
  return constantTimeEqual(sig, expected);
}

export function verifyControlPassword(input: string): boolean {
  const expected = process.env.CONTROL_PASSWORD;
  if (!expected) return false;
  return constantTimeEqual(input, expected);
}

export const CONTROL_COOKIE = COOKIE_NAME;
export const CONTROL_COOKIE_TTL_SECONDS = Math.floor(COOKIE_TTL_MS / 1000);
