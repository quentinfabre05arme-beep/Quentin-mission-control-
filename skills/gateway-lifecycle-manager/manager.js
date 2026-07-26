/**
 * Gateway Lifecycle Manager
 * Manage OpenClaw gateway without interrupting sessions
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

const SESSION_BACKUP = path.join(__dirname, '..', '..', 'memory', 'session_backup.json');
const GATEWAY_LOG = path.join(__dirname, '..', '..', 'logs', 'gateway_lifecycle.log');

class GatewayLifecycleManager {
  constructor() {
    this.isRestarting = false;
    this.sessionState = null;
  }

  /**
   * Check gateway status
   */
  async getStatus() {
    try {
      // Check if gateway port is listening
      const net = require('net');
      const port = 18789; // Default gateway port
      
      return new Promise((resolve) => {
        const socket = new net.Socket();
        
        socket.setTimeout(2000);
        socket.once('connect', () => {
          socket.destroy();
          resolve({ status: 'running', port });
        });
        
        socket.once('timeout', () => {
          socket.destroy();
          resolve({ status: 'stopped', port });
        });
        
        socket.once('error', () => {
          resolve({ status: 'stopped', port });
        });
        
        socket.connect(port, '127.0.0.1');
      });
    } catch (error) {
      return { status: 'unknown', error: error.message };
    }
  }

  /**
   * Save current session state
   */
  async saveSession() {
    this.sessionState = {
      timestamp: new Date().toISOString(),
      skills: this.getLoadedSkills(),
      context: this.getCurrentContext(),
      pendingTasks: this.getPendingTasks()
    };
    
    fs.writeFileSync(SESSION_BACKUP, JSON.stringify(this.sessionState, null, 2));
    this.log('Session saved before restart');
    
    return this.sessionState;
  }

  /**
   * Restore session after restart
   */
  async restoreSession() {
    if (fs.existsSync(SESSION_BACKUP)) {
      const saved = JSON.parse(fs.readFileSync(SESSION_BACKUP, 'utf8'));
      this.sessionState = saved;
      this.log('Session restored after restart');
      return saved;
    }
    return null;
  }

  /**
   * Restart gateway asynchronously
   */
  async restart(options = {}) {
    if (this.isRestarting) {
      return { status: 'already_restarting', message: 'Restart already in progress' };
    }
    
    this.isRestarting = true;
    const startTime = Date.now();
    
    try {
      // 1. Save session
      await this.saveSession();
      
      // 2. Stop gateway gracefully
      this.log('Stopping gateway...');
      await this.stopGateway();
      
      // 3. Wait for shutdown
      await this.waitForShutdown(10000);
      
      // 4. Start gateway
      this.log('Starting gateway...');
      await this.startGateway(options);
      
      // 5. Wait for startup
      await this.waitForStartup(15000);
      
      // 6. Verify health
      const health = await this.checkHealth();
      
      // 7. Restore session
      await this.restoreSession();
      
      // 8. Verify plugins
      const plugins = await this.verifyPlugins();
      
      const duration = Date.now() - startTime;
      this.isRestarting = false;
      
      return {
        status: 'success',
        duration: `${duration}ms`,
        health,
        plugins,
        session: this.sessionState
      };
      
    } catch (error) {
      this.isRestarting = false;
      this.log(`Restart failed: ${error.message}`);
      
      // Attempt recovery
      await this.attemptRecovery();
      
      return {
        status: 'failed',
        error: error.message,
        recovery: 'attempted'
      };
    }
  }

  /**
   * Stop gateway
   */
  async stopGateway() {
    return new Promise((resolve, reject) => {
      const stopProcess = spawn('openclaw', ['gateway', 'stop'], {
        shell: true,
        timeout: 10000
      });
      
      stopProcess.on('close', (code) => {
        if (code === 0 || code === null) {
          resolve({ status: 'stopped' });
        } else {
          reject(new Error(`Stop failed with code ${code}`));
        }
      });
      
      stopProcess.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Start gateway
   */
  async startGateway(options = {}) {
    return new Promise((resolve, reject) => {
      const args = ['gateway', 'start'];
      
      if (options.verbose) args.push('--verbose');
      if (options.config) args.push('--config', options.config);
      
      const startProcess = spawn('openclaw', args, {
        shell: true,
        detached: true, // Run in background
        stdio: 'ignore'
      });
      
      startProcess.on('error', (error) => {
        reject(error);
      });
      
      // Give it time to start
      setTimeout(() => {
        resolve({ status: 'started', pid: startProcess.pid });
      }, 2000);
    });
  }

  /**
   * Wait for shutdown
   */
  async waitForShutdown(timeout = 10000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getStatus();
      if (status.status === 'stopped') {
        return { status: 'shutdown_complete' };
      }
      await this.sleep(500);
    }
    
    throw new Error('Shutdown timeout');
  }

  /**
   * Wait for startup
   */
  async waitForStartup(timeout = 15000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < timeout) {
      const status = await this.getStatus();
      if (status.status === 'running') {
        return { status: 'startup_complete' };
      }
      await this.sleep(1000);
    }
    
    throw new Error('Startup timeout');
  }

  /**
   * Check gateway health
   */
  async checkHealth() {
    try {
      const status = await this.getStatus();
      
      if (status.status !== 'running') {
        return { status: 'unhealthy', reason: 'not_running' };
      }
      
      // Additional health checks could go here
      return { status: 'healthy', port: status.port };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  /**
   * Verify plugins loaded
   */
  async verifyPlugins() {
    // Check which plugins are available
    const pluginStatus = {
      duckduckgo: false,
      elevenlabs: false,
      'document-extract': false,
      'active-memory': false
    };
    
    // In practice, would query gateway for loaded plugins
    return pluginStatus;
  }

  /**
   * Attempt recovery if restart fails
   */
  async attemptRecovery() {
    this.log('Attempting recovery...');
    
    try {
      // Try to start gateway anyway
      await this.startGateway();
      await this.waitForStartup(5000);
      
      const health = await this.checkHealth();
      if (health.status === 'healthy') {
        this.log('Recovery successful');
        return { status: 'recovered' };
      }
    } catch (error) {
      this.log(`Recovery failed: ${error.message}`);
    }
    
    return { status: 'recovery_failed' };
  }

  /**
   * Reload configuration without restart
   */
  async reloadConfig() {
    return new Promise((resolve, reject) => {
      const reloadProcess = spawn('openclaw', ['config', 'reload'], {
        shell: true,
        timeout: 5000
      });
      
      reloadProcess.on('close', (code) => {
        if (code === 0) {
          resolve({ status: 'reloaded' });
        } else {
          reject(new Error(`Reload failed with code ${code}`));
        }
      });
    });
  }

  // Helper methods
  getLoadedSkills() {
    // Would return currently loaded skills
    return [];
  }

  getCurrentContext() {
    // Would return current conversation context
    return {};
  }

  getPendingTasks() {
    // Would return pending tasks
    return [];
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  log(message) {
    const entry = `[${new Date().toISOString()}] ${message}\n`;
    fs.appendFileSync(GATEWAY_LOG, entry);
  }
}

// Command interface
class GatewayCommands {
  constructor() {
    this.manager = new GatewayLifecycleManager();
  }

  async execute(command, args = {}) {
    switch (command) {
      case 'status':
        return this.manager.getStatus();
      
      case 'restart':
        if (!args.force) {
          return {
            status: 'confirmation_required',
            message: 'Gateway restart will briefly interrupt service. Confirm?'
          };
        }
        return this.manager.restart(args);
      
      case 'reload':
        return this.manager.reloadConfig();
      
      case 'health':
        return this.manager.checkHealth();
      
      default:
        return { status: 'unknown_command', command };
    }
  }
}

module.exports = { GatewayLifecycleManager, GatewayCommands };
