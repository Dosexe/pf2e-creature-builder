export function globalLog(force, ...args) {
    const shouldLog = force || game['modules'].get('_dev-mode')?.api?.getPackageDebugValue(this.ID);

    if (shouldLog) {
        console.log(this.ID, '|', ...args);
    }
}