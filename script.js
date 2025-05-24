// GraphQL query to fetch issues with comprehensive data
const ISSUES_QUERY = `
  query {
    issues(first: 100) {
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

// Function to fetch issues from Linear GraphQL API
async function fetchIssues() {
    const tokenInput = document.getElementById('token-input');
    const token = tokenInput.value.trim();

    if (!token) {
        showError('Please enter your Linear API token');
        return;
    }

    // Show loading state
    showLoading(true);
    hideError();
    hideResults();

    console.log('Starting fetch request to Linear API...');

    try {
        // Test basic connectivity first
        console.log('Testing network connectivity...');

        const response = await fetch('/api/linear', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query: ISSUES_QUERY
            })
        });

        console.log('Response received:', response.status, response.statusText);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Response error:', errorText);
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Data received:', data);

        if (data.errors) {
            console.error('GraphQL errors:', data.errors);
            throw new Error(data.errors[0].message || 'GraphQL error occurred');
        }

        const issues = data.data?.issues?.nodes || [];
        console.log('Issues found:', issues.length);
        displayIssues(issues);

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
function displayIssues(issues) {
    const tbody = document.getElementById('issues-tbody');
    const issueCount = document.getElementById('issue-count');

    // Clear existing rows
    tbody.innerHTML = '';

    if (issues.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="no-data">No issues found</td></tr>';
        issueCount.textContent = '0 issues';
    } else {
        issueCount.textContent = `${issues.length} issue${issues.length !== 1 ? 's' : ''}`;

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

function showError(message) {
    const errorDiv = document.getElementById('error-message');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
}

function hideError() {
    const errorDiv = document.getElementById('error-message');
    errorDiv.classList.add('hidden');
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
});
