# Production Deployment Checklist

## Pre-Deployment (Complete Before Going Live)

### 1. Database Setup ✅ CRITICAL

- [ ] **Run Migration**: `20251025000002_fix_evaluation_race_condition.sql`
  - Location: `supabase/migrations/`
  - How: Copy/paste into Supabase Dashboard → SQL Editor → Run
  - Why: Fixes race condition bug with concurrent evaluations

- [ ] **Verify RLS Policies**: Check Supabase Dashboard
  - All tables should have Row Level Security enabled
  - Test with different user roles

- [ ] **Test Database Connection**
  ```bash
  curl https://your-domain.com/api/health
  # Should return: "status": "healthy"
  ```

### 2. Environment Variables ✅ CRITICAL

- [ ] **Copy environment template**
  ```bash
  cp .env.example .env.local
  ```

- [ ] **Configure required variables**:
  - `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase anonymous key
  - `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role key (keep secret!)
  - `NEXT_PUBLIC_APP_URL` - Your production domain
  - `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN` - Email domain (geo.com)
  - `EVALUATION_REMINDER_SECRET` - Random secret for cron jobs

- [ ] **Optional but recommended**:
  - `RESEND_API_KEY` - For email notifications

### 3. Code Review ✅

- [ ] **Test locally first**
  ```bash
  npm run build
  npm start
  # Visit http://localhost:3000
  ```

- [ ] **Check error boundaries**:
  - Visit non-existent route → Should show friendly error page
  - No blank white screens

- [ ] **Test rate limiting**:
  - Make 11+ requests to `/api/auth/signout` in 1 minute
  - 11th should return 429 error

### 4. Security Review ✅

- [ ] **Verify authentication**:
  - Test login/logout flow
  - Verify role-based access control
  - Ensure unauthorized users can't access protected routes

- [ ] **Check API security**:
  - Rate limiting enabled on all routes
  - Request validation working
  - No sensitive data in client code

- [ ] **Database security**:
  - RLS policies enabled
  - Service role key not exposed
  - Admin access restricted

---

## Deployment Steps

### Option A: Deploy to Vercel (Recommended)

```bash
# 1. Install Vercel CLI
npm i -g vercel

# 2. Deploy
vercel

# 3. Set environment variables in Vercel dashboard
# Settings → Environment Variables → Add each variable

# 4. Redeploy with production environment
vercel --prod
```

### Option B: Deploy to Other Platform

1. Build the application:
   ```bash
   npm run build
   ```

2. Configure environment variables in your hosting platform

3. Deploy using platform-specific commands

---

## Post-Deployment Verification (Test Everything!)

### 1. Health Check ✅ CRITICAL

```bash
curl https://your-production-domain.com/api/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "checks": {
    "api": "ok",
    "database": "ok"
  }
}
```

**If unhealthy:** Check database connection and Supabase status

### 2. Authentication Flow ✅ CRITICAL

- [ ] Navigate to `/login`
- [ ] Login with test account
- [ ] Verify redirected to correct dashboard based on role
- [ ] Test logout
- [ ] Verify redirected back to login

### 3. Role-Based Access ✅ CRITICAL

Test with each role:
- [ ] **Admin**: Can access `/admin` and create users
- [ ] **Evaluator**: Can access `/evaluator` and submit evaluations
- [ ] **Content Creator**: Can access `/content-department` and log reports
- [ ] **Content Manager**: Can access `/content-department` with full permissions

### 4. Core Functionality ✅

**Content Department:**
- [ ] Log a new Writer Engagement Report
- [ ] Schedule a meeting
- [ ] View calendar
- [ ] View all call reports

**Evaluator Portal:**
- [ ] View pending evaluations
- [ ] Submit an evaluation
- [ ] View completed evaluations
- [ ] View call report details

**Admin Panel:**
- [ ] Create a new user
- [ ] Change user role
- [ ] Deactivate a user

### 5. Concurrent Operations ✅ CRITICAL

Test race condition fix:
- [ ] Have 2 evaluators submit evaluations for same report simultaneously
- [ ] Both submissions should succeed
- [ ] Evaluation count should be accurate (not duplicated)
- [ ] Status should update correctly when threshold reached

### 6. Error Handling ✅

- [ ] Visit `/this-does-not-exist` → Should show error boundary page
- [ ] Trigger an error in evaluator portal → Should show evaluator error page
- [ ] Check browser console → Errors logged
- [ ] Check Vercel Dashboard → Logs → Runtime Logs for error capture

### 7. Performance ✅

- [ ] Navigate between pages → Should feel instant with loading skeletons
- [ ] Dashboard loads → Should be under 1 second
- [ ] Call reports list → Should load quickly with caching
- [ ] Network tab → Check response times are reasonable

### 8. Rate Limiting ✅

```bash
# Test auth endpoint
for i in {1..12}; do
  curl -X POST https://your-domain.com/api/auth/signout
  echo "Request $i"
done
```

- [ ] Requests 1-10: Should succeed
- [ ] Requests 11+: Should return 429 with "Too many requests"

---

## Monitoring Setup

### 1. Uptime Monitoring

Set up external monitoring (choose one):
- **UptimeRobot** (free): https://uptimerobot.com
- **Pingdom**: https://pingdom.com
- **Better Uptime**: https://betteruptime.com

Monitor URL: `https://your-domain.com/api/health`

### 2. Error Tracking (Built-in with Vercel)

Vercel automatically captures console errors:
- [ ] Verify errors appear in Vercel Dashboard → Logs
- [ ] Set up Vercel email notifications for deployment failures
- [ ] Review runtime logs regularly

### 3. Performance Monitoring

Monitor in your hosting dashboard:
- [ ] Response times (should be < 500ms)
- [ ] Error rates (should be < 1%)
- [ ] Build times
- [ ] Bandwidth usage

### 4. Database Monitoring

In Supabase Dashboard:
- [ ] Monitor active connections (should be < 50)
- [ ] Check for slow queries (> 1 second)
- [ ] Review storage usage
- [ ] Set up backup schedule (automatic in Supabase)

---

## Week 1 Post-Launch Tasks

### Day 1-2: Immediate Monitoring
- [ ] Monitor health check endpoint every hour
- [ ] Watch error rates in Vercel Dashboard logs
- [ ] Check database connection count
- [ ] Review user feedback

### Day 3-7: Performance Review
- [ ] Analyze response times across all routes
- [ ] Check for any error patterns in logs
- [ ] Review rate limit hits
- [ ] Monitor concurrent user count

### Week 1 Review Meeting
- [ ] Review error logs
- [ ] Collect user feedback
- [ ] Identify any performance bottlenecks
- [ ] Plan any necessary fixes

---

## Common Issues & Solutions

### Issue: "Service Unavailable" (503)
**Cause:** Database connection failed
**Solution:**
1. Check Supabase dashboard status
2. Verify environment variables are correct
3. Check `/api/health` endpoint

### Issue: Users can't login
**Cause:** Email domain validation
**Solution:** Verify `NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN=geo.com` is set

### Issue: Blank page on errors
**Cause:** Error boundaries not deployed
**Solution:** Verify `app/error.tsx` exists and is deployed

### Issue: Concurrent evaluation bug
**Cause:** Migration not run
**Solution:** Run `20251025000002_fix_evaluation_race_condition.sql`

### Issue: Too many rate limit errors
**Cause:** Rate limits too strict
**Solution:** Adjust limits in `lib/rate-limit.ts` if needed

---

## Rollback Plan

If critical issues occur:

### Immediate Rollback (Vercel)
```bash
vercel rollback
```

### Manual Rollback
1. Revert to previous Git commit
2. Redeploy
3. Restore database from backup (if needed)

### Database Rollback
1. Supabase Dashboard → Database → Backups
2. Restore from automatic daily backup
3. May lose up to 24 hours of data

---

## Success Criteria

Your deployment is successful when:

- ✅ Health check returns "healthy"
- ✅ All user roles can access their dashboards
- ✅ Evaluators can submit evaluations without errors
- ✅ Content creators can log reports
- ✅ Admin can create users
- ✅ Error boundaries catch and display errors gracefully
- ✅ Rate limiting prevents abuse
- ✅ No critical errors in first 24 hours

---

## Emergency Contacts

Document these before deployment:

- **Hosting Platform Support**: _______________
- **Supabase Support**: support@supabase.com
- **Primary Developer**: _______________
- **Database Admin**: _______________
- **On-Call Person**: _______________

---

## Final Pre-Launch Checklist

Right before making site public:

- [ ] All tests pass
- [ ] Database migration applied
- [ ] Environment variables configured
- [ ] Health check responding
- [ ] Error boundaries tested
- [ ] Rate limiting verified
- [ ] Monitoring set up
- [ ] Rollback plan documented
- [ ] Team notified of launch
- [ ] Celebration prepared! 🎉

---

**You're ready for production!** 🚀

Remember: Start with small user group first, monitor closely, then gradually expand access.
