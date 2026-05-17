import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';

export default defineConfig({
	build: {
		lib: {
			entry: 'src/index.ts',
			name: 'JsonFetchClient',
			fileName: (format) => (format === 'es' ? 'index.js' : 'index.cjs'),
			formats: ['es', 'cjs'],
		},
		sourcemap: true,
		target: 'es2022',
		rollupOptions: {
			external: ['lodash-es'],
			output: {
				exports: 'named',
			},
		},
	},
	plugins: [
		dts({
			tsconfigPath: './tsconfig.json',
			include: ['src'],
			outDir: 'dist',
		}),
	],
});
