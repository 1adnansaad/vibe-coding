const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Data storage directory
const DATA_DIR = path.join(__dirname, 'data');
const CONTEXTS_FILE = path.join(DATA_DIR, 'contexts.json');

// Ensure data directory exists
async function ensureDataDir() {
  try {
    await fs.access(DATA_DIR);
  } catch {
    await fs.mkdir(DATA_DIR, { recursive: true });
  }
}

// Load contexts from file
async function loadContexts() {
  try {
    const data = await fs.readFile(CONTEXTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    // File doesn't exist or is invalid, return empty array
    return [];
  }
}

// Save contexts to file
async function saveContexts(contexts) {
  await ensureDataDir();
  await fs.writeFile(CONTEXTS_FILE, JSON.stringify(contexts, null, 2));
}

// API Routes

// Get all contexts
app.get('/api/context/all', async (req, res) => {
  try {
    const contexts = await loadContexts();
    res.json(contexts);
  } catch (error) {
    console.error('Error getting all contexts:', error);
    res.status(500).json({ error: 'Failed to load contexts' });
  }
});

// Get specific context by fileId
app.get('/api/context/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const contexts = await loadContexts();
    const context = contexts.find(c => c.fileId.toString() === fileId.toString());
    
    if (!context) {
      return res.status(404).json({ error: 'Context not found' });
    }
    
    res.json(context);
  } catch (error) {
    console.error('Error getting context:', error);
    res.status(500).json({ error: 'Failed to load context' });
  }
});

// Save new context
app.post('/api/context/save', async (req, res) => {
  try {
    const contextData = req.body;
    
    // Validate required fields
    if (!contextData.fileId || !contextData.fileName) {
      return res.status(400).json({ error: 'Missing required fields: fileId, fileName' });
    }
    
    // Add server timestamp
    contextData.savedAt = new Date().toISOString();
    contextData.id = `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Load existing contexts
    const contexts = await loadContexts();
    
    // Check if context already exists (update if it does)
    const existingIndex = contexts.findIndex(c => c.fileId.toString() === contextData.fileId.toString());
    
    if (existingIndex >= 0) {
      // Update existing context
      contexts[existingIndex] = { ...contexts[existingIndex], ...contextData };
    } else {
      // Add new context
      contexts.push(contextData);
    }
    
    // Save to file
    await saveContexts(contexts);
    
    res.json({ 
      success: true, 
      id: contextData.id,
      message: existingIndex >= 0 ? 'Context updated' : 'Context saved'
    });
    
  } catch (error) {
    console.error('Error saving context:', error);
    res.status(500).json({ error: 'Failed to save context' });
  }
});

// Delete context
app.delete('/api/context/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    const contexts = await loadContexts();
    const filteredContexts = contexts.filter(c => c.fileId.toString() !== fileId.toString());
    
    if (filteredContexts.length === contexts.length) {
      return res.status(404).json({ error: 'Context not found' });
    }
    
    await saveContexts(filteredContexts);
    res.json({ success: true, message: 'Context deleted' });
    
  } catch (error) {
    console.error('Error deleting context:', error);
    res.status(500).json({ error: 'Failed to delete context' });
  }
});

// Search contexts
app.get('/api/context/search/:query', async (req, res) => {
  try {
    const { query } = req.params;
    const contexts = await loadContexts();
    
    const searchResults = contexts.filter(context => {
      const searchText = `${context.fileName} ${context.fileContext} ${JSON.stringify(context.sheetContexts)} ${JSON.stringify(context.columnContexts)}`.toLowerCase();
      return searchText.includes(query.toLowerCase());
    });
    
    res.json(searchResults);
  } catch (error) {
    console.error('Error searching contexts:', error);
    res.status(500).json({ error: 'Failed to search contexts' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Context storage server running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/api/health`);
});

module.exports = app;
