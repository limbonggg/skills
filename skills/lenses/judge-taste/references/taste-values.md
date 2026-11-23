# Taste values

Every number this lens rules with. Read it before writing the verdict, and take every value from it —
an approximate number is a finding of the same kind as the defect it describes.

## Contents

1. Motion budget by frequency
2. Duration by surface
3. Easing
4. What may move
5. Spacing scale
6. Density and measure
7. Type ramp
8. Contrast floors
9. Target sizes and focus
10. Reduced motion
11. Values are CSS px at a 16px root
12. What this table refuses to decide

## 1. Motion budget by frequency

Duration is set by repetition, not by how it looks in a recording.

| how often the interaction happens | budget | examples |
|---|---|---|
| many times a minute | 0–100ms, opacity only | keystroke, row hover, tab switch, checkbox, scroll-linked |
| many times a session | 120–200ms | menu open, panel toggle, toast, tooltip |
| once per task | 200–300ms | modal, drawer, route change, accordion |
| once per session or rarer | ≤300ms, functional only | onboarding step, success state, empty-state reveal |
| not in the task flow | 0ms. No animation. Ever. | marketing surfaces, ambient illustration, background video |

A 300ms hover is a 300ms tax on every row, forever.

## 2. Duration by surface

| surface | enter | exit |
|---|---|---|
| press / tap feedback | 80–120ms | 80–120ms |
| hover, focus, state colour | 100–150ms | 100–150ms |
| checkbox, radio, switch | 120–160ms | 120–160ms |
| tooltip | 120–180ms, after a 300–500ms delay | 100–150ms |
| menu, select, combobox | 150–200ms | 100–150ms |
| popover | 150–200ms | 100–150ms |
| toast | 150–200ms | 100–150ms |
| modal, dialog | 200–300ms | 150–200ms |
| drawer, sheet, bottom sheet | 200–300ms | 200–250ms |
| accordion, disclosure | 200–300ms | 200–250ms |
| route / page change | 200–300ms, or 0 | 150–200ms |
| skeleton → content | 150–200ms crossfade | — |
| progress, spinner | continuous, linear | fade out ≤150ms |

**Ceiling: 300ms** for any transition whose job is to explain a state change. Above 300ms the
interface is waiting for itself.

**Spinner threshold:** nothing at 0ms; show a spinner after 1000ms if the work is still running.
Never flash a spinner for a sub-second wait — the flash is more distracting than the wait.

## 3. Easing

| name | curve | use |
|---|---|---|
| standard | `cubic-bezier(0.2, 0, 0, 1)` | default for state change, movement, size |
| enter | `cubic-bezier(0.05, 0.7, 0.1, 1)` | element appearing: decelerate into place |
| exit | `cubic-bezier(0.3, 0, 0.8, 0.15)` | element leaving: accelerate away |
| linear | `linear` | progress, spinners, continuous loops only |
| spring | settle ≤300ms, interruptible | direct manipulation only: drag, swipe, reorder |

Never `ease-in-out` on UI: it starts slow, and the first 100ms is the only part the user reads as
instant. Never the CSS default `ease`. Never `linear` for movement between two positions.

## 4. What may move

- `transform` and `opacity` only. `width`, `height`, `top`, `left`, `margin`, `padding`,
  `box-shadow`, and `filter` force layout or paint on every frame.
- Translate for a state change: ≤ 8px.
- Enter from off-surface: ≤ 24px, or the surface's own dimension for a sheet or drawer.
- Press scale: 0.96–0.98. Below 0.94 the control looks broken rather than pressed.
- Stagger: ≤ 3 items, ≤ 30ms apart. More items or wider gaps is a loading screen pretending to be a
  reveal.
- Text opacity: never animate to a partial value. Fade the container, not the glyphs.

## 5. Spacing scale

Base 4px. Steps: **4, 8, 12, 16, 24, 32, 48, 64, 96, 128**.

- Legal off-scale values: a 1px hairline border, a 2px focus-ring offset, and an optical adjustment of
  ≤2px named in the artifact. Nothing else.
- Gaps inside a component: 4 / 8 / 12. Between components: 16 / 24 / 32. Between sections: 48 / 64 /
  96.
- A column of stacked text uses one step for the whole column. Two adjacent gaps that differ by 4px
  read as a mistake, not a decision.
- Padding ≥ the gap between the contents. A card with 24px padding and 8px between its parts is
  composed; 8px padding and 24px between its parts is leaking.

## 6. Density and measure

| thing | value |
|---|---|
| control height, dense | 28–32px |
| control height, default | 36px |
| control height, touch | 44px minimum |
| list row height | 32 / 40 / 48px |
| paragraph measure | 45–75ch, target 66ch |
| line-height, body | 1.5 (legal 1.45–1.6) |
| line-height, UI label | 1.3 |
| line-height, heading | 1.2 |
| line-height, display | 1.05–1.15 |
| paragraph spacing | one spacing step |

Never below 1.4 line-height on a paragraph longer than two lines. Never centre a paragraph longer than
two lines — the eye loses the return on every row.

## 7. Type ramp

- Base 16px. Body never below 14px. 12px is the floor for labels, captions, and metadata. Below 12px
  is not text.
- At most **5 sizes** on one screen. At most **3 weights**.
- Each adjacent step ≥ **1.2×** the previous. Legal ramps: 12/14/16/20/24/32, 14/16/20/24/32/40,
  13/16/20/28/40.
- Tracking: 0 at 14–18px; −0.01em to −0.02em at 24px and above; +0.02em to +0.05em for all-caps
  labels at 12–13px. Never letter-space lowercase body text.
- Weights: 400 body, 500 labels and emphasis, 600 headings. 700+ only at display sizes.
- A display face below 20px is a defect: it was drawn for large sizes and its spacing collapses when
  small.

## 8. Contrast floors

Measured on the rendered pair, not on the tokens. Opacity, gradients, overlays, images behind text,
and `backdrop-filter` change the pair; measure the pixel.

| element | floor |
|---|---|
| body text (< 24px regular, < 18.66px bold) | 4.5:1 |
| large text (≥ 24px regular, ≥ 18.66px bold) | 3:1 |
| placeholder and helper text | 4.5:1 — a placeholder is text |
| long-form body copy | 7:1 preferred, 4.5:1 absolute |
| icon and UI boundary | 3:1 against the adjacent colour |
| focus indicator | 3:1 against component and background, 2px thick, 2px offset |
| disabled text | 3:1 — exempt from WCAG, not from legibility |
| body text on a dark surface | 7:1–12:1; never pure white on pure black (halation) |

"Large text" is 24px regular or 18.66px bold, where bold means 700. A 20px 600 heading is body text
for contrast purposes and needs 4.5:1 — the pair most design systems fail.

## 9. Target sizes and focus

- Pointer-coarse (touch): **44×44** CSS px minimum, including padding.
- Pointer-fine: **24×24** minimum, with ≥ 8px between targets.
- The target is the button, not the glyph: a 16px icon in a 24px hit area is a 24px target.
- Focus is always visible, on every interactive element, never removed without a replacement of equal
  contrast.
- Focus order follows reading order.

## 10. Reduced motion

Under `prefers-reduced-motion: reduce`:

- durations → 0ms, or a ≤100ms opacity crossfade;
- no transform, scale, parallax, or scroll-linked motion;
- no autoplaying video or animation;
- spinners and progress remain — they carry information and do not translate the viewport.

The setting is a floor, not a preference. Motion that ignores it is a rejection-list hit.

## 11. Values are CSS px at a 16px root

`rem` for type and for spacing that must scale with the user's setting; `px` for borders, shadows, and
hit-area minimums. A 12px caption written as 0.75rem is 12px only at a 16px root — which is the point,
but a measurement taken at a 20px root is not a measurement of the same screen.

## 12. What this table refuses to decide

Whether the screen is beautiful, on-brand, or distinctive. Those are reference questions, not value
questions: show three screens in the same product that the team considers good, and judge the fourth
against them. This table decides whether the screen is composed, restrained, and legible — and it
names which of the three failed.
