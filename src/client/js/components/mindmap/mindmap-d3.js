// D3-based Interactive Mind Map Implementation
// Converted from React/TypeScript to vanilla JavaScript

let mindMapData = null;
let selectedNodeId = null;
let contextMenuNodeId = null;
let svgElement = null;
let currentZoomTransform = null;
let isInitialRender = true;

// Initialize the interactive mind map
function initializeInteractiveMindMap(filteredIssues = null, allIssues = null) {
    console.log('Initializing interactive mind map with', filteredIssues ? filteredIssues.length : 0, 'filtered issues');
    console.log('All issues available:', allIssues ? allIssues.length : 0);

    if (filteredIssues && filteredIssues.length > 0) {
        console.log('Sample of filtered issues:', filteredIssues.slice(0, 3));
    }

    // Convert issues to mind map data or use sample data
    if (filteredIssues && filteredIssues.length > 0) {
        console.log('Converting Linear issues to mind map...');
        mindMapData = convertLinearIssuesToMindMap(filteredIssues, allIssues);
        console.log('Mind map data created:', mindMapData);
    } else {
        console.log('No issues provided, using sample data');
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

    // Create SVG element with minimum size to enable scrolling
    const svg = d3.select(container)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%')
        .style('background', 'transparent')
        .style('min-width', '1200px')
        .style('min-height', '800px');

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

    // Get actual container dimensions and ensure minimum size for scrolling
    const container = document.getElementById('interactive-mindmap-container');
    const containerRect = container.getBoundingClientRect();
    const width = Math.max(containerRect.width, 1200); // Minimum width for horizontal scrolling
    const height = Math.max(containerRect.height, 800); // Minimum height for vertical scrolling

    console.log('Container dimensions:', containerRect.width, 'x', containerRect.height);
    console.log('Using dimensions:', width, 'x', height);

    // Update SVG dimensions to ensure proper scrolling
    svgElement
        .attr('width', width)
        .attr('height', height);

    const g = svgElement.append("g");

    // Create zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 4])
        .filter(function() {
            // Allow zoom on wheel events and pan on drag events
            // Exclude double-click to prevent zoom on node double-click
            return d3.event.type === 'wheel' || d3.event.type === 'mousedown';
        })
        .on("zoom", function() {
            currentZoomTransform = d3.event.transform;
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
        .separation((a, b) => {
            return a.parent === b.parent ? 2 : 3;
        });

    treeLayout(root);

    // Check if we have stored positions, if not do initial layout and store them
    const hasStoredPositions = checkIfPositionsAreStored();

    if (hasStoredPositions) {
        // Use stored positions only - no auto-layout
        applyStoredPositions();
    } else {
        // First time: use tree layout for initial positioning, then store all positions
        // Root positioning
        root.x = height / 2;
        root.y = 100;

        // Apply tree layout positions and then store them
        // (tree layout positions are already applied from treeLayout(root) call above)
    }

    function checkIfPositionsAreStored() {
        // Check if root has stored position
        const rootNode = findNodeById(mindMapData, root.data.id);
        return rootNode && (hasCustomPosition(rootNode) || hasRelativePosition(rootNode));
    }

    function applyStoredPositions() {
        // Apply positions from stored data, starting with root and cascading down
        root.descendants().forEach(d => {
            const originalNode = findNodeById(mindMapData, d.data.id);

            if (d.depth === 0) {
                // Root node: use absolute position
                if (originalNode && hasCustomPosition(originalNode)) {
                    d.x = originalNode.x;
                    d.y = originalNode.y;
                } else {
                    // Fallback for root
                    d.x = height / 2;
                    d.y = 100;
                }
            } else {
                // Child nodes: calculate from relative position
                if (originalNode && hasRelativePosition(originalNode) && d.parent) {
                    const absolutePos = calculateAbsolutePosition(originalNode, d.parent.x, d.parent.y);
                    if (absolutePos) {
                        d.x = absolutePos.x;
                        d.y = absolutePos.y;
                    }
                } else if (originalNode && hasCustomPosition(originalNode)) {
                    // Fallback to absolute position if available
                    d.x = originalNode.x;
                    d.y = originalNode.y;
                }
            }
        });
    }

    // We'll calculate positions after nodes are created with actual dimensions
    // For now, just use the tree layout for vertical positioning

    // Create links (curved paths) - will be updated after nodes are created
    const links = g.selectAll(".link")
        .data(root.links())
        .enter()
        .append("path")
        .attr("class", "link")
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
        .style("fill", d => {
            if (d.data.id === selectedNodeId) {
                return "#6366F1"; // Selected node color
            } else if (d.data.isGreyedOut) {
                return d.depth === 0 ? "#D1D5DB" : "#F3F4F6"; // Greyed out colors
            } else {
                return d.depth === 0 ? "#8B5CF6" : "#E0E7FF"; // Normal colors
            }
        })
        .style("stroke", d => getStatusColor(d.data.status))
        .style("stroke-width", d => d.data.id === selectedNodeId ? 3 : 3)
        .each(function(d) {
            const text = d.data.name || "New Issue";
            const fontSize = d.depth === 0 ? 16 : 14;

            // Create temporary text element to measure
            const tempText = d3.select(this.parentNode)
                .append("text")
                .text(text)
                .style("font-size", fontSize + "px")
                .style("font-weight", d.depth === 0 ? "bold" : "normal")
                .style("font-family", "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif");

            let bbox;
            try {
                bbox = tempText.node().getBBox();
                console.log('Text:', text, 'BBox:', bbox);
            } catch (e) {
                console.error('Error getting bbox:', e);
                bbox = null;
            }

            // Remove temporary text
            tempText.remove();

            // Use fallback calculation if bbox is invalid
            let width, height;
            if (!bbox || bbox.width === 0 || bbox.height === 0) {
                // Fallback: estimate dimensions based on text length and font size
                width = Math.max(text.length * fontSize * 0.7 + 30, 100);
                height = Math.max(fontSize * 1.5 + 16, 40);
                console.log('Using fallback dimensions for:', text, 'width:', width, 'height:', height);
            } else {
                width = Math.max(bbox.width + 30, 80);
                height = Math.max(bbox.height + 16, 32);
            }

            d3.select(this)
                .attr("x", -(width / 2))
                .attr("y", -(height / 2))
                .attr("width", width)
                .attr("height", height)
                .attr("data-width", width)
                .attr("data-height", height);
        });

    // Add node text
    nodes.append("text")
        .text(d => d.data.name || "New Issue")
        .style("text-anchor", "middle")
        .style("dominant-baseline", "middle")
        .style("font-size", d => d.depth === 0 ? "16px" : "14px")
        .style("font-weight", d => d.depth === 0 ? "bold" : "normal")
        .style("fill", d => {
            if (d.data.id === selectedNodeId) {
                return "white"; // Selected node text
            } else if (d.data.isGreyedOut) {
                return "#9CA3AF"; // Greyed out text
            } else {
                return d.depth === 0 ? "white" : "#374151"; // Normal text colors
            }
        })
        .style("pointer-events", "none");

    // Add connection circles for non-root nodes
    nodes.each(function(d) {
        if (d.depth > 0) {
            const nodeGroup = d3.select(this);
            const rect = nodeGroup.select("rect");
            const width = +rect.attr("data-width");
            const height = +rect.attr("data-height");

            const circleX = -(width / 2) - 8;
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
                    // Stop event propagation to prevent node drag behavior
                    d3.event.sourceEvent.stopPropagation();
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
            const width = +rect.attr("data-width");
            const height = +rect.attr("data-height");

            const buttonX = (width / 2) + 5;
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

    // Now that nodes are created with actual dimensions, recalculate ALL positions
    const CONSTANT_SPACING = 200; // Distance from parent +/- control to child circle

    // Shared function to calculate proper child position relative to parent
    function calculateChildPosition(parentNode, childNode, parentWidth, childWidth) {
        // Parent +/- control position (right edge of parent + button offset)
        const parentControlX = parentNode.y + (parentWidth / 2) + 5 + 12;

        // Child CENTER position = parent control + constant spacing + half child width
        // This ensures the child's connection circle (at left edge) is exactly CONSTANT_SPACING from parent control
        const newChildY = parentControlX + CONSTANT_SPACING + (childWidth / 2);

        return {
            x: childNode.x, // Keep existing x (vertical) position
            y: newChildY    // Calculate new y (horizontal) position
        };
    }

    function recalculateAllPositions() {
        // Process all nodes level by level to ensure proper cascading
        const nodesByLevel = {};
        root.descendants().forEach(d => {
            if (!nodesByLevel[d.depth]) nodesByLevel[d.depth] = [];
            nodesByLevel[d.depth].push(d);
        });

        // Start from level 1 (children of root) and cascade down
        for (let level = 1; level < Object.keys(nodesByLevel).length; level++) {
            nodesByLevel[level].forEach(node => {
                const parent = node.parent;
                if (!parent) return;

                // During initial layout, position all nodes using auto-layout
                // (This function is only called during first-time positioning)

                // Get actual parent node width
                const parentNodeGroup = nodes.filter(n => n.data.id === parent.data.id);
                const parentRect = parentNodeGroup.select("rect");
                const parentWidth = +parentRect.attr("data-width");

                // Get actual child node width too
                const childNodeGroup = nodes.filter(n => n.data.id === node.data.id);
                const childRect = childNodeGroup.select("rect");
                const childWidth = +childRect.attr("data-width");

                // Use shared positioning logic
                const newPosition = calculateChildPosition(parent, node, parentWidth, childWidth);
                node.y = newPosition.y;

                // Update the node's visual transform
                childNodeGroup.attr("transform", `translate(${node.y},${node.x})`);

                // Update the connection circle position (should be at left edge)
                const newCircleX = -(childWidth / 2) - 8;
                childNodeGroup.select(".connection-circle")
                    .attr("cx", newCircleX)
                    .attr("cy", 0);
            });
        }
    }

    // If this is the first time (no stored positions), do initial positioning and store it
    if (!hasStoredPositions) {
        // Recalculate positions with actual node dimensions (only on first layout)
        recalculateAllPositions();

        // Store all current positions as relative coordinates
        storeAllPositionsAsRelative();

        // Store root position as absolute
        const rootOriginalNode = findNodeById(mindMapData, root.data.id);
        if (rootOriginalNode) {
            setNodeCustomPosition(rootOriginalNode, root.x, root.y);
        }
    }

    // Function to store all current positions as relative to their parents
    function storeAllPositionsAsRelative() {
        root.descendants().forEach(d => {
            const originalNode = findNodeById(mindMapData, d.data.id);
            if (originalNode && d.parent) {
                // Store current position relative to parent
                storeCurrentPositionAsRelative(originalNode, d.x, d.y, d.parent.x, d.parent.y);
            }
        });
    }



    // Update links to connect from +/- controls to connection circles
    links.attr("d", function(d) {
        const sourceNode = d.source;
        const targetNode = d.target;

        // Get source node dimensions and +/- control position
        const sourceNodeGroup = nodes.filter(node => node.data.id === sourceNode.data.id);
        const sourceRect = sourceNodeGroup.select("rect");
        const sourceWidth = +sourceRect.attr("data-width");

        // Source point: +/- control position (all nodes with children have +/- controls)
        const sourceX = sourceNode.y + (sourceWidth / 2) + 5 + 12; // +5 for button offset, +12 for button radius
        const sourceY = sourceNode.x;

        // Get target node dimensions and connection circle position
        const targetNodeGroup = nodes.filter(node => node.data.id === targetNode.data.id);
        const targetRect = targetNodeGroup.select("rect");
        const targetWidth = +targetRect.attr("data-width");

        // Target point: connection circle position (left edge of child node)
        const targetX = targetNode.y - (targetWidth / 2) - 8; // -8 for circle offset
        const targetY = targetNode.x;

        // Create curved path
        const midX = (sourceX + targetX) / 2;

        return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
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

    // Add drag behavior to make entire nodes draggable
    const nodeDrag = d3.drag()
        .subject(function(d) {
            // Set the drag subject to the current node position
            return {x: d.y, y: d.x}; // Note: we swap x/y here to match our coordinate system
        })
        .on("start", function(d) {
            // Stop event propagation to prevent zoom behavior
            d3.event.sourceEvent.stopPropagation();

            // Change cursor to indicate dragging
            d3.select(this).style("cursor", "grabbing");
        })
        .on("drag", function(d) {
            // Calculate the movement delta
            const oldX = d.x;
            const oldY = d.y;
            const newX = d3.event.y; // event.y -> our x (vertical)
            const newY = d3.event.x; // event.x -> our y (horizontal)
            const deltaX = newX - oldX;
            const deltaY = newY - oldY;

            // Update the dragged node's position
            d.x = newX;
            d.y = newY;

            // Update the visual transform for the dragged node
            d3.select(this).attr("transform", `translate(${d.y},${d.x})`);

            // Move all descendant nodes by the same delta (hierarchical movement)
            moveDescendants(d, deltaX, deltaY);

            // Update all links that involve this node or its descendants
            updateLinksForNodeAndDescendants(d);
        })
        .on("end", function(d) {
            // Change cursor back
            d3.select(this).style("cursor", "pointer");

            // Store position based on node type
            const originalNode = findNodeById(mindMapData, d.data.id);
            if (originalNode) {
                if (d.depth === 0) {
                    // Root node: store as absolute position
                    setNodeCustomPosition(originalNode, d.x, d.y);
                } else {
                    // Child node: store as relative position to parent
                    storeCurrentPositionAsRelative(originalNode, d.x, d.y, d.parent.x, d.parent.y);
                }
            }

            // Update relative positions for all descendants
            updateRelativePositionsForDescendants(d);
        });

    // Apply drag behavior to all nodes
    nodes.call(nodeDrag);

    // Function to update relative positions for all descendants after a drag
    function updateRelativePositionsForDescendants(parentNode) {
        // Update relative positions for all descendants
        parentNode.descendants().forEach(descendant => {
            const originalDescendant = findNodeById(mindMapData, descendant.data.id);
            if (originalDescendant && descendant.parent) {
                // Store current position relative to parent
                storeCurrentPositionAsRelative(originalDescendant, descendant.x, descendant.y, descendant.parent.x, descendant.parent.y);
            }
        });
    }

    // Function to move all descendants of a node by a delta
    function moveDescendants(parentNode, deltaX, deltaY) {
        // Get all descendants of the parent node
        const descendants = parentNode.descendants().slice(1); // Skip the parent itself

        descendants.forEach(descendant => {
            // Update the descendant's position
            descendant.x += deltaX;
            descendant.y += deltaY;

            // Update the visual transform for the descendant
            const descendantNodeGroup = nodes.filter(n => n.data.id === descendant.data.id);
            descendantNodeGroup.attr("transform", `translate(${descendant.y},${descendant.x})`);
        });
    }

    // Function to update links for a node and all its descendants
    function updateLinksForNodeAndDescendants(node) {
        // Get all nodes that need link updates (the node and its descendants)
        const nodesToUpdate = node.descendants();

        // Update all links that involve any of these nodes
        links.attr("d", function(linkData) {
            const sourceNode = linkData.source;
            const targetNode = linkData.target;

            // Only update if this link involves one of our nodes
            const sourceInvolved = nodesToUpdate.some(n => n.data.id === sourceNode.data.id);
            const targetInvolved = nodesToUpdate.some(n => n.data.id === targetNode.data.id);

            if (sourceInvolved || targetInvolved) {
                // Get source node dimensions and +/- control position
                const sourceNodeGroup = nodes.filter(node => node.data.id === sourceNode.data.id);
                const sourceRect = sourceNodeGroup.select("rect");
                const sourceWidth = +sourceRect.attr("data-width");

                // Source point: +/- control position
                const sourceX = sourceNode.y + (sourceWidth / 2) + 5 + 12;
                const sourceY = sourceNode.x;

                // Get target node dimensions and connection circle position
                const targetNodeGroup = nodes.filter(node => node.data.id === targetNode.data.id);
                const targetRect = targetNodeGroup.select("rect");
                const targetWidth = +targetRect.attr("data-width");

                // Target point: connection circle position
                const targetX = targetNode.y - (targetWidth / 2) - 8;
                const targetY = targetNode.x;

                // Create curved path
                const midX = (sourceX + targetX) / 2;

                return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
            }

            // Return the current path if this link is not involved
            return d3.select(this).attr("d");
        });
    }

    // Function to update links when a node is dragged
    function updateLinksForNode(draggedNode) {
        // Update all links that involve this node - use the same logic as the main link drawing
        links.attr("d", function(linkData) {
            const sourceNode = linkData.source;
            const targetNode = linkData.target;

            // Get source node dimensions and +/- control position
            const sourceNodeGroup = nodes.filter(node => node.data.id === sourceNode.data.id);
            const sourceRect = sourceNodeGroup.select("rect");
            const sourceWidth = +sourceRect.attr("data-width");

            // Source point: +/- control position (all nodes with children have +/- controls)
            const sourceX = sourceNode.y + (sourceWidth / 2) + 5 + 12; // +5 for button offset, +12 for button radius
            const sourceY = sourceNode.x;

            // Get target node dimensions and connection circle position
            const targetNodeGroup = nodes.filter(node => node.data.id === targetNode.data.id);
            const targetRect = targetNodeGroup.select("rect");
            const targetWidth = +targetRect.attr("data-width");

            // Target point: connection circle position (left edge of child node)
            const targetX = targetNode.y - (targetWidth / 2) - 8; // -8 for circle offset
            const targetY = targetNode.x;

            // Create curved path
            const midX = (sourceX + targetX) / 2;

            return `M${sourceX},${sourceY} C${midX},${sourceY} ${midX},${targetY} ${targetX},${targetY}`;
        });
    }

    // Clear selection when clicking on empty space (but not when dragging)
    let isDragging = false;
    let dragStartTime = 0;

    svgElement.on("mousedown", function() {
        isDragging = false;
        dragStartTime = Date.now();
    });

    svgElement.on("mousemove", function() {
        if (d3.event.buttons === 1) { // Left mouse button is pressed
            isDragging = true;
        }
    });

    svgElement.on("click", function() {
        // Only clear selection if this was a click, not the end of a drag
        const clickDuration = Date.now() - dragStartTime;
        if (!isDragging && clickDuration < 200) {
            setSelectedNode(null);
            hideContextMenu();
        }
        isDragging = false;
    });

    // Center the view initially or restore previous zoom
    const bounds = g.node().getBBox();
    if (bounds) {
        if (isInitialRender) {
            // Only center on initial render
            const centerX = width / 2 - bounds.x - bounds.width / 2;
            const centerY = height / 2 - bounds.y - bounds.height / 2;
            currentZoomTransform = d3.zoomIdentity.translate(centerX, centerY);
            svgElement.call(zoom.transform, currentZoomTransform);
            isInitialRender = false;
        } else if (currentZoomTransform) {
            // Restore previous zoom state
            svgElement.call(zoom.transform, currentZoomTransform);
        }
    }
}

// Set selected node
function setSelectedNode(nodeId) {
    selectedNodeId = nodeId;
    updateMindMapVisualization();
}

// Open node dialog for editing existing node
function openNodeDialog(nodeId) {
    const node = findNodeById(mindMapData, nodeId);
    if (node) {
        openIssueDialog(node, function(updates) {
            updateNode(node, updates);
            updateMindMapVisualization();
        });
    }
}

// Position a newly created node using the same logic as initial layout
function positionNewNode(newNodeId) {
    // Find the new node in the current visualization
    const newNodeGroup = d3.selectAll('.node').filter(d => d.data.id === newNodeId);
    if (newNodeGroup.empty()) return;

    const newNodeData = newNodeGroup.datum();
    const parent = newNodeData.parent;
    if (!parent) return; // Root node doesn't need repositioning

    // Get parent node dimensions
    const parentNodeGroup = d3.selectAll('.node').filter(d => d.data.id === parent.data.id);
    const parentRect = parentNodeGroup.select("rect");
    const parentWidth = +parentRect.attr("data-width");

    // Get new node dimensions
    const newNodeRect = newNodeGroup.select("rect");
    const newNodeWidth = +newNodeRect.attr("data-width");

    // Use the same positioning logic as initial layout
    const CONSTANT_SPACING = 200;
    const newPosition = {
        x: newNodeData.x, // Keep vertical position from D3 layout
        y: parent.y + (parentWidth / 2) + 5 + 12 + CONSTANT_SPACING + (newNodeWidth / 2)
    };

    // Update the node's position
    newNodeData.y = newPosition.y;

    // Update visual transform
    newNodeGroup.attr("transform", `translate(${newPosition.y},${newPosition.x})`);

    // Update connection circle position
    const newCircleX = -(newNodeWidth / 2) - 8;
    newNodeGroup.select(".connection-circle")
        .attr("cx", newCircleX)
        .attr("cy", 0);

    // Store the position as relative to parent
    const originalNode = findNodeById(mindMapData, newNodeId);
    if (originalNode) {
        storeCurrentPositionAsRelative(originalNode, newPosition.x, newPosition.y, parent.x, parent.y);
    }

    // Update any links that connect to this node
    updateMindMapVisualization();
}

// Open dialog for creating a new issue
function openNewIssueDialog(parentId) {
    // Find the parent node to get project information
    const parent = findNodeById(mindMapData, parentId);

    // Create a temporary node object for the dialog (not added to the tree yet)
    const tempNode = {
        id: 'temp-' + Date.now(),
        name: '',
        description: '',
        status: 'backlog',
        nodeType: 'issue'
    };

    // Pre-populate project information based on parent
    if (parent && typeof getProjectInfoFromParent === 'function') {
        const projectInfo = getProjectInfoFromParent(parent);
        tempNode.teamId = projectInfo.teamId;
        tempNode.teamName = projectInfo.teamName;
        tempNode.projectName = projectInfo.projectName;
        tempNode.projectId = projectInfo.projectId;

        console.log(`Creating new issue under parent: ${parent.name} (${parent.nodeType})`);
        console.log(`Pre-populated project info - TeamId: ${tempNode.teamId}, Team: ${tempNode.teamName}, Project: ${tempNode.projectName}, ProjectId: ${tempNode.projectId}`);
    }

    openIssueDialog(tempNode, function(updates) {
        // Only create the actual node when Save is clicked
        if (parent) {
            const newChild = addChildNode(parent, updates.name || 'New Issue');
            // Apply all the updates to the new node
            updateNode(newChild, updates);
            setSelectedNode(newChild.id);
            updateMindMapVisualization();

            // Position the new node using the same logic as initial layout
            // Use setTimeout to ensure the node is rendered before positioning
            setTimeout(() => {
                positionNewNode(newChild.id);
            }, 50);
        }
    });
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

        // Update project information based on new parent
        if (typeof updateNodeProjectInfo === 'function') {
            console.log(`Updating project info for node ${nodeToMove.name} (${nodeToMove.id}) moving to parent ${newParent.name} (${newParent.id})`);
            console.log(`Parent node type: ${newParent.nodeType}, team: ${newParent.teamName}, project: ${newParent.projectName}`);
            console.log(`Node before update - team: ${nodeToMove.teamName}, project: ${nodeToMove.projectName}`);

            updateNodeProjectInfo(nodeToMove, newParent);

            console.log(`Node after update - team: ${nodeToMove.teamName}, project: ${nodeToMove.projectName}`);

            // Recursively update project info for all descendants
            function updateDescendantsProjectInfo(node) {
                if (node.children) {
                    node.children.forEach(child => {
                        console.log(`Updating descendant ${child.name} - before: team=${child.teamName}, project=${child.projectName}`);
                        updateNodeProjectInfo(child, node);
                        console.log(`Updating descendant ${child.name} - after: team=${child.teamName}, project=${child.projectName}`);
                        updateDescendantsProjectInfo(child);
                    });
                }
            }
            updateDescendantsProjectInfo(nodeToMove);
        }

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
        openNewIssueDialog(contextMenuNodeId);
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
            // Open dialog for creating a new issue (don't create the node yet)
            const parentId = selectedNodeId || "root";
            openNewIssueDialog(parentId);
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
