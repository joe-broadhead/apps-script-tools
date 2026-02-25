class Graph {
  constructor() {
    this.adjacencyList = new Map();
  }

  addVertex(vertex) {
    if (!this.adjacencyList.has(vertex)) {
      this.adjacencyList.set(vertex, []);
    };
  }

  addEdge(vertex1, vertex2) {
    if (!this.adjacencyList.has(vertex1)) {
      this.addVertex(vertex1);
    };
    if (!this.adjacencyList.has(vertex2)) {
      this.addVertex(vertex2);
    };
    this.adjacencyList.get(vertex1).push(vertex2);
    this.adjacencyList.get(vertex2).push(vertex1);
  }

  getNeighbors(vertex) {
    return this.adjacencyList.get(vertex) || [];
  }

  areConnected(vertex1, vertex2) {
    return this.adjacencyList.get(vertex1)?.includes(vertex2) || false;
  }

  print() {
    for (const [vertex, neighbors] of this.adjacencyList) {
      console.log(`${vertex} -> ${neighbors.join(", ")}`);
    };
  }

  bfs(start) {
    const visited = new Set();
    const queue = [start];
    const result = [];

    while (queue.length > 0) {
      const vertex = queue.shift();
      if (!visited.has(vertex)) {
        visited.add(vertex);
        result.push(vertex);

        for (const neighbor of this.adjacencyList.get(vertex)) {
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
      yield { vertex, neighbors };
    };
  }
}
