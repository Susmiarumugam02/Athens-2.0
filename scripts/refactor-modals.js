#!/usr/bin/env node

/**
 * Modal Refactoring Automation Script
 * Converts old Modal pattern to new ModalForm/AppDialog pattern
 */

const fs = require('fs');
const path = require('path');

const PATTERNS = {
  // Old imports to replace
  oldImports: [
    /import\s+{\s*Modal\s*}\s+from\s+['"]\.\.\/ui\/Modal['"]/g,
    /import\s+{\s*Button\s*}\s+from\s+['"]\.\.\/ui\/Button['"]/g,
    /import\s+{\s*LoadingSpinner\s*}\s+from\s+['"]\.\.\/ui\/LoadingSpinner['"]/g,
  ],
  
  // New imports to add
  newImports: {
    form: `import { ModalForm, FormField } from '../ui/ModalForm'\nimport { Input } from '../ui/Input'`,
    dialog: `import { AppDialog, AppDialogHeader, AppDialogTitle, AppDialogBody, AppDialogFooter, AppDialogCloseButton } from '../ui/AppDialog'\nimport { Button } from '../ui/Button'`
  },
  
  // Props pattern
  oldProps: /interface\s+(\w+)Props\s*{\s*isOpen:\s*boolean\s*onClose:\s*\(\)\s*=>\s*void/g,
  newProps: (name) => `interface ${name}Props {\n  open: boolean\n  onOpenChange: (open: boolean) => void`,
  
  // Component signature
  oldSignature: /const\s+(\w+):\s*React\.FC<(\w+)Props>\s*=\s*\(\{\s*isOpen,\s*onClose,/g,
  newSignature: (name, propsName) => `const ${name}: React.FC<${propsName}Props> = ({\n  open,\n  onOpenChange,`,
  
  // Modal wrapper
  oldModalOpen: /<Modal\s+isOpen={isOpen}\s+onClose={onClose}/g,
  newModalOpen: '<AppDialog open={open} onOpenChange={onOpenChange}',
  
  // State
  oldLoading: /const\s+\[is(\w+),\s*setIs\1\]\s*=\s*useState\(false\)/g,
  newLoading: 'const [loading, setLoading] = useState(false)',
  
  // Form setup
  oldForm: /const\s*{\s*register,\s*handleSubmit,\s*formState:\s*{\s*errors\s*}[^}]*}\s*=\s*useForm/g,
  newForm: `const form = useForm<FormData>({\n    mode: 'onChange',\n    defaultValues: { /* fields */ }\n  })\n  const { register, formState: { errors } } = form`,
};

function detectModalType(content) {
  if (content.includes('useForm') && content.includes('register')) {
    return 'form';
  }
  if (content.includes('handleSubmit') || content.includes('onSave')) {
    return 'form';
  }
  return 'dialog';
}

function refactorModal(filePath) {
  console.log(`\n📝 Refactoring: ${filePath}`);
  
  let content = fs.readFileSync(filePath, 'utf8');
  const originalLength = content.length;
  
  // Detect modal type
  const modalType = detectModalType(content);
  console.log(`   Type: ${modalType}`);
  
  // Replace imports
  content = content.replace(
    /import\s+{\s*Modal\s*}\s+from\s+['"][^'"]+['"]/g,
    modalType === 'form' ? PATTERNS.newImports.form : PATTERNS.newImports.dialog
  );
  
  // Replace props interface
  content = content.replace(
    /isOpen:\s*boolean/g,
    'open: boolean'
  );
  content = content.replace(
    /onClose:\s*\(\)\s*=>\s*void/g,
    'onOpenChange: (open: boolean) => void'
  );
  
  // Replace component signature
  content = content.replace(/isOpen,/g, 'open,');
  content = content.replace(/onClose,/g, 'onOpenChange,');
  content = content.replace(/onClose\)/g, 'onOpenChange)');
  
  // Replace loading state
  content = content.replace(/\[is(\w+),\s*setIs\1\]/g, '[loading, setLoading]');
  content = content.replace(/isLoading/g, 'loading');
  content = content.replace(/setIsLoading/g, 'setLoading');
  content = content.replace(/isSubmitting/g, 'loading');
  content = content.replace(/setIsSubmitting/g, 'setLoading');
  
  // Replace Modal component
  if (modalType === 'form') {
    content = content.replace(
      /<Modal[^>]*>/g,
      '<ModalForm\n      open={open}\n      onOpenChange={onOpenChange}\n      title=""\n      form={form}\n      onSubmit={onSubmit}\n      loading={loading}\n      size="lg"\n    >'
    );
    content = content.replace(/<\/Modal>/g, '</ModalForm>');
  } else {
    content = content.replace(
      /<Modal[^>]*>/g,
      '<AppDialog open={open} onOpenChange={onOpenChange} size="md">'
    );
    content = content.replace(/<\/Modal>/g, '</AppDialog>');
  }
  
  // Replace onClose calls
  content = content.replace(/onClose\(\)/g, 'onOpenChange(false)');
  
  // Remove early return
  content = content.replace(/if\s*\(!isOpen\)\s*return\s*null\s*/g, '');
  content = content.replace(/if\s*\(!open\)\s*return\s*null\s*/g, '');
  
  const newLength = content.length;
  const reduction = ((originalLength - newLength) / originalLength * 100).toFixed(1);
  
  console.log(`   ✅ Reduced by ${reduction}% (${originalLength} → ${newLength} chars)`);
  
  return content;
}

function scanDirectory(dir, pattern = /Modal\.tsx$/) {
  const files = [];
  
  function scan(currentDir) {
    const items = fs.readdirSync(currentDir);
    
    for (const item of items) {
      const fullPath = path.join(currentDir, item);
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (!['node_modules', 'dist', 'build', '.git'].includes(item)) {
          scan(fullPath);
        }
      } else if (pattern.test(item)) {
        files.push(fullPath);
      }
    }
  }
  
  scan(dir);
  return files;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (command === 'scan') {
    const dir = args[1] || './src';
    console.log(`🔍 Scanning for modals in: ${dir}\n`);
    
    const modals = scanDirectory(dir);
    console.log(`\n📊 Found ${modals.length} modal files:\n`);
    modals.forEach((m, i) => console.log(`${i + 1}. ${m}`));
    
  } else if (command === 'refactor') {
    const target = args[1];
    
    if (!target) {
      console.error('❌ Usage: node refactor-modals.js refactor <file|directory>');
      process.exit(1);
    }
    
    const stat = fs.statSync(target);
    const files = stat.isDirectory() ? scanDirectory(target) : [target];
    
    console.log(`🚀 Refactoring ${files.length} modal(s)...`);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const file of files) {
      try {
        const refactored = refactorModal(file);
        
        // Create backup
        fs.writeFileSync(file + '.backup', fs.readFileSync(file));
        
        // Write refactored content
        fs.writeFileSync(file, refactored);
        successCount++;
      } catch (error) {
        console.error(`   ❌ Error: ${error.message}`);
        errorCount++;
      }
    }
    
    console.log(`\n✨ Complete! ${successCount} refactored, ${errorCount} errors`);
    console.log(`💾 Backups saved with .backup extension`);
    
  } else if (command === 'preview') {
    const file = args[1];
    
    if (!file) {
      console.error('❌ Usage: node refactor-modals.js preview <file>');
      process.exit(1);
    }
    
    console.log(`👀 Preview refactoring: ${file}\n`);
    const refactored = refactorModal(file);
    console.log('\n--- REFACTORED CODE ---\n');
    console.log(refactored.substring(0, 1000) + '\n...\n');
    
  } else {
    console.log(`
Modal Refactoring Tool
======================

Commands:
  scan [directory]           - Scan for modal files
  preview <file>             - Preview refactoring without saving
  refactor <file|directory>  - Refactor modal(s) and create backups
  
Examples:
  node refactor-modals.js scan ./src/components
  node refactor-modals.js preview ./src/components/modals/UserModal.tsx
  node refactor-modals.js refactor ./src/components/modals
  node refactor-modals.js refactor ./src/components/modals/UserModal.tsx
    `);
  }
}

if (require.main === module) {
  main();
}

module.exports = { refactorModal, scanDirectory };
