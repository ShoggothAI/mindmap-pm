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

    console.log(`Converting ${issues.length} Linear issues to mind map structure`);

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

    // Create a map of issues by ID for quick lookup
    const issueMap = new Map();
    issues.forEach(issue => {
        issueMap.set(issue.id, issue);
    });

    // Group issues by team/project
    const projectGroups = new Map();
    const issuesWithoutTeam = [];

    issues.forEach(issue => {
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
