# GlitchTip Error Tracking - Production Setup

## ✅ What's Configured

### Error Tracking (Production Only)
- **Client-side errors**: Browser errors, React errors, unhandled promises
- **Server-side errors**: API routes, server components, database errors
- **Edge runtime errors**: Middleware errors
- **Error boundaries**: 5 boundaries across the app (global + 4 sections)
- **Logger integration**: `logError()`, `logFatal()`, `logDatabaseError()` functions
- **API error handling**: Automatic capture of 500 errors and unexpected DB errors

### Privacy & Security
- ✅ Sensitive headers redacted (Authorization, Cookie, API keys)
- ✅ JWT tokens and secrets removed from error messages
- ✅ URL query params with tokens/keys redacted
- ✅ Environment variables excluded from error contexts
- ✅ Browser extension errors filtered out

### Configuration
- **DSN**: Already configured in `.env.local`
- **Enabled**: Production only (`process.env.NODE_ENV === "production"`)
- **Tunnel**: `/monitoring` (bypasses adblockers)
- **Sample Rate**: 100% of errors, 10% of performance traces
- **Free Tier**: 1,000 events/month

## 🚀 Deployment to Vercel

### Step 1: Add Environment Variable
Go to your Vercel project → Settings → Environment Variables

Add:
```
Name: NEXT_PUBLIC_GLITCHTIP_DSN
Value: https://b0be46bfcfe84582bc6a1975408d37a6@app.glitchtip.com/19276
Apply to: Production, Preview, Development
```

### Step 2: Deploy
```bash
git add .
git commit -m "Add GlitchTip error tracking"
git push
```

### Step 3: Verify
After deployment:
1. Visit your production site
2. Trigger an error (or wait for real errors)
3. Check: https://app.glitchtip.com/19276/issues
4. Errors should appear within 10-30 seconds

## 📊 What Gets Tracked

### Automatically Tracked
- Unhandled JavaScript errors
- Unhandled promise rejections
- React component errors (via error boundaries)
- API route errors (500 status codes)
- Database errors (unexpected DB issues)
- Server component errors

### Manually Tracked (via logger)
```typescript
import { logError, logFatal, logDatabaseError } from '@/lib/logger';

// Log an error
logError(new Error('Something failed'), { context: 'additional info' });

// Log a fatal error
logFatal(new Error('Critical failure'), { service: 'payment' });

// Log a database error
logDatabaseError(error, 'SELECT * FROM users', { table: 'users' });
```

### Manually Tracked (via Sentry)
```typescript
import * as Sentry from '@sentry/nextjs';

// Capture an exception
Sentry.captureException(error, {
  level: 'error',
  tags: { feature: 'checkout' },
  extra: { userId: '123' },
});

// Capture a message
Sentry.captureMessage('Something unexpected happened', 'warning');
```

## 🔍 Monitoring Dashboard

Access your GlitchTip dashboard:
- **Issues**: https://app.glitchtip.com/19276/issues
- **Performance**: https://app.glitchtip.com/19276/performance
- **Alerts**: Configure in GlitchTip settings

### What You'll See
- Error type and message
- Full stack trace with source maps
- User context (if logged in)
- Browser/OS information
- Breadcrumbs (user actions leading to error)
- Error frequency and affected users

## 🛠️ Files Configured

### Core Configuration
- `sentry.client.config.ts` - Browser error tracking
- `sentry.server.config.ts` - Server error tracking
- `sentry.edge.config.ts` - Edge runtime error tracking
- `instrumentation.ts` - Auto-loads configs on startup
- `app/layout.tsx` - Imports client config

### Error Boundaries
- `app/global-error.tsx` - Root-level errors
- `app/error.tsx` - Main app errors
- `app/content-department/error.tsx` - Content department errors
- `app/evaluator/error.tsx` - Evaluator portal errors
- `app/management/error.tsx` - Management dashboard errors

### Integration Points
- `lib/logger/index.ts` - `logError()`, `logFatal()`, `logDatabaseError()`
- `lib/api/errors.ts` - `internalError()`, `handleDatabaseError()`
- `next.config.ts` - Source maps enabled

## ⚠️ Important Notes

1. **Production Only**: GlitchTip only runs in production to avoid dev noise
2. **Free Tier Limit**: 1,000 events/month (sufficient for most apps)
3. **Source Maps**: Enabled for readable stack traces in production
4. **Privacy**: All sensitive data is automatically redacted
5. **Performance**: 10% trace sampling to stay within free tier limits

## 📈 Best Practices

### Monitor Regularly
- Check dashboard weekly for new error patterns
- Set up email alerts for critical errors
- Review error trends and fix high-frequency issues

### Error Grouping
- Errors are grouped by type and stack trace
- Mark errors as "Resolved" when fixed
- Ignore noise (browser extensions, known issues)

### Performance
- Errors are sent asynchronously (no user impact)
- Failed error sends are retried automatically
- Tunnel endpoint prevents adblocker interference

## 🆘 Troubleshooting

### Errors Not Appearing
1. Check environment variable is set in Vercel
2. Verify app is running in production mode
3. Check GlitchTip project isn't paused
4. Look for CORS errors in browser console

### Too Many Events
1. Lower `sampleRate` in config files
2. Add more patterns to `ignoreErrors` array
3. Add noisy domains to `denyUrls` array

### Missing Stack Traces
1. Verify `productionBrowserSourceMaps: true` in next.config.ts
2. Check source maps are uploaded (automatic with this setup)
3. Ensure errors occur in production build (not dev)

## 📞 Support

- **GlitchTip Docs**: https://glitchtip.com/documentation
- **Sentry SDK Docs**: https://docs.sentry.io/platforms/javascript/guides/nextjs/
- **Your Dashboard**: https://app.glitchtip.com/19276

---

**Setup Date**: December 29, 2025
**Implementation**: Week 1 Complete ✅
**Status**: Production Ready 🚀
