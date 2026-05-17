# json-fetch-client

Typed `fetch` client for JSON APIs with:

- ergonomic HTTP helpers (`get`, `post`, `put`, `patch`, `delete`)
- JSON helpers (`*Json`) with TypeScript inference
- optional runtime validation with Zod schemas
- structured error parsing via pluggable parser registry

## Features

- Works with native `fetch`.
- `getJson`, `postJson`, `putJson`, `patchJson`, `deleteJson` helpers.
- Two JSON modes:
  - compile-time type assertion (`getJson<MyType>(...)`)
  - runtime schema validation (`getJson(url, myZodSchema)`)
- Error parsing with discriminated `kind`:
  - `problem-details`
  - `validation-problem-details`
  - `jsonapi-error`
  - `unknown`
- Extensible parser registry for adding more error formats.

## Installation

```bash
pnpm add json-fetch-client zod
```

If you use npm:

```bash
npm install json-fetch-client zod
```

## Quick Start

```ts
import FetchClient from 'json-fetch-client';

const client = new FetchClient({
  baseUrl: 'https://api.example.com',
});

const response = await client.get('users');
console.log(await response.json());
```

⚠️ **Important `baseUrl` behavior**

- `users` is treated as relative and is prefixed by `baseUrl`.
- Trailing slashes are trimmed from `baseUrl`, and one slash is added when joining relative paths.
  Example: `baseUrl = https://api.example.com///` + `users` -> `https://api.example.com/users`.
- `/users` is treated as root-relative and is **not** prefixed by `baseUrl`.
- `http://...` or `https://...` URLs are absolute and are **not** prefixed.

## JSON Helpers

### 1) Type assertion mode

```ts
type User = { id: string; name: string };

const user = await client.getJson<User>('https://api.example.com/user/1');
```

### 2) Zod validation mode

```ts
import { z } from 'zod';

const userSchema = z.object({
  id: z.string(),
  name: z.string(),
});

const user = await client.getJson('https://api.example.com/user/1', userSchema);
// user is inferred from schema
```

### 3) `204` support

```ts
const result = await client.getJsonOrUndefined<{ ok: true }>('https://api.example.com/maybe-empty');
// undefined when status is 204
```

### 4) JSON body helpers

```ts
await client.postJson('https://api.example.com/users', { name: 'Ada' });
await client.putJson('https://api.example.com/users/1', { name: 'Ada Lovelace' });
await client.patchJson('https://api.example.com/users/1', { name: 'Ada' });
await client.deleteJson('https://api.example.com/users/1');
```

## Error Handling

Non-2xx responses throw `FetchClientError`.

```ts
import { FetchClientError } from 'json-fetch-client';

try {
  await client.getJson('https://api.example.com/will-fail');
} catch (err) {
  if (err instanceof FetchClientError) {
    console.log(err.status);
    console.log(err.kind); // 'problem-details' | 'validation-problem-details' | 'jsonapi-error' | 'unknown'
    console.log(err.responseBody);
  }
}
```

### Supported structured formats (built-in)

- ASP.NET Core `ProblemDetails`
- ASP.NET Core `ValidationProblemDetails`
- JSON:API `errors[]` document

If no known format matches, `kind` is `unknown` and `responseBody` contains parsed JSON/text/binary content.

## Extending Error Parsers

The registry lives in `src/Errors/ErrorParsers.ts` and is intentionally pluggable.

- `ErrorParser`: `(error: unknown) => ParsedKnownError | undefined`
- `parseKnownError(...)`: applies parser list in order
- `defaultErrorParsers`: current built-in chain

You can add a new parser by inserting it into `defaultErrorParsers` (or by wiring your own parser list where desired).

## Constructor Options

```ts
const client = new FetchClient({
  baseUrl: 'https://api.example.com',
  optionsCallback: async (url) => ({
    headers: {
      Authorization: 'Bearer ...',
      'X-Request-Target': url,
    },
    credentials: 'include',
  }),
});
```

- `baseUrl`: prepended for relative paths (e.g. `users` -> `https://api.example.com/users`)
- `optionsCallback(url)`: async hook for default `RequestInit`

## API Surface

- `get(url, options?) => Promise<Response>`
- `post(url, body, options?) => Promise<Response>`
- `put(url, body, options?) => Promise<Response>`
- `patch(url, body, options?) => Promise<Response>`
- `delete(url, options?) => Promise<Response>`
- `getJson(...) => Promise<T>`
- `getJsonOrUndefined(...) => Promise<T | undefined>`
- `postJson(...) => Promise<T>`
- `putJson(...) => Promise<T>`
- `patchJson(...) => Promise<T>`
- `deleteJson(...) => Promise<T>`

## Development

```bash
pnpm install
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run test:coverage
pnpm run build
```

Coverage is enforced at 100% (lines/branches/functions/statements).

## Release

- CI runs on PR/push.
- Tag-based release workflow publishes to npm (see `.github/workflows/release.yml`).
- Local pre-publish gate:

```bash
pnpm run release:check
```

## License

MPL-2.0
