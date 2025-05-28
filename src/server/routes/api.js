// API routes for Linear integration
const express = require('express');
const router = express.Router();

// Get cached Linear token endpoint
router.get('/token-status', (req, res) => {
    const cachedToken = process.env.ANOTHER_LINEAR_API_KEY || process.env.LINEAR_API_KEY;
    res.json({
        hasToken: !!cachedToken,
        source: cachedToken ? 'environment' : null
    });
});

// Get cached Linear token (if available)
router.get('/cached-token', (req, res) => {
    const cachedToken = process.env.ANOTHER_LINEAR_API_KEY || process.env.LINEAR_API_KEY;
    if (cachedToken) {
        res.json({ token: cachedToken });
    } else {
        res.status(404).json({ error: 'No cached token available' });
    }
});

// Proxy endpoint for Linear API
router.post('/linear', async (req, res) => {
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

// Test endpoint to verify mind map conversion
router.get('/test-mindmap', async (req, res) => {
    try {
        const { default: fetch } = await import('node-fetch');

        // Get cached token
        const token = process.env.ANOTHER_LINEAR_API_KEY || process.env.LINEAR_API_KEY;
        if (!token) {
            return res.status(400).json({ error: 'No token available' });
        }

        // Fetch some issues
        const response = await fetch('https://api.linear.app/graphql', {
            method: 'POST',
            headers: {
                'Authorization': token,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: `
                    query {
                        issues(first: 10) {
                            nodes {
                                id
                                title
                                description
                                team {
                                    id
                                    name
                                    key
                                }
                                project {
                                    id
                                    name
                                }
                                parent {
                                    id
                                }
                                state {
                                    name
                                    type
                                }
                            }
                        }
                    }
                `
            })
        });

        const data = await response.json();

        if (data.errors) {
            return res.status(400).json({ errors: data.errors });
        }

        const issues = data.data?.issues?.nodes || [];

        // Group by team to show structure
        const teamGroups = {};
        const issuesWithoutTeam = [];

        issues.forEach(issue => {
            const teamName = issue.team?.name || issue.team?.key;
            if (teamName) {
                if (!teamGroups[teamName]) {
                    teamGroups[teamName] = { total: 0, rootIssues: 0, issues: [] };
                }
                teamGroups[teamName].total++;
                teamGroups[teamName].issues.push(issue);
                if (!issue.parent?.id) {
                    teamGroups[teamName].rootIssues++;
                }
            } else {
                issuesWithoutTeam.push(issue);
            }
        });

        res.json({
            totalIssues: issues.length,
            teamGroups: Object.keys(teamGroups).map(teamName => ({
                name: teamName,
                ...teamGroups[teamName]
            })),
            unassignedIssues: issuesWithoutTeam.length,
            sampleIssues: issues.slice(0, 3)
        });

    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Test endpoint to measure mindmap connection distances
router.get('/test-distances', (req, res) => {
    res.json({
        message: "This endpoint will be used to test mindmap connection distances",
        instructions: "Call this endpoint from the frontend after mindmap is rendered to get actual distance measurements"
    });
});

// Receive distance measurements from frontend
router.post('/test-distances', (req, res) => {
    const { distances } = req.body;

    console.log('\n=== MINDMAP DISTANCE TEST RESULTS ===');
    console.log(`Measured ${distances.length} connections:`);

    distances.forEach((d, i) => {
        console.log(`${i + 1}. ${d.source} → ${d.target}: ${d.distance.toFixed(1)}px`);
    });

    // Check if all distances are the same
    const uniqueDistances = [...new Set(distances.map(d => Math.round(d.distance)))];
    console.log('\nUnique distances (rounded):', uniqueDistances);

    if (uniqueDistances.length === 1) {
        console.log('✅ SUCCESS: All connections have constant spacing of', uniqueDistances[0], 'pixels');
    } else {
        console.log('❌ PROBLEM: Inconsistent spacing detected!');
        console.log('   Expected: All distances should be the same');
        console.log('   Actual: Found', uniqueDistances.length, 'different distances:', uniqueDistances);
    }
    console.log('=====================================\n');

    res.json({
        success: true,
        totalConnections: distances.length,
        uniqueDistances: uniqueDistances,
        isConstantSpacing: uniqueDistances.length === 1,
        expectedDistance: 200 // Our CONSTANT_SPACING value
    });
});

module.exports = router;
