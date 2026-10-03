// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { until } from "@/components/testing";
import { AUTH_STORAGE_KEY, createAuthClient, fakeAuthServer, memoryStorage, type FakeAuthServer } from "@/lib/auth";
import { SignIn } from "./SignIn";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const CODE = "12345678";

let host: HTMLDivElement;
let root: Root;
let server: FakeAuthServer;
let storage: ReturnType<typeof memoryStorage>;
let clients: SupabaseClient[];

const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const text = (testId: string) => q(testId)?.textContent ?? "";

/** Opens the settings page: a new client over the same storage, as a reload gives. */
function mount(props: { resendSeconds?: number; client?: SupabaseClient | null } = {}) {
  const client =
    props.client === undefined
      ? createAuthClient({ url: "https://example.supabase.co", key: "sb_publishable_test", storage, fetch: server.fetch })
      : props.client;
  if (client) clients.push(client);
  act(() => root.render(<SignIn client={client} storage={storage} resendSeconds={props.resendSeconds} />));
}

/** Closes the page, as a reload does before the next `mount`. */
function unmount() {
  act(() => root.unmount());
  for (const client of clients.splice(0)) client.auth.stopAutoRefresh();
  root = createRoot(host);
}

/** Types into a controlled input the way a person does. */
function type(input: HTMLElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
  act(() => {
    setter.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
  });
}

async function click(testId: string) {
  const button = await until(() => {
    const element = q(testId) as HTMLButtonElement | null;
    return element && !element.disabled ? element : null;
  }, `${testId} to be clickable`);
  act(() => button.click());
}

async function signIn(email = "courtney@example.com", code = CODE) {
  type(await until(() => q("signin-email"), "the email field"), email);
  await click("signin-send");
  type(await until(() => q("signin-code"), "the code field"), code);
  await click("signin-verify");
}

beforeEach(() => {
  server = fakeAuthServer(CODE);
  storage = memoryStorage();
  clients = [];
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  unmount();
  host.remove();
});

describe("SignIn", () => {
  it("emails a code and signs in with it", async () => {
    mount();
    type(await until(() => q("signin-email"), "the email field"), " Courtney@Example.com");
    await click("signin-send");

    await until(() => q("signin-code"), "the code field");
    expect(server.sent).toEqual(["courtney@example.com"]);
    expect(text("signin-sent")).toContain("8-digit code to courtney@example.com");
    expect((q("signin-resend") as HTMLButtonElement).disabled).toBe(true);
    expect(text("signin-resend")).toMatch(/Send a new code in \d+s/);

    // A pasted code with spaces keeps its eight digits.
    type(q("signin-code")!, "1234 5678 9");
    expect((q("signin-code") as HTMLInputElement).value).toBe(CODE);
    await click("signin-verify");

    await until(() => q("signin-account"), "the signed-in account");
    expect(text("signin-account")).toContain("courtney@example.com");
    expect(storage.data.has(AUTH_STORAGE_KEY)).toBe(true);
  });

  it("waits for all eight digits before signing in", async () => {
    mount();
    type(await until(() => q("signin-email"), "the email field"), "courtney@example.com");
    await click("signin-send");
    type(await until(() => q("signin-code"), "the code field"), "123456");
    expect((q("signin-verify") as HTMLButtonElement).disabled).toBe(true);
  });

  it("keeps the session through a reload with no connection", async () => {
    mount();
    await signIn();
    await until(() => q("signin-account"), "the signed-in account");
    unmount();

    server.offline = true;
    const before = server.calls.length;
    mount();
    await until(() => q("signin-account"), "the account after the reload");
    expect(text("signin-account")).toContain("courtney@example.com");
    expect(server.calls.length).toBe(before);
  });

  it("keeps the session through an offline reload after the access token expired", async () => {
    server.expiresIn = -60;
    mount();
    await signIn();
    await until(() => q("signin-account"), "the signed-in account");
    unmount();

    server.offline = true;
    mount();
    await until(() => q("signin-account"), "the account after the reload");
    expect(text("signin-account")).toContain("courtney@example.com");
  });

  it("says when the code is wrong and lets you try again", async () => {
    mount();
    await signIn("courtney@example.com", "87654321");
    await until(() => q("signin-error"), "the error");
    expect(text("signin-error")).toMatch(/wrong or has expired/);
    expect(storage.data.has(AUTH_STORAGE_KEY)).toBe(false);

    type(q("signin-code")!, CODE);
    await click("signin-verify");
    await until(() => q("signin-account"), "the signed-in account");
    expect(q("signin-error")).toBeNull();
  });

  it("says when there is no connection to send a code", async () => {
    server.offline = true;
    mount();
    type(await until(() => q("signin-email"), "the email field"), "courtney@example.com");
    await click("signin-send");
    await until(() => q("signin-error"), "the error");
    expect(text("signin-error")).toMatch(/No connection/);
    expect(q("signin-email")).not.toBeNull();
  });

  it("sends a new code when asked and can go back to change the address", async () => {
    mount({ resendSeconds: 0 });
    type(await until(() => q("signin-email"), "the email field"), "courtney@example.com");
    await click("signin-send");
    await click("signin-resend");
    await until(() => server.sent.length === 2, "the second code");

    await click("signin-change-email");
    await until(() => q("signin-email"), "the email field again");
  });

  it("signs out", async () => {
    mount();
    await signIn();
    await click("signout");
    await until(() => q("signin-email"), "the email field after signing out");
    expect(storage.data.has(AUTH_STORAGE_KEY)).toBe(false);
  });

  it("says signing in is unavailable when the build has no Supabase settings", async () => {
    mount({ client: null });
    await until(() => q("signin-unavailable"), "the unavailable message");
  });
});
