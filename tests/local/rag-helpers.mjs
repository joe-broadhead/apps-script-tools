import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadRagScripts(
  context,
  {
    includeAst = false,
    includeAi = true,
    includeUtilities = true
  } = {}
) {
  const paths = [];

  if (includeUtilities) {
    paths.push(...listScriptFiles('apps_script_tools/utilities'));
  } else {
    paths.push('apps_script_tools/utilities/auth/vertexServiceAccountAuthCore.js');
  }

  if (includeAi) {
    paths.push(...listScriptFiles('apps_script_tools/ai/general'));
    paths.push(
      'apps_script_tools/ai/openai/runOpenAi.js',
      'apps_script_tools/ai/gemini/runGemini.js',
      'apps_script_tools/ai/vertexGemini/runVertexGemini.js',
      'apps_script_tools/ai/openrouter/runOpenRouter.js',
      'apps_script_tools/ai/perplexity/runPerplexity.js',
      'apps_script_tools/ai/AI.js'
    );
  }

  paths.push(...listScriptFiles('apps_script_tools/rag/general'));
  paths.push('apps_script_tools/rag/RAG.js');

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
