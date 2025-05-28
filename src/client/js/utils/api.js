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
          id
          name
          key
        }
        project {
          name
          id
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

// GraphQL mutation to create a new issue in Linear
const CREATE_ISSUE_MUTATION = `
  mutation IssueCreate($teamId: String!, $title: String!, $description: String, $parentId: String, $projectId: String, $stateId: String) {
    issueCreate(
      input: {
        teamId: $teamId
        title: $title
        description: $description
        parentId: $parentId
        projectId: $projectId
        stateId: $stateId
      }
    ) {
      success
      issue {
        id
        identifier
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
          id
          name
          type
        }
      }
    }
  }
`;

// GraphQL mutation to delete an issue in Linear
const DELETE_ISSUE_MUTATION = `
  mutation IssueDelete($id: String!) {
    issueDelete(id: $id) {
      success
    }
  }
`;

// Function to create a new issue in Linear
async function createLinearIssue(issueData) {
    console.log('=== createLinearIssue called ===');
    console.log('Issue data received:', issueData);

    const token = await getCachedToken();
    console.log('Token available:', !!token);

    if (!token) {
        console.error('No Linear API token available');
        throw new Error('No Linear API token available');
    }

    const variables = {
        teamId: issueData.teamId,
        title: issueData.title,
        description: issueData.description || null,
        parentId: issueData.parentId || null,
        projectId: issueData.projectId || null,
        stateId: issueData.stateId || null
    };

    console.log('Creating Linear issue with data:', variables);

    const response = await fetch('/api/linear', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: CREATE_ISSUE_MUTATION,
            variables: variables
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Create issue response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
        console.error('Create issue GraphQL errors:', data.errors);
        throw new Error(data.errors[0].message || 'GraphQL error occurred');
    }

    if (!data.data?.issueCreate?.success) {
        throw new Error('Failed to create issue in Linear');
    }

    console.log('Successfully created Linear issue:', data.data.issueCreate.issue);
    return data.data.issueCreate.issue;
}

// Function to delete an issue in Linear
async function deleteLinearIssue(issueId) {
    const token = await getCachedToken();
    if (!token) {
        throw new Error('No Linear API token available');
    }

    const variables = {
        id: issueId
    };

    console.log('Deleting Linear issue with ID:', issueId);

    const response = await fetch('/api/linear', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: DELETE_ISSUE_MUTATION,
            variables: variables
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Delete issue response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
        console.error('Delete issue GraphQL errors:', data.errors);
        throw new Error(data.errors[0].message || 'GraphQL error occurred');
    }

    if (!data.data?.issueDelete?.success) {
        throw new Error('Failed to delete issue in Linear');
    }

    console.log('Successfully deleted Linear issue:', issueId);
    return true;
}

// Helper function to convert mindmap status to Linear state
function getLinearStateIdFromStatus(status, teamId) {
    // For now, we'll let Linear assign the default state based on the team's workflow
    // In the future, this could be enhanced to map specific statuses to state IDs
    // by fetching the team's workflow states and mapping them
    return null; // Let Linear use the default state
}

// Export functions for global use
window.createLinearIssue = createLinearIssue;
window.deleteLinearIssue = deleteLinearIssue;
window.getLinearStateIdFromStatus = getLinearStateIdFromStatus;
