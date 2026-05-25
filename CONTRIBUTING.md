# Contributing

Contributions are welcome — bug reports, feature requests, and pull requests alike.

## Getting started

```bash
git clone https://github.com/leomylonas/json-fetch-client.git
cd json-fetch-client
pnpm install
```

## Development workflow

```bash
pnpm run lint        # ESLint
pnpm run typecheck   # TypeScript
pnpm run test        # Vitest (single run)
pnpm run test:watch  # Vitest (watch mode)
pnpm run build       # Rolldown bundle
```

Code style is enforced by [Prettier](https://prettier.io) and [ESLint](https://eslint.org). Run `pnpm run format` to auto-format and `pnpm run lint` to check for lint errors before committing. The CI pipeline will fail if either check does not pass.

Coverage is enforced at 100% (lines / branches / functions / statements). All new code must be fully covered.

## Submitting a pull request

1. Fork the repository and create a branch from `main`.
2. Make your changes and ensure `pnpm run release:check` passes end-to-end.
3. Open a PR against `main` with a clear description of what changed and why.

## Reporting issues

Please use [GitHub Issues](https://github.com/leomylonas/json-fetch-client/issues) and include:

- A minimal reproduction (code snippet or repo link).
- The version of the package, Node.js, and TypeScript you are using.
- Expected vs. actual behaviour.

## License

By contributing you agree that your changes will be licensed under the [MIT License](LICENSE).
