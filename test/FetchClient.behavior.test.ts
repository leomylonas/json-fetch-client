import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import FetchClient, { parseJsonResponse } from '../src/FetchClient';
import { isZodSchema, resolveSchemaAndOptions } from '../src/SchemaUtils';

describe('FetchClient behavior branches', () => {
	it('parseJsonResponse handles empty and schema parsing branches', async () => {
		const emptyResponse = new Response('', { status: 200, headers: { 'Content-Type': 'application/json' } });
		expect(await parseJsonResponse<undefined>(emptyResponse)).toBeUndefined();

		const schemaResponse = new Response(JSON.stringify({ ok: true }), {
			status: 200,
			headers: { 'Content-Type': 'application/json' },
		});
		const parsed = await parseJsonResponse(schemaResponse, z.object({ ok: z.boolean() }));
		expect(parsed).toEqual({ ok: true });
	});

	it('schema utils cover both branches', () => {
		const schema = z.object({ a: z.string() });
		expect(isZodSchema(schema)).toBe(true);
		expect(isZodSchema({})).toBe(false);

		const resolvedSchema = resolveSchemaAndOptions(schema, { cache: 'no-store' });
		expect(resolvedSchema.schema).toBe(schema);
		expect(resolvedSchema.options.cache).toBe('no-store');

		const resolvedOptions = resolveSchemaAndOptions({ method: 'GET' });
		expect(resolvedOptions.schema).toBeUndefined();
		expect(resolvedOptions.options.method).toBe('GET');
	});

	it('executeRequest uses baseUrl only for relative non-slash paths', async () => {
		const fetchMock = vi.fn(() => Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })));
		vi.stubGlobal('fetch', fetchMock);

		const client = new FetchClient({ baseUrl: 'https://api.example.com/' });
		await client.get('users');
		expect(fetchMock).toHaveBeenCalledWith('https://api.example.com/users', expect.any(Object));

		await client.get('/users');
		expect(fetchMock).toHaveBeenCalledWith('/users', expect.any(Object));

		await client.get('http://external.test/path');
		expect(fetchMock).toHaveBeenCalledWith('http://external.test/path', expect.any(Object));

		vi.unstubAllGlobals();
	});

	it('get/post/put/patch/delete methods set HTTP methods', async () => {
		const fetchMock = vi.fn((_url: string, init?: RequestInit) =>
			Promise.resolve(new Response(null, {
				status: 204,
				...(init?.headers ? { headers: init.headers } : {}),
			})),
		);
		vi.stubGlobal('fetch', fetchMock);

		const client = new FetchClient();
		await client.get('https://x.test/get');
		await client.post('https://x.test/post', 'body');
		await client.put('https://x.test/put', 'body');
		await client.patch('https://x.test/patch', 'body');
		await client.delete('https://x.test/delete');

		expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ method: 'GET' });
		expect(fetchMock.mock.calls[1]?.[1]).toMatchObject({ method: 'POST' });
		expect(fetchMock.mock.calls[2]?.[1]).toMatchObject({ method: 'PUT' });
		expect(fetchMock.mock.calls[3]?.[1]).toMatchObject({ method: 'PATCH' });
		expect(fetchMock.mock.calls[4]?.[1]).toMatchObject({ method: 'DELETE' });

		vi.unstubAllGlobals();
	});

	it('json method wrappers apply expected headers and body', async () => {
		const fetchMock = vi.fn((_url: string, init?: RequestInit) => {
			if (init?.method === 'GET') {
				return Promise.resolve(new Response(null, { status: 204 }));
			}
			return Promise.resolve(new Response(JSON.stringify({ ok: true }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			}));
		});
		vi.stubGlobal('fetch', fetchMock);

		const client = new FetchClient();
		await client.getJsonOrUndefined('https://x.test/empty');
		await client.postJson('https://x.test/post', { a: 1 });
		await client.putJson('https://x.test/put', { a: 1 });
		await client.patchJson('https://x.test/patch', { a: 1 });
		await client.deleteJson('https://x.test/delete', z.object({ ok: z.boolean() }));

		const postCall = fetchMock.mock.calls[1]?.[1] as RequestInit;
		expect(postCall.headers).toMatchObject({ 'Content-Type': 'application/json', Accept: 'application/json' });
		expect(postCall.body).toBe(JSON.stringify({ a: 1 }));

		const deleteCall = fetchMock.mock.calls[4]?.[1] as RequestInit;
		expect(deleteCall.headers).toMatchObject({ Accept: 'application/json' });

		vi.unstubAllGlobals();
	});

	it('getJsonOrUndefined parses body when status is not 204', async () => {
		const fetchMock = vi.fn(() =>
			Promise.resolve(new Response(JSON.stringify({ value: 'ok' }), {
				status: 200,
				headers: { 'Content-Type': 'application/json' },
			})),
		);
		vi.stubGlobal('fetch', fetchMock);

		const client = new FetchClient();
		const result = await client.getJsonOrUndefined<{ value: string }>('https://x.test/value');
		expect(result).toEqual({ value: 'ok' });

		vi.unstubAllGlobals();
	});

	it('constructor optionsCallback affects merged request options and getBaseUrl', async () => {
		const fetchMock = vi.fn((_url: string, init?: RequestInit) => Promise.resolve(new Response(JSON.stringify({ headers: init?.headers }), { status: 200 })));
		vi.stubGlobal('fetch', fetchMock);

		const client = new FetchClient({
			baseUrl: 'https://api.example.com///',
			optionsCallback: () => Promise.resolve({ headers: { 'X-From-Callback': '1' } }),
		});
		expect(client.getBaseUrl()).toBe('https://api.example.com');

		await client.getJson('users', { headers: { 'X-Override': '2' } });
		const call = fetchMock.mock.calls[0]?.[1] as RequestInit;
		expect(call.headers).toMatchObject({ 'X-From-Callback': '1', 'X-Override': '2', Accept: 'application/json' });

		vi.unstubAllGlobals();
	});
});
