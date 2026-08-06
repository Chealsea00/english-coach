# BizEnglish — AI Business English Coach

**Sound fluent, natural, and executive in every meeting.**

🔗 **Live app:** https://english-coach-blue-ten.vercel.app

BizEnglish is an AI-powered coach for non-native professionals who already *work* in English but want to sound sharper, more natural, and more confident — in meetings, emails, Slack, and presentations. Paste a word or an idea (in English **or** Chinese) and get an instant, business-context learning card; then lock it into memory with spaced-repetition review.

---

## Why use it

Most language apps teach generic vocabulary. BizEnglish is built for the **workplace** — the exact expressions, tone, and delivery that make you sound like a fluent operator, not a textbook.

- **🈶 Think in Chinese, speak in English.** Type your idea in 中文 and get the natural, idiomatic way a native professional would actually say it — not a stiff literal translation.
- **💼 Business-context learning cards.** Every word comes with a Chinese meaning, English definition, real business examples, alternative phrasings by register, collocations, and word roots.
- **🗣 Sentence Coach.** Paste any sentence and learn its tone, key phrases, stress, and how to deliver it naturally.
- **🎙 Pronunciation practice.** Record yourself, compare to native audio, and get AI feedback.
- **🔁 Spaced-repetition review.** A proven memory algorithm resurfaces words right before you'd forget them — star the ones that matter most for 2× review.
- **📈 Progress that means something.** Track expressions mastered, day streaks, and reviews done.
- **☁️ Your library, everywhere.** Sign in and your vocabulary, sentences, and progress sync across every device.

## Who it's for

Non-native English-speaking professionals — analysts, managers, operators, founders — who want to communicate with more polish and less hesitation at work.

---

## Features

- **Bilingual input** — type in **English or 中文**; Chinese input is turned into the natural, idiomatic English a native professional would actually say
- **AI vocabulary cards** — every word gets a Chinese meaning, English definition, real business examples, alternative phrasings by register, common collocations, and its word root
- **Sentence Coach** — paste any sentence to learn its tone, register, key phrases, stressed words, and tips for saying it naturally
- **Passage analysis** — break down longer text from meetings, emails, or articles into key phrases and patterns worth imitating
- **Pronunciation practice** — record yourself, listen back against native audio, and get specific AI feedback
- **Spaced-repetition review** — an SM-2 memory algorithm resurfaces cards right before you'd forget them, with the answer + full explanation shown after each grade
- **Star your priorities** — mark the words and sentences you most want to master; starred items are reviewed **2× more often**
- **Custom tags** — organize your library with your own labels and filter by them
- **Auto topic sorting** — every word and sentence is auto-categorized (strategy, finance, communication, product…) and browsable by topic
- **Natural audio** — listen to any word or sentence at slow or normal speed (ElevenLabs voice, with a built-in fallback)
- **Meaningful progress** — track expressions mastered, day streak, and reviews completed
- **Accounts + cloud sync** — sign in and your entire library follows you across every device
- **Works on your phone** — responsive layout with a mobile bottom nav

---

## Tech stack

- **Next.js 16** (App Router) + **React 19** + **TypeScript**
- **Supabase** — authentication + Postgres (per-user data with Row Level Security)
- **Gemini 2.5 Flash** with a **Groq (Llama 3.3 70B)** fallback for AI generation
- **ElevenLabs** TTS with a Web Speech fallback
- Deployed on **Vercel**

## Running locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Create a `.env.local` with:

```bash
GEMINI_API_KEY=...
GROQ_API_KEY=...
ELEVENLABS_API_KEY=...
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

To set up the database, run [`supabase/schema.sql`](supabase/schema.sql) in your Supabase SQL Editor.
