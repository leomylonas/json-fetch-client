import type { FetchClientErrorKind } from './FetchClientError';
import {
	createProblemDetailsMessage,
	DEFAULT_PROBLEM_STATUS,
	type IProblemDetails,
	parseProblemDetails,
} from './ProblemDetails';
import { type IValidationProblemDetails, parseValidationProblemDetails } from './ValidationProblemDetails';
import {
	getJsonApiMessage,
	getJsonApiStatus,
	type IJsonApiErrorDocument,
	parseJsonApiErrorDocument,
} from './JsonApiError';

export type KnownErrorPayload = IProblemDetails | IValidationProblemDetails | IJsonApiErrorDocument;

export type ParsedKnownError = {
	kind: FetchClientErrorKind;
	status: number;
	message: string;
	responseBody: KnownErrorPayload;
};

export type ErrorParser = (error: unknown) => ParsedKnownError | undefined;

export const defaultErrorParsers: ErrorParser[] = [
	(error) => {
		const jsonApi = parseJsonApiErrorDocument(error);
		if (!jsonApi) {
			return undefined;
		}
		return {
			kind: 'jsonapi-error',
			status: getJsonApiStatus(jsonApi.errors),
			message: getJsonApiMessage(jsonApi.errors),
			responseBody: jsonApi,
		};
	},
	(error) => {
		const validation = parseValidationProblemDetails(error);
		if (!validation) {
			return undefined;
		}
		return {
			kind: 'validation-problem-details',
			status: validation.status ?? DEFAULT_PROBLEM_STATUS,
			message: createProblemDetailsMessage(validation),
			responseBody: validation,
		};
	},
	(error) => {
		const problem = parseProblemDetails(error);
		if (!problem) {
			return undefined;
		}
		return {
			kind: 'problem-details',
			status: problem.status ?? DEFAULT_PROBLEM_STATUS,
			message: createProblemDetailsMessage(problem),
			responseBody: problem,
		};
	},
];

export function parseKnownError(error: unknown, parsers: readonly ErrorParser[] = defaultErrorParsers): ParsedKnownError | undefined {
	for (const parser of parsers) {
		const parsedError = parser(error);
		if (parsedError) {
			return parsedError;
		}
	}

	return undefined;
}
