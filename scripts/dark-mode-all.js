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

// For this 3rd pass to fix the "faded" look, we will brighten text and borders.
const brightenReplacements = [
  // Text Brightening
  { from: /dark:text-slate-400/g, to: 'dark:text-slate-300' },
  { from: /dark:text-slate-500/g, to: 'dark:text-slate-300' },
  { from: /dark:text-slate-300/g, to: 'dark:text-slate-200' },
  { from: /dark:text-slate-200/g, to: 'dark:text-slate-100' },
  { from: /dark:text-slate-100/g, to: 'dark:text-white' },

  // Border Brightening (make borders more visible)
  { from: /dark:border-slate-800/g, to: 'dark:border-slate-700' },
  { from: /dark:border-slate-700\/50/g, to: 'dark:border-slate-600' },
  { from: /dark:border-slate-700/g, to: 'dark:border-slate-600' },

  // Background tweaks (make inner elements stand out more)
  { from: /dark:bg-slate-900\/50/g, to: 'dark:bg-slate-800' },
  { from: /dark:bg-slate-900\/80/g, to: 'dark:bg-slate-800' },
];

allFiles.forEach(filePath => {
  if (
    filePath.includes('globals.css') ||
    filePath.includes('layout.tsx') ||
    filePath.includes('Sidebar.tsx') ||
    filePath.includes('ThemeToggle.tsx')
  ) {
    return;
  }

  let originalContent = fs.readFileSync(filePath, 'utf8');
  let content = originalContent;

  brightenReplacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  // Clean up any double applied
  content = content.replace(/dark:text-slate-2000/g, 'dark:text-slate-200'); // just in case
  content = content.replace(/dark:text-white0/g, 'dark:text-white'); 
  content = content.replace(/dark:text-white00/g, 'dark:text-white'); 

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath.split('\\src\\')[1]}`);
  }
});
