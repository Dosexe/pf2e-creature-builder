const MODULE_ID = 'pf2e-creature-builder'

export function globalLog(force: boolean, ...args: unknown[]) {
    const game = (globalThis as { game?: any }).game
    const shouldLog =
        force ||
        game?.modules?.get('_dev-mode')?.api?.getPackageDebugValue(MODULE_ID)

    if (shouldLog) {
        console.log(MODULE_ID, '|', ...args)
    }
}