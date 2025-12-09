# Environments & Secrets

## Environments

- Development: local `npm run dev`
- Preview: automatic deployments for pull requests (Vercel)
- Production: automatic deployments from main branch (Vercel)

## Required variables

- `NEXT_PUBLIC_STACK_PROJECT_ID`
- `NEXT_PUBLIC_STACK_PUBLISHABLE_CLIENT_KEY`
- `STACK_SECRET_SERVER_KEY`

## Optional variables

- `GEMINI_API_KEY`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_API_KEY`

## Local setup

- Create a `.env` and set the above keys.
- Never commit `.env` files.
