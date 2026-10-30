import type { CreatureSystem } from '@/systems/CreatureSystem'
import { Pf2eCreatureSystem } from '@/systems/Pf2eCreatureSystem'
import { Sf2eCreatureSystem } from '@/systems/Sf2eCreatureSystem'

const pf2eSystem = new Pf2eCreatureSystem()
const sf2eSystem = new Sf2eCreatureSystem()

export function getCreatureSystem(): CreatureSystem {
    const id = (globalThis as { game?: { system?: { id?: string } } }).game
        ?.system?.id
    return id === 'sf2e' ? sf2eSystem : pf2eSystem
}
