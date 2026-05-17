import { describe, expect, it } from 'vitest';

import { parseKnownError } from '../src/Errors/ErrorParsers';
import { FetchClientError } from '../src/Errors/FetchClientError';
import {
	getJsonApiMessage,
	getJsonApiStatus,
	parseJsonApiErrorDocument,
} from '../src/Errors/JsonApiError';
import { createProblemDetailsMessage, parseProblemDetails } from '../src/Errors/ProblemDetails';
import { parseValidationProblemDetails } from '../src/Errors/ValidationProblemDetails';

describe('Error schema/parser utilities', () => {
	it('parses problem details and builds fallback message', () => {
		const parsed = parseProblemDetails({ title: null, detail: 'x' });
		expect(parsed).toBeDefined();
		expect(createProblemDetailsMessage(parsed ?? {})).toBe('[500 - about:blank] Unknown Error');
	});

	it('returns undefined when problem details is invalid', () => {
		expect(parseProblemDetails(123)).toBeUndefined();
	});

	it('parses validation problem details and rejects invalid shape', () => {
		expect(
			parseValidationProblemDetails({
				title: 'Validation failed',
				errors: { email: ['Required'] },
			}),
		).toBeDefined();
		expect(parseValidationProblemDetails({ title: 'Validation failed' })).toBeUndefined();
	});

	it('parses JSON:API document and helper branches', () => {
		const parsed = parseJsonApiErrorDocument({
			errors: [{ status: '422', title: 'Invalid', detail: 'Bad field' }],
		});
		expect(parsed).toBeDefined();
		expect(getJsonApiStatus(parsed?.errors ?? [])).toBe(422);
		expect(getJsonApiMessage(parsed?.errors ?? [])).toBe('Invalid: Bad field');
		expect(getJsonApiStatus([{ status: 'abc' }])).toBe(500);
		expect(getJsonApiStatus([])).toBe(500);
		expect(getJsonApiMessage([])).toBe('JSON:API error');
		expect(parseJsonApiErrorDocument({ errors: [] })).toBeUndefined();
	});

	it('resolves known errors by precedence and supports custom parser list', () => {
		const jsonApi = parseKnownError({ errors: [{ status: '409', title: 'Conflict' }] });
		expect(jsonApi).toMatchObject({ kind: 'jsonapi-error', status: 409 });

		const validation = parseKnownError({ title: 'Bad', status: 400, errors: { x: ['y'] } });
		expect(validation).toMatchObject({ kind: 'validation-problem-details', status: 400 });
		const validationDefaultStatus = parseKnownError({ title: 'Bad', errors: { x: ['y'] } });
		expect(validationDefaultStatus).toMatchObject({ kind: 'validation-problem-details', status: 500 });

		const problem = parseKnownError({ title: 'Oops', status: 500, type: 'about:blank' });
		expect(problem).toMatchObject({ kind: 'problem-details', status: 500 });
		const problemDefaultStatus = parseKnownError({ title: 'Oops', type: 'about:blank' });
		expect(problemDefaultStatus).toMatchObject({ kind: 'problem-details', status: 500 });

		const custom = parseKnownError(
			{ any: 'thing' },
			[(input) => (input ? { kind: 'unknown', status: 418, message: 'teapot', responseBody: { ok: true } } : undefined)],
		);
		expect(custom).toMatchObject({ kind: 'unknown', status: 418, message: 'teapot' });

		expect(parseKnownError({ foo: 'bar' }, [() => undefined])).toBeUndefined();
	});

	it('constructs FetchClientError with default kind', () => {
		const err = new FetchClientError('x', 400, { a: 1 });
		expect(err.kind).toBe('unknown');
		expect(err.responseBody).toEqual({ a: 1 });
	});
});
