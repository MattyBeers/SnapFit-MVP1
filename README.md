# React + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:


## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend using TypeScript with type-aware lint rules enabled. Check out the [TS template](https://github.com/vitejs/vite/tree/main/packages/create-vite/template-react-ts) for information on how to integrate TypeScript and [`typescript-eslint`](https://typescript-eslint.io) in your project.
To start the is app cd into SnapFit 
npm run dev 
# SnapFit — MVP

SnapFit is a minimal virtual fitting room web app that demonstrates automated background removal, virtual garment alignment, and outfit management.

This repository contains the frontend (Vite + React) and a lightweight server for background-removal and scraping tasks.

Quick start

1. Copy and populate environment variables from `.env.example` into `.env` (do not commit `.env`).
2. Install dependencies:

```bash
npm ci
```

3. Run the dev server:

```bash
npm run dev
# in a separate terminal (optional)
npm run server:dev
```

Build for production:

```bash
npm run build
```

What to keep private

- `.env` and any files under `private/` (API keys, tokens, personal notes)
- Any large personal images in `Body Avatar Photos/`

Contributing

Open an issue or submit a PR. For deployment notes, see `SETUP_GUIDE.md`.

License

This project is available under the MIT License (see `LICENSE`).
