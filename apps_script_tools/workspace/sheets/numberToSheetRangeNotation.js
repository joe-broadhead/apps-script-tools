function numberToSheetRangeNotation(number) {
  let temp, letter = '';
  while (number > 0) {
    temp = (number - 1) % 26;
    letter = String.fromCharCode(temp + 65) + letter;
    number = (number - temp - 1) / 26;
  }
  return letter;
};
