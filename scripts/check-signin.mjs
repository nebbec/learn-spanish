// D4's check against the real Supabase project: signing in with the emailed
// code works through the publishable key, the session is stored and survives a
// reload with no connection, a wrong code is refused, and signing out ends the
// session on the server too.
//
// Creates one throwaway user with the secret key and asks the admin API for the
// code the email would carry, so no email is sent. Deletes the user at the end.
// Run: npm run check:signin (reads .env.local; see .env.example)

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

// The same as AUTH_STORAGE_KEY and CODE_LENGTH in lib/auth/auth.ts.
const STORAGE_KEY = "learn-spanish.auth";
const CODE_LENGTH = 8;

const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } });

let passed = 0;
let failed = 0;
function check(name, ok, detail) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? ` (${detail})` : ""}`);
}

/** One browser's localStorage, shared by the clients that stand for its page loads. */
const data = new Map();
const storage = {
  getItem: (key) => data.get(key) ?? null,
  setItem: (key, value) => void data.set(key, value),
  removeItem: (key) => void data.delete(key),
};
const offlineFetch = async () => {
  throw new TypeError("Failed to fetch");
};
/** A page load: a new client over the same storage, as the app makes it. */
const pageLoad = (fetchImpl) =>
  createClient(url, publishable, {
    auth: { storageKey: STORAGE_KEY, storage, persistSession: true, autoRefreshToken: false, detectSessionInUrl: false },
    global: fetchImpl ? { fetch: fetchImpl } : undefined,
  });

const email = `signin-check-${randomUUID()}@example.com`;
let userId;
try {
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`creating a test user: ${error.message}`);
  userId = created.user.id;

  const page = pageLoad();
  const wrong = await page.auth.verifyOtp({ email, token: "0".repeat(CODE_LENGTH), type: "email" });
  check("a wrong code is refused", wrong.error?.code === "otp_expired", wrong.error?.code ?? "no error");
  check("nothing is stored after a wrong code", !data.has(STORAGE_KEY));

  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw new Error(`making a code: ${linkError.message}`);
  const code = link.properties.email_otp;
  check(`the emailed code has ${CODE_LENGTH} digits`, new RegExp(`^\\d{${CODE_LENGTH}}$`).test(code), `${code.length} characters`);

  const signedIn = await page.auth.verifyOtp({ email, token: code, type: "email" });
  check("the code signs in", !signedIn.error && signedIn.data.user?.id === userId, signedIn.error?.message);
  const stored = JSON.parse(data.get(STORAGE_KEY) ?? "null");
  check(`the session is stored under ${STORAGE_KEY}`, stored?.user?.id === userId && typeof stored?.refresh_token === "string");

  const read = await page.from("reviews").select("id").limit(1);
  check("the session reads the user's own rows", !read.error && Array.isArray(read.data), read.error?.message);

  const reused = await pageLoad().auth.verifyOtp({ email, token: code, type: "email" });
  check("a code works only once", Boolean(reused.error), "the second use signed in");
  // That failed attempt must not have touched the stored session.
  check("the stored session is still there", JSON.parse(data.get(STORAGE_KEY) ?? "null")?.user?.id === userId);

  const offline = pageLoad(offlineFetch);
  const { data: again } = await offline.auth.getSession();
  check("the session survives a reload with no connection", again.session?.user.id === userId);

  const out = await pageLoad().auth.signOut({ scope: "local" });
  check("signing out succeeds", !out.error, out.error?.message);
  check("signing out removes the stored session", !data.has(STORAGE_KEY));
  const refreshed = await pageLoad().auth.refreshSession({ refresh_token: stored.refresh_token });
  check("the server no longer accepts the signed-out session", Boolean(refreshed.error), "refresh still worked");
} catch (error) {
  failed += 1;
  console.log(`FAIL  ${error.message}`);
} finally {
  if (userId) {
    const { error } = await admin.auth.admin.deleteUser(userId);
    check("the test user is deleted", !error, error?.message);
  }
}

console.log(`\n${passed} of ${passed + failed} pass`);
process.exit(failed ? 1 : 0);
