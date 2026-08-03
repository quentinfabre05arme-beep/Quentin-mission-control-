// buffer_poster.js - Post to X via Buffer API (more reliable than SendKeys)
const fs = require('fs').promises;

const CONFIG = {
  apiKey: process.env.BUFFER_API_KEY,
  endpoint: 'https://api.buffer.com',
  profileId: process.env.BUFFER_PROFILE_ID  // Your X profile ID in Buffer
};

async function log(msg) {
  console.log(`[${new Date().toISOString()}] ${msg}`);
}

async function bufferRequest(query, variables = {}) {
  const response = await fetch(CONFIG.endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CONFIG.apiKey}`
    },
    body: JSON.stringify({ query, variables })
  });
  
  if (!response.ok) {
    throw new Error(`Buffer API error: ${response.status}`);
  }
  
  const data = await response.json();
  if (data.errors) {
    throw new Error(`GraphQL error: ${data.errors[0].message}`);
  }
  
  return data.data;
}

async function createPost(text) {
  log('Creating post via Buffer...');
  
  const query = `
    mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        id
        status
        text
      }
    }
  `;
  
  const variables = {
    input: {
      profileIds: [CONFIG.profileId],
      text: text
    }
  };
  
  const result = await bufferRequest(query, variables);
  return result.createPost;
}

async function getProfiles() {
  const query = `
    query GetProfiles {
      profiles {
        id
        service
        username
      }
    }
  `;
  
  const result = await bufferRequest(query);
  return result.profiles;
}

async function main() {
  log('=== Buffer Poster Starting ===');
  
  if (!CONFIG.apiKey) {
    log('❌ BUFFER_API_KEY not set');
    log('Get your API key at: https://publish.buffer.com/settings/api');
    return;
  }
  
  try {
    // Get available profiles
    log('Fetching your Buffer profiles...');
    const profiles = await getProfiles();
    
    if (!profiles || profiles.length === 0) {
      log('❌ No profiles found. Connect X to Buffer first.');
      return;
    }
    
    log(`Found ${profiles.length} profile(s):`);
    profiles.forEach(p => log(`  - ${p.service}: ${p.username} (ID: ${p.id})`));
    
    // Use first profile or env-specified one
    const profileId = CONFIG.profileId || profiles[0].id;
    log(`Using profile: ${profileId}`);
    
    // Get post text
    const text = process.argv[2] || 'Test post from OpenClaw via Buffer';
    log(`Posting: "${text}"`);
    
    // Create post
    const post = await createPost(text);
    log(`✅ Post created! ID: ${post.id}, Status: ${post.status}`);
    
  } catch (err) {
    log(`❌ Error: ${err.message}`);
  }
  
  log('=== Buffer Poster Complete ===');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { createPost, getProfiles };
