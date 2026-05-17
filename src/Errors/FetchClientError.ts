export type FetchClientErrorKind =
	| 'unknown'
	| 'problem-details'
	| 'validation-problem-details'
	| 'jsonapi-error';

export class FetchClientError<T = unknown, TKind extends FetchClientErrorKind = FetchClientErrorKind> extends Error {
	constructor(
		message: string,
		public readonly status: number,
		public readonly responseBody: T,
		public readonly kind: TKind = 'unknown' as TKind,
	) {
		super(message);
	}
}
