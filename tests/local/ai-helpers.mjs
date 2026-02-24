import { listScriptFiles, loadScripts } from './helpers.mjs';

export function loadAiScripts(context, { includeAst = false } = {}) {
  const shared = [
    'apps_script_tools/config/Config.js',
    'apps_script_tools/utilities/auth/vertexServiceAccountAuthCore.js'
  ];
  const general = listScriptFiles('apps_script_tools/ai/general');
  const providers = [
    'apps_script_tools/ai/openai/runOpenAi.js',
    'apps_script_tools/ai/gemini/runGemini.js',
    'apps_script_tools/ai/vertexGemini/runVertexGemini.js',
    'apps_script_tools/ai/openrouter/runOpenRouter.js',
    'apps_script_tools/ai/perplexity/runPerplexity.js',
    'apps_script_tools/ai/AI.js'
  ];

  const paths = [...shared, ...general, ...providers];

  if (includeAst) {
    paths.push('apps_script_tools/AST.js');
  }

  loadScripts(context, paths);
  return context;
}
