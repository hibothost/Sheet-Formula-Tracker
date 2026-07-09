---
name: Survey field-note placeholders
description: How to handle missing field-measured survey values (check angles, corrections) when generating or repairing traverse field-notes workbooks.
---

Traditional traverse field-notes workbooks record real field-measured
redundancy data — closing-check angles, angular/linear misclosure
corrections — that cannot be derived from coordinates or formulas alone.

**Why:** When filling a gap in an existing field-notes workbook (missing
station blocks) or generating a new one from coordinates only, there is
no legitimate way to compute these values; they only exist if someone
recorded them in the field. Silently inventing plausible-looking numbers
would misrepresent survey data.

**How to apply:**
- If asked to fill in missing entries in a real field-book workbook and no
  independent redundant reading exists to source correction/check values
  from, default to a clearly flagged placeholder (e.g. check angle =
  180°00′00″, correction = 0) and explicitly tell the user these need real
  field data if available.
- If building a generator that only takes final coordinates as input
  (no field angle observations), don't try to reproduce the
  correction/closing-check columns at all — compute only what coordinates
  support (bearing, distance) and omit the fabricated columns rather than
  filling them with fake data.
