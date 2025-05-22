SERIES_TO_MARKDOWN_TESTS = [
  {
    description: 'Series.toMarkdown() should generate a Markdown table including the index',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.toMarkdown().trim();
    
      const expectedMarkdown = `
index | values
------|-------
0     | 10    
1     | 20    
2     | 30    `.trim(); // Expected Markdown format
    
      if (result !== expectedMarkdown) {
        throw new Error(`Expected:\n${expectedMarkdown}\nBut got:\n${result}`);
      }
    },
  },
  {
    description: 'Series.toMarkdown() should generate a Markdown table without the index',
    test: () => {
      const series = new Series([10, 20, 30], 'values');
      const result = series.toMarkdown(false).trim();
    
      const expectedMarkdown = `
values
------
10    
20    
30    `.trim(); // Expected Markdown format
    
      if (result !== expectedMarkdown) {
        throw new Error(`Expected:\n${expectedMarkdown}\nBut got:\n${result}`);
      }
    },
  },
  {
    description: 'Series.toMarkdown() should generate a Markdown table with just headers for an empty Series',
    test: () => {
      const series = new Series([], 'values');
      const result = series.toMarkdown().trim();
    
      const expectedMarkdown = `
index | values
------|-------`.trim(); // Empty table with headers
    
      if (result !== expectedMarkdown) {
        throw new Error(`Expected:\n${expectedMarkdown}\nBut got:\n${result}`);
      }
    },
  },
  {
    description: 'Series.toMarkdown() should handle a large Series efficiently',
    test: () => {
      const largeArray = Array.from({ length: 1000 }, (_, i) => i);
      const series = new Series(largeArray, 'large');
      const result = series.toMarkdown().trim();
    
      // Validate only the beginning and end of the Markdown table
      const startsCorrectly = result.startsWith(`
index | large
------|------
0     | 0    
1     | 1    
2     | 2    `.trim());
    
      const endsCorrectly = result.endsWith(`
997   | 997  
998   | 998  
999   | 999  `.trim());
    
      if (!startsCorrectly || !endsCorrectly) {
        throw new Error('Failed Test: large Series to Markdown');
      }
    },
  },
];
