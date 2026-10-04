# Art style: locked in F1

The rules behind this are in `docs/design.md` under "Art". This file is what the F2 script and the F3 mascot work start from.

## References

Every character has a model sheet: front, three-quarter, side and back views, then happy (jumping), surprised, sad (drooping) and thinking. Pass the sheet of the character being rendered as the image reference on every render. The `-front` file is the front view on its own, cut from the sheet, as a second reference when one still is rendered alone.

| File | Use |
|---|---|
| `cast/concha-sheet.webp`, `cast/concha-front.webp` | The concha, lead mascot. |
| `cast/alpaca-sheet.webp`, `cast/alpaca-front.webp` | The alpaca. |
| `cast/turtle-sheet.webp`, `cast/turtle-front.webp` | The turtle. |
| `cast/chick-sheet.webp`, `cast/chick-front.webp` | The chick. |
| `cast/capybara-sheet.webp`, `cast/capybara-front.webp` | The capybara. |
| `style-test/` | The F1 style test, mascot candidates and cast candidates, with their prompts. History only. |

## The cast

Each content card shows one of these five, acting out the card's meaning. The concha leads: she takes about half the content cards, and any card where no one else fits better. The others take the words that suit their personality. The examples are a guide, not a fixed list.

| Character | Personality | Suits words like |
|---|---|---|
| Concha (lead) | The diva. Big feelings, big gestures; faints at the slightest drama. | querer, amor, llorar, caer, nunca, morir, feliz, and any card with no better fit |
| Alpaca | The glamorous rival, all big hair and comparisons. | mismo, otro, mejor, más, bonito, ver, mirar |
| Turtle | Slow, sweet and homely. | esperar, casa, despacio, tiempo, siempre, quedarse, volver |
| Chick | Small, quick and excitable; new to everything. | pequeño, nuevo, rápido, ahora, ya, aprender, preguntar |
| Capybara | Unbothered and calm; happiest eating or resting. | comer, dormir, tranquilo, agua, nada, bien, sentarse |

The description to put in a prompt, one per character. The concha and the alpaca carry their accessories in every still; the turtle, chick and capybara have none.

- **concha**: a cute pastel-pink Mexican concha sweet bun: a plump round bread body topped with the classic white sugar seashell crust like an elegant hairdo, a face on the front of the bun with big glossy black eyes, two tiny eyelash flicks, a tiny red mouth and small pink blush cheeks, tiny stubby arms and legs, and tiny pastel-lilac cat-eye sunglasses perched on top.
- **alpaca**: a cute baby alpaca with a fluffy cream-white wool body, a huge fluffy topknot of curly wool like dramatic 1980s big hair with a small lilac hair band, small pink inner ears, big glossy black eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, a small pastel-lilac feather boa around her neck, and short stubby legs with pink hooves.
- **turtle**: a cute pastel mint-green baby turtle with a big round head, large glossy black eyes, small pink blush cheeks, chunky arms and legs and a tiny tail, its rounded pastel lilac shell on its back and a pale cream belly plate on the front.
- **chick**: a cute pastel butter-yellow baby chick with a round chunky body, a small tuft on top of its head, large glossy black eyes, small pink blush cheeks, a tiny soft orange beak, stubby wings and small orange feet.
- **capybara**: a cute pastel peach baby capybara with a round chunky body, a big rounded snout, tiny round ears, large glossy black eyes, small pink blush cheeks, and short stubby limbs with dark brown paws.

## Model

Seedream 5.0 Flash (`seedream_5_0_flash`), resolution `2k`. Every model sheet and still so far was made with it. Seedream 5.0 Lite and 4.5 are unlimited on the Plus plan, but neither has been tried with the cast; check one sheet against a model sheet before switching.

## Prompt template: a sheet of six stills

A sheet holds one character, so its six poses are six cards given to the same character. Fill `{character}` with that character's description from the list above and `{1}` to `{6}` with one pose each. A pose shows the card's meaning, never a rating. Aspect `3:2`, with `--image content/art/cast/<character>-sheet.webp`.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short.

The mascot from the reference image in six new poses: {character} Keep the exact colours, proportions and clay look of the reference.
A 3 by 2 grid of six square panels with even gutters, each on a plain flat warm cream background (#fff8ec) with no scenery beyond the props named. In each panel the character is full body and centred, acting out one idea with a simple, readable pose and at most two small props in soft pastel clay:
1. top left: {1}
2. top middle: {2}
3. top right: {3}
4. bottom left: {4}
5. bottom middle: {5}
6. bottom right: {6}
No text, letters, numbers, punctuation or symbols anywhere in the image, including speech bubbles and signs. The same character design in all six panels.
```

A pose is a short phrase in that voice, for example `waving happily in front of the open door of a small cosy clay house` (house) or `pointing urgently at a big round alarm clock on the floor beside it` (now). For an abstract word, show a situation a learner would name with it: `puzzled, scratching its head, looking at a tangled knot of yarn` (problem). Play to the character: the concha refuses with her nose in the air (never), the capybara reaches for food without hurrying (to want).

## After rendering

`npm run art` does these steps; the decisions are in `docs/design.md` under "Art", "Decided in F2".

- Remove the background of the whole sheet with Higgsfield's `image_background_remover` (1 credit), then cut it into its six panels. Seedream returns 2496 by 1664: six 832 px squares with no gutters.
- Export each still as a 512 by 512 transparent WebP, quality 82, the character fitted with a 4% margin. The first 36 average 32.6 KB.
- Keep poses free of places and scenery (no platforms, shop windows, rooms): Seedream draws the scene and the removal cuts it away half done.

## Budget

Every Seedream render costs 0.5 credits whatever the resolution or reference, and the background removal 1 credit a sheet, so a sheet of six is 1.5 credits: 0.25 a still. The first 100's 36 stills took 9 credits. The full deck (about 920 stills) is about 230 credits, about 300 with a third redone. Grouping by character can leave a part-filled last sheet per character; the script fills it with extra takes of the same stills. Run scripted batches on credits, not Unlimited: Higgsfield's fair-use terms forbid automation and review Unlimited usage, and credit jobs run on the faster queue.
