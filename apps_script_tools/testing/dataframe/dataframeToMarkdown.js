DATAFRAME_TO_MARKDOWN_TESTS = [
  {
    description: 'DataFrame.toMarkdown() should render a table with headers and rows',
    test: () => {
      const df = DataFrame.fromRecords([
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ]);

      const markdown = df.toMarkdown();

      if (!markdown.includes('id') || !markdown.includes('name')) {
        throw new Error(`Expected markdown headers in output: ${markdown}`);
      }

      if (!markdown.includes('Alice') || !markdown.includes('Bob')) {
        throw new Error(`Expected markdown row values in output: ${markdown}`);
      }
    },
  },
];
