# Aloud

A communication tool for people who can only move their eyes — ALS, locked-in syndrome, cerebral palsy, advanced paralysis. No touch, no hands, no calibration hardware beyond a webcam.

**Live:** [aloud-pink.vercel.app](https://aloud-pink.vercel.app)

## The problem it's solving

Most eye-tracking AAC (augmentative and alternative communication) hardware costs anywhere from a few hundred to several thousand dollars, needs a dedicated mount, and often needs a technician to set up. Aloud runs in a browser tab on a laptop already in the room, using nothing but the built-in webcam. A caregiver opens the tab, runs a ten-second setup, and hands control to the person. Everything after that is driven by one input: a deliberate, held blink.

That single-switch constraint is the whole design problem. Everything below exists to make one signal — eyes closed for about half a second — carry an entire conversation.

## How it works

**Setup, once.** A caregiver opens the camera and walks through the intro. Aloud asks the person to hold their eyes open for a moment, then closed for a moment, and uses those two samples to compute personal open/close thresholds — not a fixed sensitivity that assumes everyone's eyes, lighting, and camera angle behave the same way. The gap between "open" and "closed" is measured with hysteresis built in, so a partial blink or a flicker doesn't trigger a false selection. Thresholds are saved locally and reused on the next visit; recalibrating later takes one tap.

**Scanning, not pointing.** There's no cursor to aim. Aloud highlights one choice at a time, cycling through the available options on a fixed rhythm. The person just watches and waits for the highlight to land on what they want — the only decision is *when*, never *where*. Holding the eyes shut for roughly half a second past that point selects it; a short cooldown afterward stops a single long blink from double-firing.

**Two ways to say something.**

- *Quick phrases* — four categories (*I feel*, *I need*, *People*, *Answers*) covering what actually comes up most for someone in this position: pain, temperature, needing the bathroom or medicine, wanting someone closer, "I love you," yes/no, "please wait." A handful of these — can't breathe, in pain — are flagged urgent and behave differently once selected (see below).
- *Spelling mode* — a letter-by-letter grid for anything the quick phrases don't cover. It's a two-level scan: first the highlight cycles through rows (a suggestions row, three letter rows, an edit row, an actions row), a selection drops into that row, and a second scan picks the specific cell. Full alphabet, punctuation, delete-letter, delete-word, undo, and clear are all reachable this way.

**Getting a sentence out of a few letters.** Spelling one word at a time is exhausting on its own, so completion happens in layers, and each layer works whether or not the ones after it are available:

1. A local phrase and bigram lexicon suggests likely next words and common full phrases as soon as typing starts — entirely offline, no network call, works the instant the page loads.
2. A personal layer quietly tracks the words and phrases the person actually uses over time, stored only in the browser, and starts surfacing their own vocabulary ahead of generic suggestions.
3. An optional AI-assisted layer can turn a sparse, keyword-style entry ("cold water") into a handful of complete, genuinely different first-person sentences the person might mean ("Could I have some cold water?" vs. "I'm thirsty" vs. "I'm too cold"). This layer needs an API key configured server-side; without one, Aloud just runs on the first two layers and nothing breaks or looks broken. Duplicate or near-duplicate suggestions are filtered out so the options offered are meaningfully different, not four rewordings of the same thing.

**Urgent messages don't get said once and missed.** Selecting anything — a quick phrase or a finished spelled sentence — makes Aloud speak it aloud. For anything flagged urgent, it doesn't say it once; it repeats on a loop until someone acknowledges it (tapping "I got help," or another deliberate long blink), because a single spoken sentence in an empty room helps no one.

**Feedback that isn't just visual.** Short audio tones mark the scan tick, a selection, a letter being added, and a low-confidence warning — useful for a caregiver listening from another room, and one less thing that depends on watching the screen at exactly the right moment.

**No camera, no problem.** Every interaction — scanning, selecting, spelling — also works with arrow keys and space/enter, and mouse hover works as a dwell-select. Eye control is the point of the project, but it was built so it degrades to something usable, not something broken, if the camera can't be used.

## Privacy

Face detection runs entirely on-device, in the browser, via a WASM/GPU-accelerated model — video frames are analyzed locally and never transmitted anywhere. The only thing that ever leaves the device is the text already being typed in spelling mode, and only when the optional AI-completion layer is configured; if it isn't, nothing leaves the device at all.

## Running it

```
npm install
npm run dev
```

Open `http://localhost:3000` and allow the camera when prompted. No camera available? Arrow keys move the highlight, space selects — the app works the same way either way.

To enable AI-assisted sentence suggestions in spelling mode, add an API key to `.env.local`. This step is optional; the app is fully functional without it.

## Testing

```
npm test
```

Covers the calibration math (threshold computation from open/closed samples), the word/phrase prediction engine, and the spelling scan state machine.

## Built with

Next.js, React, an on-device face-landmark model for blink detection, an AI API for optional sentence completion, and the Web Speech API for voice output.

## Where this could go next

There's a hardware exploration document in this repo (`HARDWARE_EXTENSION_IDEAS.md`) sketching what a dedicated physical version could look like — a self-aiming infrared station versus a lightweight dry-electrode headset — for cases where a laptop propped on a nightstand isn't the right form factor. Not built yet; it's a scoped comparison of what each approach would actually cost and require.

## Who this is for

Anyone caring for someone who has lost the ability to speak or gesture but not the ability to move their eyes — a family member, a caregiver, a care facility — and needs something they can set up in two minutes without training.
