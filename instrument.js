// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://e5ae49b092d3568c0e56c1eeb58ff6f9@o4508924865019904.ingest.de.sentry.io/4508924867641424",
  integrations: [
    nodeProfilingIntegration(),
    Sentry.httpIntegration(),
  ],
  // Tracing
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  profilesSampleRate: 1.0, // Capture 100% of the profiles
});

// Capture unhandled promise rejections and uncaught exceptions
process.on('unhandledRejection', (reason, promise) => {
  Sentry.captureException(reason);
});

process.on('uncaughtException', (error) => {
  Sentry.captureException(error);
});

// Manually call startProfiler and stopProfiler
// to profile the code in between
Sentry.profiler.startProfiler();
