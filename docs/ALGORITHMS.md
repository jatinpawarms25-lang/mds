# MDS Memory Engine - Algorithms & Verification (`docs/ALGORITHMS.md`)

Verified on 2026-11-15 against:
- Anki Manual - Deck Options (`https://docs.ankiweb.net/manual/deck-options`)
- Anki Manual - Studying & Fuzz Factor (`https://docs.ankiweb.net/manual/studying`)
- Anki Manual - Leeches (`https://docs.ankiweb.net/manual/leeches`)
- Open Spaced Repetition `ts-fsrs` (`https://www.npmjs.com/package/ts-fsrs`, `https://github.com/open-spaced-repetition/awesome-fsrs`)

## 1. FSRS (Free Spaced Repetition Scheduler - Default Engine)

MDS OS implements the DSR (Difficulty, Stability, Retrievability) model from `ts-fsrs` (FSRS-5 / FSRS-6):
- **State per card**: `difficulty` `D in [1, 10]`, `stability` `S >= 0.1` (days), `reps`, `lapses`, `state` (`new | learning | review | relearning`), `dueAt`, `lastReviewAt`.
- **Forgetting Curve (Retrievability `R`)**:
  `R(t, S) = (1 + FACTOR * (t / S)) ^ (-DECAY)`
  where `FACTOR = 0.9^(-1 / DECAY) - 1` so that `R(S, S) = 0.90` (for FSRS-5 `DECAY = 0.5, FACTOR = 19/81`; for FSRS-6 `DECAY = w[20]`).
- **Next Interval**:
  `I(S, R_target) = (S / FACTOR) * (R_target^(-1 / DECAY) - 1)`, clamped to `[1, maxInterval]`.
- **Default Desired Retention**: `0.90` (configurable `0.80` to `0.97` per Anki Manual: above 90% workload grows rapidly; above 97% workload can become overwhelming).
- **Default Parameters (`FSRS-5`, 19 weights)**:
  `w = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621]`.
- **Learning & Relearning Steps**:
  Default `learningSteps = [1, 10]` (minutes) and `relearningSteps = [10]` (minutes). Per the live Anki Manual:
  - Keep steps under 1 day so cards finish on the same day.
  - On step 0 with >= 2 steps, **Hard** shows the average of the first two steps (`round((1 + 10) / 2) = 6m`); with 1 step, Hard shows `1.5x` that step (capped at +1 day); on later steps, Hard repeats the current step.
  - **Hard** is a passing grade, not a failing grade (pressing Hard when forgotten inflates stability).

## 2. Classic Anki (SM-2 Lineage - Reference & Fallback)

- **Defaults**: `learningSteps = [1, 10]` min, `relearningSteps = [10]` min, `graduatingInterval = 1` day, `easyInterval = 4` days, `startingEase = 2.50` (250%), `minEase = 1.30` (130%).
- **Ease Updates on Review**: `Again = -0.20`, `Hard = -0.15`, `Good = 0`, `Easy = +0.15` (floored at `1.30`).
- **Interval Multipliers**: `Hard = interval * 1.2`, `Good = (interval + overdueCredit) * ease`, `Easy = (interval + overdueCredit) * ease * 1.3`.
- **Late Review Partial Credit**: When `elapsedDays > scheduledInterval`, `overdue = elapsedDays - scheduledInterval`, adding `overdue / 4` (Hard), `overdue / 2` (Good), or `overdue` (Easy).
- **Lapse**: Sends card to `relearning` with `newInterval = max(minInterval, round(interval * newIntervalPct))`.

## 3. Shared Anki Mechanics & Differences Recorded

- **Leeches**: Threshold `8` lapses (`isLeech = true` and card tagged `'leech'`). Per Anki Manual (`docs.ankiweb.net/manual/leeches`), periodic leech warnings also trigger at half the initial threshold (`8 + 4 * k`, i.e. 12, 16, 20 lapses).
- **Fuzz Factor**: Applied to review intervals `>= 2.5` days (`+/-` small jitter, minimum 1 day) to prevent cards learned together from clumping on the same day. Cannot be disabled during normal scheduling (deterministic seed supported in unit tests).
- **Internal Timer Cap**: Per Anki Manual (`Maximum answer seconds`), `duration_ms` logged to `review_logs` is capped at `60,000 ms` (60s) by default.
- **Sibling Burying**: New and review siblings (e.g. `basic_reversed` or multi-cloze cards from the same `noteId`) can be buried until the next study day; cards in `learning` or `relearning` are never buried.
- **Anki Compatibility**: Per Rule R10, the app does NOT claim `.apkg` / "Anki compatible" anywhere in UI until Phase 2B passes a real `.apkg` round-trip test.
