RAG_GROUNDING_TESTS = [
  {
    description: 'AST.RAG.answer() should return grounded citation mapping when citations are valid',
    test: () => {
      const originalLoad = astRagLoadIndexDocument;
      const originalEmbed = astRagEmbedTexts;
      const originalRunAiRequest = runAiRequest;

      astRagLoadIndexDocument = () => ({
        indexFileId: 'idx',
        fileName: 'idx.json',
        document: {
          embedding: {
            provider: 'openai',
            model: 'text-embedding-3-small'
          },
          chunks: [{
            chunkId: 'chunk_1',
            sourceId: 'src_1',
            fileId: 'file_1',
            fileName: 'doc.txt',
            mimeType: 'text/plain',
            page: null,
            slide: null,
            section: 'body',
            text: 'Grounded evidence text',
            embedding: [1, 0, 0]
          }]
        }
      });

      astRagEmbedTexts = () => ({
        vectors: [[1, 0, 0]],
        usage: {
          inputTokens: 1,
          totalTokens: 1
        }
      });

      runAiRequest = () => ({
        output: {
          json: {
            answer: 'Grounded evidence text [S1]',
            citations: ['S1']
          }
        },
        usage: {
          inputTokens: 2,
          outputTokens: 3,
          totalTokens: 5
        }
      });

      try {
        const out = AST.RAG.answer({
          indexFileId: 'idx',
          question: 'What does the document say?',
          generation: {
            provider: 'openai',
            auth: { apiKey: 'test-key' }
          },
          options: {
            requireCitations: true
          }
        });

        if (out.status !== 'ok') {
          throw new Error(`Expected status ok, got ${out.status}`);
        }

        if (!out.citations || out.citations.length !== 1) {
          throw new Error(`Expected one citation, got ${JSON.stringify(out.citations)}`);
        }

        if (out.citations[0].chunkId !== 'chunk_1') {
          throw new Error(`Expected citation to map to chunk_1, got ${out.citations[0].chunkId}`);
        }

        if (typeof out.citations[0].vectorScore !== 'number') {
          throw new Error(`Expected citation vectorScore number, got ${typeof out.citations[0].vectorScore}`);
        }

        if (out.citations[0].lexicalScore !== null) {
          throw new Error(`Expected citation lexicalScore null in vector mode, got ${out.citations[0].lexicalScore}`);
        }

        if (typeof out.citations[0].finalScore !== 'number') {
          throw new Error(`Expected citation finalScore number, got ${typeof out.citations[0].finalScore}`);
        }

        if (!out.retrieval || out.retrieval.mode !== 'vector') {
          throw new Error(`Expected retrieval.mode=vector, got ${JSON.stringify(out.retrieval)}`);
        }
      } finally {
        astRagLoadIndexDocument = originalLoad;
        astRagEmbedTexts = originalEmbed;
        runAiRequest = originalRunAiRequest;
      }
    }
  },
  {
    description: 'AST.RAG.answer() should abstain when citation grounding is insufficient',
    test: () => {
      const originalLoad = astRagLoadIndexDocument;
      const originalEmbed = astRagEmbedTexts;
      const originalRunAiRequest = runAiRequest;

      astRagLoadIndexDocument = () => ({
        indexFileId: 'idx',
        fileName: 'idx.json',
        document: {
          embedding: {
            provider: 'openai',
            model: 'text-embedding-3-small'
          },
          chunks: [{
            chunkId: 'chunk_1',
            sourceId: 'src_1',
            fileId: 'file_1',
            fileName: 'doc.txt',
            mimeType: 'text/plain',
            page: null,
            slide: null,
            section: 'body',
            text: 'Grounded evidence text',
            embedding: [1, 0, 0]
          }]
        }
      });

      astRagEmbedTexts = () => ({
        vectors: [[1, 0, 0]],
        usage: {
          inputTokens: 1,
          totalTokens: 1
        }
      });

      runAiRequest = () => ({
        output: {
          json: {
            answer: 'Ungrounded response with no citations',
            citations: []
          }
        },
        usage: {
          inputTokens: 2,
          outputTokens: 3,
          totalTokens: 5
        }
      });

      try {
        const out = AST.RAG.answer({
          indexFileId: 'idx',
          question: 'What does the document say?',
          generation: {
            provider: 'openai',
            auth: { apiKey: 'test-key' }
          },
          options: {
            requireCitations: true,
            insufficientEvidenceMessage: 'I do not have enough grounded context to answer that.'
          }
        });

        if (out.status !== 'insufficient_context') {
          throw new Error(`Expected status insufficient_context, got ${out.status}`);
        }

        if (out.citations && out.citations.length > 0) {
          throw new Error('Expected zero citations for insufficient context response');
        }
      } finally {
        astRagLoadIndexDocument = originalLoad;
        astRagEmbedTexts = originalEmbed;
        runAiRequest = originalRunAiRequest;
      }
    }
  },
  {
    description: 'AST.RAG.answer() should honor retrieval.mode=hybrid in response metadata',
    test: () => {
      const originalLoad = astRagLoadIndexDocument;
      const originalEmbed = astRagEmbedTexts;
      const originalRunAiRequest = runAiRequest;

      astRagLoadIndexDocument = () => ({
        indexFileId: 'idx',
        fileName: 'idx.json',
        document: {
          embedding: {
            provider: 'openai',
            model: 'text-embedding-3-small'
          },
          chunks: [{
            chunkId: 'chunk_1',
            sourceId: 'src_1',
            fileId: 'file_1',
            fileName: 'doc.txt',
            mimeType: 'text/plain',
            page: null,
            slide: null,
            section: 'body',
            text: 'Project risks include timeline slippage and staffing constraints.',
            embedding: [1, 0, 0]
          }]
        }
      });

      astRagEmbedTexts = () => ({
        vectors: [[1, 0, 0]],
        usage: {
          inputTokens: 1,
          totalTokens: 1
        }
      });

      runAiRequest = () => ({
        output: {
          json: {
            answer: 'Risk details [S1]',
            citations: ['S1']
          }
        },
        usage: {
          inputTokens: 2,
          outputTokens: 3,
          totalTokens: 5
        }
      });

      try {
        const out = AST.RAG.answer({
          indexFileId: 'idx',
          question: 'What are the top risks?',
          retrieval: {
            mode: 'hybrid',
            topK: 4,
            minScore: 0,
            vectorWeight: 0.5,
            lexicalWeight: 0.5
          },
          generation: {
            provider: 'openai',
            auth: { apiKey: 'test-key' }
          },
          options: {
            requireCitations: true
          }
        });

        if (!out.retrieval || out.retrieval.mode !== 'hybrid') {
          throw new Error(`Expected retrieval.mode=hybrid, got ${JSON.stringify(out.retrieval)}`);
        }
      } finally {
        astRagLoadIndexDocument = originalLoad;
        astRagEmbedTexts = originalEmbed;
        runAiRequest = originalRunAiRequest;
      }
    }
  }
];
