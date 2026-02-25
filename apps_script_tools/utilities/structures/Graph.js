class Graph {
  constructor() {
    this.adjacencyList = new Map();
  }

  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, new Set());
    };
  }

  addEdge(vertex1, vertex2) {
    if (!this.adjacencyList.has(vertex1)) {
      this.addVertex(vertex1);
    };
    if (!this.adjacencyList.has(vertex2)) {
      this.addVertex(vertex2);
    };
    this.adjacencyList.get(vertex1).add(vertex2);
    this.adjacencyList.get(vertex2).add(vertex1);
  }

  getNeighbors(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      return [];
    };
    return Array.from(this.adjacencyList.get(vertex));
  }

  areConnected(vertex1, vertex2) {
    return this.adjacencyList.get(vertex1)?.has(vertex2) || false;
  }

  print() {
    for (const [vertex, neighbors] of this.adjacencyList) {
      console.log(`${vertex} -> ${Array.from(neighbors).join(", ")}`);
    };
  }

  bfs(start) {
    if (!this.adjacencyList.has(start)) {
      return [];
    };

    const visited = new Set();
    const queue = [start];
    let headIndex = 0;
    const result = [];

    while (headIndex < queue.length) {
      const vertex = queue[headIndex];
      headIndex += 1;
      if (!visited.has(vertex)) {
        visited.add(vertex);
        result.push(vertex);

        const neighbors = this.adjacencyList.get(vertex) || [];
        for (const neighbor of neighbors) {
          if (!visited.has(neighbor)) {
            queue.push(neighbor);
          };
        };
      };
    };
    return result;
  }

  *[Symbol.iterator]() {
    for (const [vertex, neighbors] of this.adjacencyList.entries()) {
      yield { vertex, neighbors: Array.from(neighbors) };
    };
  }
}
