require("./instrument.js");

const Sentry = require("@sentry/node");
const express = require("express");
const rateLimit = require("express-rate-limit");
const path = require('path');
const axios = require('axios');
const sequelize = require('./database');
const Calculation = require('./models/Calculation');

const port = process.env.PORT || 4000;

const app = express();

app.set('trust proxy', 1);

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10, // Limit each IP to 10 requests per `window`
  message: "Too many requests from this IP, please try again later."
});

// Middleware to parse JSON bodies
app.use(express.json());

// Sync database
sequelize.sync().then(() => {
  console.log('Database synced');
});

// All your controllers should live here

app.get("/", function rootHandler(req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get("/calculate", async function calculateHandler(req, res) {
  const { operation, num1, num2 } = req.query;
  const n1 = parseFloat(num1);
  const n2 = parseFloat(num2);
  let result;

  // Vulnerable SQL query
  const query = `SELECT * FROM Calculations WHERE ipAddress = '${req.ip}' AND operation = '${operation}' AND num1 = ${n1} AND num2 = ${n2}`;

  // Check if the calculation has already been performed by the same IP
  try {
    const existingCalculation = await sequelize.query(query, {
      type: sequelize.QueryTypes.SELECT
    });

    if (existingCalculation.length > 0) {
      return res.status(400).json({ error: 'Calculation already performed, try a different one' });
    }
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).json({ error: 'Failed to check existing calculation' });
  }

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

  // Store the calculation in the database
  try {
    await Calculation.create({
      ipAddress: req.ip,
      operation,
      num1: n1,
      num2: n2,
      result
    });
  } catch (error) {
    Sentry.captureException(error);
    return res.status(500).json({ error: 'Failed to store calculation' });
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

app.get('/dependency-issue', async (req, res) => {
  try {
    const response = await axios.get('https://testapp.free.beeceptor.com/my/api/path');
    res.send(response.data);
  } catch (error) {
    Sentry.captureException(error);
    res.status(500).send('Dependency issue: Third-party service is down');
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

// Middleware to capture slow requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 500) { // Adjust the threshold as needed
      Sentry.captureMessage(`Slow request: ${req.method} ${req.url} took ${duration}ms`, {
        level: 'warning',
        extra: { duration, method: req.method, url: req.url }
      });
    }
  });
  next();
});

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