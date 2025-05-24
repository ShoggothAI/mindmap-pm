const express = require('express');
const cors = require('cors');
const path = require('path');

// Get env file path from command line argument or use default
const envPath = process.argv[2] || '.env.ubuntu';
require('dotenv').config({ path: envPath });

console.log(`Loading environment variables from: ${envPath}`);

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// Serve static files (HTML, CSS, JS)
app.use(express.static('.'));

// Get cached Linear token endpoint
app.get('/api/token-status', (req, res) => {
    const cachedToken = process.env.ANOTHER_LINEAR_API_KEY || process.env.LINEAR_API_KEY;
    res.json({
        hasToken: !!cachedToken,
        source: cachedToken ? 'environment' : null
    });
});

// Get cached Linear token (if available)
app.get('/api/cached-token', (req, res) => {
    const cachedToken = process.env.ANOTHER_LINEAR_API_KEY || process.env.LINEAR_API_KEY;
    if (cachedToken) {
        res.json({ token: cachedToken });
    } else {
        res.status(404).json({ error: 'No cached token available' });
    }
});

// Proxy endpoint for Linear API
app.post('/api/linear', async (req, res) => {
    try {
        const { default: fetch } = await import('node-fetch');

        // Extract token from Authorization header and remove 'Bearer ' prefix if present
        let token = req.headers.authorization;
        if (token && token.startsWith('Bearer ')) {
            token = token.substring(7); // Remove 'Bearer ' prefix
        }

        // If no token provided in request, try to use cached token from environment
        if (!token) {
            token = process.env.ANOTHER_LINEAR_API_KEY || process.env.LINEAR_API_KEY;
        }

        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();

        if (!response.ok) {
            return res.status(response.status).json(data);
        }

        res.json(data);
    } catch (error) {
        console.error('Proxy error:', error);
        res.status(500).json({
            errors: [{ message: 'Proxy server error: ' + error.message }]
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open http://localhost:3000 in your browser to use the Linear Issues Viewer');
});
