import type { ZodType } from 'zod';

export function isZodSchema(input: unknown): input is ZodType<unknown> {
	return input !== null && typeof input === 'object' && 'safeParse' in input;
}

export function resolveSchemaAndOptions<TSchema extends ZodType<unknown>>(
	schemaOrOptions?: TSchema | RequestInit,
	overrideOptions?: RequestInit,
): { schema: TSchema | undefined; options: RequestInit } {
	if (isZodSchema(schemaOrOptions)) {
		return {
			schema: schemaOrOptions,
			options: overrideOptions ?? {},
		};
	}

	return {
		schema: undefined,
		options: schemaOrOptions ?? {},
	};
}
