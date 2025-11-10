# Deploying PokéMaker to Vercel

This guide explains how to deploy the PokéMaker app to Vercel with proper environment variable configuration.

## Prerequisites

- Vercel account (https://vercel.com)
- GitHub repository with PokéMaker code
- Environment variables from your local `.env` file:
  - `VITE_SUPABASE_URL`
  - `VITE_SUPABASE_ANON_KEY`
  - `VITE_OPENAI_API_KEY`

## Deployment Steps

### Step 1: Connect Your Repository to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click **"Add New..."** → **"Project"**
3. Select your GitHub repository containing PokéMaker
4. Click **"Import"**

### Step 2: Configure Environment Variables

Before deploying, you must add environment variables to Vercel:

1. In the import dialog, look for **"Environment Variables"** section
2. Add the three required variables:

   | Variable Name | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | Your Supabase project URL (from `https://app.supabase.com`) |
   | `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous public key |
   | `VITE_OPENAI_API_KEY` | Your OpenAI API key (starts with `sk-`) |

3. Click **"Deploy"**

### Step 3: Verify Environment Variable Setup (Alternative Method)

If you've already deployed, you can add/update environment variables later:

1. Go to your project in Vercel Dashboard
2. Click **"Settings"** tab
3. Go to **"Environment Variables"**
4. Add the three required variables:
   - Click **"Add New"**
   - Enter the variable name and value
   - Select appropriate environments (Production, Preview, Development)
   - Click **"Save"**

## How Environment Variables Are Used

Your environment variables are injected into the Vite build process via the `VITE_` prefix:

```typescript
// In src/services/supabase.ts
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// In src/services/openai.ts
const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
```

These values are only available at build time and are embedded into the production build.

## Build Configuration

The deployment is configured in `vercel.json`:

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

This configuration:
- Runs `npm run build` to compile the app
- Uses the `dist` folder as the output (Vite's default)
- Enables SPA routing (all routes point to `/index.html` for client-side routing)

## Troubleshooting

### Build Fails: "Cannot find module 'eslint/config'"

**Status**: Fixed! The ESLint configuration now uses ESLint v9 flat config syntax.

**If you're seeing this error**:
1. Ensure you have the latest code from your repository
2. Verify `eslint.config.js` doesn't contain invalid imports
3. Redeploy from the Vercel dashboard

### Environment Variables Not Working

**Symptoms**:
- Supabase connection fails
- OpenAI API errors
- Error: "Missing environment variables"

**Solutions**:
1. Verify environment variables are added to Vercel Dashboard
2. Ensure variable names start with `VITE_` (case-sensitive)
3. Make a new deployment after adding variables (force redeploy)
4. Check Vercel build logs for error messages

**To force redeploy**:
- Go to Vercel Dashboard → Your Project
- Click **"Deployments"**
- Find the latest deployment
- Click the three dots (**...**) → **"Redeploy"**

### Blank Page or 404 Errors

**Cause**: Routing configuration issues

**Solution**: The `vercel.json` file includes rewrites for SPA routing. If you're seeing 404s:
1. Verify `vercel.json` exists in project root
2. Verify `rewrites` section is configured correctly
3. Force redeploy from Vercel Dashboard

### App Works Locally but Not on Vercel

**Common Causes**:
1. Missing environment variables (most common)
2. Browser console errors (check in DevTools)
3. Supabase CORS configuration (verify in Supabase settings)

**To Debug**:
1. Open browser DevTools (F12)
2. Check Console tab for errors
3. Check Network tab for failed API calls
4. Open Vercel deployment logs to see build errors

## Security Notes

### Client-Side API Keys

The `VITE_OPENAI_API_KEY` is exposed in the production build (by design, as Vite embeds it). This allows the app to make API calls directly from the browser.

**Security Consideration**:
- Anyone can extract your API key from the browser
- For production apps, move OpenAI calls to serverless functions
- Current setup is acceptable for MVP/learning projects
- Consider implementing Vercel API routes in future

## Production Monitoring

After deployment, monitor your app:

1. **Check Supabase Logs**:
   - Go to Supabase Dashboard
   - Check for database connection errors
   - Monitor API usage

2. **Check OpenAI Usage**:
   - Go to OpenAI Dashboard
   - Monitor API calls and costs
   - Set usage limits to prevent unexpected charges

3. **Monitor Vercel**:
   - Check deployment logs
   - Monitor function execution time
   - Check error tracking

## Redeploying After Code Changes

To deploy code changes:

1. Push changes to your GitHub repository
2. Vercel automatically redeploys on push (if auto-deployment is enabled)
3. Monitor deployment status in Vercel Dashboard
4. Check logs if deployment fails

To manually trigger deployment:
- Vercel Dashboard → Your Project → Deployments → Redeploy

## Next Steps

After successful deployment:
- Test all features on the production URL
- Share with others at your production URL
- Set up custom domain (optional)
- Monitor logs and errors

## Getting Help

If deployment fails:
1. Check Vercel build logs (Deployments tab → Failed deployment → Logs)
2. Verify environment variables are set correctly
3. Ensure all files (eslint.config.js, vercel.json, vite-env.d.ts) are committed
4. Try clearing Vercel cache and redeploying

---

**Last Updated**: November 10, 2025
