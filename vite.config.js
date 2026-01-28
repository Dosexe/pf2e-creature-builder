import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import { resolve } from 'path';

export default defineConfig({
    plugins: [tsconfigPaths()],
    build: {
        outDir: 'dist',          // Vite outputs here
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
            input: resolve(__dirname, 'src/index.ts'),
            output: {
                entryFileNames: 'bundle.js',
            },
        },
    },
    server: {
        open: false,
        watch: {
            usePolling: true, 
        },
    },
});
