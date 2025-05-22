function readFileFromDrive(fileId, fileType, options = {}) {
  const file = DriveApp.getFileById(fileId);
  const content = file.getBlob().getDataAsString();
  
  switch (fileType.toLowerCase()) {
    case 'txt':
      return content;

    case 'json':
      return JSON.parse(content);
      
    case 'csv':
      const { headerRow = 0, delimiter = ',' } = options;
      const csvArrays = Utilities.parseCsv(content, delimiter);
      return zipArraysIntoRecords(csvArrays, headerRow);
      
    default:
      throw new Error('Unsupported file type. Use "txt", "json" or "csv".');
  }
};
