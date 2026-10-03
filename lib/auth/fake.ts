/** A Storage-like object in memory, shared between clients to stand for one browser across reloads. */
export function memoryStorage(initial: Record<string, string> = {}): Pick<Storage, "getItem" | "setItem" | "removeItem"> & {
  data: Map<string, string>;
} {
  const data = new Map(Object.entries(initial));
  return {
    data,
    getItem: (key) => data.get(key) ?? null,
    setItem: (key, value) => {
      data.set(key, value);
    },
    removeItem: (key) => {
      data.delete(key);
    },
  };
}

export interface FakeAuthServer {
  /** Answers the client's requests to `/auth/v1/...`. Rejects like a browser does when `offline` is set. */
  fetch: typeof fetch;
  offline: boolean;
  /** The code the server accepts; any other is refused as wrong or expired. */
  code: string;
  /** Seconds until an issued access token expires. Negative gives tokens that have already expired. */
  expiresIn: number;
  /** Each request's method and path, with the query string. */
  calls: string[];
  /** The email addresses codes were sent to. */
  sent: string[];
  /** Makes the next code request fail as rate limited. */
  rateLimitNext: boolean;
}

function base64url(value: object): string {
  return btoa(JSON.stringify(value)).replace(/=+$/, "").replace(/\+/g, "-").replace(/\//g, "_");
}

function json(status: number, body: unknown): Response {
  return new Response(body === null ? null : JSON.stringify(body), {
    status,
    // The real server sends this header; without it the client ignores the error's `code`.
    headers: { "content-type": "application/json", "x-supabase-api-version": "2024-01-01" },
  });
}

/** An in-memory stand-in for Supabase Auth's emailed-code endpoints, for tests. */
export function fakeAuthServer(code = "12345678"): FakeAuthServer {
  let users = 0;
  const ids = new Map<string, string>();
  const server: FakeAuthServer = {
    offline: false,
    code,
    expiresIn: 3600,
    calls: [],
    sent: [],
    rateLimitNext: false,
    fetch: async (input, init) => {
      const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);
      const method = init?.method ?? "GET";
      server.calls.push(`${method} ${url.pathname}${url.search}`);
      if (server.offline) throw new TypeError("Failed to fetch");
      const body = init?.body ? (JSON.parse(String(init.body)) as Record<string, unknown>) : {};
      const path = url.pathname.replace(/^\/auth\/v1/, "");
      if (path === "/otp") {
        if (server.rateLimitNext) {
          server.rateLimitNext = false;
          return json(429, { code: "over_email_send_rate_limit", msg: "email rate limit exceeded" });
        }
        server.sent.push(String(body.email));
        return json(200, {});
      }
      if (path === "/verify") {
        if (body.token !== server.code) {
          return json(403, { code: "otp_expired", msg: "Token has expired or is invalid" });
        }
        const email = String(body.email);
        if (!ids.has(email)) ids.set(email, `00000000-0000-4000-8000-${String(++users).padStart(12, "0")}`);
        const now = Math.floor(Date.now() / 1000);
        const user = { id: ids.get(email), aud: "authenticated", role: "authenticated", email, app_metadata: {}, user_metadata: {}, created_at: new Date().toISOString() };
        const exp = now + server.expiresIn;
        return json(200, {
          access_token: `${base64url({ alg: "HS256", typ: "JWT" })}.${base64url({ sub: user.id, email, exp, aud: "authenticated", role: "authenticated" })}.sig`,
          token_type: "bearer",
          expires_in: server.expiresIn,
          expires_at: exp,
          refresh_token: `refresh-${users}`,
          user,
        });
      }
      if (path === "/logout") return json(204, null);
      return json(404, { code: "not_found", msg: `No fake for ${path}` });
    },
  };
  return server;
}
