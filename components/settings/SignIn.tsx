"use client";

import { useEffect, useState, type FormEvent } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  CODE_LENGTH,
  RESEND_SECONDS,
  authClient,
  authErrorMessage,
  isEmail,
  normalizeCode,
  normalizeEmail,
  sendCode,
  signOut,
  storedAccount,
  verifyCode,
  type Account,
} from "@/lib/auth";

export interface SignInProps {
  /** Defaults to the app's browser client. Null means the build has no Supabase settings. */
  client?: SupabaseClient | null;
  /** Where the session is stored. Defaults to localStorage; tests pass the one their client uses. */
  storage?: Pick<Storage, "getItem"> | null;
  /** Seconds before another code can be asked for. */
  resendSeconds?: number;
}

type State =
  | { step: "loading" }
  | { step: "unavailable" }
  | { step: "email" }
  | { step: "code"; email: string }
  | { step: "signed-in"; account: Account };

function browserStorage(): Pick<Storage, "getItem"> | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const button =
  "min-h-14 rounded-button bg-brand px-4 py-3 font-display text-xl font-bold text-on-brand disabled:opacity-50";
const quiet = "min-h-11 font-bold text-ink underline underline-offset-4 disabled:text-ink-soft disabled:no-underline";
const field = "min-h-14 rounded-button border-2 border-line bg-surface px-4 py-3 text-lg";

/**
 * Sign in with a code emailed to you, or sign out. The app works without
 * signing in; signing in is what lets progress be backed up and reach other
 * devices. The account shown comes from the session stored on this device, so
 * it is there straight away and with no connection.
 */
export function SignIn({ client: clientProp, storage: storageProp, resendSeconds = RESEND_SECONDS }: SignInProps) {
  const [state, setState] = useState<State>({ step: "loading" });
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    const client = clientProp === undefined ? authClient() : clientProp;
    let cancelled = false;
    // Read after the first render, so the page drawn on the server and in the browser match.
    void Promise.resolve().then(() => {
      if (cancelled) return;
      const account = client ? storedAccount(storageProp === undefined ? browserStorage() : storageProp) : null;
      setState((current) => {
        if (!client) return { step: "unavailable" };
        if (current.step !== "loading") return current;
        return account ? { step: "signed-in", account } : { step: "email" };
      });
    });
    if (!client) return;
    // Follows a sign-in from an emailed link or another tab, and a session the server ended.
    // An empty INITIAL_SESSION is ignored: offline it only means the token could not be refreshed.
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        setState((current) => (current.step === "signed-in" ? { step: "email" } : current));
      } else if (session?.user) {
        const user = session.user;
        setState({ step: "signed-in", account: { userId: user.id, email: user.email ?? "" } });
      }
    });
    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, [clientProp, storageProp]);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((seconds) => seconds - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const client = (clientProp === undefined ? authClient() : clientProp) as SupabaseClient;

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (failure) {
      setError(authErrorMessage(failure));
    } finally {
      setBusy(false);
    }
  }

  const redirectTo = () => (typeof location === "undefined" ? undefined : `${location.origin}/settings`);

  function requestCode(to: string) {
    return run(async () => {
      await sendCode(client, to, redirectTo());
      setCode("");
      setWait(resendSeconds);
      setState({ step: "code", email: normalizeEmail(to) });
    });
  }

  function submitEmail(event: FormEvent) {
    event.preventDefault();
    if (!busy && isEmail(email)) void requestCode(email);
  }

  function submitCode(event: FormEvent) {
    event.preventDefault();
    if (busy || state.step !== "code" || code.length !== CODE_LENGTH) return;
    const to = state.email;
    void run(async () => {
      const account = await verifyCode(client, to, code);
      setCode("");
      setState({ step: "signed-in", account });
    });
  }

  function leave() {
    void run(async () => {
      await signOut(client);
      setState({ step: "email" });
    });
  }

  return (
    <section
      aria-labelledby="signin-heading"
      className="flex flex-col gap-3 rounded-card border-2 border-line bg-surface p-6 shadow-card"
    >
      <h2 id="signin-heading" className="font-display text-2xl font-bold">
        Account
      </h2>

      {state.step === "loading" && <p className="text-ink-soft">Checking whether you are signed in…</p>}

      {state.step === "unavailable" && (
        <p data-testid="signin-unavailable" className="text-ink-soft">
          Signing in is not available in this version of the app. Everything still works on this device.
        </p>
      )}

      {state.step === "email" && (
        <form onSubmit={submitEmail} className="flex flex-col gap-3">
          <p className="text-ink-soft">
            The app works without an account. Sign in to back up your progress and carry it to your other devices.
            We will email you a code; there is no password.
          </p>
          <label htmlFor="signin-email" className="font-bold">
            Email
          </label>
          <input
            id="signin-email"
            data-testid="signin-email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className={field}
          />
          <button type="submit" data-testid="signin-send" disabled={busy || !isEmail(email)} className={button}>
            {busy ? "Sending…" : "Email me a code"}
          </button>
        </form>
      )}

      {state.step === "code" && (
        <form onSubmit={submitCode} className="flex flex-col gap-3">
          <p className="text-ink-soft" data-testid="signin-sent">
            We emailed a {CODE_LENGTH}-digit code to <strong className="text-ink">{state.email}</strong>. It can take a
            minute to arrive.
          </p>
          <label htmlFor="signin-code" className="font-bold">
            Code
          </label>
          <input
            id="signin-code"
            data-testid="signin-code"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern={`[0-9]{${CODE_LENGTH}}`}
            value={code}
            onChange={(event) => setCode(normalizeCode(event.target.value))}
            className={`${field} font-display tracking-[0.3em]`}
          />
          <button
            type="submit"
            data-testid="signin-verify"
            disabled={busy || code.length !== CODE_LENGTH}
            className={button}
          >
            {busy ? "Checking…" : "Sign in"}
          </button>
          <div className="flex flex-wrap justify-between gap-2">
            <button
              type="button"
              data-testid="signin-resend"
              disabled={busy || wait > 0}
              onClick={() => void requestCode(state.email)}
              className={quiet}
            >
              {wait > 0 ? `Send a new code in ${wait}s` : "Send a new code"}
            </button>
            <button
              type="button"
              data-testid="signin-change-email"
              disabled={busy}
              onClick={() => {
                setError(null);
                setState({ step: "email" });
              }}
              className={quiet}
            >
              Use a different email
            </button>
          </div>
        </form>
      )}

      {state.step === "signed-in" && (
        <>
          <p data-testid="signin-account">
            Signed in as <strong>{state.account.email || "your account"}</strong>.
          </p>
          <button type="button" data-testid="signout" disabled={busy} onClick={leave} className={quiet + " self-start"}>
            Sign out
          </button>
        </>
      )}

      {error && (
        <p role="alert" data-testid="signin-error" className="font-bold text-again">
          {error}
        </p>
      )}
    </section>
  );
}
