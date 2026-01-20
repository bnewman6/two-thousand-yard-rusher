# Deployment Guide

This guide will help you deploy your Playoffs Fantasy Challenge app so your family can access it.

## Option 1: Vercel (Recommended - Easiest & Free)

Vercel is made by the creators of Next.js and offers the best experience for deploying Next.js apps.

### Steps:

1. **Create a Vercel Account**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with your GitHub account (recommended) or email

2. **Connect Your Repository**
   - If your code is on GitHub:
     - Click "New Project" in Vercel dashboard
     - Import your GitHub repository
     - Vercel will automatically detect it's a Next.js project
   - If your code is only local:
     - First, push to GitHub (or GitLab/Bitbucket)
     - Then import in Vercel

3. **Configure Environment Variables**
   - In Vercel project settings, go to "Environment Variables"
   - Add these two variables:
     ```
     NEXT_PUBLIC_SUPABASE_URL=your-supabase-project-url
     NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
     ```
   - To find these values:
     - Go to your Supabase project dashboard
     - Navigate to Settings → API
     - Copy "Project URL" for `NEXT_PUBLIC_SUPABASE_URL`
     - Copy "anon public" key for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

4. **Deploy**
   - Click "Deploy" 
   - Vercel will build and deploy your app automatically
   - Once deployed, you'll get a URL like: `your-app.vercel.app`

5. **Share with Family**
   - Share the Vercel URL with your family
   - The app is now publicly accessible!

### Benefits:
- ✅ Free for personal projects
- ✅ Automatic HTTPS
- ✅ Fast global CDN
- ✅ Automatic deployments on git push
- ✅ Preview deployments for pull requests

---

## Option 2: Netlify (Also Great & Free)

Netlify is another excellent option for Next.js apps.

### Steps:

1. **Create a Netlify Account**
   - Go to [netlify.com](https://netlify.com)
   - Sign up with GitHub (recommended) or email

2. **Deploy from Git**
   - Click "Add new site" → "Import an existing project"
   - Connect your Git repository
   - Netlify will auto-detect Next.js settings

3. **Configure Build Settings**
   - Build command: `npm run build` (or `npm run build --turbopack`)
   - Publish directory: `.next`

4. **Add Environment Variables**
   - Go to Site settings → Environment variables
   - Add:
     - `NEXT_PUBLIC_SUPABASE_URL`
     - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

5. **Deploy**
   - Netlify will deploy and give you a URL like: `your-app.netlify.app`

---

## Option 3: Railway (Alternative)

Railway is another modern hosting platform.

### Steps:

1. Go to [railway.app](https://railway.app)
2. Sign up and create a new project
3. Connect your Git repository
4. Add environment variables in the Railway dashboard
5. Deploy!

---

## Important Pre-Deployment Checklist

Before deploying, make sure:

1. ✅ **Database is accessible** - Your Supabase database should already be accessible publicly since we've set up RLS policies
2. ✅ **Environment variables are set** - Make sure you have your Supabase credentials
3. ✅ **Test locally first** - Run `npm run build` to ensure everything builds correctly:
   ```bash
   npm run build
   ```
4. ✅ **All team data is imported** - Make sure all your teams and players are in the database

---

## Getting Your Supabase Credentials

1. Log into [supabase.com](https://supabase.com)
2. Select your project
3. Go to **Settings** → **API**
4. Copy:
   - **Project URL** → Use for `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** key → Use for `NEXT_PUBLIC_SUPABASE_ANON_KEY`

**Important**: These are safe to expose in your frontend code (they're designed for client-side use). The anon key is restricted by your RLS policies.

---

## Post-Deployment

After deploying:

1. **Test the app** - Visit your deployed URL and make sure everything works
2. **Share the link** - Send the URL to your family!
3. **Monitor** - Check Vercel/Netlify dashboard for any errors

---

## Custom Domain (Optional)

If you want a custom domain like `playoffs.yourfamily.com`:

- **Vercel**: Go to Project Settings → Domains, add your domain
- **Netlify**: Go to Domain settings → Add custom domain

---

## Troubleshooting

### Build Errors
- Check the build logs in your deployment platform
- Make sure all environment variables are set correctly
- Try building locally first: `npm run build`

### Database Connection Issues
- Verify your Supabase URL and key are correct
- Check that RLS policies are set up (should be done already)
- Make sure your Supabase project is active

### 404 Errors
- This is normal for Next.js client-side routing
- Vercel/Netlify should handle this automatically
- If issues persist, check your routing configuration

---

## Need Help?

- **Vercel Docs**: https://vercel.com/docs
- **Next.js Deployment**: https://nextjs.org/docs/deployment
- **Supabase Docs**: https://supabase.com/docs

---

## After Deployment: Making Updates

Once deployed, making updates is super easy:

1. **Make changes locally** in your code
2. **Test locally**: `npm run dev`
3. **Commit and push to GitHub**:
   ```bash
   git add .
   git commit -m "Your update description"
   git push
   ```
4. **Vercel automatically deploys!** Your changes are live in 1-2 minutes

**For content updates** (player stats, teams):
- Just use the Admin page in your deployed app
- No code deployment needed - changes save directly to Supabase

See `UPDATE_WORKFLOW.md` for detailed instructions on the update process.

---

**Recommendation**: Start with Vercel - it's the easiest and most reliable for Next.js apps!
