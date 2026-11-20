# token-radar-01

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/kenziexbt0-dot/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/kenziexbt0-dot/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks every pre-token protocol in a sealed DefiLlama snapshot by an implied token value built only from the snapshot's own figures — TVL, seven-day growth, how long it has run with no token, and how many chains it runs on — and gives each one a concrete six-step farm plan with what it costs and how long it takes. The board covers the whole 40-protocol watchlist plus all 186 rankable pre-token protocols below the $50M floor, and keeps the already-trading protocols apart in their own view at the market's own values.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <path to snapshot.json>
```

Node 22 or later, standard library only. The program writes `out/board.json`, `out/data.js`, `out/dashboard/`, `out/screenshots/` and `out/dossier.json`. It is deterministic: the same snapshot always writes the same bytes.

---

<sub>Entered on [make.fun](https://make.fun/?ref=2e09z4yn&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
