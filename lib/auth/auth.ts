import {
  createClient,
  isAuthApiError,
  isAuthError,
  isAuthRetryableFetchError,
  type SupabaseClient,
  type SupportedStorage,
} from "@supabase/supabase-js";

/** Where the browser keeps the signed-in session (localStorage). */
export const AUTH_STORAGE_KEY = "learn-spanish.auth";

/** Digits in the emailed code. Matches `otp_length` in supabase/config.toml and the live project. */
export const CODE_LENGTH = 8;

/** Seconds before another code can be asked for. Matches `max_frequency` for email. */
export const RESEND_SECONDS = 60;

export interface Account {
  userId: string;
  email: string;
}

export interface AuthClientOptions {
  url: string;
  key: string;
  /** Defaults to the browser's localStorage. Tests pass an in-memory one. */
  storage?: SupportedStorage;
  /** Defaults to the global fetch. Tests pass one that answers for the server. */
  fetch?: typeof fetch;
}

/**
 * A Supabase client for the browser. The session is kept in storage under
 * `AUTH_STORAGE_KEY`, so it survives a reload, with or without a connection.
 */
export function createAuthClient({ url, key, storage, fetch: fetchImpl }: AuthClientOptions): SupabaseClient {
  return createClient(url, key, {
    auth: {
      storageKey: AUTH_STORAGE_KEY,
      storage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: fetchImpl ? { fetch: fetchImpl } : undefined,
  });
}

let shared: SupabaseClient | null | undefined;

/** The app's one browser client, or null when the build has no Supabase settings. */
export function authClient(): SupabaseClient | null {
  if (shared !== undefined) return shared;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  shared = url && key && typeof window !== "undefined" ? createAuthClient({ url, key }) : null;
  return shared;
}

/**
 * The account whose session is stored on this device, read straight from
 * storage. Works offline: the client's own `getSession()` tries to refresh an
 * expired token first, which with no connection takes up to half a minute and
 * then reports no session. The stored session stays until the server says it
 * is no longer valid or the user signs out, so it is the right thing to show.
 */
export function storedAccount(storage: Pick<Storage, "getItem"> | null | undefined): Account | null {
  let raw: string | null = null;
  try {
    raw = storage?.getItem(AUTH_STORAGE_KEY) ?? null;
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const session = JSON.parse(raw) as { refresh_token?: unknown; user?: { id?: unknown; email?: unknown } };
    const id = session.user?.id;
    if (typeof session.refresh_token !== "string" || typeof id !== "string") return null;
    return { userId: id, email: typeof session.user?.email === "string" ? session.user.email : "" };
  } catch {
    return null;
  }
}

/** Keeps the digits a person typed or pasted, at most `CODE_LENGTH` of them. */
export function normalizeCode(input: string): string {
  return input.replace(/\D/g, "").slice(0, CODE_LENGTH);
}

export function normalizeEmail(input: string): string {
  return input.trim().toLowerCase();
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isEmail(input: string): boolean {
  return EMAIL_RE.test(normalizeEmail(input));
}

/**
 * Emails a sign-in code, creating the account on first use. `redirectTo` is
 * where the email's link, if it has one, brings the person back to.
 */
export async function sendCode(client: SupabaseClient, email: string, redirectTo?: string): Promise<void> {
  const { error } = await client.auth.signInWithOtp({
    email: normalizeEmail(email),
    options: { shouldCreateUser: true, emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}

/** Signs in with the emailed code. The session is stored by the client. */
export async function verifyCode(client: SupabaseClient, email: string, code: string): Promise<Account> {
  const { data, error } = await client.auth.verifyOtp({
    email: normalizeEmail(email),
    token: normalizeCode(code),
    type: "email",
  });
  if (error) throw error;
  if (!data.user) throw new Error("No user in the sign-in answer");
  return { userId: data.user.id, email: data.user.email ?? normalizeEmail(email) };
}

/**
 * Signs this device out. The stored session is removed even with no
 * connection; the server is told when it can be reached, and otherwise the
 * session it holds is simply never used again.
 */
export async function signOut(client: SupabaseClient): Promise<void> {
  const { error } = await client.auth.signOut({ scope: "local" });
  if (error && !isOffline(error)) throw error;
}

/** True when the call failed because the server could not be reached. */
export function isOffline(error: unknown): boolean {
  return isAuthRetryableFetchError(error) || error instanceof TypeError;
}

/** A sentence to show for a failed sign-in, sign-out or code request. */
export function authErrorMessage(error: unknown): string {
  if (isOffline(error)) return "No connection. Try again when you are online.";
  const code = isAuthError(error) ? error.code : undefined;
  switch (code) {
    case "otp_expired":
      return "That code is wrong or has expired. Check it, or ask for a new one.";
    case "over_email_send_rate_limit":
    case "over_request_rate_limit":
      return "Too many codes asked for. Wait a minute and try again.";
    case "email_address_invalid":
    case "validation_failed":
      return "Check the email address.";
    case "email_address_not_authorized":
      return "Codes cannot be emailed to this address yet.";
    case "signup_disabled":
    case "otp_disabled":
      return "Signing in is turned off for now.";
  }
  if (isAuthApiError(error) && error.status === 429) return "Too many tries. Wait a minute and try again.";
  return "Something went wrong. Try again.";
}
