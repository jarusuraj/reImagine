const fs = require('fs');
const path = require('path');

const projectDir = process.cwd();

const filesToProcess = [
  '.env',
  '.env.example',
  'vite.config.ts',
  'src/vite-env.d.ts',
  'src/App.tsx',
  'src/background.ts',
  'src/content.ts',
  'src/index.css',
  'public/content.css',
  'src/components/Footer.tsx',
  'src/components/Header.tsx',
  'src/components/HistorySidebar.tsx',
  'src/components/LangSelector.tsx',
  'src/components/Workbench.tsx',
  'src/constants/languages.ts',
  'src/hooks/useHistory.ts',
  'src/hooks/useTheme.ts',
  'src/hooks/useTranslation.ts',
  'src/services/translation.ts',
  'src/services/translation.test.ts',
  'src/types/index.ts',
  'package.json',
  'index.html'
];

function processFile(filePath) {
  const fullPath = path.join(projectDir, filePath);
  if (!fs.existsSync(fullPath)) return;

  let content = fs.readFileSync(fullPath, 'utf8');

  // 1. Replace TMT_API with REIMAGINE_API
  content = content.replace(/TMT_API/g, 'REIMAGINE_API');
  
  // 2. Replace TMT (standalone or with separators) with reImagine
  // We'll use a regex that matches 'tmt' case-insensitively but we need to be careful about what we replace it with.
  // The user said replace it with 'reImagine'.
  
  content = content.replace(/tmt/gi, 'reImagine');

  fs.writeFileSync(fullPath, content);
  console.log(`Processed ${filePath}`);
}

filesToProcess.forEach(processFile);
