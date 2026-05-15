const COOKIE_NAME = "ax_admin";
const COOKIE_TTL_MS = 12 * 60 * 60 * 1000;
const enc = new TextEncoder();

function getSecret(): string {
  const s = process.env.ADMIN_COOKIE_SECRET;
  if (!s || s.length < 16) {
    throw new Error(
      "ADMIN_COOKIE_SECRET 환경변수가 없거나 너무 짧습니다 (16자 이상).",
    );
  }
  return s;
}

let _keyPromise: Promise<CryptoKey> | null = null;
function getKey(): Promise<CryptoKey> {
  if (!_keyPromise) {
    _keyPromise = crypto.subtle.importKey(
      "raw",
      enc.encode(getSecret()),
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

export async function createAdminToken(): Promise<string> {
  const expiresAt = Date.now() + COOKIE_TTL_MS;
  const payload = `admin.${expiresAt}`;
  return `${payload}.${await sign(payload)}`;
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

export async function verifyAdminToken(
  token: string | undefined,
): Promise<boolean> {
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [role, expiresAtStr, sig] = parts;
  if (role !== "admin") return false;
  const expiresAt = Number(expiresAtStr);
  if (!Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = await sign(`${role}.${expiresAtStr}`);
  return constantTimeEqual(sig, expected);
}

export function verifyAdminPassword(input: string): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  return constantTimeEqual(input, expected);
}

export const ADMIN_COOKIE = COOKIE_NAME;
export const ADMIN_COOKIE_TTL_SECONDS = Math.floor(COOKIE_TTL_MS / 1000);
