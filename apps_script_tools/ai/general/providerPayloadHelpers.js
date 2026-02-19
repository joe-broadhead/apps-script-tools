function astAiSafeJsonParse(value) {
  if (typeof value !== 'string') {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
}

function astAiNormalizeTextContent(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map(part => {
        if (typeof part === 'string') {
          return part;
        }

        if (!part || typeof part !== 'object') {
          return '';
        }

        if (typeof part.text === 'string') {
          return part.text;
        }

        if (part.type === 'text' && typeof part.value === 'string') {
          return part.value;
        }

        return '';
      })
      .join('\n')
      .trim();
  }

  if (content == null) {
    return '';
  }

  return String(content);
}

function astAiMaybeParseDataUri(uri) {
  if (typeof uri !== 'string') {
    return null;
  }

  const match = uri.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) {
    return null;
  }

  return {
    mimeType: match[1],
    base64: match[2]
  };
}

function astAiBuildOpenAiContent(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return astAiNormalizeTextContent(content);
  }

  return content.map(part => {
    if (typeof part === 'string') {
      return {
        type: 'text',
        text: part
      };
    }

    if (!part || typeof part !== 'object') {
      return {
        type: 'text',
        text: ''
      };
    }

    const type = String(part.type || '').toLowerCase();

    if (type === 'text') {
      return {
        type: 'text',
        text: typeof part.text === 'string' ? part.text : ''
      };
    }

    if (type === 'image' || type === 'input_image' || type === 'image_url') {
      if (part.image_url) {
        return {
          type: 'image_url',
          image_url: typeof part.image_url === 'string'
            ? { url: part.image_url }
            : part.image_url
        };
      }

      if (typeof part.url === 'string') {
        return {
          type: 'image_url',
          image_url: { url: part.url }
        };
      }

      if (typeof part.base64 === 'string') {
        return {
          type: 'image_url',
          image_url: {
            url: `data:${part.mimeType || 'image/png'};base64,${part.base64}`
          }
        };
      }
    }

    return {
      type: 'text',
      text: astAiNormalizeTextContent(part)
    };
  });
}

function astAiBuildOpenAiMessages(messages) {
  return messages.map((message, index) => {
    const role = message.role || 'user';

    if (role === 'tool') {
      return {
        role: 'tool',
        content: astAiNormalizeTextContent(message.content),
        tool_call_id: message.toolCallId || `tool_call_${index + 1}`,
        name: message.name || ''
      };
    }

    const output = {
      role,
      content: astAiBuildOpenAiContent(message.content)
    };

    if (role === 'assistant' && Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
      output.tool_calls = message.toolCalls.map((toolCall, callIndex) => ({
        id: toolCall.id || `tool_call_${callIndex + 1}`,
        type: 'function',
        function: {
          name: toolCall.name,
          arguments: typeof toolCall.arguments === 'string'
            ? toolCall.arguments
            : JSON.stringify(toolCall.arguments || {})
        }
      }));
    }

    return output;
  });
}

function astAiBuildOpenAiTools(tools) {
  if (!Array.isArray(tools)) {
    return [];
  }

  return tools.map(tool => ({
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description || '',
      parameters: tool.inputSchema || { type: 'object', properties: {} }
    }
  }));
}

function astAiExtractOpenAiText(content) {
  if (typeof content === 'string') {
    return content;
  }

  if (!Array.isArray(content)) {
    return '';
  }

  return content
    .map(part => {
      if (typeof part === 'string') {
        return part;
      }

      if (!part || typeof part !== 'object') {
        return '';
      }

      if (typeof part.text === 'string') {
        return part.text;
      }

      if (part.type === 'text' && typeof part.value === 'string') {
        return part.value;
      }

      return '';
    })
    .join('')
    .trim();
}

function astAiExtractOpenAiToolCalls(message) {
  const toolCalls = Array.isArray(message && message.tool_calls)
    ? message.tool_calls
    : [];

  return toolCalls.map((toolCall, index) => {
    const functionCall = toolCall.function || {};
    const parsedArgs = astAiSafeJsonParse(functionCall.arguments);

    return {
      id: toolCall.id || `tool_call_${index + 1}`,
      name: functionCall.name || '',
      arguments: parsedArgs || functionCall.arguments || {}
    };
  });
}

function astAiPromptFromMessages(messages) {
  for (let idx = messages.length - 1; idx >= 0; idx--) {
    const message = messages[idx];
    if (message.role === 'user') {
      return astAiNormalizeTextContent(message.content);
    }
  }

  return astAiNormalizeTextContent(messages[0] ? messages[0].content : '');
}

function astAiParseGenericImages(payload = {}) {
  const images = [];

  if (Array.isArray(payload.data)) {
    payload.data.forEach(item => {
      if (!item || typeof item !== 'object') {
        return;
      }

      if (typeof item.b64_json === 'string') {
        images.push({
          base64: item.b64_json,
          mimeType: item.mime_type || 'image/png',
          width: item.width || null,
          height: item.height || null
        });
        return;
      }

      if (typeof item.url === 'string') {
        const parsed = astAiMaybeParseDataUri(item.url);
        if (parsed) {
          images.push({
            base64: parsed.base64,
            mimeType: parsed.mimeType
          });
        }
      }
    });
  }

  const choice = payload.choices && payload.choices[0];
  const message = choice && choice.message;

  if (Array.isArray(message && message.images)) {
    message.images.forEach(image => {
      if (!image || typeof image !== 'object' || typeof image.base64 !== 'string') {
        return;
      }

      images.push({
        base64: image.base64,
        mimeType: image.mimeType || 'image/png',
        width: image.width || null,
        height: image.height || null
      });
    });
  }

  const content = message && message.content;
  if (Array.isArray(content)) {
    content.forEach(part => {
      if (!part || typeof part !== 'object') {
        return;
      }

      if (part.type === 'image' && typeof part.b64_json === 'string') {
        images.push({
          base64: part.b64_json,
          mimeType: part.mime_type || 'image/png'
        });
        return;
      }

      if (part.type === 'image_url' && part.image_url && typeof part.image_url.url === 'string') {
        const parsed = astAiMaybeParseDataUri(part.image_url.url);
        if (parsed) {
          images.push({
            base64: parsed.base64,
            mimeType: parsed.mimeType
          });
        }
      }
    });
  }

  return images;
}

function astAiBuildGeminiParts(content) {
  if (typeof content === 'string') {
    return [{ text: content }];
  }

  if (!Array.isArray(content)) {
    return [{ text: astAiNormalizeTextContent(content) }];
  }

  const parts = [];

  content.forEach(part => {
    if (typeof part === 'string') {
      parts.push({ text: part });
      return;
    }

    if (!part || typeof part !== 'object') {
      return;
    }

    const type = String(part.type || '').toLowerCase();

    if (type === 'text') {
      parts.push({ text: typeof part.text === 'string' ? part.text : '' });
      return;
    }

    if (type === 'image' || type === 'input_image' || type === 'inline_data') {
      if (typeof part.base64 === 'string') {
        parts.push({
          inlineData: {
            mimeType: part.mimeType || 'image/png',
            data: part.base64
          }
        });
        return;
      }

      if (part.inlineData && typeof part.inlineData.data === 'string') {
        parts.push({
          inlineData: {
            mimeType: part.inlineData.mimeType || 'image/png',
            data: part.inlineData.data
          }
        });
        return;
      }
    }

    if (type === 'image_url' && part.image_url && typeof part.image_url.url === 'string') {
      const parsed = astAiMaybeParseDataUri(part.image_url.url);
      if (parsed) {
        parts.push({
          inlineData: {
            mimeType: parsed.mimeType,
            data: parsed.base64
          }
        });
      } else {
        parts.push({
          fileData: {
            mimeType: part.mimeType || 'image/png',
            fileUri: part.image_url.url
          }
        });
      }
      return;
    }

    parts.push({ text: astAiNormalizeTextContent(part) });
  });

  if (parts.length === 0) {
    parts.push({ text: '' });
  }

  return parts;
}

function astAiBuildGeminiContents(messages) {
  const contents = [];

  messages.forEach(message => {
    if (message.role === 'system') {
      return;
    }

    if (message.role === 'assistant') {
      const parts = [];

      if (Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
        message.toolCalls.forEach(toolCall => {
          parts.push({
            functionCall: {
              name: toolCall.name,
              args: typeof toolCall.arguments === 'string'
                ? astAiSafeJsonParse(toolCall.arguments) || {}
                : (toolCall.arguments || {})
            }
          });
        });
      }

      const text = astAiNormalizeTextContent(message.content);
      if (text) {
        parts.unshift({ text });
      }

      contents.push({
        role: 'model',
        parts: parts.length > 0 ? parts : [{ text: '' }]
      });
      return;
    }

    if (message.role === 'tool') {
      const parsed = astAiSafeJsonParse(astAiNormalizeTextContent(message.content));
      contents.push({
        role: 'user',
        parts: [{
          functionResponse: {
            name: message.name || 'tool',
            response: parsed || { output: astAiNormalizeTextContent(message.content) }
          }
        }]
      });
      return;
    }

    contents.push({
      role: 'user',
      parts: astAiBuildGeminiParts(message.content)
    });
  });

  return contents;
}

function astAiExtractGeminiSystemInstruction(messages, explicitSystem) {
  if (typeof explicitSystem === 'string' && explicitSystem.trim().length > 0) {
    return explicitSystem.trim();
  }

  const systemParts = [];

  if (!Array.isArray(messages)) {
    return null;
  }

  messages.forEach(message => {
    if (!message || message.role !== 'system') {
      return;
    }

    const text = astAiNormalizeTextContent(message.content);
    if (text) {
      systemParts.push(text);
    }
  });

  if (systemParts.length === 0) {
    return null;
  }

  return systemParts.join('\n').trim();
}

function astAiExtractGeminiOutput(responseJson) {
  const candidate = responseJson && responseJson.candidates && responseJson.candidates[0]
    ? responseJson.candidates[0]
    : {};

  const content = candidate.content || {};
  const parts = Array.isArray(content.parts) ? content.parts : [];

  const textParts = [];
  const toolCalls = [];
  const images = [];

  parts.forEach((part, index) => {
    if (!part || typeof part !== 'object') {
      return;
    }

    if (typeof part.text === 'string') {
      textParts.push(part.text);
    }

    if (part.functionCall && typeof part.functionCall.name === 'string') {
      toolCalls.push({
        id: part.functionCall.id || `tool_call_${index + 1}`,
        name: part.functionCall.name,
        arguments: part.functionCall.args || {}
      });
    }

    if (part.inlineData && typeof part.inlineData.data === 'string') {
      images.push({
        base64: part.inlineData.data,
        mimeType: part.inlineData.mimeType || 'image/png'
      });
    }
  });

  return {
    text: textParts.join('\n').trim(),
    toolCalls,
    images,
    finishReason: candidate.finishReason || null,
    usage: {
      inputTokens: responseJson && responseJson.usageMetadata ? responseJson.usageMetadata.promptTokenCount : 0,
      outputTokens: responseJson && responseJson.usageMetadata ? responseJson.usageMetadata.candidatesTokenCount : 0,
      totalTokens: responseJson && responseJson.usageMetadata ? responseJson.usageMetadata.totalTokenCount : 0
    }
  };
}
