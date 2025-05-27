// D3-based Interactive Mind Map Implementation
// Converted from React/TypeScript to vanilla JavaScript

let mindMapData = null;
let selectedNodeId = null;
let contextMenuNodeId = null;
let svgElement = null;

// Initialize the interactive mind map
function initializeInteractiveMindMap(issues = null) {
    console.log('Initializing interactive mind map with', issues ? issues.length : 0, 'issues');
    
    // Convert issues to mind map data or use sample data
    if (issues && issues.length > 0) {
        mindMapData = convertLinearIssuesToMindMap(issues);
    } else {
        mindMapData = createMindMapData();
    }
    
    renderInteractiveMindMap();
}

// Render the interactive mind map
function renderInteractiveMindMap() {
    const container = document.getElementById('interactive-mindmap-container');
    if (!container) {
        console.error('Interactive mindmap container not found');
        return;
    }
    
    // Clear existing content
    container.innerHTML = '';
    
    // Create SVG element
    const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '600px')
        .style('border', '1px solid #e5e7eb')
        .style('border-radius', '8px')
        .style('background', 'white');
    
    svgElement = svg;
    
    // Render the mind map
    updateMindMapVisualization();
    
    // Add keyboard event listeners
    setupKeyboardHandlers();
}

// Update the mind map visualization
function updateMindMapVisualization() {
    if (!svgElement || !mindMapData) return;
    
    // Clear existing elements
    svgElement.selectAll("*").remove();
    
    const width = 1000;
    const height = 600;
    
    const g = svgElement.append("g");
    
    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", function() {
            g.attr("transform", d3.event.transform);
        });
    
    svgElement.call(zoom);
    
    // Filter out collapsed nodes
    function filterCollapsed(node) {
        const filtered = {
            ...node,
            children: node.collapsed ? undefined : node.children?.map(filterCollapsed)
        };
        return filtered;
    }
    
    const filteredData = filterCollapsed(mindMapData);
    const root = d3.hierarchy(filteredData);
    
    // Create tree layout
    const treeLayout = d3.tree()
        .size([height - 100, width - 200])
        .separation(() => 1.2);
    
    treeLayout(root);
    
    // Position root at center-left
    root.x = height / 2;
    root.y = 100;
    
    // Adjust positioning for children
    root.descendants().forEach((d) => {
        if (d.depth > 0) {
            d.y = 100 + d.depth * 200;
        }
    });
    
    // Create links (curved paths)
    g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d3.linkHorizontal()
            .x(d => d.y)
            .y(d => d.x)
        )
        .style("fill", "none")
        .style("stroke", "#8B5CF6")
        .style("stroke-width", 3)
        .style("stroke-linecap", "round");
    
    // Create nodes
    const nodes = g.selectAll(".node")
        .data(root.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.y},${d.x})`)
        .style("cursor", "pointer");
    
    // Add node backgrounds with status color
    nodes.append("rect")
        .attr("rx", d => d.depth === 0 ? 25 : 15)
        .attr("ry", d => d.depth === 0 ? 25 : 15)
        .style("fill", d => d.data.id === selectedNodeId ? "#6366F1" : (d.depth === 0 ? "#8B5CF6" : "#E0E7FF"))
        .style("stroke", d => getStatusColor(d.data.status))
        .style("stroke-width", d => d.data.id === selectedNodeId ? 3 : 3)
        .each(function(d) {
            // Calculate text dimensions for proper rect sizing
            const tempText = g.append("text")
                .text(d.data.name || "New Issue")
                .style("font-size", d.depth === 0 ? "16px" : "14px")
                .style("font-weight", d.depth === 0 ? "bold" : "normal");
            
            const bbox = tempText.node().getBBox();
            tempText.remove();
            
            d3.select(this)
                .attr("x", -(bbox.width / 2) - 15)
                .attr("y", -(bbox.height / 2) - 8)
                .attr("width", bbox.width + 30)
                .attr("height", bbox.height + 16);
        });
    
    // Add node text
    nodes.append("text")
        .text(d => d.data.name || "New Issue")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("font-size", d => d.depth === 0 ? "16px" : "14px")
        .style("font-weight", d => d.depth === 0 ? "bold" : "normal")
        .style("fill", d => d.data.id === selectedNodeId ? "white" : (d.depth === 0 ? "white" : "#374151"))
        .style("pointer-events", "none");
    
    // Add connection circles for non-root nodes
    nodes.each(function(d) {
        if (d.depth > 0) {
            const nodeGroup = d3.select(this);
            const rect = nodeGroup.select("rect");
            const rectBBox = rect.node().getBBox();
            
            const circleX = rectBBox.x - 8;
            const circleY = 0;
            
            const connectionCircle = nodeGroup.append("circle")
                .attr("class", "connection-circle")
                .attr("cx", circleX)
                .attr("cy", circleY)
                .attr("r", 6)
                .style("fill", "#8B5CF6")
                .style("stroke", "white")
                .style("stroke-width", 2)
                .style("cursor", "grab");
            
            // Add drag behavior for reparenting
            const dragReparent = d3.drag()
                .on("start", function() {
                    d3.select(this).style("cursor", "grabbing");
                    nodes.selectAll("rect").style("stroke-dasharray", function(targetD) {
                        return targetD.data.id !== d.data.id ? "5,5" : null;
                    });
                })
                .on("drag", function() {
                    d3.select(this)
                        .attr("cx", d3.event.x)
                        .attr("cy", d3.event.y);
                })
                .on("end", function() {
                    d3.select(this).style("cursor", "grab");
                    nodes.selectAll("rect").style("stroke-dasharray", null);
                    
                    // Find the node under the cursor
                    const [mouseX, mouseY] = d3.mouse(g.node());
                    const targetNode = nodes.selectAll("rect").nodes().find((rectNode) => {
                        const rect = d3.select(rectNode);
                        const transform = d3.select(rectNode.parentNode).attr("transform");
                        const match = transform.match(/translate\(([^,]+),([^)]+)\)/);
                        if (match) {
                            const nodeX = parseFloat(match[1]);
                            const nodeY = parseFloat(match[2]);
                            const bbox = rectNode.getBBox();
                            
                            return mouseX >= nodeX + bbox.x && 
                                   mouseX <= nodeX + bbox.x + bbox.width &&
                                   mouseY >= nodeY + bbox.y && 
                                   mouseY <= nodeY + bbox.y + bbox.height;
                        }
                        return false;
                    });
                    
                    if (targetNode) {
                        const targetData = d3.select(targetNode.parentNode).datum();
                        if (targetData.data.id !== d.data.id) {
                            reparentNode(d.data.id, targetData.data.id);
                        }
                    }
                    
                    // Reset circle position
                    d3.select(this)
                        .attr("cx", circleX)
                        .attr("cy", circleY);
                });
            
            connectionCircle.call(dragReparent);
        }
    });
    
    // Add collapse/expand buttons
    nodes.each(function(d) {
        const originalNode = findNodeById(mindMapData, d.data.id);
        if (originalNode && originalNode.children && originalNode.children.length > 0) {
            const nodeGroup = d3.select(this);
            const rect = nodeGroup.select("rect");
            const rectBBox = rect.node().getBBox();
            
            const buttonX = rectBBox.x + rectBBox.width + 5;
            const buttonY = 0;
            
            const buttonGroup = nodeGroup.append("g")
                .attr("class", "collapse-button")
                .attr("transform", `translate(${buttonX}, ${buttonY})`)
                .style("cursor", "pointer");
            
            // Circle background
            buttonGroup.append("circle")
                .attr("r", 12)
                .style("fill", "#8B5CF6")
                .style("stroke", "white")
                .style("stroke-width", 2);
            
            // Plus/minus icon
            const isCollapsed = originalNode.collapsed;
            if (isCollapsed) {
                // Plus icon
                buttonGroup.append("line")
                    .attr("x1", -4).attr("y1", 0)
                    .attr("x2", 4).attr("y2", 0)
                    .style("stroke", "white").style("stroke-width", 2);
                buttonGroup.append("line")
                    .attr("x1", 0).attr("y1", -4)
                    .attr("x2", 0).attr("y2", 4)
                    .style("stroke", "white").style("stroke-width", 2);
            } else {
                // Minus icon
                buttonGroup.append("line")
                    .attr("x1", -4).attr("y1", 0)
                    .attr("x2", 4).attr("y2", 0)
                    .style("stroke", "white").style("stroke-width", 2);
            }
            
            // Click handler for collapse/expand
            buttonGroup.on("click", function() {
                d3.event.stopPropagation();
                toggleNodeCollapsed(originalNode);
                updateMindMapVisualization();
            });
        }
    });
    
    // Add node click handlers
    let clickTimeout = null;
    let clickCount = 0;
    
    nodes.on("click", function(d) {
        d3.event.stopPropagation();
        
        clickCount++;
        
        if (clickCount === 1) {
            clickTimeout = setTimeout(() => {
                setSelectedNode(d.data.id === selectedNodeId ? null : d.data.id);
                clickCount = 0;
            }, 300);
        } else if (clickCount === 2) {
            if (clickTimeout) {
                clearTimeout(clickTimeout);
                clickTimeout = null;
            }
            clickCount = 0;
            openNodeDialog(d.data.id);
        }
    });
    
    // Add context menu handlers
    nodes.on("contextmenu", function(d) {
        d3.event.preventDefault();
        showContextMenu(d3.event.pageX, d3.event.pageY, d.data.id);
    });
    
    // Add hover effects
    nodes.on("mouseenter", function() {
        d3.select(this).select("rect")
            .transition()
            .duration(200)
            .style("transform", "scale(1.05)");
    })
    .on("mouseleave", function() {
        d3.select(this).select("rect")
            .transition()
            .duration(200)
            .style("transform", "scale(1)");
    });
    
    // Clear selection when clicking on empty space
    svgElement.on("click", function() {
        setSelectedNode(null);
        hideContextMenu();
    });
    
    // Center the view initially
    const bounds = g.node().getBBox();
    if (bounds) {
        const centerX = width / 2 - bounds.x - bounds.width / 2;
        const centerY = height / 2 - bounds.y - bounds.height / 2;
        svgElement.call(zoom.transform, d3.zoomIdentity.translate(centerX, centerY));
    }
}

// Set selected node
function setSelectedNode(nodeId) {
    selectedNodeId = nodeId;
    updateMindMapVisualization();
}

// Open node dialog for editing
function openNodeDialog(nodeId) {
    const node = findNodeById(mindMapData, nodeId);
    if (node) {
        openIssueDialog(node, function(updates) {
            updateNode(node, updates);
            updateMindMapVisualization();
        });
    }
}

// Reparent a node
function reparentNode(nodeId, newParentId) {
    if (nodeId === newParentId || nodeId === "root") return;
    
    // Find and remove the node from its current parent
    function removeFromParent(node) {
        if (node.children) {
            const childIndex = node.children.findIndex(child => child.id === nodeId);
            if (childIndex !== -1) {
                return node.children.splice(childIndex, 1)[0];
            }
            for (const child of node.children) {
                const found = removeFromParent(child);
                if (found) return found;
            }
        }
        return null;
    }
    
    const nodeToMove = removeFromParent(mindMapData);
    if (!nodeToMove) return;
    
    // Add the node to its new parent
    const newParent = findNodeById(mindMapData, newParentId);
    if (newParent) {
        if (!newParent.children) {
            newParent.children = [];
        }
        nodeToMove.parentId = newParentId;
        newParent.children.push(nodeToMove);
        updateMindMapVisualization();
    }
}

// Create a child node
function createChildNodeForParent(parentId) {
    const parent = findNodeById(mindMapData, parentId);
    if (parent) {
        const newChild = addChildNode(parent, "New Issue");
        setSelectedNode(newChild.id);
        updateMindMapVisualization();
        return newChild.id;
    }
    return null;
}

// Delete a node
function deleteNodeById(nodeId) {
    if (nodeId === "root") return; // Cannot delete root node
    
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
    
    if (deleteFromParent(mindMapData)) {
        setSelectedNode(null);
        updateMindMapVisualization();
    }
}

// Context menu functionality
function showContextMenu(x, y, nodeId) {
    contextMenuNodeId = nodeId;
    const contextMenu = document.getElementById('context-menu');
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.classList.remove('hidden');
    
    // Hide delete option for root node
    const deleteItem = contextMenu.querySelector('.delete-item');
    if (nodeId === 'root') {
        deleteItem.style.display = 'none';
    } else {
        deleteItem.style.display = 'block';
    }
}

function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    contextMenu.classList.add('hidden');
    contextMenuNodeId = null;
}

// Context menu actions
function createChildNode() {
    if (contextMenuNodeId) {
        const newNodeId = createChildNodeForParent(contextMenuNodeId);
        if (newNodeId) {
            openNodeDialog(newNodeId);
        }
    }
    hideContextMenu();
}

function editContextNode() {
    if (contextMenuNodeId) {
        openNodeDialog(contextMenuNodeId);
    }
    hideContextMenu();
}

function deleteContextNode() {
    if (contextMenuNodeId && contextMenuNodeId !== 'root') {
        deleteNodeById(contextMenuNodeId);
    }
    hideContextMenu();
}

// Keyboard handlers
function setupKeyboardHandlers() {
    document.addEventListener('keydown', function(event) {
        // Only handle if interactive mindmap is active
        const interactiveMindmapView = document.getElementById('interactive-mindmap-view');
        if (!interactiveMindmapView || !interactiveMindmapView.classList.contains('active')) {
            return;
        }
        
        if (event.key === 'Tab') {
            event.preventDefault();
            if (selectedNodeId) {
                const newNodeId = createChildNodeForParent(selectedNodeId);
                if (newNodeId) {
                    openNodeDialog(newNodeId);
                }
            } else {
                const newNodeId = createChildNodeForParent("root");
                if (newNodeId) {
                    openNodeDialog(newNodeId);
                }
            }
        }
        
        if (event.key === 'Delete' && selectedNodeId) {
            event.preventDefault();
            deleteNodeById(selectedNodeId);
        }
        
        if (event.key === 'Escape') {
            hideContextMenu();
        }
    });
}

// Hide context menu when clicking elsewhere
document.addEventListener('click', function() {
    hideContextMenu();
});

// Export functions for global use
window.initializeInteractiveMindMap = initializeInteractiveMindMap;
window.renderInteractiveMindMap = renderInteractiveMindMap;
window.createChildNode = createChildNode;
window.editContextNode = editContextNode;
window.deleteContextNode = deleteContextNode;
