import { describe, expect, it } from "vitest";
import {
  AUTH_STORAGE_KEY,
  authErrorMessage,
  createAuthClient,
  isEmail,
  isOffline,
  normalizeCode,
  sendCode,
  signOut,
  storedAccount,
  verifyCode,
} from "./auth";
import { fakeAuthServer, memoryStorage } from "./fake";

const URL = "https://example.supabase.co";

function setup() {
  const server = fakeAuthServer("12345678");
  const storage = memoryStorage();
  // A new client over the same storage is what a page reload gives.
  const open = () => createAuthClient({ url: URL, key: "sb_publishable_test", storage, fetch: server.fetch });
  return { server, storage, open };
}

async function caught(promise: Promise<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Expected a failure");
}

describe("emailed-code sign-in", () => {
  it("asks for a code for the address as typed, creating the account on first use", async () => {
    const { server, open } = setup();
    await sendCode(open(), "  Courtney@Example.com ", "https://app.test/settings");
    expect(server.sent).toEqual(["courtney@example.com"]);
    expect(server.calls.some((call) => call.startsWith("POST /auth/v1/otp"))).toBe(true);
  });

  it("signs in with the code and stores the session", async () => {
    const { storage, open } = setup();
    const account = await verifyCode(open(), "courtney@example.com", "1234 5678");
    expect(account.email).toBe("courtney@example.com");
    expect(storage.data.has(AUTH_STORAGE_KEY)).toBe(true);
    expect(storedAccount(storage)).toEqual(account);
  });

  it("refuses a wrong code with a message saying so", async () => {
    const { storage, open } = setup();
    const error = await caught(verifyCode(open(), "courtney@example.com", "87654321"));
    expect(authErrorMessage(error)).toMatch(/wrong or has expired/);
    expect(storedAccount(storage)).toBeNull();
  });

  it("says when codes are asked for too often", async () => {
    const { server, open } = setup();
    server.rateLimitNext = true;
    const error = await caught(sendCode(open(), "courtney@example.com"));
    expect(authErrorMessage(error)).toMatch(/Wait a minute/);
  });

  it("keeps the session through a reload with no connection", async () => {
    const { server, storage, open } = setup();
    const account = await verifyCode(open(), "courtney@example.com", "12345678");

    server.offline = true;
    const reloaded = open();
    expect(storedAccount(storage)).toEqual(account);
    const { data } = await reloaded.auth.getSession();
    expect(data.session?.user.id).toBe(account.userId);
  });

  it("still shows the account offline once the access token has expired", async () => {
    const { server, storage, open } = setup();
    server.expiresIn = -60;
    const account = await verifyCode(open(), "courtney@example.com", "12345678");
    server.offline = true;
    expect(storedAccount(storage)).toEqual(account);
  });

  it("signs out, telling the server", async () => {
    const { server, storage, open } = setup();
    await verifyCode(open(), "courtney@example.com", "12345678");
    await signOut(open());
    expect(storedAccount(storage)).toBeNull();
    expect(server.calls).toContain("POST /auth/v1/logout?scope=local");
  });

  it("signs out with no connection too", async () => {
    const { server, storage, open } = setup();
    await verifyCode(open(), "courtney@example.com", "12345678");
    server.offline = true;
    await signOut(open());
    expect(storedAccount(storage)).toBeNull();
  });

  it("says when there is no connection", async () => {
    const { server, open } = setup();
    server.offline = true;
    const error = await caught(sendCode(open(), "courtney@example.com"));
    expect(isOffline(error)).toBe(true);
    expect(authErrorMessage(error)).toMatch(/No connection/);
  });
});

describe("helpers", () => {
  it("keeps up to eight digits of a typed or pasted code", () => {
    expect(normalizeCode("12 34-56 78")).toBe("12345678");
    expect(normalizeCode("123456789")).toBe("12345678");
    expect(normalizeCode("abc")).toBe("");
  });

  it("checks the shape of an email address", () => {
    expect(isEmail(" a@b.co ")).toBe(true);
    expect(isEmail("a@b")).toBe(false);
    expect(isEmail("")).toBe(false);
  });

  it("reads nothing from empty, broken or unreadable storage", () => {
    expect(storedAccount(null)).toBeNull();
    expect(storedAccount(memoryStorage())).toBeNull();
    expect(storedAccount(memoryStorage({ [AUTH_STORAGE_KEY]: "{not json" }))).toBeNull();
    expect(
      storedAccount({
        getItem: () => {
          throw new Error("blocked");
        },
      }),
    ).toBeNull();
  });
});
