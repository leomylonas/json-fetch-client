import { z } from 'zod';

export const problemDetailsSchema = z
	.object({
		type: z.string().nullable().optional(),
		title: z.string().nullable().optional(),
		status: z.number().int().nullable().optional(),
		detail: z.string().nullable().optional(),
		instance: z.string().nullable().optional(),
	})
	.catchall(z.unknown());

export type IProblemDetails = z.infer<typeof problemDetailsSchema>;

export const DEFAULT_PROBLEM_TYPE = 'about:blank';
export const DEFAULT_PROBLEM_TITLE = 'Unknown Error';
export const DEFAULT_PROBLEM_STATUS = 500;

export function parseProblemDetails(error: unknown): IProblemDetails | undefined {
	const parsed = problemDetailsSchema.safeParse(error);
	if (!parsed.success) {
		return undefined;
	}

	return parsed.data;
}

export function createProblemDetailsMessage(problem: IProblemDetails): string {
	const normalizedType = problem.type ?? DEFAULT_PROBLEM_TYPE;
	const normalizedTitle = problem.title ?? DEFAULT_PROBLEM_TITLE;
	const normalizedStatus = problem.status ?? DEFAULT_PROBLEM_STATUS;
	return `[${normalizedStatus} - ${normalizedType}] ${normalizedTitle}`;
}
