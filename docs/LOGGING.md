# Logging Guide

This guide explains the structured logging system in the Dastaan Portal, powered by [Pino](https://getpino.io).

## Overview

The application uses Pino for high-performance, structured logging with:
- **Environment-based formatting** - Pretty logs in development, JSON in production
- **Log levels** - trace, debug, info, warn, error, fatal
- **Correlation IDs** - Track requests across async operations
- **Sensitive data redaction** - Automatic removal of passwords, tokens, etc.
- **Request/response logging** - Automatic HTTP request tracking
- **Performance measurement** - Built-in duration tracking

## Quick Start

### Basic Logging

```typescript
import { logger } from '@/lib/logger';

// Information logging
logger.info('User created successfully');

// Warning logging
logger.warn('Deprecated API endpoint used');

// Error logging
logger.error(`Database connection failed: ${error.message}`);

// Debug logging (only in development)
logger.debug('Cache hit for user profile');
```

### Request Logging with Middleware

```typescript
import { withRequestLogging } from '@/lib/logger/middleware';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return withRequestLogging(request, async (logger) => {
    // Logger automatically includes correlation ID and request context
    logger.info('Fetching users');

    const users = await fetchUsers();

    return NextResponse.json({ users });
  });
}
```

## Configuration

### Environment Variables

Add to your `.env.local` file:

```bash
# LOG_LEVEL: trace, debug, info, warn, error, fatal
# Default: info in production, debug in development
LOG_LEVEL=info

# LOG_FORMAT: json or pretty
# Default: pretty in development, json in production
LOG_FORMAT=json
```

### Log Levels

Levels from most to least verbose:

1. **trace** - Very detailed debugging (e.g., function entry/exit)
2. **debug** - Detailed debugging (e.g., variable values, cache operations)
3. **info** - General information (e.g., successful operations) **← DEFAULT in prod**
4. **warn** - Warning messages (e.g., deprecated features, recoverable errors)
5. **error** - Error messages (e.g., failed operations, exceptions)
6. **fatal** - Critical errors that crash the application

**Best Practice:** Use `info` for production, `debug` for development.

## Core Features

### 1. Structured Logging

Instead of string concatenation, use structured data:

```typescript
// ❌ BAD - String concatenation
logger.info('User ' + userId + ' logged in from ' + ipAddress);

// ✅ GOOD - Simple message
logger.info(`User ${userId} logged in from ${ipAddress}`);

// ✅ BEST - Structured data (if using object syntax)
// Note: Pino requires object first, then message
logger.info({ userId, ipAddress, event: 'login' }, 'User logged in');
```

### 2. Correlation IDs

Correlation IDs track a single request through multiple function calls:

```typescript
import { runWithCorrelationId } from '@/lib/logger/context';

export async function POST(request: NextRequest) {
  return runWithCorrelationId(async () => {
    // All logs within this context will have the same correlation ID
    logger.info('Processing payment');
    await validatePayment();  // Logs will have same correlation ID
    await chargeCustomer();   // Logs will have same correlation ID
    return NextResponse.json({ success: true });
  });
}
```

### 3. Request Context

Extract user context from requests:

```typescript
import { extractUserContext } from '@/lib/logger/context';

export async function POST(request: NextRequest) {
  const { ipAddress, userAgent } = extractUserContext(request);

  logger.info(`Request from ${ipAddress} using ${userAgent}`);
}
```

### 4. Performance Logging

Measure operation duration:

```typescript
import { measureDuration, startTimer } from '@/lib/logger/middleware';

// Automatic duration logging
const users = await measureDuration('fetch_users', async () => {
  return await supabase.from('users').select('*');
});
// Logs: "Operation completed: fetch_users" with duration

// Manual timing
const timer = startTimer('complex_calculation');
// ... complex operation
timer.stop(); // Logs duration automatically
```

## Common Patterns

### API Route Logging

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { logger } from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching evaluator stats');

    const stats = await getEvaluatorStats();

    return NextResponse.json({ stats });
  } catch (error) {
    logger.error(`Error fetching evaluator stats: ${error instanceof Error ? error.message : String(error)}`);
    return NextResponse.json(
      { error: 'Failed to fetch evaluator stats' },
      { status: 500 }
    );
  }
}
```

### Authentication Events

```typescript
import { logger } from '@/lib/logger';

// Login success
logger.info(`User logged in - userId: ${user.id}, ip: ${ipAddress}`);

// Login failure
logger.warn(`Failed login attempt - email: ${email}, reason: Invalid password`);

// Logout
logger.info(`User signed out - userId: ${user.id}`);
```

### Admin Operations

```typescript
import { logger } from '@/lib/logger';

// Before admin action
logger.info(`Admin action: deleting user ${userId} by admin ${adminId}`);

// After admin action
logger.info(`User ${userId} deleted successfully`);
```

### Database Operations

```typescript
import { logger } from '@/lib/logger';

const startTime = Date.now();
const { data, error } = await supabase.from('users').select('*');
const duration = Date.now() - startTime;

if (error) {
  logger.error(`Database query failed: ${error.message} (${duration}ms)`);
} else {
  logger.debug(`Query executed successfully in ${duration}ms - rows: ${data.length}`);
}
```

## Sensitive Data Redaction

The logger automatically redacts sensitive fields from logs:

**Auto-redacted fields:**
- password
- token
- api_key, apiKey
- secret
- authorization
- cookie
- session
- access_token, refresh_token
- private_key
- credit_card
- ssn

```typescript
// This will log with [REDACTED] for password
logger.info({ email: 'user@geo.com', password: 'secret123' }, 'User data');
// Output: {"email":"user@geo.com","password":"[REDACTED]","msg":"User data"}
```

## Log Formats

### Development (Pretty)

```
[13:45:23.456] INFO: User logged in - userId: 123, ip: 192.168.1.1
[13:45:23.789] ERROR: Database query failed: Connection timeout (2350ms)
```

### Production (JSON)

```json
{"level":"info","time":"2025-01-09T13:45:23.456Z","msg":"User logged in - userId: 123, ip: 192.168.1.1"}
{"level":"error","time":"2025-01-09T13:45:23.789Z","msg":"Database query failed: Connection timeout (2350ms)"}
```

## Advanced Usage

### Child Loggers

Create scoped loggers for modules:

```typescript
import { createChildLogger } from '@/lib/logger';

const authLogger = createChildLogger({ module: 'auth' });
authLogger.info('Session validated');
// Output includes: {"module":"auth","msg":"Session validated"}

const dbLogger = createChildLogger({ module: 'database' });
dbLogger.debug('Connection pool initialized');
// Output includes: {"module":"database","msg":"Connection pool initialized"}
```

### Context Logger

Get a logger with automatic correlation ID:

```typescript
import { getContextLogger } from '@/lib/logger/context';

async function processPayment() {
  const logger = getContextLogger();
  // Logger automatically includes correlation ID from current request
  logger.info('Processing payment');
}
```

## Querying Logs

### In Development (Pretty Format)

Logs print to console with colors and formatting.

### In Production (JSON Format)

Use log aggregation services like:
- **Datadog**: `source:nodejs service:dastaan-portal`
- **CloudWatch**: Filter by `level`, `correlationId`, `userId`
- **Elasticsearch**: Query JSON fields

**Example Datadog Query:**
```
service:dastaan-portal level:error @http.method:POST @correlationId:550e8400-e29b-41d4-a716-446655440000
```

**Example CloudWatch Insights Query:**
```
fields @timestamp, msg, userId, correlationId
| filter level = "error"
| filter userId = "123"
| sort @timestamp desc
```

## Best Practices

### DO ✅

- Use appropriate log levels (info for normal operations, error for failures)
- Include context (userId, requestId, etc.) in log messages
- Log before and after critical operations
- Use structured data when available
- Measure performance of slow operations
- Log errors with full context

### DON'T ❌

- Don't log sensitive data (passwords, tokens, credit cards)
- Don't use console.log/error (use logger instead)
- Don't log inside tight loops (causes performance issues)
- Don't log entire objects (log relevant fields only)
- Don't use trace/debug levels in production

### Examples

```typescript
// ✅ GOOD
logger.info(`User ${userId} created successfully`);
logger.error(`Payment failed: ${error.message} - userId: ${userId}, amount: ${amount}`);

// ❌ BAD
logger.info('something happened'); // Too vague
logger.error(error); // Missing context
console.log('User created'); // Use logger instead
logger.debug(allUserData); // Too verbose, potential sensitive data
```

## Troubleshooting

### Logs not appearing

1. **Check LOG_LEVEL** - If set to `error`, only errors will show
2. **Check environment** - Development defaults to `debug`, production to `info`
3. **Verify logger import** - Ensure `import { logger } from '@/lib/logger'`

### Too many logs

1. **Increase LOG_LEVEL** - Set to `warn` or `error` in production
2. **Remove debug statements** - Clean up verbose logging
3. **Use correlation IDs** - Filter logs for specific requests

### Logs missing correlation IDs

1. **Use withRequestLogging** - Wrap route handlers with middleware
2. **Use runWithCorrelationId** - Wrap async operations
3. **Check context** - Correlation ID only exists within async context

## Migration from console

If migrating from `console.log/error`:

```typescript
// Before
console.log('User logged in:', userId);
console.error('Error:', error);
console.warn('Deprecated API used');

// After
logger.info(`User logged in: ${userId}`);
logger.error(`Error: ${error instanceof Error ? error.message : String(error)}`);
logger.warn('Deprecated API used');
```

## Performance

Pino is extremely fast:
- **Async logging** - Doesn't block the event loop
- **JSON serialization** - Optimized for production
- **Low overhead** - < 1ms per log in most cases

## References

- [Pino Documentation](https://getpino.io)
- [Best Practices for Logging](https://www.loggly.com/ultimate-guide/node-logging-basics/)
- [Correlation IDs Guide](https://hilton.org.uk/blog/microservices-correlation-id)

## Support

For questions or issues:
- Check this documentation first
- Review code examples in `lib/logger/`
- Ask in team Slack channel
- Create issue in GitHub repo
