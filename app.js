require("./instrument.js");

const Sentry = require("@sentry/node");
const express = require("express");

const port = process.env.PORT || 4000;

const app = express();

// Middleware to capture slow requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 1000) { // Adjust the threshold as needed
      Sentry.captureMessage(`Slow request: ${req.method} ${req.url} took ${duration}ms`, {
        level: 'warning',
        extra: { duration, method: req.method, url: req.url }
      });
    }
  });
  next();
});

// All your controllers should live here

app.get("/", function rootHandler(req, res) {
  res.end("Hello world!");
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.get("/overload", function overloadHandler(req, res) {
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  const result = fibonacci(40); // This will take a while!
  res.end(`Fibonacci result: ${result}`);
});

// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
