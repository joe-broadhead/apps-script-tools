JOBS_NAMESPACE_TESTS = [
  {
    description: 'AST.Jobs should expose public helper methods',
    test: () => {
      if (!AST || !AST.Jobs) {
        throw new Error('AST.Jobs is not available');
      }

      const requiredMethods = [
        'run',
        'enqueue',
        'resume',
        'status',
        'list',
        'cancel',
        'configure',
        'getConfig',
        'clearConfig'
      ];

      requiredMethods.forEach(method => {
        if (typeof AST.Jobs[method] !== 'function') {
          throw new Error(`AST.Jobs.${method} is not available`);
        }
      });
    }
  },
  {
    description: 'AST.Jobs.enqueue() + resume() should execute a simple two-step job',
    test: () => {
      const propertyPrefix = `AST_JOBS_GAS_TEST_${new Date().getTime()}_`;

      astJobsNamespaceStepOne = ({ payload }) => payload.value + 2;
      astJobsNamespaceStepTwo = ({ results }) => results.step_one * 3;

      const queued = AST.Jobs.enqueue({
        name: 'gas-jobs-namespace',
        options: {
          propertyPrefix
        },
        steps: [
          {
            id: 'step_one',
            handler: 'astJobsNamespaceStepOne',
            payload: {
              value: 5
            }
          },
          {
            id: 'step_two',
            handler: 'astJobsNamespaceStepTwo',
            dependsOn: ['step_one']
          }
        ]
      });

      const completed = AST.Jobs.resume(queued.id);
      if (completed.status !== 'completed') {
        throw new Error(`Expected completed status, got ${completed.status}`);
      }

      if (completed.results.step_one !== 7 || completed.results.step_two !== 21) {
        throw new Error(`Unexpected job results: ${JSON.stringify(completed.results)}`);
      }
    }
  }
];
