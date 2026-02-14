import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve static files from the build directory
app.use(express.static(path.join(__dirname, 'build')));

// Log when serving files (for debugging)
app.use((req, res, next) => {
  if (!req.path.startsWith('/api')) {
    console.log(`[Server] ${req.method} ${req.path}`);
  }
  next();
});

// SPA fallback: serve index.html for any other route (supports deep links from provider redirects)
app.get('*', (req, res) => {
  console.log(`[Server] Serving index.html for route: ${req.path}`);
  res.sendFile(path.join(__dirname, 'build', 'index.html'), (err) => {
    if (err) {
      console.error(`[Server] Error serving index.html:`, err);
      res.status(500).send('Error loading page');
    }
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('[Server] Error:', err);
  res.status(500).send('Internal Server Error');
});

app.listen(PORT, () => {
  console.log(`🚀 Frontend server listening on port ${PORT}`);
  console.log(`📁 Serving from: ${path.join(__dirname, 'build')}`);
});
