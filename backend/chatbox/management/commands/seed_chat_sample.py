"""
Management command: seed_chat_sample

Creates a self-contained sample dataset for testing the role-based chat system:
  - 1 Project  (Chat Demo Project)
  - 4 Users    (epc / client / contractor / master_admin)
  - 12 Messages (realistic cross-role conversations)

Usage:
    python manage.py seed_chat_sample            # create (idempotent)
    python manage.py seed_chat_sample --reset    # wipe sample data then recreate
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from authentication.models import User, Project
from chatbox.models import Message

# ── Sample data definitions ───────────────────────────────────────────────────

SAMPLE_PROJECT_NAME = "Chat Demo Project"

SAMPLE_PASSWORD = "ChatDemo@123"

SAMPLE_USERS = [
    {
        "email":        "epc.demo@chatdemo.com",
        "username":     "epc_demo",
        "name":         "Arjun",
        "surname":      "Mehta",
        "admin_type":   "epc",
        "company_name": "EPC Solutions Pvt Ltd",
        "designation":  "Project Manager",
        "department":   "Engineering",
    },
    {
        "email":        "client.demo@chatdemo.com",
        "username":     "client_demo",
        "name":         "Priya",
        "surname":      "Sharma",
        "admin_type":   "client",
        "company_name": "Client Corp Ltd",
        "designation":  "Site Director",
        "department":   "Operations",
    },
    {
        "email":        "contractor.demo@chatdemo.com",
        "username":     "contractor_demo",
        "name":         "Ravi",
        "surname":      "Kumar",
        "admin_type":   "contractor",
        "company_name": "BuildRight Contractors",
        "designation":  "Site Supervisor",
        "department":   "Civil Works",
    },
    {
        "email":        "masteradmin.demo@chatdemo.com",
        "username":     "masteradmin_demo",
        "name":         "Sunita",
        "surname":      "Patel",
        "admin_type":   None,
        "user_type":    "masteradmin",
        "company_name": "Athens Platform",
        "designation":  "Platform Admin",
        "department":   "Administration",
    },
]

# (sender_username, receiver_username, message)
SAMPLE_MESSAGES = [
    # EPC ↔ Client
    ("epc_demo",        "client_demo",      "Good morning Priya! The foundation work is on schedule."),
    ("client_demo",     "epc_demo",         "Great to hear, Arjun. Can you share the progress report?"),
    ("epc_demo",        "client_demo",      "Sure, I'll send it over by EOD today."),
    ("client_demo",     "epc_demo",         "Perfect. Also, the client inspection is set for Friday."),
    ("epc_demo",        "client_demo",      "Noted. We'll be ready. I'll brief the team."),

    # EPC ↔ Contractor
    ("epc_demo",        "contractor_demo",  "Ravi, please ensure the scaffolding is up by tomorrow morning."),
    ("contractor_demo", "epc_demo",         "Understood. We have 12 workers on site today."),
    ("epc_demo",        "contractor_demo",  "Good. Safety helmets mandatory for all — no exceptions."),
    ("contractor_demo", "epc_demo",         "Confirmed. All PPE distributed. Work starts at 7 AM."),

    # EPC ↔ Contractor (follow-up)
    ("contractor_demo", "epc_demo",         "Scaffolding is 80% complete. Will finish by 6 PM."),
    ("epc_demo",        "contractor_demo",  "Excellent work Ravi. Keep it up!"),

    # Client tries to reach EPC again
    ("client_demo",     "epc_demo",         "Arjun, Friday inspection confirmed for 10 AM. Please be present."),
]


class Command(BaseCommand):
    help = "Seed sample users and messages for role-based chat testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing sample data before re-seeding",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self._wipe()

        with transaction.atomic():
            project = self._get_or_create_project()
            users   = self._get_or_create_users(project)
            created = self._get_or_create_messages(users)

        self.stdout.write(self.style.SUCCESS(
            f"\n✅  Sample chat data ready!\n"
            f"    Project  : {SAMPLE_PROJECT_NAME} (id={project.id})\n"
            f"    Users    : {len(users)} created/found\n"
            f"    Messages : {created} new messages seeded\n"
            f"\n    Login credentials (password for all: {SAMPLE_PASSWORD})\n"
        ))
        for u in SAMPLE_USERS:
            role = u.get("admin_type") or u.get("user_type", "—")
            self.stdout.write(f"    [{role:12s}]  {u['email']}")
        self.stdout.write("")

    # ── Helpers ───────────────────────────────────────────────────────────────

    def _wipe(self):
        """Remove all sample data created by this command."""
        emails = [u["email"] for u in SAMPLE_USERS]
        users  = User.objects.filter(email__in=emails)
        msg_count = Message.objects.filter(
            sender__in=users
        ).delete()[0]
        user_count = users.delete()[0]
        Project.objects.filter(projectName=SAMPLE_PROJECT_NAME).delete()
        self.stdout.write(self.style.WARNING(
            f"🗑  Wiped {user_count} users and {msg_count} messages."
        ))

    def _get_or_create_project(self):
        project, created = Project.objects.get_or_create(
            projectName=SAMPLE_PROJECT_NAME,
            defaults={
                "projectCategory": "construction",
                "subscriber_role": "epc",
                "location":        "Demo City, India",
            },
        )
        if created:
            self.stdout.write(f"  Created project: {project.projectName}")
        else:
            self.stdout.write(f"  Found project  : {project.projectName}")
        return project

    def _get_or_create_users(self, project):
        user_map = {}
        for spec in SAMPLE_USERS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "username":     spec["username"],
                    "name":         spec["name"],
                    "surname":      spec["surname"],
                    "admin_type":   spec.get("admin_type"),
                    "user_type":    spec.get("user_type", "companyuser"),
                    "company_name": spec["company_name"],
                    "designation":  spec["designation"],
                    "department":   spec["department"],
                    "project":      project,
                    "is_active":    True,
                },
            )
            if created:
                user.set_password(SAMPLE_PASSWORD)
                user.save(update_fields=["password"])
                self.stdout.write(f"  Created user: {user.email} [{user.admin_type or user.user_type}]")
            else:
                # Ensure existing sample user is linked to the demo project
                if user.project_id != project.id:
                    user.project = project
                    user.save(update_fields=["project"])
                self.stdout.write(f"  Found user  : {user.email}")
            user_map[spec["username"]] = user
        return user_map

    def _get_or_create_messages(self, user_map):
        created_count = 0
        for sender_username, receiver_username, content in SAMPLE_MESSAGES:
            sender   = user_map.get(sender_username)
            receiver = user_map.get(receiver_username)
            if not sender or not receiver:
                continue
            # Avoid exact duplicates (idempotent re-runs)
            exists = Message.objects.filter(
                sender=sender, receiver=receiver, content=content
            ).exists()
            if not exists:
                Message.objects.create(
                    sender=sender,
                    receiver=receiver,
                    content=content,
                    status="read",
                )
                created_count += 1
        return created_count
