---
name: Excel ATAN2 argument order
description: Excel's ATAN2(x_num, y_num) uses the opposite argument order from JS/Python math.atan2(y, x) — relevant when generating spreadsheet formulas for bearings/angles.
---

Excel's `ATAN2(x_num, y_num)` returns the same angle as the standard
programming-language `atan2(y, x)` (JS `Math.atan2`, Python `math.atan2`,
etc.) — i.e. Excel's argument order is `(x, y)` while most languages take
`(y, x)`.

**Why:** A code reviewer flagged a traverse-bearing formula
`ATAN2(deltaNorthing, deltaEasting)` as "backwards" by comparing it to the
JS/math convention of `atan2(y, x)`. Verifying with concrete test cases
(due north, due east, due south) confirmed the original Excel formula was
already correct: passing `(deltaNorthing, deltaEasting)` to Excel's ATAN2
produces the compass bearing directly (0=north, 90=east, 180=south,
270=west), because Excel's own argument order already matches what the
formula needs.

**How to apply:** When writing or reviewing Excel formulas that use
`ATAN2`, always verify the axis convention Excel actually uses (x first,
y second) rather than assuming it mirrors a language you're more familiar
with. Sanity-check with concrete cardinal-direction test cases before
concluding a bearing/angle formula is wrong.
