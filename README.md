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

# SnapFit — MVP

SnapFit is a virtual fitting-room prototype demonstrating background removal, garment alignment and outfit management. This repository contains the frontend (Vite + React), optional lightweight server components, and deployment/dev instructions.

Status
------

- Minimal, functional MVP suitable for demo and evaluation.
- Local server provided in `server/` for background removal and scraping tasks. Server is optional for frontend-only demos.

Getting started (local)
-----------------------

1. Install dependencies:

```bash
npm ci
```

2. Backend (optional):

```bash
cd server
cp .env.example .env
# edit server/.env with your values (see below)
npm run server:dev
```

3. Frontend:

```bash
cd ..
npm run dev
```

4. Open the app at `http://localhost:5173`.

Environment
-----------

Copy `server/.env.example` to `server/.env` and fill in values for any services you use. Example variables:

```
MONGODB_URI=
MONGODB_DB_NAME=
SUPABASE_URL=
SUPABASE_ANON_KEY=
OPENAI_API_KEY=
PORT=3001
CORS_ORIGIN=http://localhost:5173
```

Important: never commit `.env` or secrets. This repo ignores `*.env` and most markdown files — `README.md` is explicitly whitelisted.

What to keep out of Git
-----------------------

- `.env`, API keys and credentials
- `private/` (personal notes, drafts)
- Large personal images (`Body Avatar Photos/`)
- Build artifacts and `node_modules`

Deployment (Render)
-------------------

Suggested steps for a quick Render deployment:

1. Create a Web Service for the server (Node):
	- Connect the repo, choose branch `main`.
	- Build command: `npm ci`
	- Start command: `npm run server`
	- Add environment variables in Render using `server/.env.example` as reference.

2. Deploy the frontend as a Static Site or separate Web Service:
	- Build command: `npm ci && npm run build`
	- Publish directory: `dist`
	- Add any `VITE_` env vars in Render's settings.

3. Verify CORS and production URLs in server environment.

Professional polish
-------------------

- Keep `README.md` concise and focused (done). Add a demo GIF or screenshot under `public/` to improve presentation.
- Add `LICENSE` (MIT included) and CI (basic workflow included).
- Add `.env.example` files (server already has one) and a short `DEPLOY.md` if you want a step-by-step deploy playbook.

Support
-------

Tell me if you want any of the following before you run the app locally:

- Add a `render.yaml` or Render-specific instructions
- Add a small demo screenshot or GIF to `public/`
- Add automated Deploy step to the CI workflow

Good luck with your competition — I’ll be here while you run the app and deploy. Paste any terminal outputs and I’ll guide the next step.
