# Technology Stack

## Frontend Framework

- **React 19.1.1** with TypeScript
- **Vite** as build tool and dev server
- **JSX/TSX** components with React functional components and hooks

## AI & APIs

- **Google Gemini AI** (@google/genai) for content generation
- **Imagen 4.0** for AI image generation
- **Google Blogger API** for publishing integration

## Backend Services

- **Supabase** for database and authentication
- **PostgreSQL** via Supabase for data storage
- **Supabase Auth** with anonymous authentication
- **Supabase Realtime** for live data subscriptions

## Development Tools

- **TypeScript 5.8.2** with strict configuration
- **Vite 6.2.0** for fast development and building
- **ESNext modules** with bundler resolution

## Key Dependencies

- `@supabase/supabase-js` - Backend services and authentication
- `@google/genai` - Gemini AI integration
- `marked` - Markdown parsing and rendering
- `uuid` - Unique identifier generation

## Build Commands

### Development

```bash
npm run dev
```

Starts Vite dev server on port 3000 with hot reload

### Production Build

```bash
npm run build
```

Creates optimized production build in `dist/` directory

### Preview Build

```bash
npm run preview
```

Serves the production build locally for testing

## Environment Configuration

### Required Environment Variables

- `GEMINI_API_KEY` - Google Gemini AI API key (set in .env.local)
- `VITE_SUPABASE_URL` - Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Supabase anonymous public key
- `GOOGLE_CLIENT_ID` - Google OAuth client ID for Blogger integration
- `GOOGLE_API_KEY` - Google API key for Blogger API

### Vite Configuration

- Custom alias `@/*` maps to project root
- Environment variables exposed via `process.env`
- Dev server configured for host `0.0.0.0:3000`

## TypeScript Configuration

- Target: ES2022 with DOM libraries
- JSX: react-jsx transform
- Module resolution: bundler (Vite-optimized)
- Experimental decorators enabled
- Path mapping for `@/*` imports
