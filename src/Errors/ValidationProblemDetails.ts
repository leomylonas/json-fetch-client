import { z } from 'zod';
import { FetchClientError } from './FetchClientError';
import { problemDetailsSchema } from './ProblemDetails';

export const validationProblemDetailsSchema = problemDetailsSchema.extend({
	errors: z.record(z.string(), z.array(z.string())),
});

export type IValidationProblemDetails = z.infer<typeof validationProblemDetailsSchema>;

export function parseValidationProblemDetails(error: unknown): IValidationProblemDetails | undefined {
	const parsed = validationProblemDetailsSchema.safeParse(error);
	if (!parsed.success) {
		return undefined;
	}

	return parsed.data;
}

export function isValidationProblemDetails(error: unknown): error is FetchClientError<IValidationProblemDetails, 'validation-problem-details'> {
	return error instanceof FetchClientError && error.kind === 'validation-problem-details' && parseValidationProblemDetails(error.responseBody) !== undefined;
}
