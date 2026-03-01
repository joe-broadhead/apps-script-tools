function astRagExtractPdfResponseText(responseJson) {
  const candidates = Array.isArray(responseJson && responseJson.candidates)
    ? responseJson.candidates
    : [];

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const candidate = candidates[idx];
    const parts = candidate && candidate.content && Array.isArray(candidate.content.parts)
      ? candidate.content.parts
      : [];

    for (let partIndex = 0; partIndex < parts.length; partIndex += 1) {
      const part = parts[partIndex];
      if (part && typeof part.text === 'string' && part.text.trim().length > 0) {
        return part.text;
      }
    }
  }

  return '';
}

function astRagNormalizePdfSegments(parsed, fallbackText) {
  const segments = [];

  if (parsed && Array.isArray(parsed.pages)) {
    parsed.pages.forEach((page, index) => {
      const pageText = page && typeof page.text === 'string' ? page.text.trim() : '';
      if (!pageText) {
        return;
      }

      const pageNumber = Number(page.page || page.pageNumber || index + 1);
      segments.push({
        section: 'page',
        page: isFinite(pageNumber) ? pageNumber : index + 1,
        slide: null,
        text: pageText
      });
    });
  }

  if (segments.length === 0 && typeof fallbackText === 'string' && fallbackText.trim().length > 0) {
    segments.push({
      section: 'page',
      page: 1,
      slide: null,
      text: fallbackText.trim()
    });
  }

  return segments;
}

function astRagResolvePdfExtractionModel(options = {}, auth = {}, config = {}) {
  const providerAuth = astRagResolveProviderAuth(auth, 'vertex_gemini');
  const candidates = [
    options.model,
    providerAuth.model,
    providerAuth.VERTEX_PDF_EXTRACT_MODEL,
    providerAuth.VERTEX_GEMINI_MODEL,
    config.VERTEX_PDF_EXTRACT_MODEL,
    config.VERTEX_GEMINI_MODEL,
    'gemini-2.0-flash-001'
  ];

  for (let idx = 0; idx < candidates.length; idx += 1) {
    const normalized = astRagNormalizeString(candidates[idx], null);
    if (normalized) {
      return normalized;
    }
  }

  return 'gemini-2.0-flash-001';
}

function astRagExtractPdfTextWithGemini(sourceDescriptor, auth = {}, options = {}) {
  let mimeType = sourceDescriptor.mimeType || 'application/pdf';
  let base64Data = astRagNormalizeString(sourceDescriptor.pdfBase64, null);

  if (!base64Data) {
    const file = sourceDescriptor.driveFile;
    if (!file || typeof file.getBlob !== 'function') {
      throw new AstRagSourceError('PDF extraction requires driveFile or pdfBase64 input', {
        fileId: sourceDescriptor.fileId,
        fileName: sourceDescriptor.fileName
      });
    }

    const blob = file.getBlob();
    const blobMimeType = blob && typeof blob.getContentType === 'function'
      ? blob.getContentType()
      : null;
    if (!sourceDescriptor.mimeType && blobMimeType) {
      sourceDescriptor.mimeType = blobMimeType;
      mimeType = blobMimeType;
    }

    if (typeof blob.getBytes === 'function' && typeof Utilities !== 'undefined' && Utilities && typeof Utilities.base64Encode === 'function') {
      base64Data = Utilities.base64Encode(blob.getBytes());
    } else if (typeof blob.getDataAsString === 'function' && typeof Utilities !== 'undefined' && Utilities && typeof Utilities.base64Encode === 'function') {
      base64Data = Utilities.base64Encode(blob.getDataAsString());
    }
  }

  if (!base64Data) {
    throw new AstRagSourceError('Unable to encode PDF bytes for Gemini extraction', {
      fileId: sourceDescriptor.fileId,
      fileName: sourceDescriptor.fileName
    });
  }

  const configSnapshot = astRagResolveConfigSnapshot();
  const vertexConfig = astRagResolveProviderConfig({
    provider: 'vertex_gemini',
    mode: 'generation',
    model: astRagResolvePdfExtractionModel(options, auth, configSnapshot),
    auth: astRagResolveProviderAuth(auth, 'vertex_gemini')
  });

  const endpoint = `https://${encodeURIComponent(vertexConfig.location)}-aiplatform.googleapis.com/v1/projects/${encodeURIComponent(vertexConfig.projectId)}/locations/${encodeURIComponent(vertexConfig.location)}/publishers/google/models/${encodeURIComponent(vertexConfig.model)}:generateContent`;

  const prompt = [
    'Extract text from this PDF.',
    'Return strict JSON with shape: {"pages":[{"page":1,"text":"..."}]}.',
    'Do not include markdown fences.'
  ].join(' ');

  const response = astRagHttpRequest({
    url: endpoint,
    method: 'post',
    headers: {
      Authorization: `Bearer ${vertexConfig.oauthToken}`
    },
    payload: {
      contents: [
        {
          role: 'user',
          parts: [
            { text: prompt },
            {
              inlineData: {
                mimeType,
                data: base64Data
              }
            }
          ]
        }
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: 'application/json',
        maxOutputTokens: 8192
      }
    },
    retries: astRagNormalizePositiveInt(options.retries, 2, 0)
  });

  const responseText = astRagExtractPdfResponseText(response.json || {});
  const parsed = astRagSafeJsonParse(responseText, null);

  const segments = astRagNormalizePdfSegments(parsed, responseText);
  const combinedText = segments.map(segment => segment.text).join('\n\n').trim();

  return {
    segments,
    combinedText,
    raw: response.json || null
  };
}
