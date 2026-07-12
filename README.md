# 漢讀 · Hanzi Reader

> A free, source-available Hanzi reader for studying Chinese through real reading.

[🇧🇷 Ler em Português Brasileiro](./LEIAME-PT-BR.md)

[🇪🇸 Leer en Español](./LEEME-ES.md)

**漢讀 · Hanzi Reader** is a Chinese reading tool made for people who want to read Mandarin texts, books, stories and study materials with useful learning support — without needing to pay a monthly subscription for basic reading features.

This project was created because I believe simple tools for reading your own books, adding pinyin, checking words, listening to pronunciation and studying Chinese should be accessible.

---

## Status

```text
Project type: Source-available
Main purpose: Chinese reading and study
Commercial resale: Not allowed
License: PolyForm Noncommercial License 1.0.0
Author: Sr. Hell
```

---

## Why I made this

I was frustrated with apps that lock very basic reading features behind subscriptions.

Paying monthly just to read my own books, see pinyin, check words or listen to simple pronunciation did not feel right to me.

So I started building my own reader — simple, direct and focused on helping Chinese learners.

Hanzi Reader is my attempt to create a practical, free and accessible tool for studying Chinese through real reading.

---

## What Hanzi Reader does

```mermaid
mindmap
  root((漢讀 Hanzi Reader))
    Reading
      Chinese texts
      Books
      Long chapters
      Clean reader interface
      Pinyin support
      Progressive rendering
    Dictionary
      Word lookup
      Character lookup
      Definitions
      Related words
      Example sentences
      Stroke order animations
      Step by step strokes
    Audio
      Read aloud
      Chinese voices
      Browser voices
      Experimental emotional voice
    Study
      Saved words
      Flashcards
      Review
    Practice
      Tone identification
      Tone sequence sessions
      Hanzi writing with stroke scoring
      How to play guides
      Session results
    Music
      Guzheng library
      Favorites shuffle repeat
    Import
      Manual text
      URL import
      PDF support
      External reading sources
    Language
      Brazilian Portuguese interface
      English interface
      Spanish interface
      Browser language detection
      Translation support
```

---

## Main features

- Read Chinese texts with pinyin support
- Import text manually or from URLs
- Read books, chapters and long texts in a clean reader interface
- Progressive reader: the first passage appears instantly and long texts stream in the background
- Save words while reading
- Built-in dictionary view
- Word definitions and automatic translation support
- Stroke order animations with a "Steps" breakdown of each writing stage
- Text-to-speech / read aloud support
- Chinese voice options
- Experimental emotional voice modes
- Practice area with tone identification, tone sequence sessions and Hanzi writing
- Hanzi writing evaluation: estimated similarity by stroke order, direction, shape, position and proportion
- "How to play" guides on the first access to each activity
- End-of-session summary screens with a short celebration track
- Guzheng music library with favorites, shuffle and repeat
- Flashcards and review for saved content
- Brazilian Portuguese, English and Spanish interface support
- Automatic interface language based on the browser language
- Local storage for user data inside the browser (light preferences in localStorage, sessions and caches in IndexedDB with automatic fallback)
- PDF reading support
- External source indexing / integration for learning purposes

---

## What's new in v5.1

- **Stroke order steps are back**: below the stroke animation in the dictionary, the **Steps** button expands static images of every writing stage — and collapses again on a second tap.
- **Hanzi writing rebuilt**: search the character you want to train, keep the stroke-order GIF and its steps beside the practice square, and finish each character to get an **estimated similarity** score (order 25%, direction 20%, shape 20%, position 20%, proportion 15%), reusing the same stroke analysis as the manual recognizer.
- **Tone sequence without a fixed limit**: play as many challenges as you like; the header shows challenges, current streak, hits and partial accuracy. Finishing (button, back arrow, device Back or Esc) opens the shared results screen with challenges, hits, mistakes, accuracy, best streak, hardest tones, session time and final score — plus the short celebration track.
- **Reliable session endings everywhere**: the device Back button and Esc now close practice activities through the results screen instead of leaving the app.
- **"How to play" screens** for tone drawing and Hanzi writing appear on first access (with a visual of the four tones and the neutral tap) and stay available behind the "?" button.
- **Faster opening of Simple Readings and Books**: the first chunk renders immediately, the interface stays responsive, and the rest streams in background batches — pausing when you leave the screen and resuming when you return.
- **Single-character definitions fixed**: the dictionary resolver normalizes the input, tries simplified/traditional variants and extra sources, and never records a temporary network failure as "not found".
- **Unified storage layer**: small preferences in localStorage (with in-memory cache), sessions and dictionary cache in IndexedDB, safe batched migration and a memory fallback when IndexedDB is unavailable.
- **Spanish interface** added, with a new accordion language selector in Settings (tap, mouse and keyboard friendly).
- **Refined footer icons** (Practice as a minimalist guzheng with sound waves, Flash Cards as stacked cards) and the **Music modal no longer opens the keyboard automatically** — the search field is only focused when you tap it.

---

## App flow

```mermaid
flowchart TD
    A[Open Hanzi Reader] --> B{Choose input}
    B --> C[Paste text]
    B --> D[Import from URL]
    B --> E[Open PDF]
    B --> F[Use saved book]

    C --> G[Reader]
    D --> G
    E --> G
    F --> G

    G --> H[Read Chinese text]
    H --> I[Show pinyin]
    H --> J[Tap word or character]
    H --> K[Select text]

    J --> L[Dictionary]
    J --> M[Save word]
    J --> N[Play audio]

    K --> O[Translate selection]
    K --> P[Read aloud]

    M --> Q[Practice]
    Q --> R[Review saved words]
```

---

## Study workflow

```mermaid
sequenceDiagram
    participant User
    participant Reader
    participant Dictionary
    participant Audio
    participant Translation
    participant Practice

    User->>Reader: Opens a Chinese text
    Reader->>Reader: Displays Hanzi with pinyin
    User->>Dictionary: Taps a word or character
    Dictionary->>User: Shows meaning, pinyin and examples
    User->>Audio: Plays pronunciation
    User->>Translation: Translates selected text
    Translation->>User: Shows translation support
    User->>Practice: Saves useful words
    Practice->>User: Reviews vocabulary later
```

---

## Project philosophy

This project is meant to stay simple, useful and accessible.

You can use it, study it, modify it and improve it for personal, educational and non-commercial purposes.

Please do not take this project and resell it as a paid clone.

The goal is to help learners, not to create another paywall.

---

## What this project is

```mermaid
graph LR
    A[Hanzi Reader] --> B[Reader interface]
    A --> C[Study helper]
    A --> D[Dictionary layer]
    A --> E[Audio layer]
    A --> F[Translation layer]
    A --> G[Source indexer]
    A --> H[Practice tool]

    G --> I[Free/public sources]
    G --> J[External services]
    G --> K[Learning resources]

    I -.owned by.-> L[Their respective owners]
    J -.owned by.-> L
    K -.owned by.-> L
```

---

## What this project is not

Hanzi Reader is **not** a paid clone.

Hanzi Reader is **not** a commercial product.

Hanzi Reader is **not** claiming ownership over third-party sources, voices, APIs, datasets, websites or learning materials.

Hanzi Reader only provides a reader, interface, study layer, translation layer, index and integration layer for learning purposes.

---

## Sources and third-party content

This project may index, connect to, reference, or integrate free/public third-party resources and browser-accessible services, including:

- Browser / Microsoft Edge text-to-speech voices
- Translation services
- Chinese learning sources
- Pinyin tools
- Dictionary data
- Stroke order resources
- PDF reading tools
- Public or free reading sources

I do not claim ownership over third-party sources, services, voices, datasets, APIs, websites, libraries or external content used, referenced, indexed or integrated by the app.

All third-party resources remain the property of their respective owners and are subject to their own licenses, terms of use, usage limits, availability and restrictions.

---

## Source relationship

```mermaid
flowchart TB
    A[Third-party free/public sources] --> B[Indexed or accessed by Hanzi Reader]
    B --> C[Reader interface]
    B --> D[Study tools]
    B --> E[Dictionary / audio / translation helpers]

    A --> F[Owned by original authors/providers]
    C --> G[Used by learner]
    D --> G
    E --> G

    H[Hanzi Reader] --> I[Does not sell third-party content]
    H --> J[Does not claim ownership]
    H --> K[Provides learning interface only]
```

---

## Repository structure

```mermaid
graph TD
    A[Repository] --> B[README.md]
    A --> C[LEIAME-PT-BR.md]
    A --> S[LEEME-ES.md]
    A --> D[LICENSE]
    A --> E[NOTICE.md]
    A --> F[index.html]
    A --> G[assets/]
    A --> H[docs/]

    B --> B1[English project explanation]
    C --> C1[Brazilian Portuguese README]
    S --> S1[Spanish README]
    D --> D1[PolyForm Noncommercial reference]
    E --> E1[Third-party source notice]
    F --> F1[Main app]
    G --> G1[Icons / images / static files]
    H --> H1[Extra documentation]
```

Recommended structure:

```text
hanzi-reader/
├── README.md
├── LEIAME-PT-BR.md
├── LEEME-ES.md
├── LICENSE
├── NOTICE.md
├── index.html
├── assets/
└── docs/
```

---

## License

This project is released under the **PolyForm Noncommercial License 1.0.0**.

You may use, study, modify and share this project for:

- Personal use
- Educational use
- Research
- Learning
- Non-commercial modification
- Non-commercial redistribution with attribution

You may **not**:

- Sell this project
- Resell modified versions
- Resell unmodified versions
- Include it in paid products
- Offer it as a paid hosted service
- Put it behind a subscription
- Use it commercially without explicit written permission from the author

This project is **source-available**, but it is **not licensed for commercial resale**.

See [LICENSE](./LICENSE) and [NOTICE.md](./NOTICE.md) for details.

---

## NOTICE

Please also read the [NOTICE.md](./NOTICE.md) file.

That file explains that Hanzi Reader may index, connect to or integrate free/public third-party resources, but does not claim ownership over them.

Third-party sources remain owned by their respective owners.

---

## Disclaimer

This is a personal learning project and may contain bugs, limitations or experimental features.

Some services used by the app may depend on browser support, network access or third-party availability.

If something stops working, it may be caused by external service changes.

---

## Contributing

Suggestions, improvements and bug reports are welcome.

If you find a problem, have an idea, or want to improve the project, feel free to open an issue or contact me.

Please keep the project non-commercial and accessible.

---

## Author

Made by **Sr. Hell**.

Free for personal, educational and non-commercial use.

Please do not sell this project.
