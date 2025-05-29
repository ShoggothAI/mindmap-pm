// Issue Dialog Management
// Handles the modal dialog for editing issue details

let currentDialogNode = null;
let dialogSaveCallback = null;

// Function to populate status dropdown with actual Linear states
function populateStatusDropdown(node) {
    const statusSelect = document.getElementById('issue-status');
    const statusDropdown = document.getElementById('status-dropdown');
    const teamId = node.teamId;

    // Clear existing options
    statusSelect.innerHTML = '';
    statusDropdown.innerHTML = '';

    let statesToUse = [];

    if (teamId && typeof getLinearStatesForTeam === 'function') {
        const teamStates = getLinearStatesForTeam(teamId);

        if (teamStates && teamStates.length > 0) {
            // Use actual Linear states
            statesToUse = teamStates.map(state => ({ name: state.name }));
            console.log(`Populated status dropdown with ${teamStates.length} Linear states for team ${teamId}`);
        }
    }

    // Fallback to default options if no Linear states available
    if (statesToUse.length === 0) {
        console.log('Using fallback status options');
        statesToUse = [
            { name: 'Backlog' },
            { name: 'Todo' },
            { name: 'In Progress' },
            { name: 'In Review' },
            { name: 'Done' },
            { name: 'Cancelled' },
            { name: 'Duplicate' }
        ];
    }

    // Populate both the hidden select and custom dropdown
    statesToUse.forEach(state => {
        // Hidden select option
        const option = document.createElement('option');
        option.value = state.name;
        option.textContent = state.name;
        statusSelect.appendChild(option);

        // Custom dropdown option
        const statusOption = document.createElement('div');
        statusOption.className = 'status-option';
        statusOption.setAttribute('data-value', state.name);

        const statusPill = document.createElement('span');
        statusPill.className = 'status-pill';
        statusPill.textContent = state.name;

        // Apply status colors
        const statusColor = getStatusColor(state.name);
        statusPill.style.backgroundColor = statusColor + '20'; // 20 for transparency
        statusPill.style.color = statusColor;
        statusPill.style.borderColor = statusColor + '40'; // 40 for border transparency

        statusOption.appendChild(statusPill);
        statusDropdown.appendChild(statusOption);
    });

    // Initialize custom dropdown functionality
    initializeCustomStatusDropdown();

    return statesToUse.length > 0;
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
    let statusToSet = node.status;
    if (!statusToSet) {
        statusToSet = 'Backlog'; // Default to Backlog
    }

    console.log('Node status:', node.status, 'Setting status to:', statusToSet);

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

    // Update issue ID displays
    document.getElementById('issue-id-display').textContent = node.id;
    document.getElementById('issue-id-readonly').textContent = node.id;

    // Show/hide parent ID section
    const parentIdSection = document.getElementById('parent-id-section');
    const parentIdField = document.getElementById('issue-parent-id');
    if (node.parentId) {
        parentIdField.textContent = node.parentId;
        parentIdSection.style.display = 'block';
    } else {
        parentIdSection.style.display = 'none';
    }

    // Set the custom dropdown selected value
    setCustomDropdownValue(statusToSet);

    // Initialize and update assignee display
    initializeAssigneeDropdown();
    updateAssigneeDisplay();

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
        teamField.textContent = teamValue;
    }

    if (teamIdField) {
        // Handle different node types and fallback values
        let teamIdValue = 'No team ID';
        if (node.teamId) {
            teamIdValue = node.teamId;
        } else if (node.nodeType === 'team') {
            teamIdValue = node.id;
        }
        teamIdField.textContent = teamIdValue;
    }

    if (projectField) {
        // Handle different node types and fallback values
        let projectValue = 'No project assigned';
        if (node.projectName) {
            projectValue = node.projectName;
        } else if (node.nodeType === 'project') {
            projectValue = node.name;
        }
        projectField.textContent = projectValue;
    }

    if (projectIdField) {
        // Handle different node types and fallback values
        let projectIdValue = 'No project ID';
        if (node.projectId) {
            projectIdValue = node.projectId;
        } else if (node.nodeType === 'project') {
            projectIdValue = node.id;
        }
        projectIdField.textContent = projectIdValue;
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

// Add event listener for assignee changes
function initializeAssigneeDropdown() {
    const assigneeSelect = document.getElementById('issue-assignee');
    if (assigneeSelect) {
        assigneeSelect.addEventListener('change', function() {
            updateAssigneeDisplay();
        });
    }
}

// Update assignee display
function updateAssigneeDisplay() {
    const assigneeSelect = document.getElementById('issue-assignee');
    const assigneeAvatar = document.getElementById('assignee-avatar');
    const assigneeName = document.getElementById('assignee-name');

    if (!assigneeSelect || !assigneeAvatar || !assigneeName) return;

    const selectedAssigneeId = assigneeSelect.value;

    if (selectedAssigneeId && typeof getLinearUserById === 'function') {
        const user = getLinearUserById(selectedAssigneeId);
        if (user) {
            const displayName = user.displayName || user.name;
            assigneeAvatar.textContent = displayName.charAt(0).toUpperCase();
            assigneeName.textContent = displayName;
            return;
        }
    }

    // Default to unassigned
    assigneeAvatar.textContent = 'U';
    assigneeName.textContent = 'Unassigned';
}

// Initialize custom status dropdown functionality
function initializeCustomStatusDropdown() {
    const trigger = document.getElementById('status-select-trigger');
    const dropdown = document.getElementById('status-dropdown');
    const hiddenSelect = document.getElementById('issue-status');

    if (!trigger || !dropdown || !hiddenSelect) return;

    // Toggle dropdown on trigger click
    trigger.addEventListener('click', function(e) {
        e.stopPropagation();
        const isOpen = !dropdown.classList.contains('hidden');

        if (isOpen) {
            dropdown.classList.add('hidden');
            trigger.classList.remove('open');
        } else {
            dropdown.classList.remove('hidden');
            trigger.classList.add('open');
        }
    });

    // Handle option selection
    dropdown.addEventListener('click', function(e) {
        const statusOption = e.target.closest('.status-option');
        if (statusOption) {
            const value = statusOption.getAttribute('data-value');
            setCustomDropdownValue(value);
            dropdown.classList.add('hidden');
            trigger.classList.remove('open');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', function(e) {
        if (!trigger.contains(e.target) && !dropdown.contains(e.target)) {
            dropdown.classList.add('hidden');
            trigger.classList.remove('open');
        }
    });
}

// Set the selected value in the custom dropdown
function setCustomDropdownValue(value) {
    const hiddenSelect = document.getElementById('issue-status');
    const selectedBadge = document.getElementById('status-selected-badge');
    const dropdown = document.getElementById('status-dropdown');

    if (!hiddenSelect || !selectedBadge || !dropdown) return;

    console.log('Setting custom dropdown value to:', value);

    // Update hidden select
    hiddenSelect.value = value;

    // Update selected badge
    const statusText = getStatusDisplayText(value);
    selectedBadge.textContent = statusText;

    // Apply status colors to selected badge
    const statusColor = getStatusColor(value);
    selectedBadge.style.backgroundColor = statusColor + '20'; // 20 for transparency
    selectedBadge.style.color = statusColor;
    selectedBadge.style.borderColor = statusColor + '40'; // 40 for border transparency

    console.log('Applied color:', statusColor, 'to badge for status:', value);

    // Update selected state in dropdown options
    const options = dropdown.querySelectorAll('.status-option');
    options.forEach(option => {
        const optionValue = option.getAttribute('data-value');
        if (optionValue === value) {
            option.classList.add('selected');
            console.log('Marked option as selected:', optionValue);
        } else {
            option.classList.remove('selected');
        }
    });
}

// Get status display text
function getStatusDisplayText(status) {
    if (!status) return 'Backlog';

    // Handle both exact matches and normalized matches
    const statusMap = {
        'Backlog': 'Backlog',
        'Todo': 'Todo',
        'In Progress': 'In Progress',
        'In Review': 'In Review',
        'Done': 'Done',
        'Cancelled': 'Cancelled',
        'Duplicate': 'Duplicate',
        // Also handle lowercase versions
        'backlog': 'Backlog',
        'todo': 'Todo',
        'in-progress': 'In Progress',
        'in-review': 'In Review',
        'done': 'Done',
        'cancelled': 'Cancelled',
        'duplicate': 'Duplicate'
    };

    return statusMap[status] || status || 'Backlog';
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
