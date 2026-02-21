function astRagExtractTextFromTable(pageElement) {
  const lines = [];

  try {
    const table = pageElement.asTable();
    const rowCount = table.getNumRows();

    for (let row = 0; row < rowCount; row += 1) {
      const columnCount = table.getRow(row).getNumCells();
      const rowValues = [];

      for (let column = 0; column < columnCount; column += 1) {
        const cellText = table.getCell(row, column).getText();
        const normalized = astRagNormalizeString(cellText ? cellText.asString() : '', '');
        rowValues.push(normalized || '');
      }

      lines.push(rowValues.join(' | ').trim());
    }
  } catch (_error) {
    return '';
  }

  return lines.join('\n').trim();
}

function astRagExtractSlideBodyText(slide) {
  const lines = [];
  const elements = slide.getPageElements();

  for (let idx = 0; idx < elements.length; idx += 1) {
    const element = elements[idx];

    try {
      if (typeof element.asShape === 'function') {
        const shapeText = element.asShape().getText();
        const text = astRagNormalizeString(shapeText ? shapeText.asString() : '', null);
        if (text) {
          lines.push(text);
          continue;
        }
      }
    } catch (_error) {
      // ignore non-shape elements
    }

    try {
      if (typeof element.asTable === 'function') {
        const tableText = astRagExtractTextFromTable(element);
        if (tableText) {
          lines.push(tableText);
        }
      }
    } catch (_error) {
      // ignore non-table elements
    }
  }

  return lines.join('\n').trim();
}

function astRagExtractSlideNotesText(slide) {
  try {
    const notesPage = slide.getNotesPage();
    if (!notesPage || typeof notesPage.getSpeakerNotesShape !== 'function') {
      return '';
    }

    const shape = notesPage.getSpeakerNotesShape();
    if (!shape || typeof shape.getText !== 'function') {
      return '';
    }

    const textRange = shape.getText();
    const text = astRagNormalizeString(textRange ? textRange.asString() : '', '');

    if (text === 'Click to add speaker notes') {
      return '';
    }

    return text;
  } catch (_error) {
    return '';
  }
}

function astRagReadDriveSourceText(sourceDescriptor, auth = {}, options = {}) {
  const sourceType = AST_RAG_SOURCE_TYPE_BY_MIME[sourceDescriptor.mimeType];
  const file = sourceDescriptor.driveFile;

  if (!sourceType) {
    throw new AstRagSourceError('Unsupported source mime type', {
      fileId: sourceDescriptor.fileId,
      mimeType: sourceDescriptor.mimeType
    });
  }

  if (sourceType === 'txt') {
    const text = file.getBlob().getDataAsString();
    return {
      segments: [{ section: 'body', page: null, slide: null, text: text || '' }],
      combinedText: text || ''
    };
  }

  if (sourceType === 'google_doc') {
    if (typeof DocumentApp === 'undefined' || !DocumentApp || typeof DocumentApp.openById !== 'function') {
      throw new AstRagSourceError('DocumentApp.openById is not available for Google Doc extraction', {
        fileId: sourceDescriptor.fileId
      });
    }

    const doc = DocumentApp.openById(sourceDescriptor.fileId);
    const text = doc.getBody().getText() || '';

    return {
      segments: [{ section: 'body', page: null, slide: null, text }],
      combinedText: text
    };
  }

  if (sourceType === 'google_slide') {
    if (typeof SlidesApp === 'undefined' || !SlidesApp || typeof SlidesApp.openById !== 'function') {
      throw new AstRagSourceError('SlidesApp.openById is not available for Google Slides extraction', {
        fileId: sourceDescriptor.fileId
      });
    }

    const presentation = SlidesApp.openById(sourceDescriptor.fileId);
    const slides = presentation.getSlides();
    const segments = [];

    for (let idx = 0; idx < slides.length; idx += 1) {
      const slideNumber = idx + 1;
      const slide = slides[idx];
      const bodyText = astRagExtractSlideBodyText(slide);
      const notesText = astRagExtractSlideNotesText(slide);

      if (bodyText) {
        segments.push({
          section: 'body',
          page: null,
          slide: slideNumber,
          text: bodyText
        });
      }

      if (notesText) {
        segments.push({
          section: 'notes',
          page: null,
          slide: slideNumber,
          text: notesText
        });
      }
    }

    const combinedText = segments.map(segment => segment.text).join('\n\n').trim();
    return {
      segments,
      combinedText
    };
  }

  if (sourceType === 'pdf') {
    return astRagExtractPdfTextWithGemini(sourceDescriptor, auth, options);
  }

  throw new AstRagSourceError('Unsupported source type', {
    fileId: sourceDescriptor.fileId,
    sourceType
  });
}
