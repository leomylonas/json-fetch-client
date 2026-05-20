import { z } from 'zod';
import { FetchClientError } from './FetchClientError';

export const jsonApiErrorObjectSchema = z
	.object({
		id: z.string().optional(),
		links: z.record(z.string(), z.unknown()).optional(),
		status: z.string().optional(),
		code: z.string().optional(),
		title: z.string().optional(),
		detail: z.string().optional(),
		source: z.record(z.string(), z.unknown()).optional(),
		meta: z.record(z.string(), z.unknown()).optional(),
	})
	.catchall(z.unknown());

export const jsonApiErrorDocumentSchema = z
	.object({
		errors: z.array(jsonApiErrorObjectSchema).min(1),
	})
	.catchall(z.unknown());

export type IJsonApiErrorDocument = z.infer<typeof jsonApiErrorDocumentSchema>;
export type IJsonApiErrorObject = z.infer<typeof jsonApiErrorObjectSchema>;

export function parseJsonApiErrorDocument(error: unknown): IJsonApiErrorDocument | undefined {
	const parsed = jsonApiErrorDocumentSchema.safeParse(error);
	if (!parsed.success) {
		return undefined;
	}

	return parsed.data;
}

export function isJsonApiError(error: unknown): error is FetchClientError<IJsonApiErrorDocument, 'jsonapi-error'> {
	return error instanceof FetchClientError && error.kind === 'jsonapi-error' && parseJsonApiErrorDocument(error.responseBody) !== undefined;
}

export function getJsonApiStatus(errors: IJsonApiErrorObject[]): number {
	const firstStatus = errors[0]?.status;
	if (!firstStatus) {
		return 500;
	}

	const parsed = Number.parseInt(firstStatus, 10);
	return Number.isNaN(parsed) ? 500 : parsed;
}

export function getJsonApiMessage(errors: IJsonApiErrorObject[]): string {
	const firstError = errors[0];
	const title = firstError?.title ?? 'JSON:API error';
	const detail = firstError?.detail ? `: ${firstError.detail}` : '';
	return `${title}${detail}`;
}
