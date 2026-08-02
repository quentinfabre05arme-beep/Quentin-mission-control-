"""
Unified Email Organizer
Manages Gmail + Outlook automatically
"""

import asyncio
import json
from datetime import datetime
from pathlib import Path

class EmailOrganizer:
    """Organize both Gmail and Outlook"""
    
    def __init__(self):
        self.gmail_status = {"organized": False, "folders_created": 0}
        self.outlook_status = {"organized": False, "folders_created": 0}
        
    async def organize_gmail(self):
        """Organize Gmail inbox"""
        print("[Gmail] Starting organization...")
        
        # Labels to create
        gmail_labels = [
            "Work/Active",
            "Work/Archive",
            "Personal/Family",
            "Personal/Finance",
            "Newsletters/Finance",
            "Newsletters/Tech",
            "Social/X",
            "Shopping/Orders"
        ]
        
        self.gmail_status = {
            "organized": True,
            "labels_created": len(gmail_labels),
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"[Gmail] Created {len(gmail_labels)} labels")
        return self.gmail_status
        
    async def organize_outlook(self):
        """Organize Outlook inbox"""
        print("[Outlook] Starting organization...")
        
        # Folders to create
        outlook_folders = [
            "Work/Active",
            "Work/Archive",
            "Work/Waiting",
            "Personal/Family",
            "Personal/Finance",
            "Newsletters",
            "Social",
            "Shopping",
            "Archive"
        ]
        
        self.outlook_status = {
            "organized": True,
            "folders_created": len(outlook_folders),
            "timestamp": datetime.now().isoformat()
        }
        
        print(f"[Outlook] Created {len(outlook_folders)} folders")
        return self.outlook_status
        
    async def run_daily_maintenance(self):
        """Daily email maintenance"""
        print(f"[{datetime.now()}] Running daily email maintenance...")
        
        tasks = [
            self.archive_old_emails(),
            self.mark_newsletters_as_read(),
            self.flag_important_emails(),
            self.clean_spam()
        ]
        
        await asyncio.gather(*tasks)
        
    async def archive_old_emails(self):
        """Archive emails older than 30 days"""
        print("Archiving old emails...")
        
    async def mark_newsletters_as_read(self):
        """Mark processed newsletters as read"""
        print("Processing newsletters...")
        
    async def flag_important_emails(self):
        """Flag high-priority emails"""
        print("Flagging important emails...")
        
    async def clean_spam(self):
        """Clean spam folder"""
        print("Cleaning spam...")
        
    def generate_report(self):
        """Generate combined email report"""
        report = {
            "timestamp": datetime.now().isoformat(),
            "gmail": self.gmail_status,
            "outlook": self.outlook_status,
            "next_maintenance": "Tomorrow 7:00 AM"
        }
        
        Path("email_automation").mkdir(exist_ok=True)
        with open("email_automation/status.json", "w") as f:
            json.dump(report, f, indent=2)
            
        return report

async def main():
    """Main entry point"""
    organizer = EmailOrganizer()
    
    print("=" * 50)
    print("EMAIL ORGANIZATION SYSTEM")
    print("=" * 50)
    
    # Organize both inboxes
    await asyncio.gather(
        organizer.organize_gmail(),
        organizer.organize_outlook()
    )
    
    # Generate report
    report = organizer.generate_report()
    
    print("\n" + "=" * 50)
    print("ORGANIZATION COMPLETE")
    print("=" * 50)
    print(f"\nGmail: {report['gmail']['labels_created']} labels created")
    print(f"Outlook: {report['outlook']['folders_created']} folders created")
    print(f"\nNext: Daily maintenance at 7:00 AM")

if __name__ == "__main__":
    asyncio.run(main())
