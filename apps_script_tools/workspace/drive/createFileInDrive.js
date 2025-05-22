function createFileInDrive(fileType, fileName, { content = null, destinationFolder = null } = {}) {
  let newFile;

  switch (fileType) {
    case `spreadsheet`:
      newFile = SpreadsheetApp.create(fileName);
      break;

    case `document`:
      newFile = DocumentApp.create(fileName);
      break;

    case `presentation`:
      newFile = SlidesApp.create(fileName);
      break;

    case `form`:
      newFile = FormApp.create(fileName);
      break;

    case `json`:
      if (!content || !Array.isArray(content)) throw new Error("Valid records are required to create a JSON file.");
      const jsonContent = JSON.stringify(content, null, 2);
      newFile = DriveApp.createFile(`${fileName}.json`, jsonContent);
      break;

    case `csv`:
        if (!content || !Array.isArray(content)) throw new Error("Valid records are required to create a CSV file.");
        const csvContent = convertRecordsToCsvFormat(content);
        newFile = DriveApp.createFile(`${fileName}.csv`, csvContent);
        break;

    default:
        throw new Error('Unsupported file type');
  }

  if (destinationFolder) {
      const file = DriveApp.getFileById(newFile.getId());
      file.moveTo(destinationFolder);
  }

  return newFile;
};
