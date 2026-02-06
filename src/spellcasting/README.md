# Spellcasting

When you build a creature from a template, the builder copies that creature’s spellcasting: its spell list and how many spell slots it has.

## How it works

- **Prepared casters** — Spells are copied into the same slot layout as the template. Each spell ends up in the correct level and slot.
- **Spontaneous casters** — Spells are copied into the new creature’s repertoire. Duplicate spells (same spell more than once) are merged into one.
- **Innate casters** — Spells are copied into the new creature’s innate repertoire. Duplicate spells are merged into one, same as spontaneous.

## What changed in this milestone

**Innate casters now get their spells copied.**

Previously, when you built a creature from a template with innate spellcasting, its innate spells were not copied to the new creature. Now they are: innate spells are copied and duplicates are merged, so the new creature has the same innate spells available as the template.
