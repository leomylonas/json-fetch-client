import { defineConfig } from 'vitest/config';

export default defineConfig({
	test: {
		environment: 'node',
		setupFiles: ['./test/setup.ts'],
		globals: true,
		include: ['test/**/*.test.ts'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.ts'],
			reporter: ['text', 'html'],
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100,
			},
		},
	},
});
