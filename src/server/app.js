// Main Express application
const express = require('express');
const path = require('path');
const corsMiddleware = require('./middleware/cors');
const apiRoutes = require('./routes/api');

// Get env file path from command line argument or use default
const envPath = process.argv[2] || '.env.ubuntu';
require('dotenv').config({ path: envPath });

console.log(`Loading environment variables from: ${envPath}`);

const app = express();

// Enable CORS for all routes
app.use(corsMiddleware);

// Parse JSON bodies
app.use(express.json());

// Serve static files from client directory
app.use(express.static(path.join(__dirname, '../client')));

// API routes
app.use('/api', apiRoutes);

// Serve the main HTML file for any non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

module.exports = app;
