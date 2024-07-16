# Incremental force-directed tree drawing

This tool allows to compare the performances of the following two algorithms for tree drawing:

* Peter Eades' Spring Embedder (denoted as _classical algorithm_);
* Spring Embedder variant (denoted as _incremental algorithm_), where the layers of the tree are introduced
incrementally (starting from the root), i.e., each layer of the tree is introduced in the drawing only after the drawing
of the previous layer has reached equilibrium.

The root node of the tree is highlighted in red.

## Parameters

* Charge: the electric charge of every node (a positive value causes nodes to attract each other, while a negative value
causes nodes to repel each other);
* Spring length: the length at rest of the springs associated to every edge;
* Classical convergence: the velocity every node has to reach for convergence in the classical algorithm;
* Incremental convergence: the velocity every node has to reach for convergence after adding a layer that is not the
last one in the incremental algorithm. For the last layer, the classical convergence threshold is used instead, for
comparison fairness.