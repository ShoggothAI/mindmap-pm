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
          id
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

// Cache for Linear states by team
let linearStatesCache = new Map();

// Cache for Linear users
let linearUsersCache = new Map();

// GraphQL query to fetch all workflow states for teams
const FETCH_STATES_QUERY = `
  query {
    teams {
      nodes {
        id
        name
        states {
          nodes {
            id
            name
            type
            color
          }
        }
      }
    }
  }
`;

// GraphQL query to fetch all users
const FETCH_USERS_QUERY = `
  query {
    users {
      nodes {
        id
        name
        email
        displayName
        active
      }
    }
  }
`;

// Function to fetch and cache Linear states
async function fetchLinearStates() {
    const token = await getCachedToken();
    if (!token) {
        console.error('No Linear API token available for fetching states');
        return;
    }

    try {
        const response = await fetch('/api/linear', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: FETCH_STATES_QUERY
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('Fetch states GraphQL errors:', data.errors);
            return;
        }

        // Cache states by team
        if (data.data?.teams?.nodes) {
            data.data.teams.nodes.forEach(team => {
                if (team.states?.nodes) {
                    linearStatesCache.set(team.id, team.states.nodes);
                    console.log(`Cached ${team.states.nodes.length} states for team ${team.name} (${team.id})`);
                }
            });
        }

        console.log('Successfully fetched and cached Linear states');
    } catch (error) {
        console.error('Failed to fetch Linear states:', error);
    }
}

// Function to fetch and cache Linear users
async function fetchLinearUsers() {
    const token = await getCachedToken();
    if (!token) {
        console.error('No Linear API token available for fetching users');
        return;
    }

    try {
        const response = await fetch('/api/linear', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: FETCH_USERS_QUERY
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.errors) {
            console.error('Fetch users GraphQL errors:', data.errors);
            return;
        }

        // Cache users by ID and create lookup maps
        if (data.data?.users?.nodes) {
            const users = data.data.users.nodes.filter(user => user.active); // Only cache active users

            // Clear existing cache
            linearUsersCache.clear();

            // Cache users by ID
            users.forEach(user => {
                linearUsersCache.set(user.id, {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    displayName: user.displayName || user.name
                });
            });

            console.log(`Cached ${users.length} active Linear users`);
        }

        console.log('Successfully fetched and cached Linear users');
    } catch (error) {
        console.error('Failed to fetch Linear users:', error);
    }
}

// Helper function to get all cached Linear users
function getAllLinearUsers() {
    return Array.from(linearUsersCache.values());
}

// Helper function to get Linear user by ID
function getLinearUserById(userId) {
    return linearUsersCache.get(userId);
}

// Helper function to find Linear user by email
function getLinearUserByEmail(email) {
    if (!email) return null;

    for (const user of linearUsersCache.values()) {
        if (user.email && user.email.toLowerCase() === email.toLowerCase()) {
            return user;
        }
    }
    return null;
}

// Helper function to find Linear user by name
function getLinearUserByName(name) {
    if (!name) return null;

    for (const user of linearUsersCache.values()) {
        if (user.name && user.name.toLowerCase() === name.toLowerCase()) {
            return user;
        }
        if (user.displayName && user.displayName.toLowerCase() === name.toLowerCase()) {
            return user;
        }
    }
    return null;
}

// Helper function to get Linear state ID from exact state name
function getLinearStateIdFromStatus(stateName, teamId) {
    if (!teamId || !stateName) {
        return null;
    }

    // Get states for this team
    const teamStates = linearStatesCache.get(teamId);
    if (!teamStates) {
        console.log(`No cached states for team ${teamId}, fetching...`);
        // Trigger fetch but return null for now
        fetchLinearStates();
        return null;
    }

    // Find exact match by state name
    const matchingState = teamStates.find(state =>
        state.name === stateName
    );

    if (matchingState) {
        console.log(`Found exact state match: ${matchingState.name} (${matchingState.id})`);
        return matchingState.id;
    }

    console.log(`No exact state match found for '${stateName}' in team ${teamId}`);
    console.log('Available states:', teamStates.map(s => s.name));
    return null;
}

// Helper function to get all states for a team
function getLinearStatesForTeam(teamId) {
    return linearStatesCache.get(teamId) || [];
}

// GraphQL mutation to update an issue in Linear
const UPDATE_ISSUE_MUTATION = `
  mutation IssueUpdate($id: String!, $parentId: String, $projectId: String, $teamId: String, $title: String, $description: String, $stateId: String) {
    issueUpdate(
      id: $id,
      input: {
        parentId: $parentId
        projectId: $projectId
        teamId: $teamId
        title: $title
        description: $description
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

// Function to update an issue in Linear (supports all fields)
async function updateLinearIssue(issueId, updateData) {
    const token = await getCachedToken();
    if (!token) {
        throw new Error('No Linear API token available');
    }

    // Only include fields that have actual values (not null/undefined)
    const variables = { id: issueId };
    const inputFields = {};

    if (updateData.parentId !== undefined && updateData.parentId !== null) {
        inputFields.parentId = updateData.parentId;
    }
    if (updateData.projectId !== undefined && updateData.projectId !== null) {
        inputFields.projectId = updateData.projectId;
    }
    if (updateData.teamId !== undefined && updateData.teamId !== null) {
        inputFields.teamId = updateData.teamId;
    }
    if (updateData.title !== undefined && updateData.title !== null) {
        inputFields.title = updateData.title;
    }
    if (updateData.description !== undefined && updateData.description !== null) {
        inputFields.description = updateData.description;
    }
    if (updateData.stateId !== undefined && updateData.stateId !== null) {
        inputFields.stateId = updateData.stateId;
    }
    if (updateData.assigneeId !== undefined) {
        inputFields.assigneeId = updateData.assigneeId;
    }

    // Build dynamic GraphQL mutation based on what fields we're updating
    const inputFieldsStr = Object.keys(inputFields).map(key => {
        if (key === 'parentId' || key === 'projectId' || key === 'teamId' || key === 'stateId' || key === 'assigneeId') {
            return `${key}: $${key}`;
        } else {
            return `${key}: $${key}`;
        }
    }).join('\n        ');

    const variableDefsStr = Object.keys(inputFields).map(key => {
        return `$${key}: String`;
    }).join(', ');

    const mutation = `
        mutation IssueUpdate($id: String!, ${variableDefsStr}) {
            issueUpdate(
                id: $id,
                input: {
                    ${inputFieldsStr}
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
                    assignee {
                        id
                        name
                        email
                    }
                }
            }
        }
    `;

    // Add the input field values to variables
    Object.assign(variables, inputFields);

    console.log('Updating Linear issue with data:', variables);
    console.log('Using mutation:', mutation);

    const response = await fetch('/api/linear', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            query: mutation,
            variables: variables
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('Update issue response error:', errorText);
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    if (data.errors) {
        console.error('Update issue GraphQL errors:', data.errors);
        throw new Error(data.errors[0].message || 'GraphQL error occurred');
    }

    if (!data.data?.issueUpdate?.success) {
        throw new Error('Failed to update issue in Linear');
    }

    console.log('Successfully updated Linear issue:', data.data.issueUpdate.issue);
    return data.data.issueUpdate.issue;
}

// Export functions for global use
window.createLinearIssue = createLinearIssue;
window.deleteLinearIssue = deleteLinearIssue;
window.updateLinearIssue = updateLinearIssue;
window.getLinearStateIdFromStatus = getLinearStateIdFromStatus;
window.getLinearStatesForTeam = getLinearStatesForTeam;
window.fetchLinearStates = fetchLinearStates;
window.fetchLinearUsers = fetchLinearUsers;
window.getAllLinearUsers = getAllLinearUsers;
window.getLinearUserById = getLinearUserById;
window.getLinearUserByEmail = getLinearUserByEmail;
window.getLinearUserByName = getLinearUserByName;
