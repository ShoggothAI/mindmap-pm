// Global status color mapping
// This mapping is used consistently across mindmap nodes and filter dropdowns

const STATUS_COLOR_MAP = {
    // Todo - Sky Blue
    'todo': '#42A5F5',
    'new': '#42A5F5',
    'open': '#42A5F5',
    'unstarted': '#42A5F5',

    // Done - Soft Green
    'done': '#66BB6A',
    'completed': '#66BB6A',
    'complete': '#66BB6A',
    'closed': '#66BB6A',
    'resolved': '#66BB6A',

    // Backlog - Light Gray
    'backlog': '#BDBDBD',

    // In Progress - Amber
    'in progress': '#FFA726',
    'in-progress': '#FFA726',
    'inprogress': '#FFA726',
    'active': '#FFA726',
    'started': '#FFA726',
    'working': '#FFA726',

    // Canceled - Muted Red
    'canceled': '#EF5350',
    'cancelled': '#EF5350',
    'rejected': '#EF5350',
    'abandoned': '#EF5350',

    // In Review - Violet
    'in review': '#AB47BC',
    'in-review': '#AB47BC',
    'inreview': '#AB47BC',
    'review': '#AB47BC',
    'testing': '#AB47BC',
    'pending review': '#AB47BC',
    'pending-review': '#AB47BC',

    // Duplicate - Dark Gray Blue
    'duplicate': '#78909C',
    'duplicated': '#78909C',

    // Blocked/waiting states - use Amber (same as in progress)
    'blocked': '#FFA726',
    'waiting': '#FFA726',
    'on hold': '#FFA726',
    'paused': '#FFA726'
};

// Function to get color for a status
function getStatusColor(statusName) {
    console.log('🎨 getStatusColor called with:', statusName);

    if (!statusName) {
        console.log('🎨 No status name, returning default gray');
        return '#BDBDBD'; // Default to Light Gray (Backlog color)
    }

    const normalizedStatus = statusName.toLowerCase().trim();
    console.log('🎨 Normalized status:', normalizedStatus);
    console.log('🎨 Available keys in map:', Object.keys(STATUS_COLOR_MAP));

    // Direct match first
    if (STATUS_COLOR_MAP[normalizedStatus]) {
        console.log('🎨 Direct match found:', STATUS_COLOR_MAP[normalizedStatus]);
        return STATUS_COLOR_MAP[normalizedStatus];
    }

    // Partial match - check if status contains any of the keywords
    for (const [keyword, color] of Object.entries(STATUS_COLOR_MAP)) {
        if (normalizedStatus.includes(keyword)) {
            console.log('🎨 Partial match found:', keyword, '->', color);
            return color;
        }
    }

    // Default to Light Gray if no match found
    console.log('🎨 No match found, returning default gray');
    return '#BDBDBD';
}

// Export for use in other modules
window.STATUS_COLOR_MAP = STATUS_COLOR_MAP;
window.getStatusColor = getStatusColor;
