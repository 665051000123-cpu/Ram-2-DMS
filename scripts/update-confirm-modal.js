const fs = require('fs');
const files = [
  'd:/RAM2 DMS(Document system)/dms-web/src/components/FolderSettings.tsx',
  'd:/RAM2 DMS(Document system)/dms-web/src/components/DepartmentSettings.tsx',
  'd:/RAM2 DMS(Document system)/dms-web/src/components/DocumentList.tsx',
  'd:/RAM2 DMS(Document system)/dms-web/src/components/UserList.tsx'
];

files.forEach(file => {
  if (fs.existsSync(file)) {
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/requirePassword=\{confirmModal\.action === "DELETE"\}/g, 'requirePassword={confirmModal.action === "DELETE" || confirmModal.action === "EDIT"}');
    fs.writeFileSync(file, content, 'utf8');
    console.log('Updated ' + file);
  }
});
