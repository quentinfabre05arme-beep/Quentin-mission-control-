// Weather + Calendar Smart Scheduling
// Checks weather before outdoor meetings and adds reminders

const { execSync } = require('child_process');

class WeatherCalendarSync {
  async run() {
    console.log('🌤️ Checking weather and calendar...');
    
    // 1. Get upcoming events (next 24h)
    const events = await this.getUpcomingEvents();
    
    // 2. Check weather for each event
    for (const event of events) {
      if (this.isOutdoorEvent(event)) {
        const weather = await this.getWeather(event.location || 'Aix-en-Provence');
        
        if (weather.rain || weather.badWeather) {
          await this.addUmbrellaReminder(event);
        }
      }
    }
    
    console.log('✅ Calendar weather sync complete!');
  }

  async getUpcomingEvents() {
    try {
      // Query Google Calendar via OOMOL
      const cmd = `oo connector run cal.list_schedules --days 1`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 15000 });
      return JSON.parse(output).events || [];
    } catch (e) {
      // Return sample for testing
      return [
        { title: 'Morning Walk', start: '2026-07-27T08:00:00', location: 'Aix-en-Provence' },
        { title: 'Meeting', start: '2026-07-27T14:00:00', location: 'Office' }
      ];
    }
  }

  isOutdoorEvent(event) {
    const outdoorKeywords = ['walk', 'run', 'hike', 'park', 'outside', 'outdoor', 'sports'];
    const title = event.title?.toLowerCase() || '';
    return outdoorKeywords.some(k => title.includes(k));
  }

  async getWeather(location) {
    try {
      // Use OOMOL's wttr.in connector
      const cmd = `oo connector run wttr.in --location "${location}" --format json`;
      const output = execSync(cmd, { encoding: 'utf8', timeout: 10000 });
      const data = JSON.parse(output);
      
      return {
        rain: data.current?.precipitation > 0,
        badWeather: data.current?.weathercode > 50
      };
    } catch (e) {
      // Default: assume good weather
      return { rain: false, badWeather: false };
    }
  }

  async addUmbrellaReminder(event) {
    try {
      const cmd = `oo connector run cal.create_schedule --title "☂️ Bring umbrella: ${event.title}" --start_time "${event.start}" --duration 1 --description "Weather alert: rain expected"`;
      
      execSync(cmd, { encoding: 'utf8', timeout: 15000 });
      console.log(`☂️ Added umbrella reminder for: ${event.title}`);
    } catch (e) {
      console.error('Failed to add reminder:', e.message);
    }
  }
}

if (require.main === module) {
  new WeatherCalendarSync().run().catch(console.error);
}

module.exports = WeatherCalendarSync;
