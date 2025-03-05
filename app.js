require("./instrument.js");

const Sentry = require("@sentry/node");
const express = require("express");
const rateLimit = require("express-rate-limit");
const { Worker } = require('worker_threads');
const path = require('path');

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

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // Limit each IP to 10 requests per `window` 
  message: "Too many requests from this IP, please try again later."
});

// All your controllers should live here

app.get("/", function rootHandler(req, res) {
  res.end("Hello world!");
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.get("/overload", function overloadHandler(req, res) {
  const worker = new Worker(path.resolve(__dirname, 'fiboWorker.js'));
  worker.on('message', (result) => {
    res.end(`Fibonacci result: ${result}`);
  });
  worker.on('error', (error) => {
    Sentry.captureException(error);
    res.status(500).end('Internal Server Error');
  });
  worker.postMessage(40);
});

// Specific rate limiter for the /overload endpoint
const overloadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 5, // Limit each IP to 5 requests per `window`
  message: "Too many requests to the /overload endpoint, please try again later."
});


// The error handler must be registered before any other error middleware and after all controllers
Sentry.setupExpressErrorHandler(app);

// Apply the overload rate limiter to the /overload endpoint
app.use("/overload", overloadLimiter);

app.use(limiter);

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {

  Sentry.captureException(err);

  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
