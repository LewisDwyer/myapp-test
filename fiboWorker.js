const { parentPort } = require('worker_threads');

function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

parentPort.on('message', (n) => {
  try {
    console.log(`Calculating Fibonacci for n=${n}`);
    const result = fibonacci(n);
    console.log(`Fibonacci result for n=${n} is ${result}`);
    parentPort.postMessage(result);
  } catch (error) {
    console.error(`Error calculating Fibonacci for n=${n}: ${error.message}`);
    parentPort.postMessage({ error: error.message });
  }
});