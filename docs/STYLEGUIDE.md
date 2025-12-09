# Style Guide

## UI

- Use Tailwind utility classes only; no inline styles
- Apply glassmorphic gradient backgrounds on all pages
- Use `HoloCard`, `HoloButton`, `HoloText` patterns where suitable

## Animation

- Use Framer Motion (`motion.*`, variants) for transitions

## Code

- Strict TypeScript, no `any`
- Services validate inputs/outputs (Zod planned)
- Function components + hooks only

## Accessibility

- Focus states, keyboard nav, ARIA roles, sufficient contrast
