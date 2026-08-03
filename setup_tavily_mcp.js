const { getCredential } = require('./credential_manager');
const { execSync } = require('child_process');

const cred = getCredential('tavily_api_key');
if (!cred) {
  console.error('Tavily API key not found in credential vault');
  process.exit(1);
}

const key = cred.password;
const mcpConfig = {
  command: 'npx',
  args: ['-y', '@tavily/mcp@latest'],
  env: { TAVILY_API_KEY: key }
};

const cmd = `openclaw mcp set tavily ${JSON.stringify(JSON.stringify(mcpConfig))}`;
console.log('Running:', cmd.replace(key, '***'));
try {
  const out = execSync(cmd, { encoding: 'utf8', windowsHide: true });
  console.log(out);
  console.log('Tavily MCP server configured');
} catch(e) {
  console.error('Failed:', e.stderr || e.message);
  process.exit(1);
}
