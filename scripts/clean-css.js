const fs = require('fs');
const path = require('path');

function getAllFiles(dirPath, arrayOfFiles) {
  const files = fs.readdirSync(dirPath);
  arrayOfFiles = arrayOfFiles || [];
  
  files.forEach(function(file) {
    if (fs.statSync(dirPath + "/" + file).isDirectory()) {
      arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js')) {
        arrayOfFiles.push(path.join(dirPath, file));
      }
    }
  });
  
  return arrayOfFiles;
}

const allFiles = getAllFiles(path.join(__dirname, '..', 'src'));

allFiles.forEach(filePath => {
  let originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;

  // Fix known invalid tailwind classes caused by regex replacement stacking
  content = content.replace(/transition-colors\/50/g, 'transition-colors');
  content = content.replace(/dark:bg-blue-500\/20\/30/g, 'dark:bg-blue-500/20');
  content = content.replace(/dark:bg-slate-800 dark:bg-slate-800/g, 'dark:bg-slate-800');
  content = content.replace(/dark:text-white dark:text-white/g, 'dark:text-white');
  content = content.replace(/transition-colors transition-colors/g, 'transition-colors');
  content = content.replace(/dark:bg-slate-800 transition-colors/g, 'dark:bg-slate-800'); // sometimes appended improperly at end of class string
  // Remove static background when hover was intended (caused by double replace)
  // Example: hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors dark:bg-slate-800 transition-colors
  content = content.replace(/dark:hover:bg-slate-800\/80 dark:bg-slate-800/g, 'dark:hover:bg-slate-800/80');
  content = content.replace(/dark:hover:bg-slate-800\/80 transition-colors dark:bg-slate-800/g, 'dark:hover:bg-slate-800/80 transition-colors');
  
  // also fix table row hover bg in DepartmentSettings and UserList
  content = content.replace(/className="hover:bg-slate-50 dark:hover:bg-slate-800\/80 transition-colors dark:bg-slate-800"/g, 'className="hover:bg-slate-50 dark:hover:bg-slate-800/80 transition-colors"');
  
  // fix disabled text
  content = content.replace(/disabled:hover:text-slate-400 dark:text-white/g, 'dark:disabled:hover:text-slate-400');

  // Fix multiple spaces
  content = content.replace(/  +/g, ' ');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath.split('\\src\\')[1]}`);
  }
});
