// Debug server script to show detailed error logs
const { exec } = require('child_process');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Set default port if not specified in .env
if (!process.env.PORT) {
  process.env.PORT = 5000;
}

// Run the server with detailed error logging
const server = exec('node src/app.js', { 
  env: process.env,
  cwd: __dirname
});

// Forward stdout and stderr to console
server.stdout.on('data', (data) => {
  console.log(data);
});

server.stderr.on('data', (data) => {
  console.error(`Error: ${data}`);
});

server.on('close', (code) => {
  console.log(`Server process exited with code ${code}`);
});

console.log('Debug server started with enhanced error logging...');
