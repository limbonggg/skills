---
name: judge-taste
description: Use when a UI needs a craft verdict — "does this look right", "the spacing is off", "it feels janky", "should this animate", "which button is primary", "make it feel more premium", a CSS diff with three type sizes and two equal-weight CTAs. Not for deciding whether the feature should exist (use make-the-call), for render cost and frame budget (use judge-performance), or for a full accessibility audit — this lens enforces only the four floors it can measure.
domain: lenses
risk: reads
invocation: model
version: 0.1.0
metadata:
  form: recipe
  baseline: aesthetic-commentary-without-a-verdict
  eval: evals/
---

# Judge Taste

Taste here is not preference. It is the set of decisions that survive the hundredth use: one primary
per screen, a ramp you can count, spacing on a scale, and motion that explains something or does not
exist. This skill turns a UI review into a verdict with numbers in it.

The lens is sourced from interaction craft — the tradition of Emil Kowalski, Rauno Freiberg, and the
Material and Apple motion specs — with its numbers pinned to perceptual thresholds and WCAG 2.2
rather than to anyone's taste, including yours.

```
EVERY VALUE ON SCREEN NAMES THE JOB IT DOES, OR IT IS DELETED.
```

## When to use / when not to use

Use when:

- the user says "does this look right?", "something feels off", "the spacing is weird", "it looks
  cluttered", "it feels janky", "this feels cheap", "make it feel more premium", "should this
  animate?", "is this too much motion?", "which button is primary?", "we have three CTAs and nobody
  knows what to click"
- you are reviewing a page, a component, a CSS diff, a design mockup, or a motion spec
- you are about to write UI code and the values are being chosen as you type
- a redesign request arrives as an adjective ("modern", "clean", "delightful") and has to become
  decisions
- a screen ships with two equal-weight actions and the argument is about colour

Not when:

- the question is whether the feature should exist — that is `make-the-call`; this lens judges the
  screen, not the product
- the complaint is speed: slow scroll, dropped frames, a 4MB hero image — that is `judge-performance`;
  this lens rules on how it looks and moves, not on what it costs to render
- the shape of the code behind it is the question — that is `judge-architecture`
- the task is a full accessibility audit — this lens enforces four measurable floors (contrast, target
  size, focus visibility, reduced motion) and nothing else; screen-reader semantics, keyboard order,
  and ARIA are a separate pass
- the deliverable is copy, brand identity, or illustration style — this lens refuses to rule on beauty
  (see Limitations)

| if the situation is | use |
|---|---|
| the screen looks assembled rather than composed | this skill |
| the screen is slow, janky, or heavy | `judge-performance` |
| the feature is unnecessary | `make-the-call` |
| the design is fine but the API under it is wrong | `judge-api` |
| the contrast fails and nothing else does | this skill, then an accessibility audit for what it cannot see |

## The process

The vocabulary first, because the verdict is written in it.

| term | means | _avoid_ |
|---|---|---|
| **primary** | the one element the screen exists for | focal point, hero, CTA |
| **ramp** | the ordered set of type sizes actually used, counted | type scale, font sizes |
| **step** | a value from the spacing or duration scale; the only legal unit of change | tweak, nudge, magic number |
| **rhythm** | the repeat of steps down a column or across a row | whitespace, breathing room |
| **functional motion** | motion that explains a state change the user would otherwise have to infer | animation, transition, micro-interaction |
| **decoration** | anything that carries no information and no affordance | polish, flourish, personality |
| **floor** | the minimum legal value below which the design is broken, not plain | guideline, best practice |

"CTA" is a type of primary, not a synonym for it. "Micro-interaction" is the word that smuggles
decoration past the gate: if it does not explain a state change, it is decoration.

### Phase 1 — Name the job and the primary

One sentence: what did the user come to this screen to do? Then name the single element that serves it.
Everything else is supporting or removable.

If you cannot name a primary, the finding is already written: the screen has no hierarchy, and no
amount of colour, shadow, or spacing will supply one.

**Done when:** exactly one element is named primary, and every other visible element is classified
supporting or removable.

### Phase 2 — Read the hierarchy without the styling

Squint, or blur the screen until the text is unreadable. The order in which the blocks appear is the
hierarchy the user gets; it must match the order in which the things matter.

Colour, shadow, and motion are not hierarchy, they are tie-breakers. A layout whose order is wrong
cannot be rescued by making the wrong thing brighter.

**Done when:** you can write the first three things the eye sees, in order, and that order is the
order of the user's job.

### Phase 3 — Count what is on the screen

Count, do not estimate:

- **primaries** — elements at the same visual weight competing for the first move. Two is the
  rejection list; three is a menu the user did not ask for.
- **the ramp** — the distinct type sizes. More than two without a named role each is the rejection
  list.
- **steps** — every gap and padding value, mapped to the scale in `references/taste-values.md`. A value
  that maps to nothing is drift.

**Done when:** every type size and every spacing value on the screen is either on the scale or named
as an exception with its reason.

### Phase 4 — Audit motion by job and frequency

For each transition, ask two questions in this order:

1. **What does it explain?** Where a panel came from, that a row moved, that a value is now the value.
   If the answer is "it feels nice", the motion has no job and the verdict is `strip`.
2. **How often will it run?** Frequency sets the budget, not taste. A 300ms hover is a 300ms tax on
   the hundredth row.

Read `references/taste-values.md` before assigning any duration, curve, or distance, and take the
value from it. The frequency table is the whole argument:

| how often | budget |
|---|---|
| many times a minute | 0–100ms, opacity only |
| many times a session | 120–200ms |
| once per task | 200–300ms |
| once per session or rarer | ≤300ms, functional only |
| not in the task flow | 0ms — no animation. Ever. |

**Done when:** every transition is labelled functional, orienting, or decoration, and every decoration
has been deleted rather than shortened.

### Phase 5 — Check the floors

Four, all measurable, all in the reference:

- contrast of every text/background pair, on the rendered pixel — 4.5:1 body, 3:1 large text and UI
  boundaries
- target size — 44×44 for touch, 24×24 with 8px spacing for pointer
- focus visible on every interactive element, 3:1, 2px, offset
- `prefers-reduced-motion` honoured — no transform, no autoplay, 0ms or a ≤100ms crossfade

A floor is not a preference and not a follow-up ticket. Shipping under a floor is shipping a broken
screen.

**Done when:** every pair, target, and focus state has a measured value, or a named failure with the
ratio.

### Phase 6 — Emit the verdict

Five verdicts. The verdict is the lowest tier any finding forces — findings do not average.

| verdict | tier | means | merge gate |
|---|---|---|---|
| `ship` | `pass` | hierarchy holds, values are on-scale, floors pass | merge as-is |
| `tighten` | `conditional` | hierarchy holds, named values are off | merge after the values change |
| `strip` | `fix` | motion or decoration has no job | do not merge until it is deleted |
| `recut` | `redesign` | the primary exists but does not win | do not merge; re-compose |
| `reject` | `refuse` | no primary can be named | start from the content |

Decision procedure, first match wins:

1. No element can be named primary → `reject`.
2. The primary exists but does not win — another element outranks it, or two compete at the same
   weight → `recut`. Promote one, demote the rest; if both are genuinely primary, the screen has two
   jobs and needs two screens.
3. A motion or decoration has no job, runs on a high-frequency surface, or ignores reduced-motion →
   `strip`.
4. Any remaining rejection-list hit, off-scale value, or floor failure → `tighten`.
5. Otherwise → `ship`.

A rejection-list hit decides the verdict by its fix, not by its presence: an over-long duration is a
value to change, competing primaries are a composition to re-cut, and a glow with no job is a thing to
delete.

Then write the artifact, eight lines, no prose around it:

```
Verdict:  <ship|tighten|recut|strip|reject> — <the one finding that set it>
Tier:     <pass | conditional | fix | redesign | refuse — mapped in the table above>
Primary:  <the element, or "none">
Rejects:  <rejection-list hits, with element and value>
Values:   <off-scale values: element, current → legal>
Motion:   <surface: job | frequency | duration>, or "none"
Floors:   <contrast / target / focus / reduced-motion: pass, or the failing pair and ratio>
Fix:      <the smallest set of changes that moves the verdict up one tier>
```

**Done when:** all eight slots are filled, every number in `Values` and `Fix` comes from the reference,
and `Fix` is a change someone could make without asking you what you meant.

### The rejection list

Refused on sight. Each hit caps the verdict; none is offset by nine good decisions elsewhere.

| rejected | why |
|---|---|
| easing on a functional transition longer than 300ms | the interface is waiting for itself, and the second use feels slower than the first |
| more than two type sizes without a hierarchy rationale | three sizes without roles is drift, and drift is how a screen becomes a ransom note |
| competing primaries | the user has to guess, and the guess is the cost you moved onto them |
| motion on a high-frequency interaction | it taxes the hundredth use to decorate the first |
| a spinner with no elapsed-time threshold | a flash of nothing on a fast call; a spinner at 0ms is a lie about latency |
| a shadow used to fake depth instead of separation | separation is surface and space; a blurred box is decoration wearing a hierarchy costume |
| a display face below 20px, or negative tracking on body text | the letterforms were drawn for large sizes; at 14px their spacing collapses |
| a centred paragraph longer than two lines | the eye loses the return line on every row |
| motion that runs under `prefers-reduced-motion` | the OS setting is a floor, not a preference |

**The deletion verdict.** `strip` is a complete verdict, not a compromise. Some surfaces should not move at
all, and "no animation. Ever." is the correct answer for a list, a form, a table, a settings page, and
anything the user touches more than once a minute. A screen with zero motion is not an unfinished
screen. It is a decision.

## Gotchas

- `transition: all 0.3s` is the most common cause of an interface that feels slow. It animates `width`,
  `height`, `top`, and `margin`, each of which forces layout on every frame. Animate `transform` and
  `opacity`; name the property, never `all`.
- A duration that looks right in a screen recording is usually 2–3× too long in the hand. Recordings
  are watched once; the interface is used a hundred times. Set the duration by repetition, then check
  it in the product.
- Contrast is a property of the rendered pair, not of the palette. A 4.5:1 token over a 4.5:1
  background composites below the floor the moment opacity, a gradient, an overlay, or an image sits
  between them. Measure the pixel, not the token.
- WCAG's "large text" starts at 24px regular or 18.66px bold, and bold means 700. A 20px 600 heading
  is body text and needs 4.5:1 — the pair most design systems fail.
- `prefers-reduced-motion` does not mean "no motion"; it means no vestibular triggers. Opacity
  crossfades are still allowed; parallax, scale, and large translation are not. Deleting all feedback
  is a different bug.
- Dark mode inverts the contrast problem. Pure white on pure black is 21:1 and the glyphs bloom, and
  the shadow that carried separation in light mode disappears — elevation has to come from surface
  lightness instead.
- `rem` is not a pixel. A 12px caption written as 0.75rem is 12px only at a 16px root; a user's
  browser setting moves every value, which is the point, but a measurement taken at a 20px root is not
  a measurement of the same screen.
- Padding smaller than the gap between contents makes a card look like it is leaking. The inside of a
  container is always ≥ the space between its parts.

## Rationalizations

| Excuse | Reality |
|---|---|
| "It's only 400ms — it feels premium" | Premium is the first use. The hundredth use wants it gone. Functional motion stops at 300ms. |
| "The gradient and glow give it depth" | Depth that carries no information is decoration. Separation comes from surface and space. |
| "The brand needs personality" | Personality belongs in one place at one weight. A screen where everything has personality has no hierarchy. |
| "Accessibility is a separate ticket" | Contrast and target size are floors. A separate ticket for a floor is a decision to ship broken. |
| "Both actions really are important" | Then one is primary and the other is secondary. Two primaries means two jobs, and two jobs means two screens. |
| "The designer chose it" | Then the designer names the job it does. A value with no job is deleted regardless of who chose it. |
| "It's a small screen, every pixel counts" | Density is not crowding. The fix for a small screen is fewer things, not smaller gaps. |
| "Users will figure it out" | The guess is the cost you moved onto them. Hierarchy exists so they do not have to guess. |
| "I'll add the polish at the end" | The end is where motion gets added to things that never needed it. Polish is the absence of noise, not the presence of effects. |
| "Different words, so the rule doesn't apply" | Spirit over letter. "Micro-interaction", "delight", "polish", and "brand moment" are the same word as decoration. |

## Red flags

- You are about to approve a screen without naming its primary.
- You are shortening a duration before deciding whether the motion has a job.
- You are calling a third type size "emphasis" without a role for it.
- You are judging whether it looks good instead of whether it is composed.
- You are proposing an effect so the review has something to say.
- You are accepting "the designer chose it" or "the brand needs it" as a rationale.
- You are reviewing the mockup's pixels and not the interaction's timing.

## Limitations

- Rules from a description, a screenshot, or a diff. It cannot see hover states, real content lengths,
  or the user's viewport; a hierarchy that holds at 1440px can invert at 375px. Ask for the narrow
  width before ruling on a responsive layout.
- Refuses to rule on beauty, brand fit, or illustration style. Those are reference questions: show
  three screens the team considers good and judge the fourth against them.
- Contrast figures hold for opaque sRGB pairs. Text over images, gradients, `backdrop-filter`, and
  semi-transparent overlays need a rendered-pixel measurement, which this lens can request but not
  perform.
- Enforces four floors, not accessibility. Screen-reader semantics, keyboard order, ARIA, and error
  announcement are a separate audit; a passing floor check is not a compliance claim.
- The durations are budgets, not a house style. A product with a deliberately slower motion language
  can exceed them per transition, but it must say so in the artifact — and 300ms remains the ceiling
  for anything the user does more than once a task.
