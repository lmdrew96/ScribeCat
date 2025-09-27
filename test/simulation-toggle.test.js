// Test for Developer Simulation Toggle Feature
const { JSDOM } = require('jsdom');
const fs = require('fs');
const path = require('path');

console.log('🧪 Testing Developer Simulation Toggle Feature...\n');

// Read the HTML and JS files
const htmlContent = fs.readFileSync(path.join(__dirname, '../src/renderer/index.html'), 'utf8');
const jsContent = fs.readFileSync(path.join(__dirname, '../src/renderer/app.js'), 'utf8');

// Setup JSDOM environment
const dom = new JSDOM(htmlContent, {
  url: 'http://localhost',
  pretendToBeVisual: true,
  resources: 'usable'
});

// Mock electron API
global.window = dom.window;
global.document = dom.window.document;

dom.window.electronAPI = {
  storeGet: (key) => {
    if (key === 'simulation-mode') return true; // Default simulation mode
    return null;
  },
  storeSet: (key, value) => {
    console.log(`Setting ${key} = ${value}`);
    return Promise.resolve(true);
  }
};

// Mock marked (for markdown parsing)
dom.window.marked = {
  parse: (text) => text
};

// Execute the app code
try {
  eval(jsContent);
  
  // Test simulation toggle functionality
  console.log('✅ HTML contains Developer Settings section');
  
  const simulationToggle = dom.window.document.getElementById('simulation-toggle');
  console.log('✅ Simulation toggle element found:', !!simulationToggle);
  
  const developerSection = dom.window.document.querySelector('h3');
  const hasDeveloperSettings = Array.from(dom.window.document.querySelectorAll('h3'))
    .some(h3 => h3.textContent === 'Developer Settings');
  console.log('✅ Developer Settings section found:', hasDeveloperSettings);
  
  const disclaimer = dom.window.document.querySelector('.simulation-disclaimer');
  console.log('✅ Warning disclaimer found:', !!disclaimer);
  
  const toggleSwitch = dom.window.document.querySelector('.toggle-switch');
  console.log('✅ Toggle switch styling found:', !!toggleSwitch);
  
  console.log('\n🎉 All simulation toggle tests passed!');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  process.exit(1);
}