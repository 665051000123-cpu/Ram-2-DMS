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

const badgeReplacements = [
  // Fix hover background classes being applied statically in dark mode
  { from: /hover:bg-blue-50 dark:bg-blue-900\/40/g, to: 'hover:bg-blue-50 dark:hover:bg-blue-500/20' },
  { from: /hover:bg-red-50 dark:bg-red-900\/40/g, to: 'hover:bg-red-50 dark:hover:bg-red-500/20' },
  { from: /hover:bg-yellow-50 dark:bg-yellow-900\/40/g, to: 'hover:bg-yellow-50 dark:hover:bg-yellow-500/20' },
  { from: /hover:bg-emerald-50 dark:bg-emerald-900\/40/g, to: 'hover:bg-emerald-50 dark:hover:bg-emerald-500/20' },
  { from: /hover:bg-amber-50 dark:bg-amber-900\/40/g, to: 'hover:bg-amber-50 dark:hover:bg-amber-500/20' },

  // Fix badges lacking dark mode colors completely
  { from: /\bbg-purple-100\b/g, to: 'bg-purple-100 dark:bg-purple-500/20' },
  { from: /\btext-purple-700\b/g, to: 'text-purple-700 dark:text-purple-300' },
  { from: /\bbg-amber-100\b/g, to: 'bg-amber-100 dark:bg-amber-500/20' },
  { from: /\btext-amber-700\b/g, to: 'text-amber-700 dark:text-amber-300' },
  { from: /\bbg-blue-100\b/g, to: 'bg-blue-100 dark:bg-blue-500/20' },
  { from: /\btext-blue-700\b/g, to: 'text-blue-700 dark:text-blue-300' },
  { from: /\bbg-emerald-100\b/g, to: 'bg-emerald-100 dark:bg-emerald-500/20' },
  { from: /\btext-emerald-700\b/g, to: 'text-emerald-700 dark:text-emerald-300' },
  { from: /\bbg-yellow-100\b/g, to: 'bg-yellow-100 dark:bg-yellow-500/20' },
  { from: /\btext-yellow-700\b/g, to: 'text-yellow-700 dark:text-yellow-300' },
  { from: /\bbg-red-100\b/g, to: 'bg-red-100 dark:bg-red-500/20' },
  { from: /\btext-red-700\b/g, to: 'text-red-700 dark:text-red-300' },
  
  // Also brighten previously muddy backgrounds (900/40) for regular colored backgrounds
  { from: /dark:bg-blue-900\/40/g, to: 'dark:bg-blue-500/20' },
  { from: /dark:bg-yellow-900\/40/g, to: 'dark:bg-yellow-500/20' },
  { from: /dark:bg-red-900\/40/g, to: 'dark:bg-red-500/20' },
  { from: /dark:bg-emerald-900\/40/g, to: 'dark:bg-emerald-500/20' },
  { from: /dark:bg-amber-900\/40/g, to: 'dark:bg-amber-500/20' },
  { from: /dark:bg-purple-900\/40/g, to: 'dark:bg-purple-500/20' },

  // And make colored texts brighter
  { from: /dark:text-blue-400/g, to: 'dark:text-blue-300' },
  { from: /dark:text-yellow-400/g, to: 'dark:text-yellow-300' },
  { from: /dark:text-red-400/g, to: 'dark:text-red-300' },
  { from: /dark:text-emerald-400/g, to: 'dark:text-emerald-300' },
  { from: /dark:text-amber-400/g, to: 'dark:text-amber-300' },
  { from: /dark:text-purple-400/g, to: 'dark:text-purple-300' }
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

  badgeReplacements.forEach(r => {
    content = content.replace(r.from, r.to);
  });

  // some cleanup just in case
  content = content.replace(/dark:bg-purple-500\/20 dark:bg-purple-500\/20/g, 'dark:bg-purple-500/20');

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath.split('\\src\\')[1]}`);
  }
});
