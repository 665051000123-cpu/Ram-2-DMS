const fs = require('fs');
const path = require('path');

const filesToProcess = [
  'src/components/DocumentList.tsx',
  'src/app/(dashboard)/settings/page.tsx',
  'src/components/StorageSettings.tsx',
  'src/components/DepartmentSettings.tsx',
  'src/app/(dashboard)/documents/[id]/DocumentDetailClient.tsx',
  'src/components/UploadModal.tsx',
  'src/components/ShareModal.tsx',
  'src/components/ConfirmModal.tsx'
];

const replacements = [
  { from: /\bbg-white(?!(\/| dark))/g, to: 'bg-white dark:bg-slate-900 transition-colors' },
  { from: /\bbg-slate-50(?!(\/| dark))/g, to: 'bg-slate-50 dark:bg-slate-900/50 transition-colors' },
  { from: /\bborder-slate-200(?!(\/| dark))/g, to: 'border-slate-200 dark:border-slate-800' },
  { from: /\bborder-slate-100(?!(\/| dark))/g, to: 'border-slate-100 dark:border-slate-800' },
  { from: /\btext-slate-800(?!(\/| dark))/g, to: 'text-slate-800 dark:text-slate-100' },
  { from: /\btext-slate-700(?!(\/| dark))/g, to: 'text-slate-700 dark:text-slate-200' },
  { from: /\btext-slate-600(?!(\/| dark))/g, to: 'text-slate-600 dark:text-slate-300' },
  { from: /\btext-slate-500(?!(\/| dark))/g, to: 'text-slate-500 dark:text-slate-400' },
  { from: /\btext-slate-400(?!(\/| dark))/g, to: 'text-slate-400 dark:text-slate-500' },
  { from: /\bhover:bg-slate-50(?!(\/| dark))/g, to: 'hover:bg-slate-50 dark:hover:bg-slate-800/50' },
  { from: /\bbg-slate-100(?!(\/| dark))/g, to: 'bg-slate-100 dark:bg-slate-800' },
  { from: /\bbg-blue-50(?!(\/| dark))/g, to: 'bg-blue-50 dark:bg-blue-900/30' },
  { from: /\bbg-yellow-50(?!(\/| dark))/g, to: 'bg-yellow-50 dark:bg-yellow-900/30' },
  { from: /\bbg-red-50(?!(\/| dark))/g, to: 'bg-red-50 dark:bg-red-900/30' },
  { from: /\bbg-emerald-50(?!(\/| dark))/g, to: 'bg-emerald-50 dark:bg-emerald-900/30' },
  { from: /\bbg-amber-50(?!(\/| dark))/g, to: 'bg-amber-50 dark:bg-amber-900/30' },
  { from: /\btext-blue-600(?!(\/| dark))/g, to: 'text-blue-600 dark:text-blue-400' },
  { from: /\bhover:text-blue-700(?!(\/| dark))/g, to: 'hover:text-blue-700 dark:hover:text-blue-300' }
];

filesToProcess.forEach(file => {
  const filePath = path.join(__dirname, '..', file);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Check if we already applied dark mode to prevent duplicate dark: classes
    if (!content.includes('dark:bg-slate-900')) {
      replacements.forEach(r => {
        content = content.replace(r.from, r.to);
      });
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated: ${file}`);
    } else {
      console.log(`Skipped (already updated): ${file}`);
    }
  } else {
    console.log(`File not found: ${file}`);
  }
});
