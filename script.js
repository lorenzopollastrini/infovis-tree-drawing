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
 * Adds the next layer of nodes to the drawing. Node labels are mapped to new index values required by D3.js.
 */
function incrementalStep(step) {
    if (step === 0) {
        nodes.push({index: 0, parent: null, x: frameWidth / 2, y: frameHeight / 2});
    } else {
        layers[step].forEach(function (node) {
            // Update D3.js nodes
            let parent = tree[node].parent;
            let nodeSpawn = incrementalNodeSpawn(node);
            nodes.push({index: node, parent: parent, x: nodeSpawn.x, y: nodeSpawn.y});

            // Update D3.js links
            links.push({source: parent, target: node});
        });
    }

    simulation.nodes(nodes);
    simulation.force("link").links(links);

    lastAddedLayer += 1;

    simulation.restart();
    startStopwatch();
}

/**
 * Computes the spawn position of a given node according to the incremental algorithm. The node is spawned in a random
 * position inside a circle directed away from its parent and grandparent.
 * @param node the node to compute the spawn position for.
 * @returns the spawn coordinates as an object with properties x and y.
 */
function incrementalNodeSpawn(node) {
    let parent = tree[node].parent;
    let parent_x = nodes[parent].x;
    let parent_y = nodes[parent].y;

    let max_epsilon = 1;
    let min_epsilon = -1;
    let epsilon_x = Math.random() * (max_epsilon - min_epsilon) + min_epsilon;
    let epsilon_y = Math.random() * (max_epsilon - min_epsilon) + min_epsilon;

    // If the parent is the root, spawn the node in a random position inside a circle around the root
    if (parent === 0) {
        return {
            x: parent_x + epsilon_x,
            y: parent_y + epsilon_y
        };
    }

    // If the parent is not the root, spawn the node in a random point of a circle directed away from the parent
    let grandparent = tree[parent].parent;
    let grandparent_x = nodes[grandparent].x;
    let grandparent_y = nodes[grandparent].y;

    // (offset_x, P_y) are the components of the vector that goes from the grandparent to the parent of the node
    let offset_x = parent_x - grandparent_x;
    let offset_y = parent_y - grandparent_y;

    // The circle is centered in (C_x, C_y)
    let C_x = parent_x + simulationParams.spawnOffsetMultiplier * offset_x;
    let C_y = parent_y + simulationParams.spawnOffsetMultiplier * offset_y;

    return {
        x: C_x + epsilon_x,
        y: C_y + epsilon_y
    };
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
                stopStopwatch();
                incrementalStep(lastAddedLayer + 1);
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
    spawnOffsetMultiplier: 1,
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