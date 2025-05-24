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

// Store all fetched issues
let allIssues = [];
const DISPLAY_LIMIT = 20;
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
async function fetchAllIssues(token) {
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

        // Update loading message to show progress
        updateLoadingMessage(`Fetching issues... (${allFetchedIssues.length} found)`);

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

// Main function to fetch issues from Linear GraphQL API
async function fetchIssues() {
    const tokenInput = document.getElementById('token-input');
    let token = tokenInput.value.trim();

    // If no token entered, try to get cached token
    if (!token) {
        console.log('No token entered, checking for cached token...');
        token = await getCachedToken();
        if (token) {
            console.log('Using cached token from server');
        } else {
            showError('Please enter your Linear API token');
            return;
        }
    }

    // Show loading state
    showLoading(true);
    hideError();
    hideResults();

    // Reset the global issues array
    allIssues = [];

    console.log('Starting fetch request to Linear API...');

    try {
        // Fetch all issues using pagination
        allIssues = await fetchAllIssues(token);

        console.log(`Total issues fetched: ${allIssues.length}`);
        console.log(`Displaying first ${Math.min(allIssues.length, DISPLAY_LIMIT)} issues`);

        // Display only the first 20 issues
        const issuesToDisplay = allIssues.slice(0, DISPLAY_LIMIT);
        displayIssues(issuesToDisplay, allIssues.length);

    } catch (error) {
        console.error('Detailed error information:', {
            name: error.name,
            message: error.message,
            stack: error.stack
        });

        // More specific error handling
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            showError('Network error: Unable to connect to Linear API. This might be due to CORS restrictions or network connectivity issues.');
        } else if (error.message.includes('401') || error.message.includes('Unauthorized')) {
            showError('Invalid API token. Please check your Linear API token and try again.');
        } else if (error.message.includes('403') || error.message.includes('Forbidden')) {
            showError('Access denied. Please ensure your API token has the necessary permissions.');
        } else if (error.message.includes('NetworkError') || error.message.includes('Failed to fetch')) {
            showError('Network error: Unable to reach Linear API. Please check your internet connection and try again.');
        } else {
            showError(`Error: ${error.message}`);
        }
    } finally {
        showLoading(false);
    }
}

// Function to display issues in the table
function displayIssues(issues, totalCount = null) {
    const tbody = document.getElementById('issues-tbody');
    const issueCount = document.getElementById('issue-count');

    // Clear existing rows
    tbody.innerHTML = '';

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No issues found</td></tr>';
        issueCount.textContent = '0 issues';
    } else {
        // Show both displayed count and total count if available
        if (totalCount !== null && totalCount > issues.length) {
            issueCount.textContent = `Showing ${issues.length} of ${totalCount} issue${totalCount !== 1 ? 's' : ''}`;
        } else {
            issueCount.textContent = `${issues.length} issue${issues.length !== 1 ? 's' : ''}`;
        }

        issues.forEach(issue => {
            const row = createIssueRow(issue);
            tbody.appendChild(row);
        });
    }

    showResults();
}

// Function to create a table row for an issue
function createIssueRow(issue) {
    const row = document.createElement('tr');

    // Format dates
    const createdDate = new Date(issue.createdAt).toLocaleDateString();
    const updatedDate = new Date(issue.updatedAt).toLocaleDateString();

    // Get priority display
    const priorityDisplay = getPriorityDisplay(issue.priority);

    // Get status with color coding
    const statusDisplay = getStatusDisplay(issue.state);

    row.innerHTML = `
        <td>
            <a href="${issue.url}" target="_blank" class="issue-link">
                ${issue.identifier}
            </a>
        </td>
        <td class="issue-title">
            <div class="title-text">${escapeHtml(issue.title)}</div>
            ${issue.labels?.nodes?.length > 0 ? createLabelsHtml(issue.labels.nodes) : ''}
        </td>
        <td>
            <span class="status-badge status-${issue.state?.type?.toLowerCase() || 'unknown'}">
                ${escapeHtml(issue.state?.name || 'Unknown')}
            </span>
        </td>
        <td>
            <span class="priority-badge priority-${issue.priority || 0}">
                ${priorityDisplay}
            </span>
        </td>
        <td>${escapeHtml(issue.assignee?.name || 'Unassigned')}</td>
        <td>
            <span class="team-badge">
                ${escapeHtml(issue.team?.name || 'No Team')}
            </span>
        </td>
        <td>${createdDate}</td>
        <td>${updatedDate}</td>
    `;

    return row;
}

// Function to get priority display text
function getPriorityDisplay(priority) {
    const priorityMap = {
        0: 'None',
        1: 'Urgent',
        2: 'High',
        3: 'Medium',
        4: 'Low'
    };
    return priorityMap[priority] || 'None';
}

// Function to get status display with appropriate styling
function getStatusDisplay(state) {
    return state?.name || 'Unknown';
}

// Function to create labels HTML
function createLabelsHtml(labels) {
    return `
        <div class="labels">
            ${labels.map(label =>
                `<span class="label" style="background-color: ${label.color}20; border-color: ${label.color}; color: ${label.color}">
                    ${escapeHtml(label.name)}
                </span>`
            ).join('')}
        </div>
    `;
}

// Utility function to escape HTML
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// UI helper functions
function showLoading(show) {
    const loading = document.getElementById('loading');
    if (show) {
        loading.classList.remove('hidden');
    } else {
        loading.classList.add('hidden');
    }
}

function updateLoadingMessage(message) {
    const loading = document.getElementById('loading');
    if (loading) {
        loading.textContent = message;
    }
}

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    hideInfo(); // Hide info when showing error
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.add('hidden');
}

function showInfo(message) {
    let infoDiv = document.getElementById('info-message');
    if (!infoDiv) {
        // Create info div if it doesn't exist
        infoDiv = document.createElement('div');
        infoDiv.id = 'info-message';
        infoDiv.className = 'info-message';
        const errorDiv = document.getElementById('error-message');
        errorDiv.parentNode.insertBefore(infoDiv, errorDiv);
    }
    infoDiv.innerHTML = message;
    infoDiv.classList.remove('hidden');
    hideError(); // Hide error when showing info
}

function hideInfo() {
    const infoDiv = document.getElementById('info-message');
    if (infoDiv) {
        infoDiv.classList.add('hidden');
    }
}

function showResults() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.classList.remove('hidden');
}

function hideResults() {
    const resultsSection = document.getElementById('results-section');
    resultsSection.classList.add('hidden');
}

// Allow Enter key to trigger fetch
document.getElementById('token-input').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        fetchIssues();
    }
});

// Clear error when user starts typing
document.getElementById('token-input').addEventListener('input', function() {
    hideError();
    hideInfo();
});

// Initialize page and check for cached token
async function initializePage() {
    const tokenStatus = await checkCachedToken();
    if (tokenStatus.hasToken) {
        // Hide the token input section since we have a cached token
        const tokenSection = document.getElementById('token-section');
        tokenSection.style.display = 'none';

        // Update header to indicate we're using cached token
        const headerP = document.querySelector('header p');
        headerP.textContent = 'Using cached Linear API token - fetching your issues...';

        // Update the page title to reflect cached token usage
        const headerH1 = document.querySelector('header h1');
        headerH1.textContent = 'Linear Issues Viewer (Cached Token)';

        showInfo('Using cached Linear API token from server environment. <a href="#" onclick="showManualTokenInput(); return false;">Use manual token instead</a>');

        // Auto-fetch issues since we have a cached token
        fetchIssues();
    } else {
        // Show token input section since no cached token is available
        const headerP = document.querySelector('header p');
        headerP.textContent = 'Enter your Linear API token to view your issues';
    }
}

// Function to show manual token input (fallback option)
function showManualTokenInput() {
    const tokenSection = document.getElementById('token-section');
    const headerP = document.querySelector('header p');
    const headerH1 = document.querySelector('header h1');

    // Show the token section
    tokenSection.style.display = 'block';

    // Reset header text
    headerH1.textContent = 'Linear Issues Viewer';
    headerP.textContent = 'Enter your Linear API token to view your issues';

    // Hide info message and show token input
    hideInfo();
    hideResults();

    // Focus on token input
    document.getElementById('token-input').focus();
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);
