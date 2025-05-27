// Server entry point
const app = require('./src/server/app');

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
    console.log('Open http://localhost:3000 in your browser to use the Linear Issues Viewer');
});
