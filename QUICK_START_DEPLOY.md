# Quick Start: Deploy to Production in 1 Hour

## Prerequisites
- ✅ Supabase project created
- ✅ Code ready to deploy
- ✅ Hosting account (Vercel recommended)

---

## Step 1: Database Migration (5 minutes)

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy contents of `supabase/migrations/20251025000002_fix_evaluation_race_condition.sql`
4. Paste and click **Run**
5. ✅ Verify: Should see "Success. No rows returned"

---

## Step 2: Environment Setup (10 minutes)

### Get Your Credentials

**From Supabase Dashboard:**
1. Project Settings → API
2. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon` `public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` `secret` key → `SUPABASE_SERVICE_ROLE_KEY`

### Create Environment File

```bash
# Copy template
cp .env.example .env.local

# Edit .env.local with your values
```

**Minimum required:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=geo.com
EVALUATION_REMINDER_SECRET=create-random-secret-here
```

---

## Step 3: Test Locally (10 minutes)

```bash
# Install dependencies
npm install

# Build for production
npm run build

# Start production server
npm start

# Visit http://localhost:3000
```

### Quick Tests:
1. ✅ Login works
2. ✅ Navigate between pages (should be fast)
3. ✅ Visit `/api/health` → Should return `{"status":"healthy"}`
4. ✅ Try invalid route → Should show error page (not blank)

---

## Step 4: Deploy to Vercel (15 minutes)

### Option A: Vercel Dashboard (Easiest)

1. Visit [vercel.com](https://vercel.com)
2. Click **Add New** → **Project**
3. Import your Git repository
4. Configure:
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Install Command**: `npm install`
5. Add environment variables (copy from .env.local)
6. Click **Deploy**
7. Wait 2-5 minutes

### Option B: Vercel CLI

```bash
# Install CLI
npm i -g vercel

# Login
vercel login

# Deploy
vercel

# Follow prompts, add environment variables
# Deploy to production
vercel --prod
```

---

## Step 5: Configure Environment Variables in Vercel (5 minutes)

1. Go to your project in Vercel Dashboard
2. Settings → Environment Variables
3. Add each variable from `.env.local`:

**Add these one by one:**
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_APP_URL` (set to your Vercel URL: `https://your-app.vercel.app`)
- `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN`
- `EVALUATION_REMINDER_SECRET`

4. Click **Save**

6. **Redeploy** (Deployments → Latest → Redeploy)

---

## Step 6: Verify Deployment (10 minutes)

### Health Check

```bash
curl https://your-app.vercel.app/api/health
```

**Expected:**
```json
{
  "status": "healthy",
  "checks": {
    "api": "ok",
    "database": "ok"
  }
}
```

### Test Core Features

1. ✅ **Login**: Visit your app, login with test account
2. ✅ **Navigation**: Click between pages (should be fast)
3. ✅ **Error Handling**: Visit `/invalid-route` (should show error page)
4. ✅ **Rate Limiting**:
   ```bash
   # Try 11 signout requests
   for i in {1..11}; do curl -X POST https://your-app.vercel.app/api/auth/signout; done
   ```
   11th should return 429

### Test Each Role

- ✅ **Admin**: Can create users at `/admin/users/new`
- ✅ **Evaluator**: Can submit evaluations
- ✅ **Content Creator**: Can log call reports

---

## Step 7: Monitor (Ongoing)

### Set Up Uptime Monitoring (5 minutes)

1. Sign up at [UptimeRobot.com](https://uptimerobot.com) (free)
2. Add new monitor:
   - **Type**: HTTP(s)
   - **URL**: `https://your-app.vercel.app/api/health`
   - **Interval**: 5 minutes
3. Add your email for alerts

**Note:** Errors are automatically logged to Vercel Dashboard → Logs → Runtime Logs

---

## ✅ Deployment Complete!

### You now have:

- ✅ Production app running on Vercel
- ✅ Database connected and working
- ✅ Health monitoring endpoint
- ✅ Error boundaries protecting users
- ✅ Rate limiting preventing abuse
- ✅ Fast navigation (5-10x improvement)

### Total time: ~1 hour

---

## 🎯 First Week Tasks

### Day 1-2
- [ ] Test with 2-3 real users
- [ ] Monitor health endpoint
- [ ] Check for any errors in logs

### Day 3-5
- [ ] Collect user feedback
- [ ] Monitor performance metrics
- [ ] Verify concurrent access works

### Day 6-7
- [ ] Review analytics
- [ ] Plan any needed improvements
- [ ] Document any issues found

---

## 📞 Need Help?

### Common Issues

**Issue: "Service Unavailable"**
- Check: Environment variables set correctly?
- Check: Database migration ran successfully?
- Check: Supabase project is active?

**Issue: "Can't login"**
- Check: User exists in database?
- Check: `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` matches user email?
- Check: `NEXT_PUBLIC_SUPABASE_URL` is correct?

**Issue: "Blank error page"**
- Check: `app/error.tsx` deployed?
- Check: Browser console for errors
- Check: Vercel deployment logs

### Documentation

- **Full Guide**: See `DEPLOYMENT_GUIDE.md`
- **Checklist**: See `PRODUCTION_CHECKLIST.md`
- **Changes**: See `CHANGES_SUMMARY.md`

---

## 🚀 Next Steps

### Immediate (This Week)
1. Test with small user group
2. Monitor closely
3. Collect feedback

### Soon (This Month)
1. Add more users gradually
2. Review performance metrics
3. Monitor error logs in Vercel Dashboard

### Future (When Needed)
1. Upgrade Supabase plan if needed
2. Add Redis for rate limiting (if > 500 users)
3. Optimize based on usage patterns

---

## 🎉 Congratulations!

Your app is live and production-ready!

**What you built:**
- ✅ Full story development management system
- ✅ Role-based access control
- ✅ Concurrent user support
- ✅ Error handling and recovery
- ✅ Performance optimized
- ✅ Production-grade security

**Remember:**
- Start small, monitor closely
- Gradually expand user base
- Keep documentation updated
- Celebrate the launch! 🎊

You did it! 🚀
