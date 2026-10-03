// @vitest-environment jsdom
import { act, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MUTED_KEY, isMuted, playClip, setMuted } from "@/components/audio";
import { BatchFrame, CardFront, Intro, Reveal } from "@/components/card";
import { AutoplaySwitch } from "@/components/settings";
import { fixtureCard } from "@/lib/deck/fixture";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

let host: HTMLDivElement;
let root: Root;

function mount() {
  host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
}

function unmount() {
  act(() => root.unmount());
  host.remove();
}

beforeEach(() => {
  window.localStorage.clear();
  mount();
});

afterEach(() => {
  unmount();
  setMuted(false);
  vi.unstubAllGlobals();
});

const render = (node: ReactNode) => act(() => root.render(node));
const q = (testId: string) => host.querySelector<HTMLElement>(`[data-testid="${testId}"]`);
const click = (testId: string) => act(() => q(testId)!.click());

const card = fixtureCard("casa-house");

/** A stand-in for the browser's Audio element that records what played and what was stopped. */
function stubAudio() {
  const clips: { src: string; paused: boolean }[] = [];
  vi.stubGlobal(
    "Audio",
    class {
      record: { src: string; paused: boolean };
      constructor(src: string) {
        this.record = { src, paused: false };
        clips.push(this.record);
      }
      play() {
        return Promise.resolve();
      }
      pause() {
        this.record.paused = true;
      }
    },
  );
  return clips;
}

describe("the word clip playing by itself", () => {
  it("plays when a reveal opens, unmuted", () => {
    const onPlay = vi.fn();
    render(<Reveal card={card} onRate={() => {}} onPlay={onPlay} />);
    expect(onPlay.mock.calls).toEqual([[card.audio.word]]);
  });

  it("does not play when a reveal opens, muted", () => {
    setMuted(true);
    const onPlay = vi.fn();
    render(<Reveal card={card} onRate={() => {}} onPlay={onPlay} />);
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("plays when an intro opens, unmuted, and not muted", () => {
    const onPlay = vi.fn();
    render(<Intro card={card} onChoose={() => {}} onPlay={onPlay} />);
    expect(onPlay.mock.calls).toEqual([[card.audio.word]]);
    unmount();
    mount();
    setMuted(true);
    const muted = vi.fn();
    render(<Intro card={card} onChoose={() => {}} onPlay={muted} />);
    expect(muted).not.toHaveBeenCalled();
  });

  it("plays once per card, not again when the reveal draws again", () => {
    const onPlay = vi.fn();
    render(<Reveal card={card} onRate={() => {}} onPlay={onPlay} move="wiggle" />);
    render(<Reveal card={card} onRate={() => {}} onPlay={onPlay} move="jump" />);
    expect(onPlay).toHaveBeenCalledTimes(1);
  });
});

describe("tapped audio buttons", () => {
  it.each([false, true])("play on the reveal and the intro, muted: %s", (muted) => {
    setMuted(muted);
    const onPlay = vi.fn();
    render(<Reveal card={card} onRate={() => {}} onPlay={onPlay} />);
    onPlay.mockClear();
    click("play-word");
    click("play-sentence");
    expect(onPlay.mock.calls).toEqual([[card.audio.word], [card.audio.sentence]]);

    unmount();
    mount();
    const onIntroPlay = vi.fn();
    render(<Intro card={card} onChoose={() => {}} onPlay={onIntroPlay} />);
    onIntroPlay.mockClear();
    click("play-word");
    expect(onIntroPlay.mock.calls).toEqual([[card.audio.word]]);
  });
});

describe("the mute button", () => {
  it("is in the batch frame's top bar, not pressed by default", () => {
    render(
      <BatchFrame total={3} index={0}>
        <p />
      </BatchFrame>,
    );
    expect(q("mute")!.getAttribute("aria-pressed")).toBe("false");
    expect(q("mute")!.getAttribute("aria-label")).toBe("Mute");
  });

  it("stops a playing clip, and keeps the setting under learn-spanish.muted", () => {
    const clips = stubAudio();
    render(
      <BatchFrame total={1} index={0}>
        <p />
      </BatchFrame>,
    );
    playClip(card.audio.word);
    expect(clips).toEqual([{ src: card.audio.word, paused: false }]);
    click("mute");
    expect(clips[0].paused).toBe(true);
    expect(q("mute")!.getAttribute("aria-pressed")).toBe("true");
    expect(window.localStorage.getItem(MUTED_KEY)).toBe("1");
    click("mute");
    expect(window.localStorage.getItem(MUTED_KEY)).toBeNull();
    expect(isMuted()).toBe(false);
  });

  it("survives a reload: the next page reads it back and plays nothing by itself", () => {
    const frame = (
      <BatchFrame total={1} index={0}>
        <p />
      </BatchFrame>
    );
    render(frame);
    click("mute");
    unmount();

    mount();
    render(frame);
    expect(q("mute")!.getAttribute("aria-pressed")).toBe("true");
    const onPlay = vi.fn();
    render(
      <BatchFrame total={1} index={0}>
        <Reveal card={card} onRate={() => {}} onPlay={onPlay} />
      </BatchFrame>,
    );
    expect(onPlay).not.toHaveBeenCalled();
  });

  it("reads a switch stored before the page opened", () => {
    window.localStorage.setItem(MUTED_KEY, "1");
    render(
      <BatchFrame total={1} index={0}>
        <p />
      </BatchFrame>,
    );
    expect(q("mute")!.getAttribute("aria-pressed")).toBe("true");
  });

  it("is the same switch as Play audio by itself in settings", () => {
    render(
      <>
        <AutoplaySwitch />
        <BatchFrame total={1} index={0}>
          <p />
        </BatchFrame>
      </>,
    );
    expect(q("autoplay-switch")!.getAttribute("aria-checked")).toBe("true");
    click("mute");
    expect(q("autoplay-switch")!.getAttribute("aria-checked")).toBe("false");
    click("autoplay-switch");
    expect(q("mute")!.getAttribute("aria-pressed")).toBe("false");
    expect(isMuted()).toBe(false);
  });
});

describe("Say it out loud", () => {
  it.each(["casa-house", "ir-form-yo", "phrase-going-home", "bueno-good"])(
    "%s, in the starter path, says it under the forward prompt",
    (id) => {
      render(<CardFront card={fixtureCard(id)} onReveal={() => {}} />);
      expect(q("say-it")!.textContent).toBe("Say it out loud");
    },
  );

  it("goes under a glue card's prompt too, when it has a unit", () => {
    render(<CardFront card={{ ...fixtureCard("de-of"), unit: "where-i-go" }} onReveal={() => {}} />);
    expect(q("say-it")!.textContent).toBe("Say it out loud");
  });

  it("is not on a reverse front", () => {
    render(<CardFront card={card} direction="reverse" onReveal={() => {}} />);
    expect(q("say-it")).toBeNull();
  });

  it.each(["ir-go", "de-of"])("%s, in the frequency phase, has no line", (id) => {
    render(<CardFront card={fixtureCard(id)} onReveal={() => {}} />);
    expect(q("say-it")).toBeNull();
  });
});
