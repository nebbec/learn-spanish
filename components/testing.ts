import { act } from "react";

// Taken before any test swaps in fake timers, so waiting still works while a test holds the clock.
const realSetTimeout = globalThis.setTimeout;

/** Gives the store and React one turn, inside `act` so React shows what changed. */
const turn = () => act(() => new Promise<void>((resolve) => realSetTimeout(resolve, 2)));

/**
 * Waits until `ready` returns something truthy, and returns it. Component tests
 * wait for the thing they are about to read or click, never for a fixed time,
 * so they still pass when the machine is busy.
 */
export async function until<T>(ready: () => T | Promise<T>, what: string, timeout = 4000): Promise<NonNullable<T>> {
  const start = performance.now();
  for (;;) {
    const value = await ready();
    if (value) return value;
    if (performance.now() - start > timeout) throw new Error(`Timed out waiting for ${what}`);
    await turn();
  }
}

/**
 * Counts the calls to `store` that are still running. Returns a function that
 * waits until none is, for a test whose next step depends on a read or write
 * that leaves no mark on screen.
 */
export function watchStore(store: object): () => Promise<void> {
  let running = 0;
  const done = () => {
    running -= 1;
  };
  const proto = Object.getPrototypeOf(store) as object;
  for (const name of Object.getOwnPropertyNames(proto)) {
    const method: unknown = Object.getOwnPropertyDescriptor(proto, name)?.value;
    if (name === "constructor" || typeof method !== "function") continue;
    (store as Record<string, unknown>)[name] = (...args: unknown[]) => {
      const result: unknown = method.apply(store, args);
      if (result instanceof Promise) {
        running += 1;
        result.then(done, done);
      }
      return result;
    };
  }
  return async () => {
    // A call queued behind a promise starts a moment after the tap that caused it.
    await turn();
    await until(() => running === 0, "the store to finish");
  };
}
