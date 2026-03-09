const fs = require('fs');

function processFile(path) {
  if (!fs.existsSync(path)) {
    throw new Error('File not found');
  }

  try {
    const data = fs.readFileSync(path, 'utf-8');
    return data.split('\n');
  } catch (err) {
    console.error(err);
    return [];
  }
}

module.exports = { processFile };
