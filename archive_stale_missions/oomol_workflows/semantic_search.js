// Semantic Search - Document embedding and similarity search
// Uses OOMOL's OpenAI embeddings connector

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class SemanticSearch {
  constructor() {
    this.indexDir = 'C:\\Users\\quent\\.openclaw\\workspace\\semantic_index';
    this.embeddings = new Map();
    this.documents = new Map();
    this.ensureIndexDir();
  }

  ensureIndexDir() {
    if (!fs.existsSync(this.indexDir)) {
      fs.mkdirSync(this.indexDir, { recursive: true });
    }
  }

  // Create embeddings for text
  async createEmbedding(text) {
    try {
      const cmd = `oo connector run openai.create_embeddings --text "${text.substring(0, 8000).replace(/"/g, '\\"')}"`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });
      
      const result = JSON.parse(output);
      return result.embeddings[0];
    } catch (e) {
      console.error('Embedding creation failed:', e.message);
      return null;
    }
  }

  // Add document to index
  async indexDocument(documentId, text, metadata = {}) {
    console.log(`📄 Indexing: ${documentId}`);
    
    const embedding = await this.createEmbedding(text);
    
    if (!embedding) {
      return { success: false, error: 'Failed to create embedding' };
    }

    this.embeddings.set(documentId, embedding);
    this.documents.set(documentId, {
      text: text.substring(0, 1000), // Store preview
      metadata,
      indexedAt: new Date().toISOString()
    });

    // Save to disk
    this.saveIndex();

    return { success: true, documentId };
  }

  // Search by query
  async search(query, topK = 5) {
    console.log(`🔍 Searching: "${query}"`);
    
    const queryEmbedding = await this.createEmbedding(query);
    
    if (!queryEmbedding) {
      return { results: [] };
    }

    const results = [];
    
    for (const [docId, embedding] of this.embeddings.entries()) {
      const similarity = this.cosineSimilarity(queryEmbedding, embedding);
      
      if (similarity > 0.7) { // Threshold
        const doc = this.documents.get(docId);
        results.push({
          documentId: docId,
          similarity: similarity.toFixed(4),
          text: doc.text.substring(0, 200) + '...',
          metadata: doc.metadata
        });
      }
    }
    
    // Sort by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    
    return {
      query,
      totalResults: results.length,
      results: results.slice(0, topK)
    };
  }

  // Calculate cosine similarity
  cosineSimilarity(a, b) {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  // Save index to disk
  saveIndex() {
    const data = {
      embeddings: Object.fromEntries(this.embeddings),
      documents: Object.fromEntries(this.documents),
      updatedAt: new Date().toISOString()
    };
    
    fs.writeFileSync(
      path.join(this.indexDir, 'index.json'),
      JSON.stringify(data, null, 2)
    );
  }

  // Load index from disk
  loadIndex() {
    const indexPath = path.join(this.indexDir, 'index.json');
    
    if (fs.existsSync(indexPath)) {
      try {
        const data = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
        this.embeddings = new Map(Object.entries(data.embeddings));
        this.documents = new Map(Object.entries(data.documents));
        console.log(`✅ Loaded ${this.embeddings.size} indexed documents`);
      } catch (e) {
        console.error('Failed to load index:', e.message);
      }
    }
  }

  // Index all markdown files in workspace
  async indexWorkspace() {
    const workspaceDir = 'C:\\Users\\quent\\.openclaw\\workspace';
    const files = this.findMarkdownFiles(workspaceDir);
    
    console.log(`📚 Found ${files.length} markdown files to index`);
    
    let indexed = 0;
    
    for (const file of files) {
      try {
        const content = fs.readFileSync(file, 'utf8');
        const relativePath = path.relative(workspaceDir, file);
        
        await this.indexDocument(relativePath, content, {
          filePath: relativePath,
          size: content.length
        });
        
        indexed++;
      } catch (e) {
        console.error(`Failed to index ${file}:`, e.message);
      }
    }
    
    console.log(`✅ Indexed ${indexed}/${files.length} files`);
    return { indexed, total: files.length };
  }

  findMarkdownFiles(dir) {
    const files = [];
    
    try {
      const entries = fs.readdirSync(dir, { recursive: true });
      
      for (const entry of entries) {
        if (typeof entry === 'string' && entry.endsWith('.md')) {
          files.push(path.join(dir, entry));
        }
      }
    } catch (e) {
      console.error('Error scanning directory:', e.message);
    }
    
    return files;
  }
}

if (require.main === module) {
  const search = new SemanticSearch();
  search.loadIndex();
  
  // Example usage:
  // search.indexWorkspace().then(() => {
  //   return search.search("autonomy improvements");
  // }).then(console.log);
}

module.exports = SemanticSearch;
