/**
 * OpenTelemetry Instrumentation for Dastaan Portal
 *
 * This file initializes the OpenTelemetry SDK with auto-instrumentation.
 * It runs once on server startup (via instrumentation.ts).
 *
 * Week 2: Console exporter for development testing
 * Week 3: OTLP HTTP exporter for Grafana Cloud
 *
 * Configuration via environment variables:
 * - OTEL_SERVICE_NAME: Service name for tracing
 * - OTEL_SERVICE_VERSION: Service version
 * - OTEL_EXPORTER_TYPE: 'console' (dev) or 'otlp' (prod)
 * - OTEL_EXPORTER_OTLP_ENDPOINT: Grafana Cloud OTLP endpoint (Week 3)
 * - OTEL_EXPORTER_OTLP_HEADERS: Authorization header for Grafana Cloud
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { BatchSpanProcessor, ConsoleSpanExporter } from '@opentelemetry/sdk-trace-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { UndiciInstrumentation } from '@opentelemetry/instrumentation-undici';

/**
 * Service identification
 */
const serviceName = process.env.OTEL_SERVICE_NAME || 'dastaan-portal';
const serviceVersion = process.env.OTEL_SERVICE_VERSION || '1.0.0';
const environment = process.env.NODE_ENV || 'development';

/**
 * Exporter type (console for dev, otlp for prod)
 */
const exporterType = process.env.OTEL_EXPORTER_TYPE || 'console';

/**
 * Create resource attributes for service identification
 */
const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: serviceVersion,
  'deployment.environment': environment,
  'service.namespace': 'dastaan',
  'telemetry.sdk.name': 'opentelemetry',
  'telemetry.sdk.language': 'nodejs',
  'telemetry.sdk.version': '1.0.0',
});

/**
 * Create trace exporter based on configuration
 */
function createTraceExporter() {
  if (exporterType === 'otlp') {
    // OTLP HTTP exporter for Grafana Cloud (Week 3)
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const authHeader = process.env.OTEL_EXPORTER_OTLP_HEADERS;

    if (!endpoint) {
      console.warn('[OTel] OTLP endpoint not configured, falling back to console exporter');
      return new ConsoleSpanExporter();
    }

    // Parse authorization header (should be in format "Authorization=Basic xxx")
    const headers: Record<string, string> = {};
    if (authHeader) {
      // Remove "Authorization=" prefix if present
      const authValue = authHeader.replace(/^Authorization=/i, '').trim();
      headers['Authorization'] = authValue;
    }

    console.log('[OTel] Configuring OTLP exporter:', {
      endpoint: `${endpoint}/v1/traces`,
      hasAuth: !!authHeader,
    });

    return new OTLPTraceExporter({
      url: `${endpoint}/v1/traces`,
      headers,
      timeoutMillis: 10000, // 10 second timeout for reliability
    });
  }

  // Console exporter for development testing
  return new ConsoleSpanExporter();
}

/**
 * Create metrics exporter based on configuration
 */
function createMetricsExporter() {
  if (exporterType === 'otlp') {
    // OTLP HTTP exporter for Grafana Cloud (Week 3)
    const endpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;
    const authHeader = process.env.OTEL_EXPORTER_OTLP_HEADERS;

    if (!endpoint) {
      console.warn('[OTel] OTLP endpoint not configured, metrics will not be exported');
      return undefined;
    }

    // Parse authorization header
    const headers: Record<string, string> = {};
    if (authHeader) {
      const authValue = authHeader.replace(/^Authorization=/i, '').trim();
      headers['Authorization'] = authValue;
    }

    return new OTLPMetricExporter({
      url: `${endpoint}/v1/metrics`,
      headers,
      timeoutMillis: 10000,
    });
  }

  // No console exporter for metrics in dev (too noisy)
  return undefined;
}

/**
 * Create span processor with batch export
 * Batches spans every 5 seconds or 512 spans
 */
const spanProcessor = new BatchSpanProcessor(createTraceExporter(), {
  maxQueueSize: 2048,
  maxExportBatchSize: 512,
  scheduledDelayMillis: 5000, // Export every 5 seconds
});

/**
 * Create metrics reader (only if OTLP is configured)
 */
const metricsExporter = createMetricsExporter();
const metricReader = metricsExporter
  ? new PeriodicExportingMetricReader({
      exporter: metricsExporter,
      exportIntervalMillis: 60000, // Export every 60 seconds
    })
  : undefined;

/**
 * Configure auto-instrumentation
 * Automatically instruments HTTP, fetch, PostgreSQL, Redis
 */
const instrumentations = [
  getNodeAutoInstrumentations({
    // Disable instrumentations that are too noisy or not needed
    '@opentelemetry/instrumentation-fs': {
      enabled: false, // File system operations are too noisy
    },
    '@opentelemetry/instrumentation-net': {
      enabled: false, // Network operations are too low-level
    },
    '@opentelemetry/instrumentation-dns': {
      enabled: false, // DNS lookups are too noisy
    },
  }),

  // Enhanced HTTP instrumentation
  new HttpInstrumentation({
    ignoreIncomingRequestHook: (request) => {
      // Ignore health checks and static assets
      const url = request.url || '';
      return (
        url.includes('/health') ||
        url.includes('/_next/static') ||
        url.includes('/favicon.ico') ||
        url.includes('/monitoring') // GlitchTip tunnel endpoint
      );
    },
    ignoreOutgoingRequestHook: (options) => {
      // Ignore telemetry exports (avoid infinite loops)
      const hostname = options.hostname || options.host || '';
      return hostname.includes('grafana.net') || hostname.includes('glitchtip.com');
    },
  }),

  // Fetch API instrumentation (Next.js uses undici)
  new UndiciInstrumentation({
    ignoreRequestHook: (request) => {
      // Ignore telemetry exports
      const url = request.origin || '';
      return url.includes('grafana.net') || url.includes('glitchtip.com');
    },
  }),
];

/**
 * Initialize OpenTelemetry SDK
 */
const sdk = new NodeSDK({
  resource,
  spanProcessors: [spanProcessor],
  metricReader,
  instrumentations,
  // 10% sampling rate (matches GlitchTip/Sentry config)
  traceExporter: undefined, // Use span processor instead
});

/**
 * Start the SDK
 * Called automatically by Next.js via instrumentation.ts
 */
try {
  sdk.start();
  console.log('[OTel] OpenTelemetry initialized successfully');
  console.log(`[OTel] Service: ${serviceName} v${serviceVersion}`);
  console.log(`[OTel] Environment: ${environment}`);
  console.log(`[OTel] Exporter: ${exporterType}`);

  if (exporterType === 'otlp' && process.env.OTEL_EXPORTER_OTLP_ENDPOINT) {
    console.log(`[OTel] OTLP Endpoint: ${process.env.OTEL_EXPORTER_OTLP_ENDPOINT}`);
  }
} catch (error) {
  console.error('[OTel] Failed to initialize OpenTelemetry:', error);
  // Don't throw - app should still work without telemetry
}

/**
 * Graceful shutdown on process termination
 * Ensures all spans and metrics are exported before exit
 */
process.on('SIGTERM', async () => {
  try {
    console.log('[OTel] Shutting down OpenTelemetry SDK...');
    await sdk.shutdown();
    console.log('[OTel] OpenTelemetry SDK shut down successfully');
  } catch (error) {
    console.error('[OTel] Error during OpenTelemetry shutdown:', error);
  } finally {
    process.exit(0);
  }
});

/**
 * Export SDK for testing purposes
 */
export { sdk };
