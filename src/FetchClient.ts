import merge from 'lodash-es/merge';
import type { ZodType, infer as ZodInfer } from 'zod';
import { resolveSchemaAndOptions } from './SchemaUtils';
import { type FetchClientErrorKind, FetchClientError } from './Errors/FetchClientError';
import { type KnownErrorPayload, parseKnownError } from './Errors/ErrorParsers';

const JSON_CONTENT_TYPE = 'application/json';

export async function parseJsonResponse<TResponse>(response: Response, schema?: ZodType<unknown>): Promise<TResponse> {
	const text = await response.text();
	const parsed: unknown = text ? JSON.parse(text) : undefined;

	if (schema) {
		return schema.parse(parsed) as TResponse;
	}

	return parsed as TResponse;
}

export async function handleErrorResponse(
	response: Response,
): Promise<FetchClientError<unknown, FetchClientErrorKind>> {
	if (response.bodyUsed) {
		return new FetchClientError(`Request failed (Status ${response.status}): ${response.statusText}`, response.status, null);
	} else {
		const contentType = response.headers.get('Content-Type');

		let responseData: unknown = null;

		if (contentType && contentType.match(/application\/.*json/)) {
			responseData = await response.json();

			const knownError = parseKnownError(responseData);
			if (knownError) {
				return new FetchClientError<KnownErrorPayload, typeof knownError.kind>(
					knownError.message,
					knownError.status,
					knownError.responseBody,
					knownError.kind,
				);
			}
		} else if (contentType && contentType.match(/text\/.+/)) {
			responseData = await response.text();
		} else {
			responseData = await response.arrayBuffer();
		}

		return new FetchClientError(
			`Request failed (Status ${response.status}): ${response.statusText}`,
			response.status,
			responseData,
		);
	}
}

export type FetchClientOptions = {
	optionsCallback?: (url: string) => Promise<RequestInit>;
	baseUrl?: string;
};

export default class FetchClient {
	protected _baseUrl: string | null = null;

	protected _optionsCallback: (url: string) => Promise<RequestInit> = () =>
		Promise.resolve<RequestInit>({
			credentials: 'include',
		});

	constructor(options?: FetchClientOptions) {
		if (options?.optionsCallback) {
			this._optionsCallback = options?.optionsCallback;
		}
		if (options?.baseUrl) {
			this._baseUrl = options.baseUrl.replace(/\/+$/, ''); // Trim trailing slashes
		}
	}

	protected async getFetchOptions(url: string, ...overrideOptions: RequestInit[]): Promise<RequestInit> {
		const defaultOptions = await this._optionsCallback(url);

		const options: RequestInit = {};

		merge(options, defaultOptions, ...overrideOptions);

		return options;
	}

	public getBaseUrl() {
		return this._baseUrl;
	}

	public async executeRequest(url: string, options: RequestInit = {}): Promise<Response> {
		let requestUrl = url;
		if (this._baseUrl && !(requestUrl.startsWith('/') || requestUrl.startsWith('http'))) {
			requestUrl = `${this._baseUrl}/${requestUrl}`;
		}

		const mergedOptions = await this.getFetchOptions(url, options);
		const response = await fetch(requestUrl, mergedOptions);
		if (response.ok) {
			return response;
		} else {
			const err = await handleErrorResponse(response);
			throw err;
		}
	}

	public get(url: string, overrideOptions: RequestInit = {}): Promise<Response> {
		return this.executeRequest(
			url,
			merge(
				{
					method: 'GET',
				},
				overrideOptions,
			),
		);
	}

	public post<TBody extends BodyInit>(url: string, body: TBody, overrideOptions: RequestInit = {}): Promise<Response> {
		return this.executeRequest(
			url,
			merge(
				{
					method: 'POST',
					body,
				},
				overrideOptions,
			),
		);
	}

	public put<TBody extends BodyInit>(url: string, body: TBody, overrideOptions: RequestInit = {}): Promise<Response> {
		return this.executeRequest(
			url,
			merge(
				{
					method: 'PUT',
					body,
				},
				overrideOptions,
			),
		);
	}

	public patch<TBody extends BodyInit>(url: string, body: TBody, overrideOptions: RequestInit = {}): Promise<Response> {
		return this.executeRequest(
			url,
			merge(
				{
					method: 'PATCH',
					body,
				},
				overrideOptions,
			),
		);
	}

	public delete(url: string, overrideOptions: RequestInit = {}): Promise<Response> {
		return this.executeRequest(
			url,
			merge(
				{
					method: 'DELETE',
				},
				overrideOptions,
			),
		);
	}

	// prettier-ignore
	public getJson<TResponse = undefined>(url: string, overrideOptions?: RequestInit): Promise<TResponse>;
	// prettier-ignore
	public getJson<TSchema extends ZodType<unknown>>(url: string, schema: TSchema, overrideOptions?: RequestInit): Promise<ZodInfer<TSchema>>;
	public async getJson<TResponse>(url: string, schemaOrOptions?: RequestInit | ZodType<unknown>, overrideOptions?: RequestInit): Promise<TResponse> {
		const { schema, options } = resolveSchemaAndOptions(schemaOrOptions, overrideOptions);
		const response = await this.get(
			url,
			merge(
				{
					headers: {
						Accept: JSON_CONTENT_TYPE,
					},
				},
				options,
			),
		);

		return parseJsonResponse<TResponse>(response, schema);
	}

	// prettier-ignore
	public getJsonOrUndefined<TResponse>(url: string, overrideOptions?: RequestInit): Promise<TResponse | undefined>;
	// prettier-ignore
	public getJsonOrUndefined<TSchema extends ZodType<unknown>>(url: string, schema: TSchema, overrideOptions?: RequestInit): Promise<ZodInfer<TSchema> | undefined>;
	public async getJsonOrUndefined<TResponse>(url: string, schemaOrOptions?: RequestInit | ZodType<unknown>, overrideOptions?: RequestInit): Promise<TResponse | undefined> {
		const { schema, options } = resolveSchemaAndOptions(schemaOrOptions, overrideOptions);
		const response = await this.get(
			url,
			merge(
				{
					headers: {
						Accept: JSON_CONTENT_TYPE,
					},
				},
				options,
			),
		);

		if (response.status === 204) {
			return undefined;
		}

		return parseJsonResponse<TResponse>(response, schema);
	}

	// prettier-ignore
	public postJson<TResponse = undefined, TBody = object>(url: string, body: TBody, overrideOptions?: RequestInit): Promise<TResponse>;
	// prettier-ignore
	public postJson<TSchema extends ZodType<unknown>, TBody = object>(url: string, body: TBody, schema: TSchema, overrideOptions?: RequestInit): Promise<ZodInfer<TSchema>>;
	public async postJson<TResponse, TBody = object>(url: string, body: TBody, schemaOrOptions?: RequestInit | ZodType<unknown>, overrideOptions?: RequestInit): Promise<TResponse> {
		const { schema, options } = resolveSchemaAndOptions(schemaOrOptions, overrideOptions);
		const response = await this.post(
			url,
			JSON.stringify(body),
			merge(
				{
					headers: {
						'Content-Type': JSON_CONTENT_TYPE,
						Accept: JSON_CONTENT_TYPE,
					},
				},
				options,
			),
		);

		return parseJsonResponse<TResponse>(response, schema);
	}

	// prettier-ignore
	public putJson<TResponse = undefined, TBody = object>(url: string, body: TBody, overrideOptions?: RequestInit): Promise<TResponse>;
	// prettier-ignore
	public putJson<TSchema extends ZodType<unknown>, TBody = object>(url: string, body: TBody, schema: TSchema, overrideOptions?: RequestInit): Promise<ZodInfer<TSchema>>;
	public async putJson<TResponse, TBody = object>(url: string, body: TBody, schemaOrOptions?: RequestInit | ZodType<unknown>, overrideOptions?: RequestInit): Promise<TResponse> {
		const { schema, options } = resolveSchemaAndOptions(schemaOrOptions, overrideOptions);
		const response = await this.put(
			url,
			JSON.stringify(body),
			merge(
				{
					headers: {
						'Content-Type': JSON_CONTENT_TYPE,
						Accept: JSON_CONTENT_TYPE,
					},
				},
				options,
			),
		);

		return parseJsonResponse<TResponse>(response, schema);
	}

	// prettier-ignore
	public patchJson<TResponse = undefined, TBody = object>(url: string, body: TBody, overrideOptions?: RequestInit): Promise<TResponse>;
	// prettier-ignore
	public patchJson<TSchema extends ZodType<unknown>, TBody = object>(url: string, body: TBody, schema: TSchema, overrideOptions?: RequestInit): Promise<ZodInfer<TSchema>>;
	public async patchJson<TResponse, TBody = object>(url: string, body: TBody, schemaOrOptions?: RequestInit | ZodType<unknown>, overrideOptions?: RequestInit): Promise<TResponse> {
		const { schema, options } = resolveSchemaAndOptions(schemaOrOptions, overrideOptions);
		const response = await this.patch(
			url,
			JSON.stringify(body),
			merge(
				{
					headers: {
						'Content-Type': JSON_CONTENT_TYPE,
						Accept: JSON_CONTENT_TYPE,
					},
				},
				options,
			),
		);

		return parseJsonResponse<TResponse>(response, schema);
	}

	// prettier-ignore
	public deleteJson<TResponse = undefined>(url: string, overrideOptions?: RequestInit): Promise<TResponse>;
	// prettier-ignore
	public deleteJson<TSchema extends ZodType<unknown>>(url: string, schema: TSchema, overrideOptions?: RequestInit): Promise<ZodInfer<TSchema>>;
	public async deleteJson<TResponse>(url: string, schemaOrOptions?: RequestInit | ZodType<unknown>, overrideOptions?: RequestInit): Promise<TResponse> {
		const { schema, options } = resolveSchemaAndOptions(schemaOrOptions, overrideOptions);
		const response = await this.delete(
			url,
			merge(
				{
					headers: {
						Accept: JSON_CONTENT_TYPE,
					},
				},
				options,
			),
		);

		return parseJsonResponse<TResponse>(response, schema);
	}
}
