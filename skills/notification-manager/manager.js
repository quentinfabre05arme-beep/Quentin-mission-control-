/**
 * Notification Manager
 * Manage alerts and notifications without external services
 */

const fs = require('fs');
const path = require('path');

const NOTIFICATIONS_FILE = path.join(__dirname, '..', '..', 'logs', 'notifications.jsonl');

class NotificationManager {
  constructor() {
    this.notifications = [];
    this.loadNotifications();
  }

  loadNotifications() {
    if (fs.existsSync(NOTIFICATIONS_FILE)) {
      const lines = fs.readFileSync(NOTIFICATIONS_FILE, 'utf8').trim().split('\n').filter(Boolean);
      this.notifications = lines.map(line => JSON.parse(line));
    }
  }

  add({ type, message, priority = 'normal', timestamp = new Date().toISOString() }) {
    const notification = {
      id: Date.now().toString(36),
      type,
      message,
      priority,
      timestamp,
      read: false
    };
    
    this.notifications.push(notification);
    fs.appendFileSync(NOTIFICATIONS_FILE, JSON.stringify(notification) + '\n');
    
    return notification;
  }

  getUnread() {
    return this.notifications.filter(n => !n.read);
  }

  getByPriority(priority) {
    return this.notifications.filter(n => n.priority === priority);
  }

  markRead(id) {
    const notification = this.notifications.find(n => n.id === id);
    if (notification) {
      notification.read = true;
      this.saveAll();
    }
    return notification;
  }

  clearOld(days = 7) {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - days);
    
    const before = this.notifications.length;
    this.notifications = this.notifications.filter(n => 
      new Date(n.timestamp) > cutoff
    );
    
    this.saveAll();
    
    return { removed: before - this.notifications.length };
  }

  saveAll() {
    const lines = this.notifications.map(n => JSON.stringify(n));
    fs.writeFileSync(NOTIFICATIONS_FILE, lines.join('\n') + '\n');
  }

  getStats() {
    return {
      total: this.notifications.length,
      unread: this.getUnread().length,
      byPriority: {
        high: this.getByPriority('high').length,
        normal: this.getByPriority('normal').length,
        low: this.getByPriority('low').length
      }
    };
  }
}

module.exports = NotificationManager;
