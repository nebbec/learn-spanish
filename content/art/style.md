# Art style: locked in F1

The rules behind this are in `docs/design.md` under "Art". This file is what the F2 script and the F3 mascot work start from.

## References

| File | Use |
|---|---|
| `mascot/turtle-sheet.webp` | The model sheet: front, three-quarter, side and back views, then happy (jumping), surprised, sad (drooping) and thinking. Pass it as the image reference on every render. |
| `mascot/turtle-front.webp` | The front view on its own, cut from the sheet. A second reference when one still is rendered alone. |
| `style-test/` | The F1 style test and mascot candidates, with their prompts. History only. |

## Model

Seedream 5.0 Flash (`seedream_5_0_flash`), resolution `2k`. The sheet and the stills so far were all made with it. Seedream 5.0 Lite and 4.5 are unlimited on the Plus plan, but neither has been tried with the turtle; check one sheet against the model sheet before switching.

## Prompt template: a sheet of six stills

Fill `{1}` to `{6}` with one pose each. A pose shows the card's meaning, never a rating. Aspect `3:2`, with `--image content/art/mascot/turtle-sheet.webp`.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short.

The mascot from the reference image in six new poses: a cute pastel mint-green baby turtle with a big round head, large glossy black eyes, small pink blush cheeks, chunky arms and legs and a tiny tail, its rounded pastel lilac shell on its back and a pale cream belly plate on the front. Keep the exact colours, proportions and clay look of the reference.
A 3 by 2 grid of six square panels with even gutters, each on a plain flat warm cream background (#fff8ec) with no scenery beyond the props named. In each panel the turtle is full body and centred, acting out one idea with a simple, readable pose and at most two small props in soft pastel clay:
1. top left: {1}
2. top middle: {2}
3. top right: {3}
4. bottom left: {4}
5. bottom middle: {5}
6. bottom right: {6}
No text, letters, numbers, punctuation or symbols anywhere in the image, including speech bubbles and signs. The same character design in all six panels.
```

A pose is a short phrase in that voice, for example `waving happily in front of the open door of a small cosy clay house` (house) or `pointing urgently at a big round alarm clock on the floor beside it` (now). For an abstract word, show a situation a learner would name with it: `puzzled, scratching its head, looking at a tangled knot of yarn` (problem).

## After rendering

- Cut the sheet into its six panels on the gutters.
- Remove the background so the still is transparent; cards are white and the menu is cream, so a still must not carry a box of either colour. Higgsfield's `image_background_remover` is the first thing to try; check its edges on the soft clay shadow.
- Export WebP at the card size. A first measure on the model sheet's front view: 512 px wide at quality 82 is about 14 KB, 640 px about 18 KB, on the cream background. Transparency will add a little.

## Budget

Every Seedream render costs 0.5 credits whatever the resolution or reference. Six stills a sheet makes the first slice (about 67 stills) roughly 10 credits with redos, and the full deck (about 920) 100 to 130. One still a render would be five times that. Run scripted batches on credits, not Unlimited: Higgsfield's fair-use terms forbid automation and review Unlimited usage, and credit jobs run on the faster queue.
