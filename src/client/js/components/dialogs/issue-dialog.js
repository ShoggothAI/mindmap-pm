// Issue Dialog Management
// Handles the modal dialog for editing issue details

let currentDialogNode = null;
let dialogSaveCallback = null;

// Function to populate status dropdown with actual Linear states
function populateStatusDropdown(node) {
    const statusSelect = document.getElementById('issue-status');
    const teamId = node.teamId;

    // Clear existing options
    statusSelect.innerHTML = '';

    if (teamId && typeof getLinearStatesForTeam === 'function') {
        const teamStates = getLinearStatesForTeam(teamId);

        if (teamStates && teamStates.length > 0) {
            // Populate with actual Linear states
            teamStates.forEach(state => {
                const option = document.createElement('option');
                option.value = state.name;
                option.textContent = state.name;
                statusSelect.appendChild(option);
            });

            console.log(`Populated status dropdown with ${teamStates.length} Linear states for team ${teamId}`);
            return true;
        }
    }

    // Fallback to default options if no Linear states available
    console.log('Using fallback status options');
    const defaultStates = [
        { name: 'Backlog' },
        { name: 'Todo' },
        { name: 'In Progress' },
        { name: 'In Review' },
        { name: 'Done' },
        { name: 'Cancelled' },
        { name: 'Duplicate' }
    ];

    defaultStates.forEach(state => {
        const option = document.createElement('option');
        option.value = state.name;
        option.textContent = state.name;
        statusSelect.appendChild(option);
    });

    return false;
}

// Function to populate assignee dropdown with Linear users
function populateAssigneeDropdown() {
    const assigneeSelect = document.getElementById('issue-assignee');

    // Clear existing options except "No assignee"
    assigneeSelect.innerHTML = '<option value="">No assignee</option>';

    if (typeof getAllLinearUsers === 'function') {
        const users = getAllLinearUsers();

        if (users && users.length > 0) {
            // Sort users by display name
            users.sort((a, b) => (a.displayName || a.name).localeCompare(b.displayName || b.name));

            // Populate with Linear users
            users.forEach(user => {
                const option = document.createElement('option');
                option.value = user.id;
                option.textContent = `${user.displayName || user.name}${user.email ? ` (${user.email})` : ''}`;
                assigneeSelect.appendChild(option);
            });

            console.log(`Populated assignee dropdown with ${users.length} Linear users`);
            return true;
        }
    }

    console.log('No Linear users available for assignee dropdown');
    return false;
}

// Open the issue dialog with a node
function openIssueDialog(node, onSave) {
    if (!node) return;

    currentDialogNode = node;
    dialogSaveCallback = onSave;

    // Populate status dropdown with actual Linear states first
    populateStatusDropdown(node);

    // Populate assignee dropdown with Linear users
    populateAssigneeDropdown();

    // Populate form fields
    document.getElementById('issue-name').value = node.name || '';
    document.getElementById('issue-description').value = node.description || '';

    // Set status - use node's status, fallback to "Backlog" if it exists, otherwise leave unselected
    const statusSelect = document.getElementById('issue-status');
    let statusToSet = node.status;
    if (!statusToSet) {
        // Check if "Backlog" is available in the dropdown
        const backlogOption = Array.from(statusSelect.options).find(option => option.value === 'Backlog');
        statusToSet = backlogOption ? 'Backlog' : '';
    }
    statusSelect.value = statusToSet;

    // Set assignee - try to match by assignee ID first, then by name
    const assigneeSelect = document.getElementById('issue-assignee');
    let assigneeToSet = '';

    if (node.assigneeId) {
        // Try to find by ID first
        assigneeToSet = node.assigneeId;
    } else if (node.assigneeName) {
        // Try to find by name if no ID available
        if (typeof getLinearUserByName === 'function') {
            const user = getLinearUserByName(node.assigneeName);
            if (user) {
                assigneeToSet = user.id;
            }
        }
    }

    assigneeSelect.value = assigneeToSet;
    document.getElementById('issue-id-display').textContent = `#${node.id}`;

    // Apply status colors to the select dropdown
    applyStatusColorsToSelect();

    // Populate project information fields (read-only)
    const teamField = document.getElementById('issue-team');
    const teamIdField = document.getElementById('issue-team-id');
    const projectField = document.getElementById('issue-project');
    const projectIdField = document.getElementById('issue-project-id');

    if (teamField) {
        // Handle different node types and fallback values
        let teamValue = 'No team assigned';
        if (node.teamName) {
            teamValue = node.teamName;
        } else if (node.nodeType === 'team') {
            teamValue = node.name;
        }
        teamField.value = teamValue;
    }

    if (teamIdField) {
        // Handle different node types and fallback values
        let teamIdValue = 'No team ID';
        if (node.teamId) {
            teamIdValue = node.teamId;
        } else if (node.nodeType === 'team') {
            teamIdValue = node.id;
        }
        teamIdField.value = teamIdValue;
    }

    if (projectField) {
        // Handle different node types and fallback values
        let projectValue = 'No project assigned';
        if (node.projectName) {
            projectValue = node.projectName;
        } else if (node.nodeType === 'project') {
            projectValue = node.name;
        }
        projectField.value = projectValue;
    }

    if (projectIdField) {
        // Handle different node types and fallback values
        let projectIdValue = 'No project ID';
        if (node.projectId) {
            projectIdValue = node.projectId;
        } else if (node.nodeType === 'project') {
            projectIdValue = node.id;
        }
        projectIdField.value = projectIdValue;
    }

    // Show dialog
    const dialog = document.getElementById('issue-dialog');
    dialog.classList.remove('hidden');

    // Focus on name field
    document.getElementById('issue-name').focus();
    document.getElementById('issue-name').select();
}

// Close the issue dialog
function closeIssueDialog() {
    const dialog = document.getElementById('issue-dialog');
    dialog.classList.add('hidden');
    currentDialogNode = null;
    dialogSaveCallback = null;
}

// Save the issue dialog changes
function saveIssueDialog() {
    if (!currentDialogNode || !dialogSaveCallback) return;

    // Get assignee information
    const assigneeId = document.getElementById('issue-assignee').value;
    let assigneeName = '';

    if (assigneeId && typeof getLinearUserById === 'function') {
        const user = getLinearUserById(assigneeId);
        if (user) {
            assigneeName = user.displayName || user.name;
        }
    }

    const updates = {
        name: document.getElementById('issue-name').value,
        description: document.getElementById('issue-description').value,
        status: document.getElementById('issue-status').value,
        assigneeId: assigneeId,
        assigneeName: assigneeName
    };

    // Call the save callback
    dialogSaveCallback(updates);

    // Close dialog
    closeIssueDialog();
}

// Status colors are now handled by the global color map in status-colors.js

// Apply status colors to the select dropdown
function applyStatusColorsToSelect() {
    const statusSelect = document.getElementById('issue-status');
    if (!statusSelect) return;

    // Apply colors to each option
    Array.from(statusSelect.options).forEach(option => {
        const statusValue = option.value;
        const statusColor = getStatusColor(statusValue);

        // Set the option's style
        option.style.backgroundColor = statusColor + '20'; // 20 for transparency
        option.style.borderLeft = `4px solid ${statusColor}`;
        option.style.paddingLeft = '8px';
    });

    // Update select background when value changes
    statusSelect.addEventListener('change', function() {
        const selectedColor = getStatusColor(this.value);
        this.style.backgroundColor = selectedColor + '20';
        this.style.borderLeft = `4px solid ${selectedColor}`;
    });

    // Set initial color
    const initialColor = getStatusColor(statusSelect.value);
    statusSelect.style.backgroundColor = initialColor + '20';
    statusSelect.style.borderLeft = `4px solid ${initialColor}`;
}

// Get status display text
function getStatusDisplayText(status) {
    const statusMap = {
        'backlog': 'Backlog',
        'todo': 'Todo',
        'in-progress': 'In Progress',
        'in-review': 'In Review',
        'done': 'Done',
        'cancelled': 'Cancelled',
        'duplicate': 'Duplicate'
    };
    return statusMap[status] || 'Backlog';
}

// Handle keyboard events for dialog
document.addEventListener('keydown', function(event) {
    const dialog = document.getElementById('issue-dialog');
    if (!dialog.classList.contains('hidden')) {
        if (event.key === 'Escape') {
            closeIssueDialog();
        } else if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            saveIssueDialog();
        }
    }
});

// Handle clicking outside dialog to close
document.getElementById('issue-dialog').addEventListener('click', function(event) {
    if (event.target === this) {
        closeIssueDialog();
    }
});

// Prevent dialog content clicks from closing dialog
document.querySelector('.dialog-content').addEventListener('click', function(event) {
    event.stopPropagation();
});

// Export functions for global use
window.openIssueDialog = openIssueDialog;
window.closeIssueDialog = closeIssueDialog;
window.saveIssueDialog = saveIssueDialog;
window.getStatusDisplayText = getStatusDisplayText;
// Note: getStatusColor is now provided by status-colors.js
