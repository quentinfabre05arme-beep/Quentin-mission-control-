"""
PC Control Automation
Launch apps, manage files, system monitoring
"""

import subprocess
import psutil
import os
from datetime import datetime
from pathlib import Path

class PCAutomation:
    """Control PC applications and system"""
    
    def __init__(self):
        self.running_apps = []
        
    def launch_chrome(self, url=None):
        """Launch Chrome browser"""
        print(f"[{datetime.now()}] Launching Chrome...")
        if url:
            subprocess.Popen(["start", "chrome", url], shell=True)
        else:
            subprocess.Popen(["start", "chrome"], shell=True)
            
    def launch_outlook(self):
        """Launch Outlook"""
        print(f"[{datetime.now()}] Launching Outlook...")
        subprocess.Popen(["start", "outlook"], shell=True)
        
    def launch_teams(self):
        """Launch Microsoft Teams"""
        print(f"[{datetime.now()}] Launching Teams...")
        subprocess.Popen(["start", "teams"], shell=True)
        
    def system_health_check(self):
        """Check system health"""
        print(f"[{datetime.now()}] Running system health check...")
        
        # Disk usage
        disk = psutil.disk_usage('C:')
        disk_percent = disk.percent
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # CPU usage
        cpu_percent = psutil.cpu_percent(interval=1)
        
        health = {
            "timestamp": datetime.now().isoformat(),
            "disk_usage_percent": disk_percent,
            "memory_usage_percent": memory_percent,
            "cpu_usage_percent": cpu_percent,
            "status": "healthy" if all([disk_percent < 90, memory_percent < 90, cpu_percent < 80]) else "warning"
        }
        
        return health
        
    def open_folder(self, path):
        """Open folder in File Explorer"""
        print(f"[{datetime.now()}] Opening folder: {path}")
        os.startfile(path)

if __name__ == "__main__":
    pc = PCAutomation()
    health = pc.system_health_check()
    print(f"System Health: {health}")
