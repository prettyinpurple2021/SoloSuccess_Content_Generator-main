# React Initialization Error Fix

## Problem

**Error:** `Cannot set properties of undefined (setting 'Children')`

**Symptom:** Only background is visible, app content doesn't render

## Root Cause

This error occurs when:

1. React is not fully initialized when Stack Auth or other libraries try to access it
2. Module loading order issues cause React to be undefined
3. React.Children is accessed before React is available

## Fixes Applied

### 1. React Global Availability

- Added React to `window.React` in both `index.tsx` and `stack/client.ts`
- Ensures React is available globally before any libraries try to access it

### 2. Import Order

- React is imported FIRST in `index.tsx`
- React is made globally available BEFORE importing Stack Auth
- Stack Auth client initializes after React is global

### 3. Vite Configuration

- Added `dedupe: ['react', 'react-dom', 'react/jsx-runtime']` to ensure single React instance
- Added `optimizeDeps.include` to pre-bundle React
- React chunk is loaded first before other vendor chunks

### 4. Error Handling

- Added React availability checks before rendering
- Added React.Children existence verification
- Enhanced error messages to help debug initialization issues

## Testing

1. **Clear browser cache** and reload
2. **Check browser console** for React initialization messages
3. **Verify environment variables** are set (Stack Auth keys)
4. **Check network tab** to ensure React bundle loads first

## If Error Persists

### Check Browser Console

Look for:

- React initialization errors
- Missing environment variables
- Module loading errors
- Stack Auth initialization errors

### Verify Environment Variables

```bash
# Check if Stack Auth variables are set
echo $VITE_STACK_PROJECT_ID
echo $VITE_STACK_PUBLISHABLE_CLIENT_KEY
```

### Clear Cache and Rebuild

```bash
# Clear node_modules and reinstall
rm -rf node_modules package-lock.json
npm install

# Clear Vite cache
rm -rf node_modules/.vite

# Rebuild
npm run build
```

### Check Network Tab

1. Open browser DevTools → Network tab
2. Reload page
3. Check that `vendor-react-*.js` loads first
4. Verify no 404 errors for React files

## Common Causes

1. **Missing Environment Variables** - Stack Auth can't initialize
2. **Cache Issues** - Old bundle with React initialization problems
3. **Module Resolution** - React not found or multiple instances
4. **Build Issues** - React not properly bundled

## Next Steps

If the error persists after these fixes:

1. Check browser console for specific error messages
2. Verify Stack Auth environment variables are set
3. Clear all caches (browser, Vite, node_modules)
4. Rebuild the project
5. Check if the issue occurs in development vs production
