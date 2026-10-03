// jsdom has no media playback: `play()` only logs "Not implemented". The intro and the
// reveal play their word clip by themselves (L14), so every component test would log it.
// Tests that check playback pass `onPlay` or stub `Audio` themselves.
if (typeof HTMLMediaElement !== "undefined") {
  HTMLMediaElement.prototype.play = () => Promise.resolve();
  HTMLMediaElement.prototype.pause = () => {};
}
