require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const db = require('../src/config/db');

db('uploaded_files')
  .select('id', 'original_name', 'status', 'google_file_id')
  .orderBy('id', 'desc')
  .limit(10)
  .then(rows => {
    console.log(JSON.stringify(rows, null, 2));
    process.exit(0);
  })
  .catch(e => { console.error(e.message); process.exit(1); });
