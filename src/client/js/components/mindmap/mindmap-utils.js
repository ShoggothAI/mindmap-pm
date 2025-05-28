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
        // Node type and project information
        this.nodeType = null; // 'team' | 'project' | 'issue'
        this.teamName = null; // Team name for team and project nodes
        this.projectName = null; // Project name for project nodes and issues with projects
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

// Add a child node to a parent (local only - for backward compatibility)
function addChildNode(parentNode, childName) {
    if (!parentNode.children) {
        parentNode.children = [];
    }

    const newChild = new MindMapNode(
        Date.now().toString(),
        childName,
        "",
        parentNode.id,
        "Backlog",
        []
    );

    // Set node type and inherit project information from parent
    newChild.nodeType = 'issue'; // New nodes are always issues
    updateNodeProjectInfo(newChild, parentNode);

    // Note: Positioning will be handled by the D3 rendering layer using the same logic as initial layout

    parentNode.children.push(newChild);
    return newChild;
}

// Add a child node and create corresponding Linear issue
async function addChildNodeWithLinearSync(parentNode, issueData) {
    // Validate that we have the required team information
    if (!parentNode.teamId && parentNode.nodeType !== 'team' && parentNode.nodeType !== 'project') {
        throw new Error('Cannot create issue: No team information available');
    }

    // Get team ID from parent or parent's team info
    let teamId = parentNode.teamId;
    if (parentNode.nodeType === 'team') {
        teamId = parentNode.teamId || parentNode.id.replace('team-', '');
    }

    if (!teamId) {
        throw new Error('Cannot create issue: No team ID available');
    }

    // Prepare Linear issue data
    const linearIssueData = {
        teamId: teamId,
        title: issueData.name || issueData.title || 'New Issue',
        description: issueData.description || '',
        parentId: null, // Will be set if parent is an issue
        projectId: parentNode.projectId || null,
        stateId: null // Will be set below if we have a valid status
    };

    // Try to set state ID - prefer provided status, fallback to "Backlog", or leave null
    let statusToUse = issueData.status;
    if (!statusToUse) {
        // Check if "Backlog" is a valid state for this team
        const teamStates = getLinearStatesForTeam(teamId);
        const hasBacklog = teamStates && teamStates.some(state => state.name === 'Backlog');
        statusToUse = hasBacklog ? 'Backlog' : null;
    }

    if (statusToUse) {
        const stateId = getLinearStateIdFromStatus(statusToUse, teamId);
        if (stateId) {
            linearIssueData.stateId = stateId;
        }
    }

    // Set parent ID if the parent is an issue (not team or project)
    if (parentNode.nodeType === 'issue') {
        linearIssueData.parentId = parentNode.id;
    }

    console.log('Creating Linear issue with data:', linearIssueData);

    try {
        // Create the issue in Linear first
        const createdIssue = await createLinearIssue(linearIssueData);

        // Create the mindmap node with the Linear issue ID
        if (!parentNode.children) {
            parentNode.children = [];
        }

        const newChild = new MindMapNode(
            createdIssue.id, // Use the Linear issue ID
            createdIssue.title,
            createdIssue.description || '',
            parentNode.id,
            convertLinearStateToStatus(createdIssue.state),
            []
        );

        // Set node type and project information from the created issue
        newChild.nodeType = 'issue';
        newChild.teamId = createdIssue.team?.id || teamId;
        newChild.teamName = createdIssue.team?.name || parentNode.teamName;
        newChild.projectId = createdIssue.project?.id || parentNode.projectId;
        newChild.projectName = createdIssue.project?.name || parentNode.projectName;

        parentNode.children.push(newChild);

        console.log('Successfully created mindmap node with Linear issue:', newChild);
        return newChild;

    } catch (error) {
        console.error('Failed to create Linear issue:', error);
        // Fall back to creating a local-only node
        console.log('Falling back to local-only node creation');
        return addChildNode(parentNode, linearIssueData.title);
    }
}

// Helper function to get Linear state name (no conversion, use exact name)
function convertLinearStateToStatus(linearState) {
    if (!linearState) return 'Backlog'; // Default fallback
    return linearState.name; // Use exact Linear state name
}

// Update node name
function updateNodeName(node, newName) {
    node.name = newName;
}

// Update node with partial data (local only)
function updateNode(node, updates) {
    if (updates.name !== undefined) node.name = updates.name;
    if (updates.description !== undefined) node.description = updates.description;
    if (updates.status !== undefined) node.status = updates.status;
    if (updates.assigneeId !== undefined) node.assigneeId = updates.assigneeId;
    if (updates.assigneeName !== undefined) node.assigneeName = updates.assigneeName;
}

// Update node and sync changes to Linear
async function updateNodeWithLinearSync(node, updates) {
    // Only sync if this is an actual issue node (not team/project)
    if (node.nodeType !== 'issue') {
        console.log('Not syncing to Linear: node is not an issue type');
        updateNode(node, updates);
        return true;
    }

    try {
        // Prepare Linear update data
        const linearUpdateData = {};

        if (updates.name !== undefined) {
            linearUpdateData.title = updates.name;
        }
        if (updates.description !== undefined) {
            linearUpdateData.description = updates.description;
        }
        if (updates.status !== undefined) {
            // Get Linear state ID for exact status name
            const stateId = getLinearStateIdFromStatus(updates.status, node.teamId);
            if (stateId) {
                linearUpdateData.stateId = stateId;
            }
        }
        if (updates.assigneeId !== undefined) {
            linearUpdateData.assigneeId = updates.assigneeId;
        }

        console.log('Updating Linear issue with data:', linearUpdateData);

        // Update in Linear first
        const updatedIssue = await updateLinearIssue(node.id, linearUpdateData);

        // If Linear update succeeds, update the mindmap locally
        updateNode(node, updates);

        console.log('Successfully updated issue in Linear and mindmap');
        return true;

    } catch (error) {
        console.error('Failed to update issue in Linear:', error);

        // Ask user if they want to update locally anyway
        const updateLocally = confirm(
            `Failed to update issue in Linear: ${error.message}\n\n` +
            'Do you want to update it in the mindmap anyway? ' +
            '(This will create a mismatch between Linear and the mindmap)'
        );

        if (updateLocally) {
            updateNode(node, updates);
        }

        return updateLocally;
    }
}

// Delete a node with Linear sync
async function deleteNodeWithLinearSync(nodeToDelete, rootNode) {
    // Check if this is a team or project node
    if (nodeToDelete.nodeType === 'team' || nodeToDelete.nodeType === 'project') {
        // Show warning popup and do nothing
        const nodeTypeName = nodeToDelete.nodeType === 'team' ? 'Team' : 'Project';
        alert(`Warning: Cannot delete ${nodeTypeName} nodes. Only issue nodes can be deleted.`);
        return false;
    }

    // Only delete issue nodes
    if (nodeToDelete.nodeType !== 'issue') {
        console.log('Skipping deletion of non-issue node:', nodeToDelete.nodeType);
        return false;
    }

    try {
        // Delete from Linear first
        console.log('Deleting Linear issue:', nodeToDelete.id);
        await deleteLinearIssue(nodeToDelete.id);

        // If Linear deletion succeeds, remove from mindmap
        const deleted = deleteNodeFromTree(nodeToDelete.id, rootNode);

        if (deleted) {
            console.log('Successfully deleted node from both Linear and mindmap');
        } else {
            console.warn('Node was deleted from Linear but not found in mindmap tree');
        }

        return deleted;

    } catch (error) {
        console.error('Failed to delete Linear issue:', error);

        // Ask user if they want to delete locally anyway
        const deleteLocally = confirm(
            `Failed to delete issue from Linear: ${error.message}\n\n` +
            'Do you want to delete it from the mindmap anyway? ' +
            '(This will create a mismatch between Linear and the mindmap)'
        );

        if (deleteLocally) {
            return deleteNodeFromTree(nodeToDelete.id, rootNode);
        }

        return false;
    }
}

// Helper function to delete a node from the tree structure
function deleteNodeFromTree(nodeId, rootNode) {
    function deleteFromParent(node) {
        if (node.children) {
            const childIndex = node.children.findIndex(child => child.id === nodeId);
            if (childIndex !== -1) {
                node.children.splice(childIndex, 1);
                return true;
            }
            for (const child of node.children) {
                if (deleteFromParent(child)) return true;
            }
        }
        return false;
    }

    return deleteFromParent(rootNode);
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

// Get project information from a parent node
function getProjectInfoFromParent(parentNode) {
    if (!parentNode) {
        return { teamId: null, teamName: null, projectName: null, projectId: null };
    }

    if (parentNode.nodeType === 'team') {
        // Parent is a team node - no project
        return { teamId: parentNode.teamId, teamName: parentNode.teamName, projectName: null, projectId: null };
    } else if (parentNode.nodeType === 'project') {
        // Parent is a project node - inherit team and project
        return { teamId: parentNode.teamId, teamName: parentNode.teamName, projectName: parentNode.projectName, projectId: parentNode.projectId };
    } else if (parentNode.nodeType === 'issue') {
        // Parent is an issue - inherit its project info
        return { teamId: parentNode.teamId, teamName: parentNode.teamName, projectName: parentNode.projectName, projectId: parentNode.projectId };
    }

    return { teamId: null, teamName: null, projectName: null, projectId: null };
}

// Update node project information based on new parent
function updateNodeProjectInfo(node, newParent) {
    const projectInfo = getProjectInfoFromParent(newParent);
    node.teamId = projectInfo.teamId;
    node.teamName = projectInfo.teamName;
    node.projectName = projectInfo.projectName;
    node.projectId = projectInfo.projectId;
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

    // Use exact Linear status name (no conversion)
    function convertStatus(linearState) {
        if (!linearState) return 'Backlog'; // Default fallback
        return linearState.name; // Use exact Linear state name
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

        // Set node type and project information
        node.nodeType = 'issue';
        node.teamId = issue.team?.id || null;
        node.teamName = issue.team?.name || issue.team?.key || null;
        node.projectName = issue.project?.name || null;
        node.projectId = issue.project?.id || null;

        // Set assignee information
        node.assigneeId = issue.assignee?.id || null;
        node.assigneeName = issue.assignee?.name || null;
        node.assigneeEmail = issue.assignee?.email || null;

        return node;
    }

    // Create a map of issues by ID for quick lookup
    const issueMap = new Map();
    issuesToProcess.forEach(issue => {
        issueMap.set(issue.id, issue);
    });

    // Group issues by team
    const teamGroups = new Map();
    const issuesWithoutTeam = [];

    issuesToProcess.forEach(issue => {
        const teamId = issue.team?.id;
        const teamName = issue.team?.name || issue.team?.key;
        if (teamId && teamName) {
            // Use teamId as the key to ensure uniqueness
            if (!teamGroups.has(teamId)) {
                teamGroups.set(teamId, {
                    teamId: teamId,
                    teamName: teamName,
                    issues: []
                });
            }
            teamGroups.get(teamId).issues.push(issue);
        } else {
            issuesWithoutTeam.push(issue);
        }
    });

    console.log(`Found ${teamGroups.size} teams:`, Array.from(teamGroups.keys()));
    console.log(`Found ${issuesWithoutTeam.length} issues without team assignment`);

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

    // Create team nodes as root nodes (no workspace node)
    const teamNodes = [];

    // Process each team
    teamGroups.forEach((teamData, teamId) => {
        const { teamName, issues: teamIssues } = teamData;
        // Create team node (root level)
        const teamNode = new MindMapNode(
            `team-${teamId}`,
            teamName,
            `Team: ${teamName}`,
            null, // No parent - this is a root node
            "in-progress",
            []
        );
        teamNode.nodeType = 'team';
        teamNode.teamId = teamId;
        teamNode.teamName = teamName;

        // Group issues within this team by project
        const projectGroups = new Map();
        const issuesWithoutProject = [];

        teamIssues.forEach(issue => {
            const projectId = issue.project?.id;
            const projectName = issue.project?.name;
            if (projectId && projectName) {
                // Use projectId as the key to ensure uniqueness
                if (!projectGroups.has(projectId)) {
                    projectGroups.set(projectId, {
                        projectId: projectId,
                        projectName: projectName,
                        issues: []
                    });
                }
                projectGroups.get(projectId).issues.push(issue);
            } else {
                issuesWithoutProject.push(issue);
            }
        });

        console.log(`Team ${teamName}: ${projectGroups.size} projects, ${issuesWithoutProject.length} issues without project`);

        // Add project nodes as children of team
        projectGroups.forEach((projectData, projectId) => {
            const { projectName, issues: projectIssues } = projectData;
            const projectNode = new MindMapNode(
                `project-${teamName}-${projectId}`,
                projectName,
                `Project: ${projectName}`,
                teamNode.id,
                "in-progress",
                []
            );
            projectNode.nodeType = 'project';
            projectNode.teamId = teamId;
            projectNode.teamName = teamName;
            projectNode.projectName = projectName;
            projectNode.projectId = projectId;

            // Find root issues for this project (issues without parent)
            const rootIssuesForProject = projectIssues.filter(issue => !issue.parent?.id);

            console.log(`Project ${projectName} (${projectId}): ${projectIssues.length} total issues, ${rootIssuesForProject.length} root issues`);

            // Add root issues as children of the project node
            rootIssuesForProject.forEach(rootIssue => {
                const issueNode = convertIssue(rootIssue, projectNode.id);
                projectNode.children.push(issueNode);
                // Add children recursively
                addChildren(issueNode, rootIssue.id, projectIssues);
            });

            teamNode.children.push(projectNode);
        });

        // Add issues without project directly to team node
        if (issuesWithoutProject.length > 0) {
            const rootIssuesWithoutProject = issuesWithoutProject.filter(issue => !issue.parent?.id);

            console.log(`Team ${teamName} issues without project: ${issuesWithoutProject.length} total, ${rootIssuesWithoutProject.length} root issues`);

            rootIssuesWithoutProject.forEach(rootIssue => {
                const issueNode = convertIssue(rootIssue, teamNode.id);
                teamNode.children.push(issueNode);
                // Add children recursively
                addChildren(issueNode, rootIssue.id, issuesWithoutProject);
            });
        }

        teamNodes.push(teamNode);
    });

    // Handle issues without team assignment
    if (issuesWithoutTeam.length > 0) {
        const unassignedTeamNode = new MindMapNode(
            "team-unassigned",
            "Unassigned Team",
            "Issues without team assignment",
            null, // Root node
            "backlog",
            []
        );
        unassignedTeamNode.nodeType = 'team';
        unassignedTeamNode.teamName = null;

        // Find root issues (without parent) among unassigned issues
        const rootUnassignedIssues = issuesWithoutTeam.filter(issue => !issue.parent?.id);

        console.log(`Unassigned team: ${issuesWithoutTeam.length} total issues, ${rootUnassignedIssues.length} root issues`);

        // Add root issues as children of the unassigned team node
        rootUnassignedIssues.forEach(rootIssue => {
            const issueNode = convertIssue(rootIssue, unassignedTeamNode.id);
            unassignedTeamNode.children.push(issueNode);
            // Add children recursively
            addChildren(issueNode, rootIssue.id, issuesWithoutTeam);
        });

        teamNodes.push(unassignedTeamNode);
    }

    console.log(`Created mind map with ${teamNodes.length} team nodes`);

    // Return the first team node if there's only one, otherwise create a virtual root
    if (teamNodes.length === 1) {
        return teamNodes[0];
    } else {
        // Create a virtual root to hold multiple teams
        const virtualRoot = new MindMapNode(
            "virtual-root",
            "Teams",
            "Multiple teams",
            null,
            "in-progress",
            teamNodes
        );
        // Update parent IDs for team nodes
        teamNodes.forEach(teamNode => {
            teamNode.parentId = virtualRoot.id;
        });
        return virtualRoot;
    }
}

// Reparent a node with Linear synchronization
async function reparentNodeWithLinearSync(nodeId, newParentId, rootNode) {
    if (nodeId === newParentId || nodeId === "root") return false;

    // Find the node to move
    const nodeToMove = findNodeById(rootNode, nodeId);
    if (!nodeToMove) {
        console.error('Node to move not found:', nodeId);
        return false;
    }

    // Only sync issue nodes with Linear
    if (nodeToMove.nodeType !== 'issue') {
        console.log('Skipping Linear sync for non-issue node:', nodeToMove.nodeType);
        return false;
    }

    // Find the new parent
    const newParent = findNodeById(rootNode, newParentId);
    if (!newParent) {
        console.error('New parent not found:', newParentId);
        return false;
    }

    // Prepare the update data for Linear
    const updateData = {
        parentId: null, // Will be set based on new parent type
        projectId: newParent.projectId || null,
        teamId: newParent.teamId || null
    };

    // Set parentId based on new parent type
    if (newParent.nodeType === 'issue') {
        // Moving under another issue - set as parent
        updateData.parentId = newParent.id;
    } else if (newParent.nodeType === 'project' || newParent.nodeType === 'team') {
        // Moving under project or team - no parent issue
        updateData.parentId = null;
    }

    console.log('Reparenting node in Linear:', {
        nodeId: nodeId,
        nodeName: nodeToMove.name,
        newParentId: newParentId,
        newParentName: newParent.name,
        newParentType: newParent.nodeType,
        updateData: updateData
    });

    try {
        // Update in Linear first
        const updatedIssue = await updateLinearIssue(nodeId, updateData);

        // If Linear update succeeds, update the mindmap locally
        // This will be handled by the existing reparentNode function
        console.log('Successfully updated issue in Linear, now updating mindmap');
        return true;

    } catch (error) {
        console.error('Failed to update issue in Linear:', error);

        // Ask user if they want to update locally anyway
        const updateLocally = confirm(
            `Failed to update issue in Linear: ${error.message}\n\n` +
            'Do you want to move it in the mindmap anyway? ' +
            '(This will create a mismatch between Linear and the mindmap)'
        );

        return updateLocally;
    }
}

// Function to merge fresh Linear data with existing mindmap data while preserving positioning
function mergeLinearDataWithMindMap(freshIssues, existingMindMapData) {
    console.log('Merging fresh Linear data with existing mindmap data');
    console.log('Fresh issues count:', freshIssues.length);
    console.log('Existing mindmap data:', existingMindMapData);

    // Create a map of existing nodes by ID for quick lookup
    const existingNodesMap = new Map();

    function collectExistingNodes(node) {
        if (node.nodeType === 'issue') {
            existingNodesMap.set(node.id, {
                ...node,
                // Preserve positioning data
                x: node.x,
                y: node.y,
                relativeX: node.relativeX,
                relativeY: node.relativeY,
                hasCustomPosition: node.hasCustomPosition,
                hasRelativePosition: node.hasRelativePosition,
                collapsed: node.collapsed,
                // Preserve assignee data
                assigneeId: node.assigneeId,
                assigneeName: node.assigneeName,
                assigneeEmail: node.assigneeEmail
            });
        }
        if (node.children) {
            node.children.forEach(collectExistingNodes);
        }
    }

    if (existingMindMapData) {
        collectExistingNodes(existingMindMapData);
    }

    console.log('Collected existing nodes:', existingNodesMap.size);

    // Convert fresh issues to mindmap structure
    const freshMindMapData = convertLinearIssuesToMindMap(freshIssues, freshIssues);

    // Function to merge positioning data from existing nodes
    function mergePositioningData(freshNode) {
        if (freshNode.nodeType === 'issue' && existingNodesMap.has(freshNode.id)) {
            const existingNode = existingNodesMap.get(freshNode.id);

            // Preserve positioning data
            freshNode.x = existingNode.x;
            freshNode.y = existingNode.y;
            freshNode.relativeX = existingNode.relativeX;
            freshNode.relativeY = existingNode.relativeY;
            freshNode.hasCustomPosition = existingNode.hasCustomPosition;
            freshNode.hasRelativePosition = existingNode.hasRelativePosition;
            freshNode.collapsed = existingNode.collapsed;

            // Preserve assignee information if it exists in existing node but not in fresh data
            if (existingNode.assigneeId && !freshNode.assigneeId) {
                freshNode.assigneeId = existingNode.assigneeId;
            }
            if (existingNode.assigneeName && !freshNode.assigneeName) {
                freshNode.assigneeName = existingNode.assigneeName;
                freshNode.assigneeEmail = existingNode.assigneeEmail;
            }

            console.log(`Preserved positioning for node ${freshNode.id}:`, {
                x: freshNode.x,
                y: freshNode.y,
                relativeX: freshNode.relativeX,
                relativeY: freshNode.relativeY,
                hasCustomPosition: freshNode.hasCustomPosition,
                collapsed: freshNode.collapsed
            });
        }

        // Recursively merge children
        if (freshNode.children) {
            freshNode.children.forEach(mergePositioningData);
        }
    }

    // Apply positioning data to fresh mindmap
    mergePositioningData(freshMindMapData);

    console.log('Merged mindmap data with preserved positioning');
    return freshMindMapData;
}

// Function to update existing mindmap data with fresh Linear data
function updateMindMapWithFreshData(freshIssues, existingMindMapData, filteredIssues) {
    console.log('Updating mindmap with fresh data');
    console.log('Fresh issues:', freshIssues.length);
    console.log('Filtered issues:', filteredIssues.length);

    // If no existing mindmap data, create fresh
    if (!existingMindMapData) {
        console.log('No existing mindmap data, creating fresh');
        return convertLinearIssuesToMindMap(filteredIssues, freshIssues);
    }

    // Merge fresh data with existing positioning
    return mergeLinearDataWithMindMap(filteredIssues, existingMindMapData);
}

// Export functions for global use
window.MindMapNode = MindMapNode;
window.createMindMapData = createMindMapData;
window.addChildNode = addChildNode;
window.addChildNodeWithLinearSync = addChildNodeWithLinearSync;
window.deleteNodeWithLinearSync = deleteNodeWithLinearSync;
window.deleteNodeFromTree = deleteNodeFromTree;
window.convertLinearStateToStatus = convertLinearStateToStatus;
window.reparentNodeWithLinearSync = reparentNodeWithLinearSync;
window.updateNodeName = updateNodeName;
window.updateNode = updateNode;
window.updateNodeWithLinearSync = updateNodeWithLinearSync;
window.findNodeById = findNodeById;
window.toggleNodeCollapsed = toggleNodeCollapsed;
window.convertLinearIssuesToMindMap = convertLinearIssuesToMindMap;
window.getProjectInfoFromParent = getProjectInfoFromParent;
window.updateNodeProjectInfo = updateNodeProjectInfo;
window.mergeLinearDataWithMindMap = mergeLinearDataWithMindMap;
window.updateMindMapWithFreshData = updateMindMapWithFreshData;
