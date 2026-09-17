# Context Budget

Paste a prompt, chat log, or context dump and get a **shareable budget card**: approximate tokens, a green → yellow → red bar, headroom, and a heuristic list of what to cut.

A window fills up with few-shots, JSON, licenses, and last week's transcript. The card is small enough to screenshot and specific enough to argue with: how full the window is, and which blobs are earning their keep.

**Paste the context. Print the budget. Share the cut — not the secrets.**

[![MIT License](https://img.shields.io/badge/license-MIT-00D4FF?labelColor=0A0F1F)](LICENSE)

SMF Works viral kit:

1. **[Paste → Skill](https://github.com/smfworks/paste-to-skill)** — create
2. **[Skill Lint](https://github.com/smfworks/skill-lint)** — grade / fix
3. **[Refuse Card](https://github.com/smfworks/refuse-card)** — the gate
4. **[Agent Receipt](https://github.com/smfworks/agent-receipt)** — what ran
5. **[Prompt Diff](https://github.com/smfworks/prompt-diff)** — what changed
6. **Context Budget (this)** — what to cut

## Why a context budget?

Agent work dies when the window is full of copies: repeated examples, tool dumps, licenses, and chat history nobody will reread. A card is a lab artifact, not a finance product.

**Approximate (chars ÷ 4). Heuristic demo. Not a billing meter. Not a tokenizer. Judgment stays human.**

## Quickstart

```bash
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

```bash
npm run build
npm run preview
npm test
```

Node 20+ (22 recommended). Client-side only — no auth, no backend, no API keys, no secrets leave the browser.

## Use it

1. Pick **Tight brief** (GREEN), **Few-shot echo** (YELLOW), **Session dump** (RED), or **Payload dump** (RED), or paste / drop a `.txt` / `.md` / `.json`.
2. Choose a budget: **8k / 32k / 128k / 200k**, or **Custom** (`64k`, `50000`, …).
3. The card updates live — `~tokens`, `%` of budget, headroom, and a cut list.
4. **Download PNG** or **Copy share text**. **Reset** clears the compositor.

Useful query params: `?sample=few-shot-echo`, `?sample=session-dump`, `?budget=32k`, `?shot=card`, `?shot=og`.

## Samples

| Id | What it shows |
| --- | --- |
| `tight-brief` | Bounded ops prompt · GREEN on 8k · nothing obvious to cut |
| `few-shot-echo` | The same example, copied · YELLOW on 8k |
| `session-dump` | Chat transcript + JSON payload · RED on 8k |
| `payload-dump` | License + base64 + URL dump · RED on 8k |

## How tokens are counted

`tokens ≈ round(chars / 4)`. That is a **rough estimate**, not tiktoken, not a provider tokenizer, and **not a billing meter**. Different models count differently. Treat the number as a conversation starter.

### Bands (share of the selected budget)

| Band | When |
| --- | --- |
| **GREEN** | &lt; 70% |
| **YELLOW** | 70% – &lt; 90% |
| **RED** | ≥ 90%, including over budget |

### Cut heuristics

Pattern matching in [`src/lib/cuts.ts`](src/lib/cuts.ts). It will be wrong. That is the point of a human gate.

| Id | Looks for |
| --- | --- |
| `dup-lines` | Consecutive duplicate lines |
| `dup-blocks` | Repeated paragraphs |
| `few-shot` | `Example N:` / few-shot piles |
| `chat-log` | User / Assistant transcripts |
| `json-blob` | Large JSON documents or fences |
| `code-fence` | Oversized fenced code |
| `base64` | High-entropy / data-URL blobs |
| `boilerplate` | License / copyright walls |
| `url-dump` | A pile of inline URLs |
| `stack-trace` | Stack frames |
| `blank-runs` | Long empty stretches |

Savings on the card are also chars ÷ 4. Overlapping hits can double-count. Cut with judgment.

## Host a demo

Static files from `npm run build` (output: `dist/`).

Or Docker:

```bash
docker build -t context-budget .
docker run --rm -p 8080:80 context-budget
```

Then open [http://localhost:8080](http://localhost:8080).

## Stack

Vite + React + TypeScript. Budgeting is client-side heuristics (no model, no keys). PNG export via `html-to-image`. Fonts: Inter, Space Grotesk, JetBrains Mono. Palette: navy `#0A0F1F`, ember `#ea580c`, cyan `#00D4FF`. Bar: green `#4ade80` → yellow `#eab308` → red `#f43f5e`.

## Built by SMF Works

[SMF Works](https://smfworks.com) is a human-AI research lab. We publish what we learn, ship open agent tools, and install stacks on hardware you own.

Intelligence is abundant. Judgment is the product.

- Lab: [smfworks.com](https://smfworks.com)
- GitHub: [github.com/smfworks](https://github.com/smfworks)
- X: [@MichaelGannotti](https://x.com/MichaelGannotti)
- Sister apps: [Paste → Skill](https://github.com/smfworks/paste-to-skill) · [Skill Lint](https://github.com/smfworks/skill-lint) · [Refuse Card](https://github.com/smfworks/refuse-card) · [Agent Receipt](https://github.com/smfworks/agent-receipt) · [Prompt Diff](https://github.com/smfworks/prompt-diff)

MIT licensed. No medical or legal claims. This is a shareable budget card, not a meter, not an audit, not advice, and not a hosted agent.

## License

[MIT](LICENSE) © 2026 SMF Works
