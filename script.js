/**
 * Generates a random tree, with nodes labeled according to a breadth-first search.
 * @param maxChildrenCount the maximum number of children per node.
 * @param height the tree height.
 * @returns the generated tree. The generated tree is an object with the following structure:
 * node label (Number): {layer: layer (Number), parent: parent label (Number), children: [children labels (Number)]}.
 */
function randomTree(maxChildrenCount, height) {
    let tree = {
        0: {layer: 0, parent: null, children: []}
    };

    let lastAddedNodes = [0];
    let nextNode = 1;
    let currentHeight = 0;

    // Keep adding layers until desired height is reached
    while (currentHeight !== height) {
        let addedNodes = [];

        // Select a random node, among the last added, to have at least one child
        let randomNode = lastAddedNodes[Math.floor(Math.random() * lastAddedNodes.length)];

        // All other last-added nodes are allowed to have no children
        lastAddedNodes.forEach(function (currentNode) {
            // Generate a random childrenCount for the current node
            let childrenCount;
            if (currentNode !== randomNode) {
                childrenCount = Math.floor(Math.random() * (maxChildrenCount + 1));
            } else {
                childrenCount = Math.floor(Math.random() * maxChildrenCount + 1);
            }

            // Add childrenCount children to the current node
            for (let i = 0; i < childrenCount; i++) {
                tree[nextNode] = {layer: currentHeight + 1, parent: currentNode, children: []};
                tree[currentNode].children.push(nextNode);

                addedNodes.push(nextNode);
                nextNode += 1;
            }
        });

        lastAddedNodes = addedNodes;

        currentHeight += 1;
    }

    return tree;
}

function startClassicalAlgorithm() {
    resetSimulation();
    incremental = false;
    currentConvergenceThreshold = simulationParams.classicalConvergenceThreshold;

    // Build D3.js nodes and links
    Object.keys(tree).forEach(function (node, index) {
        nodes.push({index: node, parent: tree[node].parent});

        tree[node].children.forEach(function (child) {
            links.push({source: index, target: child});
        });
    });

    simulation.nodes(nodes);
    simulation.force("link").links(links);
    simulation.restart();
    startStopwatch();
}

function startIncrementalAlgorithm() {
    resetSimulation();
    incremental = true;
    currentConvergenceThreshold = simulationParams.incrementalConvergenceThreshold;

    layers = computeLayers(tree);

    incrementalStep(0);
}

function computeLayers(tree) {
    let result = {};

    Object.keys(tree).forEach(function (node) {
        node = parseInt(node);
        let layer = tree[node].layer;
        if (result[layer] !== undefined) {
            result[layer].push(node);
        } else {
            result[layer] = [node];
        }
    });

    return result;
}

/**
 * Adds the next layer of nodes to the drawing and restarts the simulation.
 */
function incrementalStep(step) {
    if (step === 0) {
        // Place the root at the center of the frame
        nodes.push({index: 0, parent: null, x: frameWidth / 2, y: frameHeight / 2});
    } else if (step === 1) {
        // Evenly distribute nodes around the root
        let numNodes = layers[1].length
        layers[1].forEach(function(node, i) {
            let nodeAngle = i / numNodes * 2 * Math.PI;

            // Update D3.js nodes
            nodes.push({
                index: node,
                parent: 0,
                x: nodes[0].x + simulationParams.linkDistance * Math.cos(nodeAngle),
                y: nodes[0].y + simulationParams.linkDistance * Math.sin(nodeAngle)
            });

            // Update D3.js links
            links.push({source: 0, target: node});
        });
    } else {
        // Evenly distribute nodes on semicircles directed away from their parents and grandparents
        let leaves = layers[step - 1];
        leaves.forEach(function(leaf) {
            let children = tree[leaf].children;
            children.forEach(function(child, i) {
                let parent = tree[child].parent;
                let parentX = nodes[parent].x;
                let parentY = nodes[parent].y;

                let grandparent = tree[parent].parent;
                let grandparentX = nodes[grandparent].x;
                let grandparentY = nodes[grandparent].y;

                let parentGrandparentAngle =
                    Math.abs(Math.atan((parentY - grandparentY) / (parentX - grandparentX)));

                let childAngle = 3 / 2 * Math.PI; // Initially rotate the semicircle to make it face right

                // Direct the semicircle away from the parent and grandparent
                if (parentX > grandparentX) { // The parent is to the right of the grandparent
                    if (parentY >= grandparentY) { // The parent is exactly to the right or at the bottom right
                        childAngle += parentGrandparentAngle;
                    } else { // The parent is at the top right
                        childAngle += -parentGrandparentAngle;
                    }
                } else { // The parent is to the left of the grandparent
                    if (parentY <= grandparentY) { // The parent is exactly to the left or at the top left
                        childAngle += parentGrandparentAngle - Math.PI;
                    } else { // The parent is at the bottom left
                        childAngle += - parentGrandparentAngle + Math.PI;
                    }
                }

                // Determine the child position on the semicircle based on the number of children of its parent
                if (children.length === 1) {
                    // Place the child at the halfway point of the semicircle
                    childAngle += Math.PI / 2;
                } else if (children.length === 2) {
                    // Place the child either at one fourth or three fourths of the semicircle
                    childAngle += (1/4 + 1/2 * i) * Math.PI;
                } else {
                    // Place the child using all the available length of the semicircle
                    childAngle += i / (children.length - 1) * Math.PI;
                }

                // Update D3.js nodes
                nodes.push({
                    index: child,
                    parent: parent,
                    x: parentX + simulationParams.linkDistance * Math.cos(childAngle),
                    y: parentY + simulationParams.linkDistance * Math.sin(childAngle)
                });

                // Update D3.js links
                links.push({source: parent, target: child});
            });
        });
    }
    simulation.nodes(nodes);
    simulation.force("link").links(links);

    lastAddedLayer += 1;

    simulation.restart();
    startStopwatch();
}

function ticked() {
    if (nodes.length !== 1) // Adding only the root in the incremental algorithm shouldn't count as an iteration
        currentIteration += 1;
    document.getElementById("iteration-counter").innerHTML = currentIteration;

    let converged = true;
    for (let node of nodes) {
        if (Math.sqrt(Math.pow(node.vx, 2) + Math.pow(node.vy, 2)) > currentConvergenceThreshold) {
            converged = false;
            break;
        }
    }

    svgGroup.selectAll("line")
        .data(links)
        .join(
            enter => enter.insert("line", ":first-child"),
        )
        .attr("x1", function (d) {
            return d.source.x;
        })
        .attr("y1", function (d) {
            return d.source.y;
        })
        .attr("x2", function (d) {
            return d.target.x;
        })
        .attr("y2", function (d) {
            return d.target.y;
        })
        .attr("stroke", "black");

    svgGroup.selectAll("circle")
        .data(nodes)
        .join("circle")
        .attr("r", 5)
        .attr("cx", function (d) {
            return d.x;
        })
        .attr("cy", function (d) {
            return d.y;
        })
        .attr("fill", function (d) {
            return d.index === 0 ? "red" : "black";
        });

    if (converged) {
        simulation.stop();
        if (incremental) {
            if (lastAddedLayer < treeParams.treeHeight) {
                if (lastAddedLayer === treeParams.treeHeight - 1) {
                    // For the last layer, use the classical convergence threshold for comparison fairness
                    currentConvergenceThreshold = simulationParams.classicalConvergenceThreshold;
                }
                stopStopwatch();
                let nextStep = lastAddedLayer + 1;
                incrementalStep(nextStep);
            } else {
                stopStopwatch();
            }
        } else {
            stopStopwatch();
        }
    }
}

function handleZoom(event) {
    svgGroup.attr("transform", event.transform);
}

function resetSimulation() {
    nodes = [];
    links = [];

    simulation.nodes(nodes)
        .force("link").links(links);
    simulation.stop();

    clearDrawing();

    lastAddedLayer = -1;
    currentIteration = 0;
    document.getElementById("iteration-counter")
        .innerHTML = "0";

    resetStopwatch();
}

function clearDrawing() {
    svg.selectAll("circle")
        .data(nodes)
        .join("circle")
        .exit()
        .remove();

    svg.selectAll("line")
        .data(links)
        .join("line")
        .exit()
        .remove();
}

function regenerateTree() {
    resetSimulation();
    tree = randomTree(treeParams.maxChildrenCount, treeParams.treeHeight);
    nodeCountSpan.text(Object.entries(tree).length);
    treeDescription.style("color", "green").transition().duration(1000).style("color", "black");
}

function startStopwatch() {
    if (!stopwatch) {
        stopwatch = setInterval(() => {
            milliseconds += 10;
            document.getElementById('stopwatch').innerText = (milliseconds / 1000).toFixed(3);
        }, 10);
    }
}

function stopStopwatch() {
    clearInterval(stopwatch);
    stopwatch = null;
}

function resetStopwatch() {
    stopStopwatch();
    milliseconds = 0;
    document.getElementById('stopwatch').innerText = '0.000';
}

const frameWidth = 600;
const frameHeight = 600;
const svg = d3.select("svg")
    .attr("width", frameWidth)
    .attr("height", frameHeight);
svg.call(d3.zoom().on("zoom", handleZoom));
const svgGroup = svg.append("g"); // Group to allow zooming and panning

let treeParams = {
    maxChildrenCount: 2,
    treeHeight: 4
}

let tree = randomTree(treeParams.maxChildrenCount, treeParams.treeHeight);
let layers;
const treeDescription = d3.select("#tree-description");
const nodeCountSpan = d3.select("#node-count").text(Object.entries(tree).length);

let nodes = []; // D3.js nodes
let links = []; // D3.js links (assuming source is target's parent)

let simulationParams = {
    manyBodyStrength: -50,
    linkDistance: 50,
    classicalConvergenceThreshold: 0.5,
    incrementalConvergenceThreshold: 0.7
};

let incremental; // Boolean that indicates whether to use the incremental approach

const simulation = d3.forceSimulation(nodes)
    .force("manyBody", d3.forceManyBody().strength(simulationParams.manyBodyStrength))
    .force("link", d3.forceLink(links).distance(simulationParams.linkDistance).strength(1))
    .force("center", d3.forceCenter(frameWidth / 2, frameHeight / 2))
    .alphaDecay(0)
    .velocityDecay(0.75)
    .stop()
    .on("tick", ticked);

let currentIteration = 0;
let lastAddedLayer = -1;

let currentConvergenceThreshold;

let stopwatch;
let milliseconds = 0;

const treeForm = d3.select("#tree-form");
treeForm.select("#max-children-count").attr("value", treeParams.maxChildrenCount);
treeForm.select("#tree-height").attr("value", treeParams.treeHeight);
treeForm.on("submit", function (event) {
    event.preventDefault();

    let formData = new FormData(event.target);

    treeParams.maxChildrenCount = parseFloat(formData.get("maxChildrenCount").toString());
    treeParams.treeHeight = parseFloat(formData.get("treeHeight").toString());

    regenerateTree();
});

const simulationForm = d3.select("#simulation-form");
simulationForm.select("#many-body-strength")
    .attr("value", simulationParams.manyBodyStrength);
simulationForm.select("#link-distance")
    .attr("value", simulationParams.linkDistance);
simulationForm.select("#classical-convergence-threshold")
    .attr("value", simulationParams.classicalConvergenceThreshold);
simulationForm.select("#incremental-convergence-threshold")
    .attr("value", simulationParams.incrementalConvergenceThreshold);
simulationForm.on("submit", function (event) {
    event.preventDefault();

    let formData = new FormData(event.target);

    simulationParams.manyBodyStrength =
        parseFloat(formData.get("manyBodyStrength").toString());
    simulationParams.linkDistance =
        parseFloat(formData.get("linkDistance").toString());
    simulationParams.classicalConvergenceThreshold =
        parseFloat(formData.get("classicalConvergenceThreshold").toString());
    simulationParams.incrementalConvergenceThreshold =
        parseFloat(formData.get("incrementalConvergenceThreshold").toString());

    simulation.force("manyBody").strength(simulationParams.manyBodyStrength);
    simulation.force("link").distance(simulationParams.linkDistance);
});