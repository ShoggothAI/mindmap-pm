// API utilities for Linear integration
// Handles all API calls to the backend and Linear GraphQL API

// GraphQL query to fetch issues with comprehensive data and pagination support
const ISSUES_QUERY = `
  query($first: Int!, $after: String) {
    issues(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        identifier
        title
        description
        priority
        createdAt
        updatedAt
        url
        parent {
          id
        }
        state {
          name
          type
        }
        assignee {
          name
          email
        }
        team {
          name
          key
        }
        creator {
          name
        }
        labels {
          nodes {
            name
            color
          }
        }
      }
    }
  }
`;

// Constants
const FETCH_BATCH_SIZE = 100;

// Function to fetch a single page of issues
async function fetchIssuesPage(token, after = null) {
    const variables = {
        first: FETCH_BATCH_SIZE,
        after: after
    };

    const response = await fetch('/api/linear', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: ISSUES_QUERY,
            variables: variables
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
        console.error('GraphQL errors:', data.errors);
        throw new Error(data.errors[0].message || 'GraphQL error occurred');
    }

    return data.data?.issues || { nodes: [], pageInfo: { hasNextPage: false, endCursor: null } };
}

// Function to fetch ALL issues using pagination
async function fetchAllIssues(token, onProgress = null) {
    let allFetchedIssues = [];
    let hasNextPage = true;
    let cursor = null;
    let pageCount = 0;

    console.log('Starting to fetch all issues with pagination...');

    while (hasNextPage) {
        pageCount++;
        console.log(`Fetching page ${pageCount}...`);

        const issuesPage = await fetchIssuesPage(token, cursor);
        const issues = issuesPage.nodes || [];

        allFetchedIssues = allFetchedIssues.concat(issues);

        hasNextPage = issuesPage.pageInfo?.hasNextPage || false;
        cursor = issuesPage.pageInfo?.endCursor || null;

        console.log(`Page ${pageCount}: fetched ${issues.length} issues. Total so far: ${allFetchedIssues.length}`);

        // Call progress callback if provided
        if (onProgress) {
            onProgress(allFetchedIssues.length);
        }

        // Safety check to prevent infinite loops
        if (pageCount > 100) {
            console.warn('Reached maximum page limit (100). Stopping pagination.');
            break;
        }
    }

    console.log(`Finished fetching all issues. Total: ${allFetchedIssues.length} issues across ${pageCount} pages.`);
    return allFetchedIssues;
}

// Function to check for cached token on server
async function checkCachedToken() {
    try {
        const response = await fetch('/api/token-status');
        if (response.ok) {
            const data = await response.json();
            return data;
        }
    } catch (error) {
        console.log('No cached token available:', error.message);
    }
    return { hasToken: false };
}

// Function to get cached token from server
async function getCachedToken() {
    try {
        const response = await fetch('/api/cached-token');
        if (response.ok) {
            const data = await response.json();
            return data.token;
        }
    } catch (error) {
        console.log('Could not retrieve cached token:', error.message);
    }
    return null;
}
