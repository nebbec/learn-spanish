# F1 style test prompts

Model `seedream_5_0_flash`, resolution `2k`, aspect `3:2` (GPT Image 2.5 was tried first and refused on the free plan). One contact sheet per style, all six words on it: `A-flat-vector.jpg`, `B-clay-toy.jpg`, `C-sticker.jpg`. Each prompt is the style line followed by the shared sheet text. The axolotl was a stand-in mascot for comparing styles. Courtney chose B, clay toy.

## Shared sheet text

A character contact sheet: a 3 by 2 grid of six separate square panels with even gutters, each panel on a plain warm cream background (#fff8ec). The same mascot appears in every panel: a small chubby lavender-purple axolotl (#7c4dff family) with pink frilly gills, a round head, big friendly eyes, short stubby limbs and a little tail. It acts out one word per panel, centred, full body, simple pose, minimal props:
1. top left, "house": waving happily in front of the open door of a small cosy house.
2. top middle, "to speak": talking animatedly, mouth open, one hand gesturing, an empty speech bubble beside it.
3. top right, "good": beaming with a big thumbs up, a small sparkle near its head.
4. bottom left, "weather": holding an umbrella under a cloud with rain on one side and sunshine on the other.
5. bottom middle, "problem": puzzled, scratching its head, looking at a tangled knot of yarn on the floor.
6. bottom right, "now": urgently pointing at a big round alarm clock on the floor beside it.
No text, letters, numbers or words anywhere in the image. Same character design, proportions and colours in all six panels. Accent colours: sunny yellow (#ffc93c), deep ink outline (#2b2140).

## Styles

- **A, flat vector**: Flat vector illustration, bold simple shapes, thick even rounded outlines in deep ink, flat fills with at most one soft shadow tone, no gradients or texture, limited palette, crisp edges, modern app illustration.
- **B, clay toy**: Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short.
- **C, sticker**: Chunky kawaii sticker art, each figure with a thick white die-cut sticker border and a faint drop shadow, cute oversized head, big shiny eyes, bold outline, bright saturated flat colours with small highlights.

## Mascot candidates (`mascot-candidates.jpg`)

Clay style, Seedream 5.0 Flash, 2k, 3:2. Candidates: capybara, chick, turtle. The turtle was chosen.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short.

A mascot candidate sheet: a 3 by 2 grid of six square panels with even gutters, each on a plain warm cream background (#fff8ec). Three different candidate mascots, one per column. Each is a very simple, cute baby animal with a round chunky body, big friendly eyes, tiny limbs, minimal detail, in soft pastel colours with at most two colours per character plus small blush cheeks. Top row: the character standing, facing the viewer, neutral friendly smile. Bottom row: the same character jumping happily with arms up.
Left column: a pastel peach capybara with a rounded snout and tiny ears.
Middle column: a pastel butter-yellow baby chick with a tiny soft orange beak and stubby wings.
Right column: a pastel mint-green baby turtle with a pale lilac rounded shell.
No text, letters, numbers or symbols anywhere in the image. Each character keeps the same design in its two panels.
```

## Turtle model sheet (`../cast/turtle-sheet.webp`)

Same model, 2k, 16:9, with the turtle panel cropped from the candidates sheet as `--image`.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short.

A character model sheet for the mascot in the reference image: a cute pastel mint-green baby turtle with a big round head, large glossy black eyes, small pink blush cheeks, a small smile, chunky arms and legs, a tiny tail. Its rounded pastel lilac shell sits on its back like a backpack, with a pale cream belly plate on the front. Keep the exact colours, proportions and clay look of the reference.
A 4 by 2 grid of eight square panels with even gutters, each on a plain warm cream background (#fff8ec), the full body centred in each panel.
Top row, turnaround in a neutral standing pose: front view, three-quarter view, side view, back view.
Bottom row, expressions: very happy jumping with arms up, surprised with a little wiggle, sad and drooping with head down, thinking with one hand on its chin.
No text, letters, numbers or symbols anywhere in the image. The same character design in all eight panels.
```

## Cast candidates (`cast-candidates.jpg`)

A second round after F1, for a lead with more character that could also front the app's Instagram account. Seedream 5.0 Flash, 2k, 1:1, one render per candidate, each with the turtle's panel from `mascot-candidates.jpg` as `--image` for the clay material only. Candidates: a hummingbird, an alpaca, a coquí frog, a capybara, a concha bun and a made-up teardrop. Courtney chose the concha as lead and kept the alpaca, with the turtle, the chick and the capybara, as the cast. Each prompt is the candidate's line followed by the shared text.

Shared text:

```
Ultra-simple Japanese kawaii character design: a soft rounded mochi-like body, almost no neck, tiny stubby limbs, tiny black dot eyes set wide apart, soft pink blush cheeks, soft pastel colours. Rendered as a handmade clay toy: matte plasticine with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows. Use the reference image for the clay material, colour softness, cuteness and lighting only, not for the character. Full body, centred. Plain warm cream background (#fff8ec). No text, letters, numbers or symbols anywhere in the image.
```

Concha line: `A tiny cute creature that is a Mexican concha sweet bun: a soft round pastel-pink bread dome with the classic white sugar seashell pattern on top, worn like an elegant hairdo, with a small face on the front of the bun, tiny stubby arms and legs. She is a little drama-queen diva: two tiny eyelash flicks above each dot eye and a tiny red mouth, with one tiny limb raised to her forehead as if about to swoon. Tiny pastel-lilac cat-eye sunglasses perched on top.`

Alpaca line: `A tiny round baby alpaca, a fluffy cream-white cloud of a body, a huge fluffy topknot of curly wool on her head like dramatic 1980s big hair, small pastel-pink ears.` followed by the same diva line and `A small pastel-lilac feather boa around her neck.`

## Cast model sheets (`../cast/`)

The concha's and the alpaca's from their candidate renders, the chick's and the capybara's from their panels on `mascot-candidates.jpg`, each as `--image`. The prompt is the turtle model sheet's above, with the turtle's description replaced by the character's from `../style.md`. 16:9, 2k.
