# Setup Checklist

## ✅ Completed

- [x] Dependencies installed
- [x] Environment variables configured
- [x] Tailwind CSS configured

## 🔧 Still Need To Do

### 1. Neon Database Setup

- [x] Go to your Neon project dashboard (https://console.neon.tech/)
- [x] Navigate to **SQL Editor**
- [x] Copy and paste the contents of `database/schema.sql`
- [x] Click **Run** to create the database tables

### 2. Stack Auth Setup

- [x] Go to your Stack Auth project (https://app.stack-auth.com/)
- [x] Configure authentication providers
- [x] Set up environment variables for Stack Auth
- [x] Verify authentication is working

### 3. Test the Application

- [ ] Run `npm run dev`
- [ ] Open http://localhost:3000
- [ ] Verify anonymous login works
- [ ] Test creating a blog post

## 🚨 Common Issues

### "Authentication failed"

- Make sure Stack Auth is configured correctly (step 2 above)
- Check Stack Auth environment variables

### "Table 'posts' doesn't exist"

- Make sure you ran the database schema in Neon (step 1 above)

### Styling issues

- Should be fixed now with Tailwind CSS configuration

## 📝 Environment Variables Needed

```env
# Required
GEMINI_API_KEY=your_gemini_key
DATABASE_URL=your_neon_database_url
VITE_STACK_PROJECT_ID=your_stack_project_id
VITE_STACK_PUBLISHABLE_CLIENT_KEY=your_stack_publishable_key
STACK_SECRET_SERVER_KEY=your_stack_secret_key

# Optional (for Blogger publishing)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_API_KEY=your_google_api_key
```
