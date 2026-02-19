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

    const spellItems: Record<string, unknown>[] = []

    for (const levelDef of spellList.levels) {
        if (!availableLevels.has(levelDef.level)) continue

        for (const entry of levelDef.spells) {
            const template = resolvedBySlug.get(entry.slug)
            if (!template) continue

            const spellData = foundry.utils.deepClone(template) as Record<
                string,
                unknown
            >

            delete spellData._id

            if (entry.label) {
                spellData.name = entry.label
            }

            const system = spellData.system as
                | Record<string, unknown>
                | undefined
            if (system) {
                system.location = { value: spellcastingEntryId }
            }

            spellItems.push(spellData)
        }
    }

    if (spellItems.length === 0) {
        globalLog(false, 'No spells resolved for spell list')
        return
    }

    const created = await (actor as any).createEmbeddedDocuments(
        'Item',
        spellItems,
    )

    if (casterType === 'prepared' && Array.isArray(created)) {
        await assignPreparedSlots(
            created,
            spellList,
            slots,
            availableLevels,
            actor,
            spellcastingEntryId,
        )
    }

    globalLog(
        false,
        `Applied ${spellItems.length} spells from list "${spellList.name}"`,
    )
}

/**
 * For prepared casters, assign created spell IDs to the prepared[] arrays
 * in the spellcasting entry's slots.
 */
async function assignPreparedSlots(
    createdItems: Array<{ id: string; name: string }>,
    spellList: SpellList,
    slots: Record<string, SpellSlot>,
    availableLevels: Set<number>,
    actor: Actor,
    spellcastingEntryId: string,
): Promise<void> {
    const createdQueue = [...createdItems]
    const updatedSlots: Record<string, SpellSlot> =
        foundry.utils.deepClone(slots)

    for (const levelDef of spellList.levels) {
        if (!availableLevels.has(levelDef.level)) continue

        const slotKey = `slot${levelDef.level}`
        const slot = updatedSlots[slotKey]
        if (!slot?.prepared) continue

        let preparedIndex = 0
        for (const _entry of levelDef.spells) {
            if (preparedIndex >= slot.prepared.length) break
            const created = createdQueue.shift()
            if (created) {
                slot.prepared[preparedIndex] = {
                    id: created.id,
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
}
