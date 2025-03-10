require("./instrument.js");

const Sentry = require("@sentry/node");
const Tracing = require("@sentry/tracing");
const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require('path');

const port = process.env.PORT || 4000;

const app = express();

app.set('trust proxy', 1);

Sentry.init({
  dsn: "https://e5ae49b092d3568c0e56c1eeb58ff6f9@o4508924865019904.ingest.de.sentry.io/4508924867641424",
  integrations: [
    // Enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // Enable Express.js middleware tracing
    new Tracing.Integrations.Express({ app }),
  ],
  tracesSampleRate: 1.0, // Adjust this value in production
});

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // Limit each IP to 10 requests per `window`
  message: "Too many requests from this IP, please try again later."
});

// All your controllers should live here

app.get("/", function rootHandler(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/calculate", function calculateHandler(req, res) {
  const { operation, num1, num2 } = req.query;
  const n1 = parseFloat(num1);
  const n2 = parseFloat(num2);
  let result;

  switch (operation) {
    case 'add':
      result = n1 + n2;
      break;
    case 'subtract':
      result = n1 - n2;
      break;
    case 'multiply':
      result = n1 * n2;
      break;
    case 'divide':
      result = n1 / n2;
      break;
    default:
      return res.status(400).json({ error: 'Invalid operation' });
  }

  res.json({ result });
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

app.get("/overload", function overloadHandler(req, res) {
  const n = parseInt(req.query.n, 10);
  if (isNaN(n) || n < 0) {
    return res.status(400).end('Invalid input');
  }

  try {
    const result = fibonacci(n);
    res.end(`Fibonacci result: ${result}`);
  } catch (error) {
    res.status(500).end(`Internal Server Error: ${error.message}`);
  }
});

// Specific rate limiter for the /overload endpoint
const overloadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per `window`
  message: "Too many requests to the /overload endpoint, please try again later."
});

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);
// Request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());
// Tracing handler must be before any other middleware
app.use(Sentry.Handlers.tracingHandler());
// Middleware to capture slow requests

// app.use((req, res, next) => {
//   const start = Date.now();
//   res.on('finish', () => {
//     const duration = Date.now() - start;
//     if (duration > 1000) { // Adjust the threshold as needed
//       Sentry.captureMessage(`Slow request: ${req.method} ${req.url} took ${duration}ms`, {
//         level: 'warning',
//         extra: { duration, method: req.method, url: req.url }
//       });
//     }
//   });
//   next();
// });

// Apply the overload rate limiter to the /overload endpoint
// app.use("/overload", overloadLimiter);

// app.use(limiter);

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  Sentry.captureException(err);

  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

// Global error handling for uncaught exceptions and unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  Sentry.captureException(reason);
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  Sentry.captureException(error);
  console.error('Uncaught Exception thrown:', error);
  process.exit(1); // Optional: exit the process after handling the exception
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})