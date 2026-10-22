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

## Brezel candidates, German lead (`brezel-candidates-t1.jpg`, `-t2.jpg`, `brezel-lineup.jpg`)

The lead and hero mascot for the German version: the Brezel replaces the concha; the alpaca, turtle, chick and capybara stay. Seedream 5.0 Flash, 2k, 1:1, two takes, `--image cast/concha-front.webp` for the clay material only. Candidates: the Ordnung stickler (left column) and the gemütlich Bavarian (right). `brezel-lineup.jpg` puts take 1's two fronts beside the concha and the four who stay.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short. Use the reference image for the clay material, colour softness, cuteness and lighting only, not for the character.

A mascot candidate sheet: a 2 by 2 grid of four square panels with even gutters, each on a plain warm cream background (#fff8ec). Two different candidate mascots, one per column, both a tiny cute creature that is a German Brezel (soft pretzel): a plump, rounded, soft-pastel golden-brown baked dough body formed by the pretzel's fat lower "belly" curve, with a small face on the front of the belly: big glossy black eyes, small pink blush cheeks and a tiny mouth. The pretzel's two thin dough arms loop up from the belly, twist once and cross over the top of her head in the classic pretzel knot, worn like a hairdo. A few chunky white coarse salt crystals scattered on top like freckles. Tiny stubby clay arms and legs in the same baked dough colour. Very simple, minimal detail, at most two colours plus blush and the accessory.
Top row: the character standing, facing the viewer, friendly expression. Bottom row: the same character jumping happily with arms up.
Left column, the tidy stickler: a neat, prim little Brezel with tiny round pastel-lilac spectacles perched on her nose, a perfectly symmetrical knot, a slightly proper, pursed little smile, standing very upright with her tiny hands clasped primly in front.
Right column, the jolly Bavarian: a round, beaming little Brezel wearing a tiny pastel-green felt Alpine hat with a small pastel-lilac feather tucked at a jaunty angle on top of the knot, a big open-mouthed grin and extra-rosy cheeks.
No text, letters, numbers or symbols anywhere in the image. Each character keeps the same design in its two panels.
```

## Bavarian Brezel in pastel (`brezel-bavarian-t1.jpg`, `-t2.jpg`)

Courtney chose the Bavarian over the stickler. Seedream 5.0 Flash, 2k, 1:1, two takes; `--image` the Bavarian front cropped from `brezel-candidates-t1.jpg` (design), then `cast/concha-front.webp` (material).

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short. Use the first reference image for the character design and the second for the clay material, matte finish, pastel colour softness and lighting.

The mascot from the first reference image, a cute German Brezel (soft pretzel) character, restyled to match the second reference: fully matte plasticine with no shine or glaze, recoloured to a soft pastel honey-caramel tan (lighter and softer than a real baked pretzel), with a pale cream face on the plump lower belly of the pretzel, big glossy black eyes with two tiny eyelash flicks, small pink blush cheeks, a tiny happy mouth. The thin dough arms loop up and cross over the top of her head in the classic pretzel knot, worn like a hairdo. A few chunky soft white salt crystals on top like freckles. Tiny stubby clay arms and legs in the same honey tan. She always wears a tiny pastel sage-green felt Alpine hat with a small pastel-lilac feather, sitting on top of the knot, slightly tilted.
A 2 by 2 grid of four square panels with even gutters, each on a plain warm cream background (#fff8ec), full body centred.
1. top left: standing, facing the viewer, beaming.
2. top right: very happy, jumping with arms up.
3. bottom left: surprised, mouth open in a little o, one hand on her cheek.
4. bottom right: sad and drooping, looking down.
No text, letters, numbers or symbols anywhere in the image. The same character design, colours and hat in all four panels.
```

## German cast candidates (`german-cast-candidates-t1.jpg`, `-t2.jpg`, `german-lineup.jpg`)

Food characters that could join or replace the animals beside the Brezel. Seedream 5.0 Flash, 2k, 3:2, two takes, `--image cast/concha-front.webp` for the material only. `german-lineup.jpg`: the Brezel, Maß, bratwurst, potato, gummy bear and Lebkuchenherz from take 1.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short. Use the reference image for the clay material, matte finish, pastel colour softness, cuteness and lighting only, not for the characters.

A cast candidate sheet: a 3 by 2 grid of six square panels with even gutters, each on a plain warm cream background (#fff8ec). Six different candidate characters, one per panel, each a tiny cute creature that is a German food, with a small face: big glossy black eyes, small pink blush cheeks and a tiny mouth, tiny stubby clay arms and legs, full body, standing and facing the viewer, centred. Ultra-simple kawaii design, soft pastel colours, at most two main colours per character plus blush, fully matte with no shine.
1. top left: a chubby bratwurst sausage standing upright, soft pastel peach-pink with a few faint pastel grill stripes, lounging with a relaxed, half-lidded, unbothered smile.
2. top middle: a Bavarian Maß beer stein, a tall pastel butter-yellow glass mug body with a chunky handle on one side, a huge fluffy white foam head spilling over the top like dramatic big hair, with two tiny eyelash flicks, a glamorous little diva.
3. top right: a Lebkuchenherz gingerbread heart, a soft pastel cinnamon-tan heart-shaped body with a wavy pastel-pink icing border and a small pastel-lilac ribbon loop at the top, sweet and shy.
4. bottom left: a tiny gummy bear, pastel strawberry-red, softly translucent like jelly, small and excitable, bouncing on its toes.
5. bottom middle: a round little potato, pastel sandy beige with a few tiny darker freckle spots, a small green sprout on top of its head, calm and homely.
6. bottom right: a slice of Black Forest cake, pastel cocoa-brown sponge layers with cream-white cream layers, a big swirl of cream on top and a single glossy cherry, proper and a little grand.
No text, letters, numbers or symbols anywhere in the image. Each character is clearly separate and distinct.
```

## German cast as boys (`german-cast-boys-t1.jpg`, `-t2.jpg`, `german-cast-girls-vs-boys.jpg`)

Every candidate was a girl; a masculine version of each, to choose a gender per character. Seedream 5.0 Flash, 2k, 3:2, two takes, `--image` a sheet of the six girls (the Brezel from `brezel-bavarian-t1.jpg`, the rest from `german-cast-candidates-t1.jpg`). Take 1 kept the reference's order for the bottom row (potato, gummy bear); take 2 followed the prompt. `german-cast-girls-vs-boys.jpg`: girls on top, take 2's boys below, in the order Brezel, Maß, bratwurst, potato, gummy bear, Lebkuchenherz.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short.

The six characters from the reference sheet, each in the same panel position, redesigned as boys. Keep each one's food, body shape, colours, proportions, size and clay look exactly; change only the face and small details to read clearly as a cute little boy: no eyelashes, no red lips, small chunky clay eyebrows, a small simple smile or grin, big glossy black eyes and pink blush cheeks kept.
A 3 by 2 grid of six square panels with even gutters, each on a plain warm cream background (#fff8ec), full body, standing, facing the viewer, centred.
1. top left: the Brezel (soft pretzel) with the pastel sage-green felt Alpine hat and lilac feather, now a jolly lad with a small curly twisted-dough moustache and bushy little brows, beaming.
2. top middle: the Maß beer stein, the white foam now a big fluffy quiff on top plus a little foam moustache, a cheeky confident grin.
3. top right: the bratwurst, the same relaxed half-lidded unbothered expression, with thick sleepy brows and a lazy little smile.
4. bottom left: the gummy bear, now made of fully matte pastel strawberry-red plasticine like the others (not translucent, not shiny), small and excitable, bouncing on its toes with a big open grin.
5. bottom middle: the potato with the green sprout, calm and homely, with little bushy brows and a gentle smile.
6. bottom right: the Lebkuchenherz gingerbread heart with the pink icing border, the lilac ribbon loop replaced by a small pastel-lilac bow tie at the bottom of the heart, sweet and shy.
No text, letters, numbers or symbols anywhere in the image. Each character is clearly separate and distinct.
```

## German model sheets (`../de/cast/<name>-sheet.webp`)

Courtney's genders: Brezel girl (lead), Maß boy, bratwurst boy, potato boy, gummy bear girl, Lebkuchenherz girl. One model sheet each: the turtle model sheet's prompt above with the description below, Seedream 5.0 Flash, 2k, 16:9, `--image` the chosen panel (the Brezel from `brezel-bavarian-t1.jpg`, the Lebkuchenherz from `german-cast-candidates-t1.jpg`, the rest from `german-cast-boys-t2.jpg`). The `-front` file is the sheet's first panel.

The gummy bear took three rounds. Made from the matte boy, she read as a plain teddy, and Courtney wanted the gelatine sheen of the first candidate back. Two takes from the jelly girl of `german-cast-candidates-t1.jpg` (with "and no motion lines" added to the prompt) gave her body the sheen but left her arms matte; two more from the better take's front panel, with the description below, kept the arms matte. Take 1 of the last round is in use.

- **brezel**: a cute German Brezel (soft pretzel) girl: a plump body formed by the pretzel's fat lower belly in soft pastel honey-tan, fully matte plasticine with no glaze or shine, a pale cream face with big glossy black eyes, two tiny eyelash flicks, a tiny red mouth and small pink blush cheeks; the thin dough arms loop up and cross over the top of her head in the classic pretzel knot, worn like a hairdo; a few chunky soft white salt crystals like freckles; tiny stubby arms and legs in the same honey-tan; and a tiny pastel sage-green felt Alpine hat with a small pastel-lilac feather perched on the knot, slightly tilted.
- **mass**: a cute Bavarian Maß beer stein boy: a tall pastel butter-yellow glass mug body with soft dimpled panels and a chunky handle on one side, a huge fluffy white foam head on top like a big quiff and a little white foam moustache, small chunky dark eyebrows, big glossy black eyes, small pink blush cheeks, a cheeky grin, and tiny stubby clay arms and legs in pale butter-yellow.
- **bratwurst**: a chubby pastel peach-pink bratwurst sausage boy standing upright, with a few faint pastel grill stripes and a tiny twisted tip on top, half-lidded sleepy eyes under thick sleepy brows, small pink blush cheeks, a lazy little smile, and short stubby arms and legs in the same peach-pink.
- **potato**: a round pastel sandy-beige potato boy with a few tiny darker freckle spots and a small two-leaf green sprout on top of his head, little bushy brows, big glossy black eyes, small pink blush cheeks, a gentle smile, and short stubby arms and legs in the same beige.
- **gummybear**: a tiny gummy bear girl made entirely of glossy translucent pastel strawberry-red gelatine, head, body, arms and legs all the same softly see-through jelly with the sheen and soft highlights of a real gummy candy (she is the only shiny character; everything else about the render stays soft clay-toy), round ears, a slightly paler muzzle with a tiny dark nose, big glossy black eyes with two tiny eyelash flicks, a tiny smile, small pink blush cheeks, no eyebrows, and chunky little arms and legs.
- **lebkuchen**: a cute Lebkuchenherz gingerbread heart girl: a chunky soft pastel cinnamon-tan heart-shaped body with a wavy pastel-pink icing border and a small pastel-lilac ribbon loop at the top, big glossy black eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, and short stubby arms and legs in the same cinnamon-tan.

## Latin American cast candidates (`latam-cast-candidates-t1.jpg`, `-t2.jpg`, `latam-lineup.jpg`)

Food characters that could replace the animals beside the concha in the Spanish app. Seedream 5.0 Flash, 2k, 3:2, two takes, `--image cast/concha-front.webp` for the material only. `latam-lineup.jpg`: the concha, then take 2's six.

```
Soft 3D clay-toy render, matte plasticine material with subtle fingerprints, rounded chunky forms, soft studio lighting with gentle shadows, warm and playful like a stop-motion short. Use the reference image for the clay material, matte finish, pastel colour softness, cuteness and lighting only, not for the characters.

A cast candidate sheet: a 3 by 2 grid of six square panels with even gutters, each on a plain warm cream background (#fff8ec). Six different candidate characters, one per panel, each a tiny cute creature that is a Latin American food, with a small face: big glossy black eyes, small pink blush cheeks, tiny stubby clay arms and legs, full body, standing and facing the viewer, centred. Ultra-simple kawaii design, soft pastel colours, at most two main colours per character plus blush, fully matte with no shine. Girls have two tiny eyelash flicks and a tiny red mouth; boys have small chunky eyebrows and a simple smile, no eyelashes.
1. top left: a Mexican tamal boy, a plump pastel golden-yellow corn dough body snugly wrapped in a pale sage-green corn husk like a sleeping bag, the husk tied at the top in a little tuft, sleepy half-lidded eyes, utterly relaxed.
2. top middle: a churro girl, a tall star-ridged pastel cinnamon-tan churro sparkling with soft white sugar, a little swirl of pastel caramel dulce de leche on top like a glamorous hairdo, posing with one hand on her hip.
3. top right: an avocado half girl, a soft pastel pear-green body with a pastel butter-yellow face area and a round pastel brown pit as her tummy, a calm, warm, motherly smile.
4. bottom left: a tiny chili pepper boy, a small pastel coral-red chile with a curly pastel-green stem on top like a cowlick, bouncing on his toes, bursting with energy.
5. bottom middle: an Argentine empanada boy, a plump half-moon pastel golden pastry with a crimped braided edge running over the top like a hairline, proud and friendly.
6. bottom right: an alfajor girl, a round sandwich cookie of two pale shortbread discs with a thick pastel caramel dulce de leche filling, the edge rolled in white coconut flakes, sweet and shy.
No text, letters, numbers or symbols anywhere in the image. Each character is clearly separate and distinct.
```

## Latin American model sheets (`../cast/<name>-sheet.webp`)

Courtney keeps all six to replace the animals beside the concha, with the empanada and the chile as boys and the rest girls. The model-sheet prompt with "and no motion lines" added, `--image` the panel from `latam-cast-candidates-t2.jpg` (the alfajor from `-t1`), Seedream 5.0 Flash, 2k, 16:9. The chile came back with no eyebrows and the empanada with no arms in the turnaround, so both were rendered again with the descriptions below. The `-front` file is the sheet's first panel.

- **tamal**: a plump pastel golden-yellow corn-dough tamal girl snugly wrapped in a pale sage-green corn husk like a sleeping bag, the husk tied at the top in a little tuft like a topknot, sleepy half-lidded eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, and short stubby arms and legs in golden-yellow.
- **churro**: a tall star-ridged pastel cinnamon-tan churro girl sparkling with soft white sugar, a swirl of pastel caramel dulce de leche on top like a glamorous hairdo, big glossy black eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, and short stubby arms and legs in pale cream.
- **avocado**: an avocado-half girl: a soft pastel pear-green skin rim around a pastel butter-yellow face, a round pastel brown pit as her tummy, big glossy black eyes with two tiny eyelash flicks, a tiny red mouth, small pink blush cheeks, and short stubby arms and legs in pastel green.
- **chile**: a small pastel coral-red chili pepper boy with a curly pastel-green stem on top like a cowlick, two small chunky dark-brown eyebrows clearly visible above his eyes in every panel, big glossy black eyes, small pink blush cheeks, a big open cheeky grin, no eyelashes and no red lips, and short stubby arms and legs in coral-red.
- **empanada**: a plump half-moon pastel golden Argentine empanada boy with a crimped braided edge running over the top like a hairline, small chunky dark eyebrows, big glossy black eyes, small pink blush cheeks, a wide friendly grin, no eyelashes and no red lips, and short stubby legs and two short stubby arms in golden tan, one on each side of his body, visible in every panel including the front, three-quarter, side and back views.
- **alfajor**: a round alfajor sandwich-cookie girl: two pale shortbread discs with a thick pastel caramel dulce de leche filling, the edge rolled in white coconut flakes, her face on the top cookie with big glossy black eyes, two tiny eyelash flicks, a tiny red mouth and small pink blush cheeks, and short stubby arms and legs in pale shortbread.
