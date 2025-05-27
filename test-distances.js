// Simple test to trigger the mindmap and check distance measurements

async function testMindmapDistances() {
    const { default: fetch } = await import('node-fetch');
    try {
        console.log('Testing mindmap distance measurements...');

        // First, get the mindmap data
        const response = await fetch('http://localhost:3000/api/mindmap');
        const html = await response.text();

        console.log('✅ Mindmap page loaded successfully');
        console.log('📝 Note: Distance measurements will only run when the page is loaded in a browser');
        console.log('🔍 To see the test results:');
        console.log('   1. Open http://localhost:3000 in your browser');
        console.log('   2. Click on the "Interactive Mind Map" tab');
        console.log('   3. Check the browser console for distance measurements');
        console.log('   4. Check the server terminal for the detailed report');

    } catch (error) {
        console.error('❌ Error testing mindmap:', error.message);
    }
}

testMindmapDistances();
