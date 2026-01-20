# How to Update Your Deployed App

Once your app is deployed to Vercel, making updates is easy and automatic!

## Quick Workflow

### 1. Make Changes Locally
Edit your code, add features, fix bugs, etc. in your local development environment.

### 2. Test Locally (Recommended)
```bash
npm run dev
```
Test your changes at `http://localhost:3000` to make sure everything works.

### 3. Commit and Push to GitHub
```bash
# Stage your changes
git add .

# Commit with a descriptive message
git commit -m "Add new feature"  # or "Fix bug", "Update teams", etc.

# Push to GitHub
git push
```

### 4. Vercel Auto-Deploys! 🚀
- Vercel automatically detects the push
- Builds your app
- Deploys to production
- Your family sees the updates within 1-2 minutes!

## Detailed Steps

### If Your Code is Already on GitHub

1. **Make changes** in your code editor
2. **Commit changes**:
   ```bash
   git add .
   git commit -m "Description of what you changed"
   git push
   ```
3. **Wait for Vercel** - Check the Vercel dashboard to see the deployment progress
4. **Done!** - Your changes are live

### If You Need to Update Environment Variables

Sometimes you might need to update Supabase credentials or other settings:

1. Go to your Vercel project dashboard
2. Click on **Settings** → **Environment Variables**
3. Update or add variables as needed
4. Click **Redeploy** if needed, or wait for next deployment

### Preview Deployments

Vercel creates preview deployments for pull requests and branches:
- Push to a branch → Preview deployment URL
- Merge to main → Production deployment

This lets you test changes before they go live!

## Best Practices

### ✅ Good Commit Messages
```bash
git commit -m "Fix player points calculation"
git commit -m "Add team detail page"
git commit -m "Update admin password protection"
```

### ✅ Test Before Pushing
Always test locally first:
```bash
npm run dev
# Test your changes
npm run build  # Make sure it builds
```

### ✅ Small, Frequent Updates
- Make small changes
- Commit and push often
- Each deployment takes ~1-2 minutes
- Easy to rollback if something breaks

## Rollback (If Something Breaks)

If you need to undo a deployment:

1. Go to Vercel dashboard
2. Click on **Deployments**
3. Find the previous working deployment
4. Click the **⋯** menu → **Promote to Production**

## Updating Database/Content

### Player Stats & Teams
- Use the **Admin page** in your deployed app
- Log in with password `123456`
- Make changes directly - they're saved to Supabase
- No code deployment needed for content updates!

### Code Changes
- Use the git workflow above
- Only needed when changing features, UI, or logic

## Common Update Scenarios

### Scenario 1: Update Player Stats
**No deployment needed!**
- Just go to Admin → Players Manager
- Edit stats directly
- Changes are live immediately

### Scenario 2: Add New Team
**No deployment needed!**
- Go to Admin → Teams Manager
- Add team or import CSV
- Changes are live immediately

### Scenario 3: Change UI/Fix Bug
**Requires deployment:**
1. Make code changes locally
2. Test with `npm run dev`
3. `git add . && git commit -m "Fix bug" && git push`
4. Wait for Vercel to deploy

### Scenario 4: Add New Feature
**Requires deployment:**
1. Code new feature
2. Test locally
3. Commit and push
4. Vercel auto-deploys

## Troubleshooting

### "My changes aren't showing up"
- Wait 1-2 minutes for deployment
- Hard refresh browser (Cmd+Shift+R / Ctrl+Shift+R)
- Check Vercel dashboard for build errors

### "Build is failing"
- Check the build logs in Vercel dashboard
- Test build locally: `npm run build`
- Fix errors, then push again

### "Need to update Supabase keys"
- Go to Vercel → Settings → Environment Variables
- Update the values
- Redeploy (or wait for next push)

---

## Summary

**Content Updates** (players, teams, stats):
- ✅ Use Admin page directly - instant updates

**Code Updates** (features, UI, bug fixes):
- ✅ `git commit` → `git push` → Auto-deploy in 1-2 minutes

**That's it!** Your family will see updates automatically. 🎉
