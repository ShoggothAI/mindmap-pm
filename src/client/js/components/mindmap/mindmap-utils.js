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
        // Custom positioning properties
        this.x = null; // Absolute X position (null means use auto-layout)
        this.y = null; // Absolute Y position (null means use auto-layout)
        this.hasCustomPosition = false; // Flag to track if node has been manually positioned
        // Relative positioning properties (relative to parent)
        this.relativeX = null; // X position relative to parent
        this.relativeY = null; // Y position relative to parent
        this.hasRelativePosition = false; // Flag to track if relative position is stored
        // Filtering properties
        this.isFiltered = true; // Whether this node matches the current filter
        this.isGreyedOut = false; // Whether this node should be shown greyed out
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

    // Note: Positioning will be handled by the D3 rendering layer using the same logic as initial layout

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

// Set custom position for a node
function setNodeCustomPosition(node, x, y) {
    node.x = x;
    node.y = y;
    node.hasCustomPosition = true;
}

// Clear custom position for a node (revert to auto-layout)
function clearNodeCustomPosition(node) {
    node.x = null;
    node.y = null;
    node.hasCustomPosition = false;
}

// Check if a node has a custom position
function hasCustomPosition(node) {
    return node.hasCustomPosition && node.x !== null && node.y !== null;
}

// Set relative position for a node (relative to its parent)
function setNodeRelativePosition(node, relativeX, relativeY) {
    node.relativeX = relativeX;
    node.relativeY = relativeY;
    node.hasRelativePosition = true;
}

// Calculate absolute position from relative position
function calculateAbsolutePosition(node, parentAbsoluteX, parentAbsoluteY) {
    if (node.hasRelativePosition && node.relativeX !== null && node.relativeY !== null) {
        return {
            x: parentAbsoluteX + node.relativeX,
            y: parentAbsoluteY + node.relativeY
        };
    }
    return null;
}

// Store current absolute position as relative to parent
function storeCurrentPositionAsRelative(node, nodeAbsoluteX, nodeAbsoluteY, parentAbsoluteX, parentAbsoluteY) {
    const relativeX = nodeAbsoluteX - parentAbsoluteX;
    const relativeY = nodeAbsoluteY - parentAbsoluteY;
    setNodeRelativePosition(node, relativeX, relativeY);
}

// Check if a node has a relative position
function hasRelativePosition(node) {
    return node.hasRelativePosition && node.relativeX !== null && node.relativeY !== null;
}

// Convert Linear issues to MindMapNode structure
// filteredIssues: the issues that match the current filter
// allIssues: all available issues (used to find missing parents)
function convertLinearIssuesToMindMap(filteredIssues, allIssues = null) {
    if (!filteredIssues || filteredIssues.length === 0) {
        return createMindMapData(); // Return sample data if no issues
    }

    // If allIssues not provided, use filteredIssues (backward compatibility)
    if (!allIssues) {
        allIssues = filteredIssues;
    }

    console.log(`Converting ${filteredIssues.length} filtered issues to mind map structure`);
    console.log('Filtered issues:', filteredIssues.map(issue => ({
        id: issue.id,
        title: issue.title,
        identifier: issue.identifier,
        team: issue.team?.name,
        parent: issue.parent?.id ? { id: issue.parent.id, title: issue.parent.title } : null
    })));

    // Create sets for quick lookup
    const filteredIssueIds = new Set(filteredIssues.map(issue => issue.id));
    const allIssuesMap = new Map(allIssues.map(issue => [issue.id, issue]));

    // Find missing parent issues that need to be included (greyed out)
    const missingParents = new Set();

    function findMissingParentsRecursive(issue) {
        if (issue.parent?.id && !filteredIssueIds.has(issue.parent.id)) {
            const parentIssue = allIssuesMap.get(issue.parent.id);
            if (parentIssue && !missingParents.has(issue.parent.id)) {
                missingParents.add(issue.parent.id);
                // Recursively check if this parent also has missing parents
                findMissingParentsRecursive(parentIssue);
            }
        }
    }

    // Find all missing parents
    filteredIssues.forEach(findMissingParentsRecursive);

    console.log(`Found ${missingParents.size} missing parent issues:`, Array.from(missingParents));

    // Combine filtered issues with missing parents
    const issuesToProcess = [...filteredIssues];
    missingParents.forEach(parentId => {
        const parentIssue = allIssuesMap.get(parentId);
        if (parentIssue) {
            issuesToProcess.push(parentIssue);
        }
    });

    console.log(`Processing ${issuesToProcess.length} total issues (${filteredIssues.length} filtered + ${missingParents.size} parents)`);

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
        const node = new MindMapNode(
            issue.id,
            issue.title || issue.identifier || 'Untitled Issue',
            issue.description || '',
            parentId,
            convertStatus(issue.state),
            []
        );

        // Mark whether this issue is filtered (visible) or greyed out (parent only)
        node.isFiltered = filteredIssueIds.has(issue.id);
        node.isGreyedOut = !node.isFiltered;

        return node;
    }

    // Create a map of issues by ID for quick lookup
    const issueMap = new Map();
    issuesToProcess.forEach(issue => {
        issueMap.set(issue.id, issue);
    });

    // Group issues by team/project
    const projectGroups = new Map();
    const issuesWithoutTeam = [];

    issuesToProcess.forEach(issue => {
        const teamName = issue.team?.name || issue.team?.key;
        if (teamName) {
            if (!projectGroups.has(teamName)) {
                projectGroups.set(teamName, []);
            }
            projectGroups.get(teamName).push(issue);
        } else {
            issuesWithoutTeam.push(issue);
        }
    });

    console.log(`Found ${projectGroups.size} teams/projects:`, Array.from(projectGroups.keys()));
    console.log(`Found ${issuesWithoutTeam.length} issues without team assignment`);

    // Create the root node
    const root = new MindMapNode(
        "root",
        "Linear Workspace",
        "Projects and issues from Linear workspace",
        null,
        "in-progress",
        []
    );

    // Helper function to add children recursively
    function addChildren(parentNode, parentIssueId, allIssues) {
        const children = allIssues.filter(issue => issue.parent?.id === parentIssueId);
        children.forEach(childIssue => {
            const childNode = convertIssue(childIssue, parentNode.id);
            parentNode.children.push(childNode);
            // Recursively add grandchildren
            addChildren(childNode, childIssue.id, allIssues);
        });
    }

    // Process each project/team
    projectGroups.forEach((teamIssues, teamName) => {
        // Create project node
        const projectNode = new MindMapNode(
            `project-${teamName}`,
            teamName,
            `Issues from ${teamName} team`,
            "root",
            "in-progress",
            []
        );

        // Find issues without parent (root issues for this team)
        const rootIssuesForTeam = teamIssues.filter(issue => !issue.parent?.id);

        console.log(`Team ${teamName}: ${teamIssues.length} total issues, ${rootIssuesForTeam.length} root issues`);
        console.log(`Root issues for ${teamName}:`, rootIssuesForTeam.map(issue => ({
            id: issue.id,
            title: issue.title,
            identifier: issue.identifier
        })));
        console.log(`Child issues for ${teamName}:`, teamIssues.filter(issue => issue.parent?.id).map(issue => ({
            id: issue.id,
            title: issue.title,
            identifier: issue.identifier,
            parent: issue.parent.id
        })));

        // Add root issues as children of the project node
        rootIssuesForTeam.forEach(rootIssue => {
            const issueNode = convertIssue(rootIssue, projectNode.id);
            projectNode.children.push(issueNode);
            // Add children recursively
            addChildren(issueNode, rootIssue.id, teamIssues);
        });

        root.children.push(projectNode);
    });

    // Handle issues without team assignment
    if (issuesWithoutTeam.length > 0) {
        const unassignedNode = new MindMapNode(
            "project-unassigned",
            "Unassigned Issues",
            "Issues without team assignment",
            "root",
            "backlog",
            []
        );

        // Find root issues (without parent) among unassigned issues
        const rootUnassignedIssues = issuesWithoutTeam.filter(issue => !issue.parent?.id);

        console.log(`Unassigned: ${issuesWithoutTeam.length} total issues, ${rootUnassignedIssues.length} root issues`);

        // Add root issues as children of the unassigned node
        rootUnassignedIssues.forEach(rootIssue => {
            const issueNode = convertIssue(rootIssue, unassignedNode.id);
            unassignedNode.children.push(issueNode);
            // Add children recursively
            addChildren(issueNode, rootIssue.id, issuesWithoutTeam);
        });

        root.children.push(unassignedNode);
    }

    console.log(`Created mind map with ${root.children.length} project nodes`);
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
