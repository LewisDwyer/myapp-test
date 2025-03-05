require("./instrument.js");

const Sentry = require("@sentry/node");
const express = require("express");

const port = process.env.PORT || 4000;

const app = express();

// All your controllers should live here

app.get("/", function rootHandler(req, res) {
  res.end("Hello world!");
});

app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("My first Sentry error!");
});

app.get("/overload", function overloadHandler(req, res) {
  // Perform a CPU-intensive task by calculating Fibonacci numbers
  function fibonacci(n) {
    if (n <= 1) return n;
    return fibonacci(n - 1) + fibonacci(n - 2);
  }

  const result = fibonacci(40); // Adjust the number to increase/decrease the load
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
