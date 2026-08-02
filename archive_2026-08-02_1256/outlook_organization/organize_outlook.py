"""
Outlook Organization Script
Uses browser automation to organize Outlook inbox
"""

import subprocess
import json
from datetime import datetime
from pathlib import Path

class OutlookOrganizer:
    """Organize Outlook via browser automation"""
    
    def __init__(self):
        self.status = {
            "started": datetime.now().isoformat(),
            "inbox_count": 0,
            "archived": 0,
            "labeled": 0,
            "unsubscribed": 0,
            "status": "starting"
        }
        
    def open_outlook(self):
        """Open Outlook in Chrome"""
        print("Opening Outlook...")
        try:
            subprocess.Popen([
                "start", "chrome", "https://outlook.live.com"
            ], shell=True)
            return True
        except Exception as e:
            print(f"Error opening Outlook: {e}")
            return False
            
    def create_organization_plan(self):
        """Create organization structure"""
        plan = {
            "folders_to_create": [
                "Work/Active",
                "Work/Archive", 
                "Work/Waiting",
                "Personal/Family",
                "Personal/Finance",
                "Newsletters",
                "Social",
                "Shopping",
                "Archive"
            ],
            "actions": [
                "Archive emails older than 30 days",
                "Sort newsletters by sender",
                "Unsubscribe from low-value lists",
                "Flag important ongoing threads",
                "Create rules for auto-sorting"
            ],
            "target_metrics": {
                "inbox_count": 50,
                "unread_count": 10,
                "archive_older_than_days": 30
            }
        }
        
        Path("outlook_organization").mkdir(exist_ok=True)
        with open("outlook_organization/plan.json", "w") as f:
            json.dump(plan, f, indent=2)
            
        return plan
        
    def generate_report(self):
        """Generate organization report"""
        report = f"""
OUTLOOK ORGANIZATION REPORT
=================================
Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}
Status: {self.status['status']}

ACTIONS COMPLETED:
- Outlook opened in Chrome
- Organization plan created
- Folder structure defined

PROPOSED FOLDERS:
- Work/Active, Work/Archive, Work/Waiting
- Personal/Family, Personal/Finance
- Newsletters, Social, Shopping
- Archive

TARGETS:
- Inbox: < 50 emails
- Unread: < 10 emails
- Archive: 30+ days old

NEXT STEPS:
1. Review plan in outlook_organization/
2. Run organization in browser
3. Apply folders and rules
4. Set up auto-maintenance

=================================
        """
        
        with open("outlook_organization/report.txt", "w", encoding='utf-8') as f:
            f.write(report)
            
        print(report)
        return report

if __name__ == "__main__":
    organizer = OutlookOrganizer()
    
    # Step 1: Open Outlook
    organizer.open_outlook()
    
    # Step 2: Create organization plan
    organizer.create_organization_plan()
    
    # Step 3: Generate report
    organizer.generate_report()
    
    print("\n+ Outlook organization ready!")
    print("Check outlook_organization/ folder for details")
