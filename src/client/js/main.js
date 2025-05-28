// Store all fetched issues
let allIssues = [];
let filteredIssues = [];
const DISPLAY_LIMIT = 20;

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
        allIssues = await fetchAllIssues(token, (count) => {
            updateLoadingMessage(`Fetching issues... (${count} found)`);
        });

        console.log(`Total issues fetched: ${allIssues.length}`);
        console.log(`Displaying first ${Math.min(allIssues.length, DISPLAY_LIMIT)} issues`);

        // Hide any error messages since fetch was successful
        hideError();

        // Populate filter dropdowns with unique values from all issues
        populateFilters(allIssues);

        // Initialize filtered issues to all issues
        filteredIssues = [...allIssues];

        // Display only the first 20 issues
        const issuesToDisplay = filteredIssues.slice(0, DISPLAY_LIMIT);
        displayIssues(issuesToDisplay, filteredIssues.length);

        // Switch to Interactive Mind Map tab after issues are loaded
        console.log('Issues loaded successfully, switching to Interactive Mind Map tab');
        console.log('allIssues array contains:', allIssues.length, 'issues');
        setTimeout(() => {
            console.log('About to switch to interactive-mindmap tab');
            switchTab('interactive-mindmap');
        }, 100);

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

    // Clear existing rows
    tbody.innerHTML = '';

    if (issues.length === 0) {
        const noDataMessage = totalCount === 0 ? 'No issues found' : 'No issues match the current filters';
        tbody.innerHTML = `<tr><td colspan="8" class="no-data">${noDataMessage}</td></tr>`;
    } else {
        issues.forEach(issue => {
            const row = createIssueRow(issue);
            tbody.appendChild(row);
        });

        // Show count information if we're displaying a subset
        if (totalCount && totalCount > issues.length) {
            const countRow = document.createElement('tr');
            countRow.innerHTML = `<td colspan="8" class="count-info">Showing ${issues.length} of ${totalCount} issues</td>`;
            tbody.appendChild(countRow);
        }
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
        infoDiv.style.display = 'none';
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

        // Hide the header section when using cached token
        const header = document.querySelector('header');
        header.style.display = 'none';

        // showInfo('Using cached Linear API token from server environment. <a href="#" onclick="showManualTokenInput(); return false;">Use manual token instead</a>');

        // Hide any existing error and info messages
        hideError();
        hideInfo();

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

// Tab switching functionality
function switchTab(tabName, event) {
    // Remove active class from all tab buttons and content
    document.querySelectorAll('.tab-button').forEach(button => {
        button.classList.remove('active');
    });
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });

    // Add active class to selected tab button and content
    if (event && event.target) {
        event.target.classList.add('active');
    } else {
        // Fallback: find the button by tabName
        const buttons = document.querySelectorAll('.tab-button');
        buttons.forEach(button => {
            if ((tabName === 'table' && button.textContent.includes('Table')) ||
                (tabName === 'interactive-mindmap' && button.textContent.includes('Interactive'))) {
                button.classList.add('active');
            }
        });
    }
    document.getElementById(tabName + '-view').classList.add('active');

    // If switching to interactive mindmap tab, render the interactive mindmap
    if (tabName === 'interactive-mindmap') {
        console.log('Switching to interactive mindmap tab');
        console.log('filteredIssues at switch time:', filteredIssues ? filteredIssues.length : 'null/undefined', 'issues');
        if (filteredIssues && filteredIssues.length > 0) {
            console.log('Sample issue:', filteredIssues[0]);
        }
        initializeInteractiveMindMap(filteredIssues, allIssues);
    }
}

// Store selected filter values
let selectedStatuses = new Set();
let selectedAssignees = new Set();

// Function to populate filter dropdowns with unique values and counts from issues
function populateFilters(issues) {
    // Count occurrences of each status and assignee
    const statusCounts = {};
    const assigneeCounts = {};

    issues.forEach(issue => {
        const status = issue.state?.name || 'Unknown';
        const assignee = issue.assignee?.name || 'Unassigned';

        statusCounts[status] = (statusCounts[status] || 0) + 1;
        assigneeCounts[assignee] = (assigneeCounts[assignee] || 0) + 1;
    });

    // Populate status filter
    populateMultiSelectOptions('status', statusCounts);

    // Populate assignee filter
    populateMultiSelectOptions('assignee', assigneeCounts);

    // Initialize all items as selected
    selectedStatuses = new Set(Object.keys(statusCounts));
    selectedAssignees = new Set(Object.keys(assigneeCounts));

    // Update checkboxes to reflect initial state
    updateCheckboxStates('status');
    updateCheckboxStates('assignee');

    // Update button text
    updateSelectedText('status');
    updateSelectedText('assignee');
}

// Function to populate options for a multi-select dropdown
function populateMultiSelectOptions(filterType, counts) {
    const optionsList = document.getElementById(`${filterType}-options-list`);
    optionsList.innerHTML = '';

    // Sort by count (descending) then by name
    const sortedEntries = Object.entries(counts).sort((a, b) => {
        if (b[1] !== a[1]) return b[1] - a[1]; // Sort by count descending
        return a[0].localeCompare(b[0]); // Then by name ascending
    });

    sortedEntries.forEach(([value, count]) => {
        const optionItem = document.createElement('div');
        optionItem.className = 'option-item';

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.id = `${filterType}-${value.replace(/\s+/g, '-').toLowerCase()}`;
        checkbox.value = value;
        checkbox.checked = true; // Initially all selected
        checkbox.onchange = () => handleOptionChange(filterType, value);

        const label = document.createElement('label');
        label.htmlFor = checkbox.id;
        label.innerHTML = `
            <span>${value}</span>
            <span class="option-count">${count}</span>
        `;

        optionItem.appendChild(checkbox);
        optionItem.appendChild(label);
        optionsList.appendChild(optionItem);
    });
}

// Function to toggle dropdown visibility
function toggleDropdown(dropdownId) {
    const dropdown = document.getElementById(dropdownId);
    const options = dropdown.querySelector('.multi-select-options');
    const isOpen = options.style.display !== 'none';

    // Close all other dropdowns first
    document.querySelectorAll('.multi-select-options').forEach(opt => {
        opt.style.display = 'none';
    });
    document.querySelectorAll('.multi-select-dropdown').forEach(dd => {
        dd.classList.remove('open');
    });

    // Toggle current dropdown
    if (!isOpen) {
        options.style.display = 'block';
        dropdown.classList.add('open');
    }
}

// Function to handle select all/none toggle
function toggleSelectAll(filterType) {
    const selectAllCheckbox = document.getElementById(`${filterType}-select-all`);
    const isChecked = selectAllCheckbox.checked;

    // Get all option checkboxes
    const optionCheckboxes = document.querySelectorAll(`#${filterType}-options-list input[type="checkbox"]`);

    // Update all checkboxes
    optionCheckboxes.forEach(checkbox => {
        checkbox.checked = isChecked;
    });

    // Update selected sets
    if (filterType === 'status') {
        if (isChecked) {
            optionCheckboxes.forEach(cb => selectedStatuses.add(cb.value));
        } else {
            selectedStatuses.clear();
        }
    } else {
        if (isChecked) {
            optionCheckboxes.forEach(cb => selectedAssignees.add(cb.value));
        } else {
            selectedAssignees.clear();
        }
    }

    updateSelectedText(filterType);
    applyFilters();
}

// Function to handle individual option change
function handleOptionChange(filterType, value) {
    // Find checkbox by iterating through options to avoid CSS selector issues with special characters
    const optionCheckboxes = document.querySelectorAll(`#${filterType}-options-list input[type="checkbox"]`);
    let checkbox = null;
    for (let cb of optionCheckboxes) {
        if (cb.value === value) {
            checkbox = cb;
            break;
        }
    }

    if (!checkbox) return;

    if (filterType === 'status') {
        if (checkbox.checked) {
            selectedStatuses.add(value);
        } else {
            selectedStatuses.delete(value);
        }
    } else {
        if (checkbox.checked) {
            selectedAssignees.add(value);
        } else {
            selectedAssignees.delete(value);
        }
    }

    updateCheckboxStates(filterType);
    updateSelectedText(filterType);
    applyFilters();
}

// Function to update select all checkbox state
function updateCheckboxStates(filterType) {
    const selectAllCheckbox = document.getElementById(`${filterType}-select-all`);
    const optionCheckboxes = document.querySelectorAll(`#${filterType}-options-list input[type="checkbox"]`);
    const checkedCount = document.querySelectorAll(`#${filterType}-options-list input[type="checkbox"]:checked`).length;

    if (checkedCount === 0) {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = false;
    } else if (checkedCount === optionCheckboxes.length) {
        selectAllCheckbox.checked = true;
        selectAllCheckbox.indeterminate = false;
    } else {
        selectAllCheckbox.checked = false;
        selectAllCheckbox.indeterminate = true;
    }
}

// Function to update the selected text display
function updateSelectedText(filterType) {
    const selectedSet = filterType === 'status' ? selectedStatuses : selectedAssignees;
    const button = document.querySelector(`#${filterType}-filter .selected-text`);
    const totalOptions = document.querySelectorAll(`#${filterType}-options-list input[type="checkbox"]`).length;

    if (selectedSet.size === 0) {
        button.textContent = `No ${filterType === 'status' ? 'Statuses' : 'Assignees'}`;
    } else if (selectedSet.size === totalOptions) {
        button.textContent = `All ${filterType === 'status' ? 'Statuses' : 'Assignees'}`;
    } else if (selectedSet.size === 1) {
        button.textContent = Array.from(selectedSet)[0];
    } else {
        button.textContent = `${selectedSet.size} ${filterType === 'status' ? 'Statuses' : 'Assignees'}`;
    }
}

// Function to apply filters and update displays
function applyFilters() {
    // Filter the issues based on selected criteria
    filteredIssues = allIssues.filter(issue => {
        const issueStatus = issue.state?.name || 'Unknown';
        const issueAssignee = issue.assignee?.name || 'Unassigned';

        const statusMatch = selectedStatuses.size === 0 || selectedStatuses.has(issueStatus);
        const assigneeMatch = selectedAssignees.size === 0 || selectedAssignees.has(issueAssignee);

        return statusMatch && assigneeMatch;
    });

    console.log(`Filtered ${allIssues.length} issues down to ${filteredIssues.length} issues`);
    console.log('Filter criteria:', {
        statuses: Array.from(selectedStatuses),
        assignees: Array.from(selectedAssignees)
    });

    // Update table view
    const issuesToDisplay = filteredIssues.slice(0, DISPLAY_LIMIT);
    displayIssues(issuesToDisplay, filteredIssues.length);

    // Update mindmap view if it's currently active
    const mindmapView = document.getElementById('interactive-mindmap-view');
    if (mindmapView && mindmapView.classList.contains('active')) {
        console.log('Updating mindmap with filtered issues');
        initializeInteractiveMindMap(filteredIssues, allIssues);
    }
}

// Function to refresh issues from Linear while preserving mindmap state
async function refreshIssues() {
    console.log('Refreshing issues from Linear...');

    const refreshButton = document.getElementById('refresh-button');
    const refreshIcon = refreshButton.querySelector('.refresh-icon');
    const refreshText = refreshButton.querySelector('.refresh-text');

    // Show loading state
    refreshButton.disabled = true;
    refreshButton.classList.add('loading');
    refreshText.textContent = 'Refreshing...';

    try {
        // Get cached token
        const token = await getCachedToken();
        if (!token) {
            showError('No Linear API token available. Please enter your token and fetch issues first.');
            return;
        }

        // Store current mindmap data and zoom state before refresh
        const currentMindMapData = window.mindMapData || null;
        const currentZoomTransform = window.currentZoomTransform || null;

        console.log('Preserving current mindmap state:', {
            hasMindMapData: !!currentMindMapData,
            hasZoomTransform: !!currentZoomTransform
        });

        // Fetch fresh issues from Linear
        console.log('Fetching fresh issues from Linear...');
        const freshIssues = await fetchAllIssues(token, (count) => {
            refreshText.textContent = `Refreshing... (${count} found)`;
        });

        console.log(`Fetched ${freshIssues.length} fresh issues`);

        // Update global allIssues array
        allIssues = freshIssues;

        // Preserve current filter selections and apply them to fresh data
        console.log('Applying existing filters to fresh data');
        filteredIssues = allIssues.filter(issue => {
            const issueStatus = issue.state?.name || 'Unknown';
            const issueAssignee = issue.assignee?.name || 'Unassigned';

            const statusMatch = selectedStatuses.size === 0 || selectedStatuses.has(issueStatus);
            const assigneeMatch = selectedAssignees.size === 0 || selectedAssignees.has(issueAssignee);

            return statusMatch && assigneeMatch;
        });

        console.log(`Applied filters: ${allIssues.length} -> ${filteredIssues.length} issues`);

        // Update filter dropdowns with new data (but preserve selections)
        populateFilters(allIssues);

        // Update table view
        const issuesToDisplay = filteredIssues.slice(0, DISPLAY_LIMIT);
        displayIssues(issuesToDisplay, filteredIssues.length);

        // Update mindmap view if it's currently active, preserving positioning and zoom
        const mindmapView = document.getElementById('interactive-mindmap-view');
        if (mindmapView && mindmapView.classList.contains('active')) {
            console.log('Updating mindmap with fresh data while preserving state');

            // Use the merge function to preserve positioning
            if (currentMindMapData && typeof updateMindMapWithFreshData === 'function') {
                console.log('Using merge function to preserve mindmap positioning');
                window.mindMapData = updateMindMapWithFreshData(allIssues, currentMindMapData, filteredIssues);
            } else {
                console.log('No existing mindmap data or merge function, creating fresh');
                window.mindMapData = null; // Reset to trigger fresh creation
            }

            // Restore zoom state
            if (currentZoomTransform) {
                console.log('Restoring zoom state');
                window.currentZoomTransform = currentZoomTransform;
            }

            // Re-initialize the mindmap
            initializeInteractiveMindMap(filteredIssues, allIssues);
        }

        console.log('Refresh completed successfully');

    } catch (error) {
        console.error('Error during refresh:', error);
        showError(`Failed to refresh issues: ${error.message}`);
    } finally {
        // Reset button state
        refreshButton.disabled = false;
        refreshButton.classList.remove('loading');
        refreshText.textContent = 'Refresh';
    }
}

// Close dropdowns when clicking outside
document.addEventListener('click', function(event) {
    if (!event.target.closest('.multi-select-dropdown')) {
        document.querySelectorAll('.multi-select-options').forEach(options => {
            options.style.display = 'none';
        });
        document.querySelectorAll('.multi-select-dropdown').forEach(dropdown => {
            dropdown.classList.remove('open');
        });
    }
});



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

// Function to toggle instructions visibility
function toggleInstructions() {
    const instructions = document.querySelector('.mindmap-instructions');
    instructions.classList.toggle('collapsed');
}

// Initialize page when DOM is loaded
document.addEventListener('DOMContentLoaded', initializePage);

