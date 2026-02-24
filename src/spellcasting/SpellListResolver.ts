import type { SpellSlot } from '@/spellcasting/model/spellcasting'
import type { SpellList, SpellListEntry } from '@/spellcasting/model/spellList'
import { globalLog } from '@/utils'

const SPELLS_COMPENDIUM = 'pf2e.spells-srd'

interface CompendiumIndexEntry {
    _id: string
    name: string
    system?: { slug?: string }
}

/**
 * Determine which spell levels have available slots from a slots record.
 * Returns a Set of level numbers (0 = cantrips, 1-10 = spell levels).
 */
export function getAvailableSpellLevels(
    slots: Record<string, SpellSlot>,
): Set<number> {
    const available = new Set<number>()
    for (const [key, slot] of Object.entries(slots)) {
        const match = key.match(/^slot(\d+)$/)
        if (match && slot.max > 0) {
            available.add(Number(match[1]))
        }
    }
    return available
}

/**
 * Build a slug-to-id lookup map from the compendium index.
 */
function buildSlugIndex(
    index: Iterable<CompendiumIndexEntry>,
): Map<string, string> {
    const map = new Map<string, string>()
    for (const entry of index) {
        const slug = entry.system?.slug
        if (slug) {
            map.set(slug, entry._id)
        }
    }
    return map
}

/**
 * Collect unique slugs needed for the available levels from a spell list.
 */
export function collectRequiredSlugs(
    spellList: SpellList,
    availableLevels: Set<number>,
): Set<string> {
    const slugs = new Set<string>()
    for (const level of spellList.levels) {
        if (availableLevels.has(level.level)) {
            for (const spell of level.spells) {
                slugs.add(spell.slug)
            }
        }
    }
    return slugs
}

export interface ResolvedSpell {
    spellData: Record<string, unknown>
    entry: SpellListEntry
    level: number
}

/**
 * Resolve a spell list against the PF2E spells compendium and create
 * spell items on the actor linked to the given spellcasting entry.
 *
 * Only spell levels that have available slots (max > 0) are populated.
 * For prepared casters, slot prepared[] arrays are updated with new spell IDs.
 */
export async function resolveAndApplySpellList(
    spellList: SpellList,
    slots: Record<string, SpellSlot>,
    spellcastingEntryId: string,
    casterType: string,
    actor: Actor,
): Promise<void> {
    const pack = game!.packs!.get(SPELLS_COMPENDIUM)
    if (!pack) {
        globalLog(true, `Compendium pack ${SPELLS_COMPENDIUM} not found`)
        return
    }

    const availableLevels = getAvailableSpellLevels(slots)
    const requiredSlugs = collectRequiredSlugs(spellList, availableLevels)

    if (requiredSlugs.size === 0) {
        globalLog(false, 'No spell levels with available slots for this list')
        return
    }

    const index = (await pack.getIndex({
        fields: ['system.slug'] as any,
    })) as unknown as Iterable<CompendiumIndexEntry>
    const slugIndex = buildSlugIndex(index)

    const resolvedBySlug = new Map<string, Record<string, unknown>>()
    for (const slug of requiredSlugs) {
        const docId = slugIndex.get(slug)
        if (!docId) {
            globalLog(
                true,
                `Spell slug "${slug}" not found in ${SPELLS_COMPENDIUM}`,
            )
            continue
        }
        const doc = await pack.getDocument(docId)
        if (doc) {
            resolvedBySlug.set(slug, (doc as any).toObject())
        }
    }

    if (casterType === 'prepared') {
        await resolveAndApplyPrepared(
            spellList,
            availableLevels,
            resolvedBySlug,
            slots,
            spellcastingEntryId,
            actor,
        )
    } else if (casterType === 'innate') {
        await resolveAndApplyInnate(
            spellList,
            availableLevels,
            resolvedBySlug,
            spellcastingEntryId,
            actor,
        )
    } else {
        await resolveAndApplySpontaneous(
            spellList,
            availableLevels,
            resolvedBySlug,
            spellcastingEntryId,
            actor,
        )
    }
}

/**
 * Clone a compendium spell template and prepare it for creation on an actor.
 * Strips _id, applies optional label override, and sets system.location.
 */
function cloneSpellTemplate(
    template: Record<string, unknown>,
    entry: SpellListEntry,
    location: Record<string, unknown>,
): Record<string, unknown> {
    const spellData = foundry.utils.deepClone(template) as Record<
        string,
        unknown
    >
    delete spellData._id
    if (entry.label) {
        spellData.name = entry.label
    }
    const system = spellData.system as Record<string, unknown> | undefined
    if (system) {
        system.location = location
    }
    return spellData
}

/**
 * Collect unique spell items from a spell list, deduplicating by slug.
 * Returns the items and an ordered list of slugs (for mapping created IDs back).
 */
function collectUniqueSpellItems(
    spellList: SpellList,
    availableLevels: Set<number>,
    resolvedBySlug: Map<string, Record<string, unknown>>,
    spellcastingEntryId: string,
): { items: Record<string, unknown>[]; slugOrder: string[] } {
    const items: Record<string, unknown>[] = []
    const slugOrder: string[] = []
    const seenSlugs = new Set<string>()

    for (const levelDef of spellList.levels) {
        if (!availableLevels.has(levelDef.level)) continue
        for (const entry of levelDef.spells) {
            if (seenSlugs.has(entry.slug)) continue
            const template = resolvedBySlug.get(entry.slug)
            if (!template) continue

            seenSlugs.add(entry.slug)
            items.push(
                cloneSpellTemplate(template, entry, {
                    value: spellcastingEntryId,
                }),
            )
            slugOrder.push(entry.slug)
        }
    }
    return { items, slugOrder }
}

/**
 * For prepared casters: create one spell document per unique slug, then
 * assign created IDs to prepared slot arrays per level. Multiple entries
 * for the same slug at a level reuse the same document ID.
 */
async function resolveAndApplyPrepared(
    spellList: SpellList,
    availableLevels: Set<number>,
    resolvedBySlug: Map<string, Record<string, unknown>>,
    slots: Record<string, SpellSlot>,
    spellcastingEntryId: string,
    actor: Actor,
): Promise<void> {
    const { items: uniqueSpellItems, slugOrder } = collectUniqueSpellItems(
        spellList,
        availableLevels,
        resolvedBySlug,
        spellcastingEntryId,
    )

    if (uniqueSpellItems.length === 0) {
        globalLog(false, 'No spells resolved for spell list')
        return
    }

    const created = (await (actor as any).createEmbeddedDocuments(
        'Item',
        uniqueSpellItems,
    )) as Array<{ id: string; name: string }>

    const slugToId = new Map<string, string>()
    for (let i = 0; i < slugOrder.length; i++) {
        if (created[i]) {
            slugToId.set(slugOrder[i], created[i].id)
        }
    }

    const updatedSlots: Record<string, SpellSlot> =
        foundry.utils.deepClone(slots)

    for (const levelDef of spellList.levels) {
        if (!availableLevels.has(levelDef.level)) continue
        const slotKey = `slot${levelDef.level}`
        const slot = updatedSlots[slotKey]
        if (!slot?.prepared) continue

        let preparedIndex = 0
        for (const entry of levelDef.spells) {
            if (preparedIndex >= slot.prepared.length) break
            const spellId = slugToId.get(entry.slug)
            if (spellId) {
                slot.prepared[preparedIndex] = {
                    id: spellId,
                    expended: false,
                }
                preparedIndex++
            }
        }
    }

    const existingEntry = actor.items as unknown as Iterable<{
        type: string
        id: string
    }>
    let entryId: string | null = null
    for (const item of existingEntry) {
        if (
            item.type === 'spellcastingEntry' &&
            item.id === spellcastingEntryId
        ) {
            entryId = item.id
            break
        }
    }

    if (entryId) {
        await (actor as any).updateEmbeddedDocuments('Item', [
            { _id: entryId, 'system.slots': updatedSlots },
        ])
    }

    globalLog(
        false,
        `Applied ${uniqueSpellItems.length} spells from list "${spellList.name}" (prepared)`,
    )
}

/**
 * For innate casters: create one spell document per entry per level.
 * The same slug at different levels produces separate documents, each with
 * its own heightenedLevel and a single use (uses: {value:1, max:1}).
 * Cantrips (level 0) get no uses limit.
 */
async function resolveAndApplyInnate(
    spellList: SpellList,
    availableLevels: Set<number>,
    resolvedBySlug: Map<string, Record<string, unknown>>,
    spellcastingEntryId: string,
    actor: Actor,
): Promise<void> {
    const spellItems: Record<string, unknown>[] = []

    for (const levelDef of spellList.levels) {
        if (!availableLevels.has(levelDef.level)) continue
        for (const entry of levelDef.spells) {
            const template = resolvedBySlug.get(entry.slug)
            if (!template) continue

            const location: Record<string, unknown> = {
                value: spellcastingEntryId,
                heightenedLevel: levelDef.level,
            }
            if (levelDef.level > 0) {
                location.uses = { value: 1, max: 1 }
            }
            spellItems.push(cloneSpellTemplate(template, entry, location))
        }
    }

    if (spellItems.length === 0) {
        globalLog(false, 'No spells resolved for spell list')
        return
    }

    await (actor as any).createEmbeddedDocuments('Item', spellItems)

    globalLog(
        false,
        `Applied ${spellItems.length} spells from list "${spellList.name}" (innate)`,
    )
}

/**
 * For spontaneous casters: create exactly one spell document per
 * unique slug across all levels. No duplicates for spells that appear at
 * multiple levels (heightening is implicit).
 */
async function resolveAndApplySpontaneous(
    spellList: SpellList,
    availableLevels: Set<number>,
    resolvedBySlug: Map<string, Record<string, unknown>>,
    spellcastingEntryId: string,
    actor: Actor,
): Promise<void> {
    const { items: spellItems } = collectUniqueSpellItems(
        spellList,
        availableLevels,
        resolvedBySlug,
        spellcastingEntryId,
    )

    if (spellItems.length === 0) {
        globalLog(false, 'No spells resolved for spell list')
        return
    }

    await (actor as any).createEmbeddedDocuments('Item', spellItems)

    globalLog(
        false,
        `Applied ${spellItems.length} spells from list "${spellList.name}" (spontaneous)`,
    )
}
