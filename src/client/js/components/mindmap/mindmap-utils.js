// Mind Map Data Structures and Utilities
// Converted from TypeScript to JavaScript

// MindMapNode interface equivalent
class MindMapNode {
    constructor(id, name, description = "", parentId = null, status = "backlog", children = []) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.parentId = parentId;
        this.status = status; // 'backlog' | 'in-progress' | 'done'
        this.children = children;
        this.collapsed = false;
    }
}

// Create sample mind map data
function createMindMapData() {
    return new MindMapNode(
        "root",
        "Project Root",
        "Main project container",
        null,
        "in-progress",
        [
            new MindMapNode(
                "1",
                "User Authentication",
                "Implement user login and registration system with email verification",
                "root",
                "done",
                [
                    new MindMapNode(
                        "1-1",
                        "Login Form",
                        "Create responsive login form with validation",
                        "1",
                        "done",
                        []
                    ),
                    new MindMapNode(
                        "1-2",
                        "Registration API",
                        "Backend API endpoint for user registration with email validation",
                        "1",
                        "in-progress",
                        [
                            new MindMapNode(
                                "1-2-1",
                                "Email Validation",
                                "Implement email verification service",
                                "1-2",
                                "backlog",
                                []
                            )
                        ]
                    ),
                    new MindMapNode(
                        "1-3",
                        "Password Reset",
                        "Allow users to reset their password via email",
                        "1",
                        "backlog",
                        [
                            new MindMapNode(
                                "1-3-1",
                                "Reset Flow UI",
                                "Design and implement password reset user interface",
                                "1-3",
                                "backlog",
                                [
                                    new MindMapNode(
                                        "1-3-1-1",
                                        "Email Input Form",
                                        "Create form for users to enter email for password reset",
                                        "1-3-1",
                                        "backlog",
                                        []
                                    )
                                ]
                            )
                        ]
                    )
                ]
            )
        ]
    );
}

// Add a child node to a parent
function addChildNode(parentNode, childName) {
    if (!parentNode.children) {
        parentNode.children = [];
    }
    
    const newChild = new MindMapNode(
        Date.now().toString(),
        childName,
        "",
        parentNode.id,
        "backlog",
        []
    );
    
    parentNode.children.push(newChild);
    return newChild;
}

// Update node name
function updateNodeName(node, newName) {
    node.name = newName;
}

// Update node with partial data
function updateNode(node, updates) {
    if (updates.name !== undefined) node.name = updates.name;
    if (updates.description !== undefined) node.description = updates.description;
    if (updates.status !== undefined) node.status = updates.status;
}

// Find a node by ID in the tree
function findNodeById(root, id) {
    if (root.id === id) return root;
    
    if (root.children) {
        for (const child of root.children) {
            const found = findNodeById(child, id);
            if (found) return found;
        }
    }
    
    return null;
}

// Toggle node collapsed state
function toggleNodeCollapsed(node) {
    if (node.children && node.children.length > 0) {
        node.collapsed = !node.collapsed;
    }
}

// Convert Linear issues to MindMapNode structure
function convertLinearIssuesToMindMap(issues) {
    if (!issues || issues.length === 0) {
        return createMindMapData(); // Return sample data if no issues
    }

    // Create a map of issues by ID for quick lookup
    const issueMap = new Map();
    const rootIssues = [];
    const childIssues = [];

    // First pass: categorize issues
    issues.forEach(issue => {
        issueMap.set(issue.id, issue);
        if (issue.parent?.id) {
            childIssues.push(issue);
        } else {
            rootIssues.push(issue);
        }
    });

    // Convert Linear status to our status format
    function convertStatus(linearState) {
        if (!linearState) return 'backlog';
        const stateName = linearState.name.toLowerCase();
        if (stateName.includes('done') || stateName.includes('completed')) {
            return 'done';
        } else if (stateName.includes('progress') || stateName.includes('active')) {
            return 'in-progress';
        } else {
            return 'backlog';
        }
    }

    // Convert a Linear issue to MindMapNode
    function convertIssue(issue, parentId = null) {
        return new MindMapNode(
            issue.id,
            issue.title || issue.identifier || 'Untitled Issue',
            issue.description || '',
            parentId,
            convertStatus(issue.state),
            []
        );
    }

    // If we have no clear hierarchy, create a simple structure
    if (rootIssues.length === 0 || rootIssues.length === issues.length) {
        const root = new MindMapNode(
            "root",
            "Linear Issues",
            "Issues from Linear workspace",
            null,
            "in-progress",
            []
        );

        // Add first 10 issues as direct children
        const limitedIssues = issues.slice(0, 10);
        limitedIssues.forEach(issue => {
            const mindMapNode = convertIssue(issue, "root");
            root.children.push(mindMapNode);
        });

        return root;
    }

    // Build hierarchy with actual parent-child relationships
    const root = new MindMapNode(
        "root",
        "Linear Issues",
        "Issues from Linear workspace",
        null,
        "in-progress",
        []
    );

    // Add root issues (limit to 5 to keep manageable)
    const limitedRoots = rootIssues.slice(0, 5);
    limitedRoots.forEach(rootIssue => {
        const rootNode = convertIssue(rootIssue, "root");
        
        // Add children recursively
        function addChildren(parentNode, parentIssueId) {
            const children = childIssues.filter(child => child.parent?.id === parentIssueId);
            children.slice(0, 5).forEach(childIssue => { // Limit children per parent
                const childNode = convertIssue(childIssue, parentNode.id);
                parentNode.children.push(childNode);
                addChildren(childNode, childIssue.id); // Recursive for grandchildren
            });
        }

        addChildren(rootNode, rootIssue.id);
        root.children.push(rootNode);
    });

    return root;
}

// Export functions for global use
window.MindMapNode = MindMapNode;
window.createMindMapData = createMindMapData;
window.addChildNode = addChildNode;
window.updateNodeName = updateNodeName;
window.updateNode = updateNode;
window.findNodeById = findNodeById;
window.toggleNodeCollapsed = toggleNodeCollapsed;
window.convertLinearIssuesToMindMap = convertLinearIssuesToMindMap;
