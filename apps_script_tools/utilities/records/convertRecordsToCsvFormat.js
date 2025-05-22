function convertRecordsToCsvFormat(records) {
  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("Invalid data for CSV. Provide a non-empty array of objects.");
  }

  const headers = Object.keys(records[0]);
  const csvRows = records.reduce((acc, record) => {
    const row = headers.map(header => JSON.stringify(record[header] || ""));
    acc.push(row.join(','));
    return acc;
  }, [headers.join(',')]);

  return csvRows.join('\n');
};
