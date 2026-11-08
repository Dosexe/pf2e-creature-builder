interface RegisteredSetting {
    default?: unknown
}

interface GameSettings {
    settings?: { get?: (key: string) => RegisteredSetting | undefined }
    get?: (namespace: string, key: string) => unknown
}

function gameSettings(): GameSettings | undefined {
    return (
        globalThis as {
            game?: { settings?: GameSettings; system?: { id?: string } }
        }
    ).game?.settings
}

function systemId(): string | undefined {
    return (globalThis as { game?: { system?: { id?: string } } }).game?.system
        ?.id
}

export function isSchemaVersion(value: unknown): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0
}

/**
 * Schema version of the running Pathfinder or Starfinder system.
 * The setting default is the latest version, even when a world has stored an older one.
 */
export function currentSchemaVersion(): number | undefined {
    const id = systemId()
    if (id !== 'pf2e' && id !== 'sf2e') return undefined
    const settings = gameSettings()
    const registered = settings?.settings?.get?.(`${id}.worldSchemaVersion`)
    if (isSchemaVersion(registered?.default)) return registered.default
    const stored = settings?.get?.(id, 'worldSchemaVersion')
    if (isSchemaVersion(stored)) return stored
    return undefined
}

/** Flat update used when cloning an actor into the world. */
export function schemaVersionUpdate(actor?: object): Record<string, number> {
    const recorded = (actor as { schemaVersion?: number | null } | undefined)
        ?.schemaVersion
    if (isSchemaVersion(recorded)) return {}
    const version = currentSchemaVersion()
    if (version === undefined) return {}
    return { 'system._migration.version': version }
}

/**
 * Give a newly built item the current schema version.
 * A number already stored on the item is left alone.
 */
export function withSchemaVersion<T extends object>(data: T): T {
    const version = currentSchemaVersion()
    if (version === undefined) return data
    const system = (data as { system?: unknown }).system
    const systemRecord =
        system && typeof system === 'object' && !Array.isArray(system)
            ? (system as Record<string, unknown>)
            : {}
    const existing = systemRecord._migration
    const migration =
        existing && typeof existing === 'object' && !Array.isArray(existing)
            ? (existing as Record<string, unknown>)
            : {}
    if (isSchemaVersion(migration.version)) return data
    return {
        ...data,
        system: {
            ...systemRecord,
            _migration: { ...migration, version },
        },
    } as T
}
