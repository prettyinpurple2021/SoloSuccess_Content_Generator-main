# Project Structure

## Root Level Files

- `App.tsx` - Main application component with all state management and UI logic
- `index.tsx` - React application entry point and root rendering
- `types.ts` - TypeScript type definitions for Post, Supabase, and UI state
- `constants.tsx` - Reusable UI components (icons, spinners) and platform configurations

## Directory Organization

### `/components`

React components for specific UI sections:

- `CalendarView.tsx` - Calendar-based post scheduling interface

### `/services`

External API integrations and business logic:

- `supabaseService.ts` - Supabase configuration, auth, and database setup
- `geminiService.ts` - Google Gemini AI API calls for content generation
- `bloggerService.ts` - Google Blogger API integration with OAuth
- `schedulerService.ts` - External scheduling service integration (placeholder)

### `/.kiro`

Kiro IDE configuration and steering documents

## Architecture Patterns

### State Management

- **Centralized State**: All application state managed in `App.tsx` using React hooks
- **Loading States**: Unified loading state management with `LoadingState` interface
- **Error Handling**: Centralized error and success message handling

### Component Structure

- **Single Page Application**: All UI rendered from main `App.tsx` component
- **Modal-Based UI**: Post details, scheduling, and repurposing use modal overlays
- **Responsive Design**: Grid-based layout with mobile-first approach

### Service Layer

- **API Abstraction**: Each external service has dedicated service file
- **Environment Configuration**: API keys and configuration managed via environment variables
- **Error Boundaries**: Service calls wrapped with try-catch and user-friendly error messages

### Data Flow

1. **Supabase Auth**: Anonymous authentication on app load
2. **Real-time Data**: Supabase subscriptions for live post updates
3. **AI Generation**: Sequential workflow from topic → ideas → content → enhancements
4. **Multi-platform Distribution**: Platform-specific content generation and scheduling

### File Naming Conventions

- **Components**: PascalCase with `.tsx` extension
- **Services**: camelCase with `.ts` extension
- **Types**: Centralized in `types.ts` with descriptive interface names
- **Constants**: Exported from `constants.tsx` with UPPER_CASE for arrays/configs

### Import Patterns

- **Relative Imports**: Use `./` for same directory, `../` for parent directories
- **Alias Imports**: `@/` maps to project root for cleaner imports
- **Service Imports**: Import entire service modules with `* as serviceName`
