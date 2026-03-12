function normalizeAnswerStyle_(answer) {
  var text = stringOrEmpty_(answer).replace(/\r\n/g, '\n').trim();
  if (!text) return '';

  text = text.replace(/^\s*(Answer|Response)\s*:\s*/i, '');
  text = text.replace(/[ \t]{2,}/g, ' ');
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  text = text.replace(/\]\s+([,.;:!?])/g, ']$1');
  text = normalizeInlineCitationsFormat_(text);

  return text;
}

function normalizeInlineCitationsFormat_(answer) {
  var text = stringOrEmpty_(answer);

  text = text.replace(/\(\s*(S\d+)\s*\)/gi, '[$1]');
  text = text.replace(/\(\s*(S\d+(?:\s*[,;]\s*S\d+)+)\s*\)/gi, function (_all, group) {
    return splitCitationGroup_(group).join(' ');
  });
  text = text.replace(/\[\s*(S\d+(?:\s*[,;]\s*S\d+)+)\s*\]/gi, function (_all, group) {
    return splitCitationGroup_(group).join(' ');
  });
  text = text.replace(/(^|[\s(])S(\d+)(?=([\s,.;:!?)]|$))/g, function (_all, lead, digits) {
    return lead + '[S' + digits + ']';
  });

  return text;
}

function splitCitationGroup_(group) {
  var ids = stringOrEmpty_(group).split(/[,;]\s*/);
  var out = [];
  for (var i = 0; i < ids.length; i += 1) {
    var id = stringOrEmpty_(ids[i]).trim().toUpperCase();
    if (/^S\d+$/.test(id)) out.push('[' + id + ']');
  }
  return out;
}

function decorateCitations_(citations) {
  var source = Array.isArray(citations) ? citations : [];
  var out = [];

  for (var i = 0; i < source.length; i += 1) {
    var citation = source[i] || {};
    out.push({
      citationId: stringOrEmpty_(citation.citationId),
      chunkId: stringOrEmpty_(citation.chunkId),
      fileId: stringOrEmpty_(citation.fileId),
      fileName: stringOrEmpty_(citation.fileName) || 'Source',
      mimeType: stringOrEmpty_(citation.mimeType),
      page: citation.page == null ? null : integerOr_(citation.page, null),
      slide: citation.slide == null ? null : integerOr_(citation.slide, null),
      score: citation.score == null ? null : numberOr_(citation.score, null),
      snippet: normalizeSnippet_(citation.snippet),
      url: stringOrEmpty_(citation.url) || toCitationUrl_(citation)
    });
  }

  return out;
}

function toCitationUrl_(citation) {
  var fileId = stringOrEmpty_(citation && citation.fileId);
  if (!fileId) return '';

  var mimeType = stringOrEmpty_(citation && citation.mimeType);
  if (mimeType === 'application/vnd.google-apps.document') {
    return 'https://docs.google.com/document/d/' + fileId + '/edit';
  }
  if (mimeType === 'application/vnd.google-apps.presentation') {
    return 'https://docs.google.com/presentation/d/' + fileId + '/edit';
  }
  if (mimeType === 'application/vnd.google-apps.spreadsheet') {
    return 'https://docs.google.com/spreadsheets/d/' + fileId + '/edit';
  }
  return 'https://drive.google.com/file/d/' + fileId + '/view';
}

function normalizeSnippet_(snippet) {
  return stringOrEmpty_(snippet)
    .replace(/\s+/g, ' ')
    .replace(/\u0000/g, '')
    .trim()
    .slice(0, 420);
}
