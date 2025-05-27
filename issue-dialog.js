// Issue Dialog Management
// Handles the modal dialog for editing issue details

let currentDialogNode = null;
let dialogSaveCallback = null;

// Open the issue dialog with a node
function openIssueDialog(node, onSave) {
    if (!node) return;
    
    currentDialogNode = node;
    dialogSaveCallback = onSave;
    
    // Populate form fields
    document.getElementById('issue-name').value = node.name || '';
    document.getElementById('issue-description').value = node.description || '';
    document.getElementById('issue-status').value = node.status || 'backlog';
    document.getElementById('issue-id-display').textContent = `#${node.id}`;
    
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
    
    const updates = {
        name: document.getElementById('issue-name').value,
        description: document.getElementById('issue-description').value,
        status: document.getElementById('issue-status').value
    };
    
    // Call the save callback
    dialogSaveCallback(updates);
    
    // Close dialog
    closeIssueDialog();
}

// Get status color for styling
function getStatusColor(status) {
    switch (status) {
        case 'done': return '#10B981'; // green
        case 'in-progress': return '#3B82F6'; // blue
        case 'backlog': return '#6B7280'; // gray
        default: return '#6B7280';
    }
}

// Get status display text
function getStatusDisplayText(status) {
    switch (status) {
        case 'in-progress': return 'In Progress';
        case 'backlog': return 'Backlog';
        case 'done': return 'Done';
        default: return 'Backlog';
    }
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
window.getStatusColor = getStatusColor;
window.getStatusDisplayText = getStatusDisplayText;
