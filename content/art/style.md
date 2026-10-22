# Art style: locked in F1, cast replaced in F4

The rules behind this are in `docs/design.md` under "Art". This file is what the F2 script and the F3 mascot work start from.

## References

Every character has a model sheet: front, three-quarter, side and back views, then happy (jumping), surprised, sad (drooping) and thinking. Pass the sheet of the character being rendered as the image reference on every render. The `-front` file is the front view on its own, cut from the sheet, as a second reference when one still is rendered alone.

| File | Use |
|---|---|
| `cast/concha-sheet.webp`, `cast/concha-front.webp` | The concha, lead mascot. |
| `cast/churro-sheet.webp`, `cast/churro-front.webp` | The churro. |
| `cast/avocado-sheet.webp`, `cast/avocado-front.webp` | The avocado. |
| `cast/chile-sheet.webp`, `cast/chile-front.webp` | The chile. |
| `cast/tamal-sheet.webp`, `cast/tamal-front.webp` | The tamal. |
| `cast/empanada-sheet.webp`, `cast/empanada-front.webp` | The empanada. |
| `cast/alfajor-sheet.webp`, `cast/alfajor-front.webp` | The alfajor. |
| `cast/alpaca-*`, `turtle-*`, `chick-*`, `capybara-*` | The animal cast, retiring in F5 (see below). |
| `de/` | The German cast, a design pack for a German version of the app; not used by the scripts. |
| `style-test/` | The F1 style test, mascot candidates and cast candidates, and F4's food cast rounds, with their prompts. History only. |

## The cast

Each content card shows one of these seven, acting out the card's meaning. All seven are Latin American foods, so the cards and the lead share one world. The concha leads: she takes about half the content cards, and any card where no one else fits better. The others take the words that suit their personality. The examples are a guide, not a fixed list.

| Character | Personality | Suits words like |
|---|---|---|
| Concha (lead, she) | The diva. Big feelings, big gestures; faints at the slightest drama. | querer, amor, llorar, caer, nunca, morir, feliz, and any card with no better fit |
| Churro (she) | The glamorous rival, all dulce de leche hairdo and comparisons. | mismo, otro, mejor, más, bonito, ver, mirar |
| Avocado (she) | Warm, slow and homely; everyone's mother. | esperar, casa, familia, despacio, tiempo, siempre, quedarse, volver |
| Chile (he) | Small, quick and excitable; new to everything. | pequeño, nuevo, rápido, ahora, ya, aprender, preguntar |
| Tamal (she) | Unbothered and sleepy, wrapped in her husk; happiest eating or resting. | comer, dormir, tranquilo, agua, nada, bien, sentarse |
| Empanada (he) | Proud, friendly and helpful; the one who gets things done. | hacer, ayudar, trabajar, dar, poder, amigo, hola, hablar |
| Alfajor (she) | Sweet and shy; polite to a fault. | gracias, por favor, perdón, poco, gustar, sentir, tal vez |

The description to put in a prompt, one per character. The concha carries her sunglasses in every still. Girls have eyelash flicks and a tiny red mouth; the two boys have small chunky eyebrows and neither. Arms and legs are short and stubby on all seven.

- **concha**: a cute pastel-pink Mexican concha sweet bun: a plump round bread body topped with the classic white sugar seashell crust like an elegant hairdo, a face on the front of the bun with big glossy black eyes, two tiny eyelash flicks, a tiny red mouth and small pink blush cheeks, tiny stubby arms and legs, and tiny pastel-lilac cat-eye sunglasses perched on top.
- **churro**: a tall star-ridged pastel cinnamon-tan churro girl sparkling with soft white sugar, a swirl of pastel caramel dulce de leche on top like a glamorous hairdo, big glossy black eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, and short stubby arms and legs in pale cream.
- **avocado**: an avocado-half girl: a soft pastel pear-green skin rim around a pastel butter-yellow face, a round pastel brown pit as her tummy, big glossy black eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, and short stubby arms and legs in pastel green.
- **chile**: a small pastel coral-red chili pepper boy with a curly pastel-green stem on top like a cowlick, two small chunky dark-brown eyebrows, big glossy black eyes, small pink blush cheeks, a big open cheeky grin, no eyelashes and no red lips, and short stubby arms and legs in coral-red.
- **tamal**: a plump pastel golden-yellow corn-dough tamal girl snugly wrapped in a pale sage-green corn husk like a sleeping bag, the husk tied at the top in a little tuft like a topknot, sleepy half-lidded eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, and short stubby arms and legs in golden-yellow.
- **empanada**: a plump half-moon pastel golden Argentine empanada boy with a crimped braided edge running over the top like a hairline, small chunky dark eyebrows, big glossy black eyes, small pink blush cheeks, a wide friendly grin, no eyelashes and no red lips, and two short stubby arms and short stubby legs in golden tan.
- **alfajor**: a round alfajor sandwich-cookie girl: two pale shortbread discs with a thick pastel caramel dulce de leche filling, the edge rolled in white coconut flakes, her face on the top cookie with big glossy black eyes, two tiny eyelash flicks, a tiny red mouth and small pink blush cheeks, and short stubby arms and legs in pale shortbread.

## Retiring in F5: the animal cast

F4 replaced the alpaca, turtle, chick and capybara with the food cast above. The 36 stills F2 published still use them, and `scripts/content/art.ts` (`CAST`) still lists them, so their sheets and descriptions stay until F5 recasts the first 100 and removes them. They are not in the cast section, so a cast call never offers them.

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

## Mascot loops

F3 made the hero mascot's idle and celebration loops from the concha's front view with the background removed (`cast/concha-cutout.webp`), centred on a square of the paper colour and passed as both the start and the end frame of a short video job. The takes, their prompts and models are in `mascot/takes.json`; `npm run mascot` encodes them and publishes the two in use. The decisions are in `docs/design.md` under "Art", "Decided in F3".
