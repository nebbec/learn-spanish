// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INSTALL_DISMISSED_KEY } from "@/lib/pwa";
import { InstallPrompt } from "./InstallPrompt";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const IPHONE =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1";
const ANDROID =
  "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

let host: HTMLDivElement;
let root: Root;

const find = (id: string) => host.querySelector<HTMLElement>(`[data-testid="${id}"]`);

function device(userAgent: string, standalone = false) {
  vi.spyOn(navigator, "userAgent", "get").mockReturnValue(userAgent);
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: standalone && query.includes("standalone") }));
}

function mount() {
  act(() => root.render(<InstallPrompt />));
}

/** The browser saying it can install the app, as Chrome does. */
function offerInstall() {
  const event = Object.assign(new Event("beforeinstallprompt", { cancelable: true }), {
    prompt: vi.fn(async () => undefined),
  });
  act(() => void window.dispatchEvent(event));
  return event;
}

beforeEach(() => {
  window.localStorage.clear();
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
});

afterEach(() => {
  act(() => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("InstallPrompt", () => {
  it("shows the add-to-home-screen steps on an iPhone", () => {
    device(IPHONE);
    mount();
    expect(find("install-ios")?.textContent).toContain("Add to Home Screen");
    expect(find("install-button")).toBeNull();
  });

  it("shows nothing when the app is already installed", () => {
    device(IPHONE, true);
    mount();
    expect(find("install-prompt")).toBeNull();
  });

  it("shows an Install button only once the browser offers to install, and uses the offer", async () => {
    device(ANDROID);
    mount();
    expect(find("install-prompt")).toBeNull();

    const offer = offerInstall();
    expect(offer.defaultPrevented).toBe(true);
    expect(find("install-ios")).toBeNull();

    await act(async () => find("install-button")!.click());
    expect(offer.prompt).toHaveBeenCalledTimes(1);
    expect(find("install-prompt")).toBeNull();
  });

  it("stays away once dismissed", () => {
    device(IPHONE);
    mount();
    act(() => find("install-dismiss")!.click());
    expect(find("install-prompt")).toBeNull();
    expect(window.localStorage.getItem(INSTALL_DISMISSED_KEY)).toBe("1");

    act(() => root.unmount());
    root = createRoot(host);
    mount();
    expect(find("install-prompt")).toBeNull();
  });
});
