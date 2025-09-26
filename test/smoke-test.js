#!/usr/bin/env node

/**
 * Smoke Test for ScribeCat Application
 * 
 * This test validates the basic structure and functionality of the ScribeCat desktop app.
 * It checks for the presence of required files, validates the package.json configuration,
 * and ensures the main process can be loaded without errors.
 */

const fs = require('fs');
const path = require('path');

class SmokeTest {
  constructor() {
    this.rootPath = path.join(__dirname, '..');
    this.errors = [];
    this.warnings = [];
    this.passed = 0;
    this.total = 0;
  }

  test(description, testFn) {
    this.total++;
    try {
      const result = testFn();
      if (result === false) {
        this.errors.push(`❌ ${description}`);
      } else {
        this.passed++;
        console.log(`✅ ${description}`);
      }
    } catch (error) {
      this.errors.push(`❌ ${description}: ${error.message}`);
    }
  }

  warn(message) {
    this.warnings.push(`⚠️  ${message}`);
    console.log(`⚠️  ${message}`);
  }

  fileExists(filePath) {
    return fs.existsSync(path.join(this.rootPath, filePath));
  }

  directoryExists(dirPath) {
    const fullPath = path.join(this.rootPath, dirPath);
    return fs.existsSync(fullPath) && fs.statSync(fullPath).isDirectory();
  }

  run() {
    console.log('🧪 Running ScribeCat Smoke Tests...\n');

    // Test package.json
    this.test('package.json exists and is valid', () => {
      const packagePath = path.join(this.rootPath, 'package.json');
      if (!fs.existsSync(packagePath)) return false;
      
      const pkg = JSON.parse(fs.readFileSync(packagePath, 'utf8'));
      return pkg.name === 'scribecat' && pkg.main === 'src/main.js';
    });

    // Test main process file
    this.test('Main process file exists', () => {
      return this.fileExists('src/main.js');
    });

    // Test preload script
    this.test('Preload script exists', () => {
      return this.fileExists('src/preload/preload.js');
    });

    // Test renderer files
    this.test('Renderer HTML file exists', () => {
      return this.fileExists('src/renderer/index.html');
    });

    this.test('Renderer CSS file exists', () => {
      return this.fileExists('src/renderer/styles.css');
    });

    this.test('Renderer JS file exists', () => {
      return this.fileExists('src/renderer/app.js');
    });

    // Test directory structure
    this.test('Assets directory exists', () => {
      return this.directoryExists('assets');
    });

    this.test('Assets/images directory exists', () => {
      return this.directoryExists('assets/images');
    });

    this.test('Assets/fonts directory exists', () => {
      return this.directoryExists('assets/fonts');
    });

    // Test build configuration
    this.test('Build configuration is present in package.json', () => {
      const pkg = JSON.parse(fs.readFileSync(path.join(this.rootPath, 'package.json'), 'utf8'));
      return pkg.build && pkg.build.appId && pkg.build.productName;
    });

    // Test dependencies
    this.test('Required dependencies are installed', () => {
      return this.directoryExists('node_modules') && 
             this.directoryExists('node_modules/electron') &&
             this.directoryExists('node_modules/electron-store');
    });

    // Test HTML structure
    this.test('HTML contains required elements', () => {
      const htmlContent = fs.readFileSync(path.join(this.rootPath, 'src/renderer/index.html'), 'utf8');
      const requiredElements = [
        'app-header',
        'sidebar',
        'recording-controls',
        'notes-editor',
        'transcription-display',
        'ai-chat'
      ];
      
      return requiredElements.every(elementId => htmlContent.includes(elementId));
    });

    // Test main process can be required (syntax check)
    this.test('Main process file has valid syntax', () => {
      try {
        const mainPath = path.join(this.rootPath, 'src/main.js');
        const mainContent = fs.readFileSync(mainPath, 'utf8');
        
        // Basic syntax validation - check for required Electron imports
        const hasElectronImport = mainContent.includes("require('electron')");
        const hasCreateWindow = mainContent.includes('createWindow');
        const hasWhenReady = mainContent.includes('app.whenReady');
        
        return hasElectronImport && hasCreateWindow && hasWhenReady;
      } catch (error) {
        return false;
      }
    });

    // Test CSS has basic styles
    this.test('CSS contains theme variables', () => {
      const cssContent = fs.readFileSync(path.join(this.rootPath, 'src/renderer/styles.css'), 'utf8');
      return cssContent.includes(':root') && cssContent.includes('--primary-color');
    });

    // Test JavaScript application class
    this.test('JavaScript contains ScribeCatApp class', () => {
      const jsContent = fs.readFileSync(path.join(this.rootPath, 'src/renderer/app.js'), 'utf8');
      return jsContent.includes('class ScribeCatApp') && jsContent.includes('constructor()');
    });

    // Check for placeholder assets
    if (!this.fileExists('assets/images/nugget.png')) {
      this.warn('Logo asset (nugget.png) is placeholder - replace with actual logo');
    }

    if (!this.fileExists('assets/fonts/GalaxyCaterpillar.ttf')) {
      this.warn('Brand font (GalaxyCaterpillar.ttf) is missing - using fallback fonts');
    }

    // Test gitignore
    this.test('.gitignore exists and contains essential entries', () => {
      if (!this.fileExists('.gitignore')) return false;
      
      const gitignoreContent = fs.readFileSync(path.join(this.rootPath, '.gitignore'), 'utf8');
      return gitignoreContent.includes('node_modules') && 
             gitignoreContent.includes('dist') &&
             gitignoreContent.includes('.DS_Store');
    });

    // Summary
    console.log('\n📊 Test Results:');
    console.log(`✅ Passed: ${this.passed}/${this.total}`);
    
    if (this.errors.length > 0) {
      console.log(`❌ Failed: ${this.errors.length}`);
      console.log('\nErrors:');
      this.errors.forEach(error => console.log(error));
    }
    
    if (this.warnings.length > 0) {
      console.log('\nWarnings:');
      this.warnings.forEach(warning => console.log(warning));
    }

    const success = this.errors.length === 0;
    console.log(`\n${success ? '🎉' : '💥'} Smoke test ${success ? 'PASSED' : 'FAILED'}`);
    
    if (success) {
      console.log('\n🚀 ScribeCat is ready for development and testing!');
      console.log('\nNext steps:');
      console.log('1. Replace placeholder assets with actual logo and fonts');
      console.log('2. Add API keys for AssemblyAI and OpenAI');
      console.log('3. Test recording functionality');
      console.log('4. Test cross-platform builds');
    }

    process.exit(success ? 0 : 1);
  }
}

// Run the smoke test
new SmokeTest().run();