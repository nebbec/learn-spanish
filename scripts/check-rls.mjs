// D3's check against the real Supabase project: a second user can neither read
// nor change the first user's rows in reviews, notes, card_reports or resets (L16),
// and a visitor who is not signed in gets nothing. Also checks the rules sync relies
// on: a repeated upload changes nothing, reviews and resets cannot be changed, a
// note only replaces an earlier one, and the download order (`seq`) follows arrival.
// And the language column (DE2): a row that names no language is Spanish, only es
// and de are accepted, a card has a note per language, and a read filtered by
// language gets only that language's rows.
//
// Creates two throwaway users with the secret key, signs each in with an
// emailed-code token through the publishable key as the app would, and deletes
// both users, and with them their rows, at the end. No email is sent.
// Run: npm run check:rls (reads .env.local; see .env.example)

import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const secret = process.env.SUPABASE_SECRET_KEY;
if (!url || !publishable || !secret) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY and SUPABASE_SECRET_KEY in .env.local");
  process.exit(1);
}

const memoryOnly = { auth: { persistSession: false, autoRefreshToken: false } };
const admin = createClient(url, secret, memoryOnly);
const TABLES = ["reviews", "notes", "card_reports", "resets"];
const CARD = "rls-check-card";
const DEVICE = randomUUID();

let passed = 0;
let failed = 0;

function check(name, ok, detail) {
  if (ok) passed += 1;
  else failed += 1;
  console.log(`${ok ? "pass" : "FAIL"}  ${name}${!ok && detail ? ` (${detail})` : ""}`);
}

/** True when Postgres refused the call for lack of permission or a failed row-level security check. */
function refused(result) {
  return result.error?.code === "42501";
}

/** A new confirmed user, signed in through the publishable key. */
async function signedInUser(email) {
  const { data: created, error } = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (error) throw new Error(`creating a test user: ${error.message}`);
  const { data: link, error: linkError } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkError) throw new Error(`making a sign-in token: ${linkError.message}`);
  const client = createClient(url, publishable, memoryOnly);
  const { error: verifyError } = await client.auth.verifyOtp({ type: "email", token_hash: link.properties.hashed_token });
  if (verifyError) throw new Error(`signing in: ${verifyError.message}`);
  return { id: created.user.id, client };
}

function review(userId, at) {
  return {
    user_id: userId,
    id: randomUUID(),
    card_id: CARD,
    direction: "forward",
    rating: "good",
    reviewed_at: new Date(at).toISOString(),
    section: "learn",
    device_id: DEVICE,
  };
}

function note(userId, text, at) {
  return { user_id: userId, card_id: CARD, text, updated_at: new Date(at).toISOString() };
}

function report(userId) {
  return { user_id: userId, id: randomUUID(), card_id: CARD, comment: "rls check", created_at: new Date().toISOString() };
}

function reset(userId, at) {
  return { user_id: userId, id: randomUUID(), reset_at: new Date(at).toISOString(), device_id: DEVICE };
}

// The calls the app's remote makes (lib/sync/supabaseRemote.ts). Rows without `lang` are Spanish by default.
const pushReviews = (client, rows) => client.from("reviews").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });
const pushNotes = (client, rows) => client.from("notes").upsert(rows, { onConflict: "user_id,lang,card_id" });
const pushReports = (client, rows) => client.from("card_reports").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });
const pushResets = (client, rows) => client.from("resets").upsert(rows, { onConflict: "user_id,id", ignoreDuplicates: true });

/** Every row the client can see in a table, oldest seq first where there is one. */
async function visible(client, table) {
  const query = client.from(table).select("*");
  const { data, error } = table === "card_reports" ? await query : await query.order("seq");
  return { rows: data ?? [], error };
}

async function heldNote(user) {
  const { rows } = await visible(user.client, "notes");
  return rows[0];
}

async function main() {
  const tag = `${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
  const users = [];
  try {
    const a = await signedInUser(`rls-check-a-${tag}@example.com`);
    users.push(a);
    const b = await signedInUser(`rls-check-b-${tag}@example.com`);
    users.push(b);
    const anon = createClient(url, publishable, memoryOnly);
    const t0 = Date.now();

    // The first user's rows.
    const first = review(a.id, t0);
    check("first user adds a review", !(await pushReviews(a.client, [first])).error);
    check("first user adds a note", !(await pushNotes(a.client, [note(a.id, "mine", t0)])).error);
    check("first user adds a report", !(await pushReports(a.client, [report(a.id)])).error);
    const firstReset = reset(a.id, t0);
    const addReset = await pushResets(a.client, [firstReset]);
    check("first user adds a reset", !addReset.error, addReset.error?.message);
    for (const table of TABLES) {
      const { rows, error } = await visible(a.client, table);
      check(`first user reads their own ${table}`, !error && rows.length === 1, error?.message ?? `${rows.length} rows`);
    }

    // The second user and a visitor who is not signed in.
    for (const [who, client] of [["second user", b.client], ["visitor", anon]]) {
      for (const table of TABLES) {
        const { rows } = await visible(client, table);
        check(`${who} reads none of ${table}`, rows.length === 0, `${rows.length} rows`);
      }
      const adds = [
        ["reviews", await pushReviews(client, [review(a.id, t0)])],
        ["notes", await pushNotes(client, [note(a.id, "theirs", t0 + 1000)])],
        ["card_reports", await pushReports(client, [report(a.id)])],
        ["resets", await pushResets(client, [reset(a.id, t0)])],
      ];
      for (const [table, result] of adds) {
        check(`${who} cannot add to ${table} as the first user`, refused(result), result.error?.code ?? "accepted");
      }
      await client.from("notes").update({ text: "theirs", updated_at: new Date(t0 + 2000).toISOString() }).eq("user_id", a.id);
      await client.from("reviews").update({ rating: "again" }).eq("user_id", a.id);
      await client.from("resets").update({ reset_at: new Date(t0 + 3000).toISOString() }).eq("user_id", a.id);
      for (const table of TABLES) await client.from(table).delete().eq("user_id", a.id);
    }
    const afterB = await Promise.all(TABLES.map((table) => visible(a.client, table)));
    check("first user still has all their rows", afterB.every(({ rows }) => rows.length === 1));
    check("first user's note unchanged", (await heldNote(a))?.text === "mine");
    check("first user's review unchanged", afterB[0].rows[0]?.rating === "good");
    check("first user's reset unchanged", Date.parse(afterB[3].rows[0]?.reset_at) === t0);

    // Reviews are never changed, even by their owner.
    const ownChange = await a.client.from("reviews").update({ rating: "again" }).eq("id", first.id);
    check("owner cannot change a review", refused(ownChange), ownChange.error?.code ?? "accepted");
    const ownDelete = await a.client.from("reviews").delete().eq("id", first.id);
    check("owner cannot delete a review", refused(ownDelete), ownDelete.error?.code ?? "accepted");
    const resetChange = await a.client.from("resets").update({ reset_at: new Date(t0 + 4000).toISOString() }).eq("id", firstReset.id);
    check("owner cannot change a reset", refused(resetChange), resetChange.error?.code ?? "accepted");
    const resetDelete = await a.client.from("resets").delete().eq("id", firstReset.id);
    check("owner cannot delete a reset", refused(resetDelete), resetDelete.error?.code ?? "accepted");

    // A repeated upload changes nothing.
    check("repeating a review upload is accepted", !(await pushReviews(a.client, [first])).error);
    check("repeating a review upload adds nothing", (await visible(a.client, "reviews")).rows.length === 1);
    check("repeating a reset upload is accepted", !(await pushResets(a.client, [firstReset])).error);
    check("repeating a reset upload adds nothing", (await visible(a.client, "resets")).rows.length === 1);

    // Notes: the latest edit wins, and on equal times the stored one stays.
    const before = await heldNote(a);
    check("an earlier note is accepted", !(await pushNotes(a.client, [note(a.id, "older", t0 - 1000)])).error);
    check("an earlier note does not replace a later one", (await heldNote(a))?.text === "mine");
    await pushNotes(a.client, [note(a.id, "same time", t0)]);
    const tied = await heldNote(a);
    check("a note at the same time leaves the stored one", tied?.text === "mine" && tied?.seq === before?.seq);
    await pushNotes(a.client, [note(a.id, "newer", t0 + 5000)]);
    const replaced = await heldNote(a);
    check("a later note replaces it", replaced?.text === "newer");
    check("a replaced note gets a later seq", Number(replaced?.seq) > Number(before?.seq));

    // Download order: rows uploaded later come after the cursor, whatever their own times.
    const firstSeq = (await visible(a.client, "reviews")).rows[0]?.seq;
    const offlineLastWeek = review(a.id, t0 - 7 * 24 * 3600 * 1000);
    await pushReviews(a.client, [offlineLastWeek]);
    const { data: page, error: pageError } = await a.client.from("reviews").select("id, seq").gt("seq", firstSeq).order("seq");
    check(
      "a review uploaded later is read after the cursor",
      !pageError && page.length === 1 && page[0].id === offlineLastWeek.id,
      pageError?.message ?? `${page?.length} rows`,
    );

    // Resets follow arrival too: one uploaded later is read after the cursor (L16).
    const resetSeq = (await visible(a.client, "resets")).rows[0]?.seq;
    const laterReset = reset(a.id, t0 - 7 * 24 * 3600 * 1000);
    await pushResets(a.client, [laterReset]);
    const { data: resetPage, error: resetPageError } = await a.client
      .from("resets")
      .select("id, seq")
      .gt("seq", resetSeq)
      .order("seq");
    check(
      "a reset uploaded later is read after the cursor",
      !resetPageError && resetPage.length === 1 && resetPage[0].id === laterReset.id,
      resetPageError?.message ?? `${resetPage?.length} rows`,
    );

    // Ratings: the intro's `known` (L10) is stored like the three buttons; anything else is refused.
    const known = { ...review(a.id, t0 + 1000), rating: "known" };
    const knownResult = await pushReviews(a.client, [known]);
    check("a known review is accepted", !knownResult.error, knownResult.error?.message);
    const unknown = await pushReviews(a.client, [{ ...review(a.id, t0 + 2000), rating: "easy" }]);
    check("a rating outside the four is refused", unknown.error?.code === "23514", unknown.error?.code ?? "accepted");

    // Languages (DE2). Everything above named no language, so it is Spanish.
    for (const table of TABLES) {
      const { rows } = await visible(a.client, table);
      check(`a ${table} row that names no language is Spanish`, rows.length > 0 && rows.every((r) => r.lang === "es"));
    }
    const de = (row) => ({ ...row, lang: "de" });
    const germanReview = de(review(a.id, t0 + 3000));
    check("a German review is accepted", !(await pushReviews(a.client, [germanReview])).error);
    check("a German report is accepted", !(await pushReports(a.client, [de(report(a.id))])).error);
    const germanReset = de(reset(a.id, t0 + 3000));
    check("a German reset is accepted", !(await pushResets(a.client, [germanReset])).error);
    for (const [table, push, row] of [
      ["reviews", pushReviews, review(a.id, t0)],
      ["notes", pushNotes, note(a.id, "french", t0)],
      ["card_reports", pushReports, report(a.id)],
      ["resets", pushResets, reset(a.id, t0)],
    ]) {
      const result = await push(a.client, [{ ...row, lang: "fr" }]);
      check(`a ${table} row in another language is refused`, result.error?.code === "23514", result.error?.code ?? "accepted");
    }

    // A card id can be in both decks: one note per language, each kept by its own rule.
    const spanishNote = await heldNote(a);
    const addGermanNote = await pushNotes(a.client, [de(note(a.id, "deutsch", t0 - 9000))]);
    check("a German note on a card with a Spanish note is accepted", !addGermanNote.error, addGermanNote.error?.message);
    const notes = (await visible(a.client, "notes")).rows;
    check(
      "the card then has a note in each language",
      notes.length === 2 && notes.some((n) => n.lang === "es" && n.text === spanishNote?.text) && notes.some((n) => n.lang === "de" && n.text === "deutsch"),
      notes.map((n) => `${n.lang}:${n.text}`).join(", "),
    );
    await pushNotes(a.client, [de(note(a.id, "deutsch, later", t0 + 9000))]);
    const afterGerman = (await visible(a.client, "notes")).rows;
    check(
      "a later German note replaces only the German one",
      afterGerman.find((n) => n.lang === "de")?.text === "deutsch, later" && afterGerman.find((n) => n.lang === "es")?.text === spanishNote?.text,
    );

    // A download filtered by language, as the app makes it, after a cursor shared by both.
    const read = (table, lang, since) => a.client.from(table).select("*").eq("lang", lang).gt("seq", since).order("seq");
    const germanOnly = await read("reviews", "de", 0);
    check(
      "a German download reads only German reviews",
      !germanOnly.error && germanOnly.data.length === 1 && germanOnly.data[0].id === germanReview.id,
      germanOnly.error?.message ?? `${germanOnly.data?.length} rows`,
    );
    const spanishOnly = await read("reviews", "es", 0);
    check("a Spanish download reads no German review", !spanishOnly.error && spanishOnly.data.every((r) => r.lang === "es") && spanishOnly.data.length === 3);
    const spanishResets = await read("resets", "es", 0);
    check(
      "a Spanish download reads no German reset",
      !spanishResets.error && spanishResets.data.length === 2 && !spanishResets.data.some((r) => r.id === germanReset.id),
    );
    // The German review's seq lies between the Spanish cursor and the next Spanish row.
    const lastSpanish = spanishOnly.data.at(-1)?.seq;
    check("the German review took a later seq than the Spanish cursor", Number(germanOnly.data?.[0]?.seq) > Number(lastSpanish));
    const laterSpanish = review(a.id, t0 + 4000);
    await pushReviews(a.client, [laterSpanish]);
    const nextPage = await read("reviews", "es", lastSpanish);
    check(
      "a Spanish row uploaded after a German one is read after the Spanish cursor",
      !nextPage.error && nextPage.data.length === 1 && nextPage.data[0].id === laterSpanish.id,
      nextPage.error?.message ?? `${nextPage.data?.length} rows`,
    );

    // Languages do not open another user's rows.
    for (const table of TABLES) {
      const { data } = await b.client.from(table).select("*").eq("lang", "de");
      check(`second user reads none of the first user's German ${table}`, (data ?? []).length === 0, `${data?.length} rows`);
    }
  } finally {
    for (const user of users) await admin.auth.admin.deleteUser(user.id);
  }

  if (users.length === 2) {
    const left = await Promise.all(
      TABLES.map((table) => admin.from(table).select("*", { count: "exact", head: true }).in("user_id", users.map((u) => u.id))),
    );
    check("deleting the users removes their rows", left.every(({ count, error }) => !error && count === 0));
  }
  console.log(`\n${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((error) => {
  console.error(`check-rls stopped: ${error.message ?? error}`);
  process.exit(1);
});
