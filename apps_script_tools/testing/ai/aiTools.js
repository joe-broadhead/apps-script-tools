AI_TOOLS_TESTS = [
  {
    description: 'AST.AI.tools() should execute function handlers and return tool results',
    test: () => {
      const originalRunOpenAi = runOpenAi;
      let callCount = 0;

      runOpenAi = request => {
        callCount += 1;

        if (callCount === 1) {
          return normalizeAiResponse({
            provider: 'openai',
            operation: 'tools',
            model: 'gpt-4.1-mini',
            output: {
              toolCalls: [{
                id: 'tool_1',
                name: 'adder_tool',
                arguments: { a: 2, b: 8 }
              }]
            }
          });
        }

        return normalizeAiResponse({
          provider: 'openai',
          operation: 'tools',
          model: 'gpt-4.1-mini',
          output: {
            text: 'done'
          }
        });
      };

      try {
        const response = AST.AI.tools({
          provider: 'openai',
          model: 'gpt-4.1-mini',
          input: 'sum values',
          auth: {
            apiKey: 'test-key'
          },
          tools: [{
            name: 'adder_tool',
            description: 'adds two numbers',
            inputSchema: {
              type: 'object',
              properties: {
                a: { type: 'number' },
                b: { type: 'number' }
              }
            },
            handler: args => args.a + args.b
          }],
          options: {
            maxToolRounds: 3
          }
        });

        if (response.output.text !== 'done') {
          throw new Error(`Expected done text, but got ${response.output.text}`);
        }

        if (!Array.isArray(response.output.toolResults) || response.output.toolResults.length !== 1) {
          throw new Error('Expected exactly one tool result');
        }

        if (response.output.toolResults[0].result !== 10) {
          throw new Error(`Expected tool result 10, but got ${response.output.toolResults[0].result}`);
        }
      } finally {
        runOpenAi = originalRunOpenAi;
      }
    }
  },
  {
    description: 'AST.AI.tools() should resolve string handler names from global scope',
    test: () => {
      const originalRunOpenAi = runOpenAi;
      const originalGlobalHandler = this.astAiGlobalAdder;
      let callCount = 0;

      this.astAiGlobalAdder = args => args.left + args.right;

      runOpenAi = request => {
        callCount += 1;

        if (callCount === 1) {
          return normalizeAiResponse({
            provider: 'openai',
            operation: 'tools',
            model: 'gpt-4.1-mini',
            output: {
              toolCalls: [{
                id: 'tool_2',
                name: 'global_adder_tool',
                arguments: '{"left":3,"right":7}'
              }]
            }
          });
        }

        return normalizeAiResponse({
          provider: 'openai',
          operation: 'tools',
          model: 'gpt-4.1-mini',
          output: {
            text: 'global done'
          }
        });
      };

      try {
        const response = AST.AI.tools({
          provider: 'openai',
          model: 'gpt-4.1-mini',
          input: 'sum global values',
          auth: {
            apiKey: 'test-key'
          },
          tools: [{
            name: 'global_adder_tool',
            description: 'adds two numbers from global handler',
            inputSchema: {
              type: 'object',
              properties: {
                left: { type: 'number' },
                right: { type: 'number' }
              }
            },
            handler: 'astAiGlobalAdder'
          }]
        });

        if (response.output.text !== 'global done') {
          throw new Error(`Expected global done text, but got ${response.output.text}`);
        }

        if (response.output.toolResults[0].result !== 10) {
          throw new Error(`Expected tool result 10, but got ${response.output.toolResults[0].result}`);
        }
      } finally {
        runOpenAi = originalRunOpenAi;
        if (typeof originalGlobalHandler === 'undefined') {
          delete this.astAiGlobalAdder;
        } else {
          this.astAiGlobalAdder = originalGlobalHandler;
        }
      }
    }
  },
  {
    description: 'AST.AI.tools() should throw when tool rounds exceed maxToolRounds',
    test: () => {
      const originalRunOpenAi = runOpenAi;

      runOpenAi = request => {
        return normalizeAiResponse({
          provider: 'openai',
          operation: 'tools',
          model: 'gpt-4.1-mini',
          output: {
            toolCalls: [{
              id: `loop_${new Date().getTime()}`,
              name: 'loop_tool',
              arguments: {}
            }]
          }
        });
      };

      try {
        AST.AI.tools({
          provider: 'openai',
          model: 'gpt-4.1-mini',
          input: 'loop forever',
          auth: {
            apiKey: 'test-key'
          },
          tools: [{
            name: 'loop_tool',
            description: 'never ends',
            inputSchema: {
              type: 'object',
              properties: {}
            },
            handler: () => 'ok'
          }],
          options: {
            maxToolRounds: 2
          }
        });

        throw new Error('Expected AstAiToolLoopError, but no error was thrown');
      } catch (error) {
        if (error.name !== 'AstAiToolLoopError') {
          throw new Error(`Expected AstAiToolLoopError, but got ${error.name}: ${error.message}`);
        }
      } finally {
        runOpenAi = originalRunOpenAi;
      }
    }
  }
];
