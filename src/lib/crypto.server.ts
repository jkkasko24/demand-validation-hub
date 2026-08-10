// AES-GCM encryption for stored OAuth tokens. Server-only.

async function keyFrom(secret: string): Promise<CryptoKey> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret));
  return crypto.subtle.importKey("raw", digest, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

function unb64(value: string): Uint8Array<ArrayBuffer> {
  const raw = atob(value);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

function requireKeyMaterial(): string {
  const secret = process.env["TOKEN_ENCRYPTION_KEY"];
  if (!secret) throw new Error("TOKEN_ENCRYPTION_KEY is not configured");
  return secret;
}

export async function encryptToken(plain: string): Promise<string> {
  const key = await keyFrom(requireKeyMaterial());
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain)),
  );
  return `v1.${b64(iv)}.${b64(cipher)}`;
}

export async function decryptToken(stored: string): Promise<string> {
  const [version, ivPart, cipherPart] = stored.split(".");
  if (version !== "v1" || !ivPart || !cipherPart) throw new Error("Malformed encrypted token");
  const key = await keyFrom(requireKeyMaterial());
  const plain = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: unb64(ivPart) },
    key,
    unb64(cipherPart),
  );
  return new TextDecoder().decode(plain);
}

/** Signed, short-lived OAuth state so the callback can trust the user id. */
export async function signState(payload: Record<string, unknown>): Promise<string> {
  const body = b64(new TextEncoder().encode(JSON.stringify(payload)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(requireKeyMaterial()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return `${body}.${b64(sig).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}`;
}

export async function verifyState<T>(state: string): Promise<T | null> {
  const [body, sig] = state.split(".");
  if (!body || !sig) return null;
  const expected = await signState(JSON.parse(new TextDecoder().decode(unb64(pad(body)))));
  if (expected !== state) return null;
  const payload = JSON.parse(new TextDecoder().decode(unb64(pad(body)))) as { exp?: number };
  if (typeof payload.exp === "number" && payload.exp < Date.now()) return null;
  return payload as T;
}

function pad(value: string): string {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  return normalized + "=".repeat((4 - (normalized.length % 4)) % 4);
}
