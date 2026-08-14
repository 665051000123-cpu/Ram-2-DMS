const fs = require('fs');
const lines = fs.readFileSync('src/components/DocumentList.tsx', 'utf8').split('\n');

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('type="file"')) {
    console.log(`Line ${i+1}:`);
    console.log(lines.slice(Math.max(0, i-5), i+10).join('\n'));
    console.log('----------------');
  }
}
