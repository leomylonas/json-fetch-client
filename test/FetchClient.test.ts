import { http, HttpResponse } from 'msw';
import { z } from 'zod';
import { describe, expect, it } from 'vitest';

import FetchClient from '../src/FetchClient';
import { server } from './setup';

describe('FetchClient JSON helpers', () => {
	it('supports plain typed parse without schema', async () => {
		server.use(
			http.get('https://api.example.com/items', () => {
				return HttpResponse.json({ ok: true, count: 2 });
			}),
		);

		const client = new FetchClient();
		const result = await client.getJson<{ ok: boolean; count: number }>('https://api.example.com/items');

		expect(result).toEqual({ ok: true, count: 2 });
	});

	it('validates response against zod schema when provided', async () => {
		server.use(
			http.get('https://api.example.com/profile', () => {
				return HttpResponse.json({ id: 'u_123', role: 'admin' });
			}),
		);

		const client = new FetchClient();
		const schema = z.object({ id: z.string(), role: z.enum(['admin', 'user']) });
		const result = await client.getJson('https://api.example.com/profile', schema);

		expect(result).toEqual({ id: 'u_123', role: 'admin' });
	});

	it('throws when zod schema validation fails', async () => {
		server.use(
			http.get('https://api.example.com/invalid', () => {
				return HttpResponse.json({ id: 123, role: 'admin' });
			}),
		);

		const client = new FetchClient();
		const schema = z.object({ id: z.string(), role: z.enum(['admin', 'user']) });

		await expect(client.getJson('https://api.example.com/invalid', schema)).rejects.toMatchObject({
			name: 'ZodError',
		});
	});

	it('returns undefined for getJsonOrUndefined on 204', async () => {
		server.use(
			http.get('https://api.example.com/empty', () => {
				return new HttpResponse(null, { status: 204 });
			}),
		);

		const client = new FetchClient();
		const result = await client.getJsonOrUndefined<{ value: string }>('https://api.example.com/empty');

		expect(result).toBeUndefined();
	});

	it('supports schema overloads for postJson', async () => {
		server.use(
			http.post('https://api.example.com/items', async ({ request }) => {
				const body = (await request.json()) as { name: string };
				return HttpResponse.json({ id: 'i_1', name: body.name });
			}),
		);

		const client = new FetchClient();
		const schema = z.object({ id: z.string(), name: z.string() });
		const result = await client.postJson('https://api.example.com/items', { name: 'test' }, schema);

		expect(result).toEqual({ id: 'i_1', name: 'test' });
	});

	it('parses ASP.NET Problem Details with validation errors', async () => {
		server.use(
			http.post('https://api.example.com/validation', () => {
				return HttpResponse.json(
					{
						type: 'https://tools.ietf.org/html/rfc9110#section-15.5.1',
						title: 'One or more validation errors occurred.',
						status: 400,
						traceId: '00-a1b2c3d4e5f6-1',
						errors: {
							email: ['Email is required.'],
						},
					},
					{ status: 400 },
				);
			}),
		);

		const client = new FetchClient();

		await expect(client.postJson('https://api.example.com/validation', { email: '' })).rejects.toMatchObject({ kind: 'validation-problem-details', status: 400 });
	});

	it('parses JSON:API errors document', async () => {
		server.use(
			http.get('https://api.example.com/jsonapi-error', () => {
				return HttpResponse.json(
					{
						errors: [
							{
								status: '422',
								code: 'INVALID_ATTRIBUTE',
								title: 'Invalid Attribute',
								detail: 'firstName must contain at least three characters.',
								source: { pointer: '/data/attributes/firstName' },
							},
						],
					},
					{ status: 422 },
				);
			}),
		);

		const client = new FetchClient();

		await expect(client.getJson('https://api.example.com/jsonapi-error')).rejects.toMatchObject({ kind: 'jsonapi-error', status: 422 });
	});
});
