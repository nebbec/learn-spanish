// Hand-made corrections to the German lemma list (DE6), for frequent forms it
// gets wrong or cannot know, in the shape of overrides.mjs: each key is a form
// from the frequency list (lower case), the value is the word it counts towards
// (lower case too), `{ word: share }` to split it, or null to leave it out.
//
// As in Spanish, function words are kept as the words a learner meets: der takes
// die, das, den, dem and des; ein, kein and the possessives take their endings;
// the pronoun forms a learner says (mich, mir, dich, dir, ihn, ihm, uns, euch)
// are words of their own, and so are the contractions (im, am, zum), as Spanish
// kept del and al. The rules are in docs/german.md under "Word list".

const fold = (word, forms) => Object.fromEntries(forms.map((f) => [f, word]));
/** Each word counts as itself: the lemma list gives it to another, rarer word. */
const itself = (list) => Object.fromEntries(list.split(" ").map((w) => [w, w]));
/** A determiner or adjective and its endings: -e, -en, -em, -er, -es. */
const endings = (word, stem = word) => fold(word, [word, ...["e", "en", "em", "er", "es"].map((e) => stem + e)]);

export const OVERRIDES_DE = {
  // Articles and determiners, with their endings.
  ...fold("der", ["der", "die", "das", "den", "dem", "des"]),
  ...endings("ein"),
  ...endings("kein"),
  ...endings("mein"),
  ...endings("dein"),
  ...endings("sein"),
  ...endings("ihr"),
  ...endings("unser"),
  ...fold("unser", ["unsre", "unsren", "unsrem", "unsrer"]),
  ...fold("euer", ["euer", "eure", "euren", "eurem", "eurer", "eures"]),
  ...endings("dieser", "dies"),
  ...endings("jeder", "jed"),
  ...endings("welcher", "welch"),
  ...endings("solcher", "solch"),
  ...fold("alle", ["all", "alle", "alles", "allen", "allem", "aller"]),
  // Pronouns, each a word of its own (the lemma list gives sie and dir to ich).
  ...itself("ich du er sie es wir mich mir dich dir ihn ihm uns euch ihnen sich man wer wen wem was dass"),
  // Clipped forms: 's (geht's) is es, 'n is ein, hab is haben, rum is herum.
  s: "es",
  n: "ein",
  hab: "haben",
  rum: "herum",
  // Words the lemma list counts towards a rarer word, and that are almost always the word itself (mal, not
  // malen; Feuer, not feuern; später and weiter, not spät and weit).
  ...itself("mal los bitte danke ende ruhe später früher weiter lieber sicher leid dank nähe wind erde opfer weile"),
  ...itself("hunger feuer platz wette regel schade ehre wache wunder sieben zahl offenbar weh meister eis weise"),
  ...itself("fertig zeuge aussage akte gleich bereit form"),
  ...endings("besser"),
  ...endings("beste", "best"),
  ...endings("erste", "erst"),
  ...endings("zweite", "zweit"),
  ...endings("dritte", "dritt"),
  ...endings("letzte", "letzt"),
  ...endings("nächste", "nächst"),
  ...endings("einige", "einig"),
  ...endings("verrückt"),
  ...endings("verheiratet"),
  ...fold("scheiße", ["scheiße"]),
  ...fold("spaß", ["spaß", "spass"]),
  ...fold("schule", ["schule", "schulen"]),
  ...fold("wand", ["wand", "wände", "wänden"]),
  ...fold("stunde", ["stunde", "stunden"]),
  ...fold("menge", ["menge", "mengen"]),
  ...fold("ei", ["ei", "eier", "eiern"]),
  ...fold("verbrechen", ["verbrechen", "verbrechens"]),
  ...fold("schmerz", ["schmerz", "schmerzen"]),
  ...fold("grenze", ["grenze", "grenzen"]),
  // Verb forms the lemma list gives to a noun or adjective (ich brauche, not der Brauch; ruf mich an).
  ...fold("brauchen", ["brauche"]),
  ...fold("rufen", ["ruf", "rufe", "rufen"]),
  ...fold("heißen", ["heiße"]),
  ...fold("versuchen", ["versuche", "versuchen"]),
  ...fold("schicken", ["schicke", "schicken"]),
  ...fold("schauen", ["schau", "schauen"]),
  ...fold("sitzen", ["sitze", "sitzen"]),
  ...fold("leiden", ["leide"]),
  ...fold("verbringen", ["verbracht"]),
  ...itself("anrufen beweisen heiraten lieben"),
  // Forms shared by hand between a verb and a noun or adjective.
  weiß: { wissen: 0.97, weiß: 0.03 },
  halt: { halt: 0.5, halten: 0.5 },
  liebe: { lieben: 0.6, liebe: 0.4 },
  frage: { frage: 0.6, fragen: 0.4 },
  fragen: { fragen: 0.85, frage: 0.15 },
  junge: { junge: 0.7, jung: 0.3 },
  jungs: "junge",
  // Words of their own that the lemma list folds into a more common one (wegen is not weg, bitten not bitte, malen
  // not mal).
  ...itself("wegen bitten malen"),
  male: "malen",
  // Clipped or English forms that count towards no word.
  ma: null,
  miss: null,
};

/**
 * How a word is written, where the rule in lemmatize-de.mjs (`spellingIn`) gets it wrong: a noun the dictionary
 * also has as a rarer lower-case word (zeit the preposition, freund in "freund sein"), or a lower-case word the
 * lemma list writes with a capital (bitte, erste).
 */
export const SPELLINGS_DE = {
  ...itself("halt einige selber hi he bitte erste"),
  ...Object.fromEntries(
    (
      "Junge Liebe Frage Dank Zeit Freund Angst Schuld Teil Plan Licht Kraft Klasse Feind Schritt Gang Bar " +
      "Verbrechen Weile Wand Weihnachten Vergnügen Zeuge Aussage Akte"
    )
      .split(" ")
      .map((w) => [w.toLowerCase(), w]),
  ),
};

/** Words left out of the list: names, letters, abbreviations, and English or French words of dubbed films. */
export const DROP_DE = (
  "john jack sam frank michael charlie peter tom mary york david max paul alex harry ben james henry nick jim don " +
  "lee bob richard billy sarah bill charles robert anna daniel martin maria johnny thomas william roger tommy " +
  "paris london amerika " +
  "a o m t de al dr. mr fbi i new sir lady monsieur madame"
).split(" ");
