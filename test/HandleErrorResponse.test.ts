import { describe, expect, it } from 'vitest';

import { handleErrorResponse } from '../src/FetchClient';

describe('handleErrorResponse', () => {
	it('handles already-consumed body', async () => {
		const response = new Response('already consumed', {
			status: 500,
			statusText: 'Server Error',
			headers: { 'Content-Type': 'text/plain' },
		});
		await response.text();

		const err = await handleErrorResponse(response);
		expect(err.responseBody).toBeNull();
		expect(err.kind).toBe('unknown');
	});

	it('parses unknown JSON error as generic unknown kind', async () => {
		const response = new Response(JSON.stringify([1, 2, 3]), {
			status: 400,
			statusText: 'Bad Request',
			headers: { 'Content-Type': 'application/json' },
		});

		const err = await handleErrorResponse(response);
		expect(err.kind).toBe('unknown');
		expect(err.responseBody).toEqual([1, 2, 3]);
	});

	it('parses plain-text error body', async () => {
		const response = new Response('bad request text', {
			status: 400,
			statusText: 'Bad Request',
			headers: { 'Content-Type': 'text/plain' },
		});

		const err = await handleErrorResponse(response);
		expect(err.kind).toBe('unknown');
		expect(err.responseBody).toBe('bad request text');
	});

	it('parses binary error body', async () => {
		const bytes = new Uint8Array([1, 2, 3]);
		const response = new Response(bytes, {
			status: 500,
			statusText: 'Server Error',
			headers: { 'Content-Type': 'application/octet-stream' },
		});

		const err = await handleErrorResponse(response);
		expect(err.kind).toBe('unknown');
		expect(err.responseBody).toBeInstanceOf(ArrayBuffer);
	});
});
