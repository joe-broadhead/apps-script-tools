class TestingFramework {
  constructor() {
    this.tests = [];
    this.results = [];
  }

  addTest(description, testFn, group = "General") {
    this.tests.push({ description, testFn, group });
  }

  async run() {
    console.log("Running tests...");
    const startTime = new Date();
    let passed = 0;

    for (const { description, testFn, group } of this.tests) {
      const result = { description, group, status: "fail", error: null };
      try {
        const output = testFn();
        if (output && typeof output.then === "function") {
          await output;
        }
        result.status = "pass";
        passed++;
        console.log(`✅ ${group} - ${description}`);
      } catch (error) {
        result.error = error.message;
        console.error(`❌ ${group} - ${description}`);
        console.error(`   Error: ${error.message}`);
      }
      this.results.push(result);
    }

    const endTime = new Date();
    console.log(`\nSummary:`);
    console.log(`${passed}/${this.tests.length} tests passed.`);
    console.log(`Execution time: ${(endTime - startTime) / 1000}s`);
  }

  exportResults() {
    return {
      total: this.tests.length,
      passed: this.results.filter(r => r.status === "pass").length,
      failed: this.results.filter(r => r.status === "fail").length,
      results: this.results,
    };
  }
}
