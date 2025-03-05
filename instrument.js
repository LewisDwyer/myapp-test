// Import with `import * as Sentry from "@sentry/node"` if you are using ESM
const Sentry = require("@sentry/node");
const { nodeProfilingIntegration } = require("@sentry/profiling-node");

Sentry.init({
  dsn: "https://ed628432a960caf1a7c56464cb78f8f1@o4508920053563392.ingest.de.sentry.io/4508920063590480",
  // Custom tracer function for a Node.js Express app
  tracesSampler: ({ name, attributes, parentSampled }) => {
    const userAgent = attributes?.["http.user_agent"];

    if (
      typeof userAgent === "string" &&
      userAgent.includes("SentryUptimeBot")
    ) {
      // Sample 100% of spans from SentryUptimeBot
      return 1;
    }

    // Sample 50% of other spans
    return 0.5;
  },
});

// Sentry.init({
//   dsn: "https://e5ae49b092d3568c0e56c1eeb58ff6f9@o4508924865019904.ingest.de.sentry.io/4508924867641424",
//   integrations: [
//     nodeProfilingIntegration(),
//   ],
//   // Tracing
//   tracesSampleRate: 1.0, //  Capture 100% of the transactions
//   profilesSampleRate: 1.0, // Capture 100% of the profiles
// });

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

// Starts a transaction that will also be profiled
Sentry.startSpan({
  name: "My First Transaction",
}, () => {
  // the code executing inside the transaction will be wrapped in a span and profiled
});

// Calls to stopProfiling are optional - if you don't stop the profiler, it will keep profiling
// your application until the process exits or stopProfiling is called.
Sentry.profiler.stopProfiler();