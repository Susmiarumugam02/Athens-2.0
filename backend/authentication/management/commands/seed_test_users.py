"""
Management command: seed_test_users

Creates test users for role-based chat system testing.
All users are assigned to a shared project so the chat
UserListView (which filters by project) returns them correctly.

Usage:
    python manage.py seed_test_users            # create (idempotent)
    python manage.py seed_test_users --reset    # wipe then recreate
"""

from django.core.management.base import BaseCommand
from django.db import transaction
from authentication.models import User, Project

PROJECT_NAME = "Test Chat Project"
PASSWORD     = "Admin@1234"

SAMPLE_USERS = [
    # EPC users
    {
        "email":        "epc1@gmail.com",
        "username":     "epc1",
        "name":         "Vasan",
        "surname":      "EPC",
        "admin_type":   "epc",
        "company_name": "EPC Solutions Pvt Ltd",
        "designation":  "Project Manager",
        "department":   "Engineering",
    },
    {
        "email":        "epc2@gmail.com",
        "username":     "epc2",
        "name":         "Kumar",
        "surname":      "EPC",
        "admin_type":   "epc",
        "company_name": "EPC Solutions Pvt Ltd",
        "designation":  "Site Engineer",
        "department":   "Engineering",
    },
    # Client users  (admin_type='client' — the valid DB choice)
    {
        "email":        "client1@gmail.com",
        "username":     "client1",
        "name":         "Arun",
        "surname":      "Client",
        "admin_type":   "client",
        "company_name": "Client Corp Ltd",
        "designation":  "Site Director",
        "department":   "Operations",
    },
    {
        "email":        "client2@gmail.com",
        "username":     "client2",
        "name":         "Ravi",
        "surname":      "Client",
        "admin_type":   "client",
        "company_name": "Client Corp Ltd",
        "designation":  "Operations Manager",
        "department":   "Operations",
    },
    # Contractor users
    {
        "email":        "contractor1@gmail.com",
        "username":     "contractor1",
        "name":         "Mani",
        "surname":      "Contractor",
        "admin_type":   "contractor",
        "company_name": "BuildRight Contractors",
        "designation":  "Site Supervisor",
        "department":   "Civil Works",
    },
    {
        "email":        "contractor2@gmail.com",
        "username":     "contractor2",
        "name":         "Suresh",
        "surname":      "Contractor",
        "admin_type":   "contractor",
        "company_name": "BuildRight Contractors",
        "designation":  "Civil Engineer",
        "department":   "Civil Works",
    },
]


class Command(BaseCommand):
    help = "Seed test users for role-based chat system testing"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Delete existing test users and project before re-seeding",
        )

    def handle(self, *args, **options):
        if options["reset"]:
            self._wipe()

        with transaction.atomic():
            project = self._get_or_create_project()
            self._seed_users(project)

        self.stdout.write(self.style.SUCCESS(
            f"\n✅  Test users ready! (password for all: {PASSWORD})\n"
        ))
        self.stdout.write(f"  {'ROLE':<12}  {'EMAIL':<30}  NAME")
        self.stdout.write(f"  {'-'*12}  {'-'*30}  {'-'*20}")
        for u in SAMPLE_USERS:
            self.stdout.write(
                f"  {u['admin_type']:<12}  {u['email']:<30}  {u['name']} {u['surname']}"
            )
        self.stdout.write("")

    def _get_or_create_project(self):
        project, created = Project.objects.get_or_create(
            projectName=PROJECT_NAME,
            defaults={
                "projectCategory": "construction",
                "subscriber_role": "epc",
                "location":        "Test City, India",
            },
        )
        verb = "Created" if created else "Found"
        self.stdout.write(f"  {verb} project: {project.projectName} (id={project.id})")
        return project

    def _seed_users(self, project):
        for spec in SAMPLE_USERS:
            user, created = User.objects.get_or_create(
                email=spec["email"],
                defaults={
                    "username":          spec["username"],
                    "name":              spec["name"],
                    "surname":           spec["surname"],
                    "admin_type":        spec["admin_type"],
                    "user_type":         "companyuser",
                    "company_name":      spec["company_name"],
                    "designation":       spec["designation"],
                    "department":        spec["department"],
                    "project":           project,
                    "is_active":         True,
                    "failed_login_count": 0,
                    "locked_until":      None,
                },
            )
            if created:
                user.set_password(PASSWORD)
                user.save(update_fields=["password"])
                self.stdout.write(
                    f"  Created [{spec['admin_type']:<12}] {user.email}"
                )
            else:
                # Always enforce correct state regardless of how user was created
                user.project           = project
                user.admin_type        = spec["admin_type"]
                user.user_type         = "companyuser"
                user.is_active         = True
                user.failed_login_count = 0
                user.locked_until      = None
                user.save(update_fields=[
                    "project", "admin_type", "user_type",
                    "is_active", "failed_login_count", "locked_until",
                ])
                self.stdout.write(
                    f"  Updated [{spec['admin_type']:<12}] {user.email}"
                )

    def _wipe(self):
        emails = [u["email"] for u in SAMPLE_USERS]
        count, _ = User.objects.filter(email__in=emails).delete()
        Project.objects.filter(projectName=PROJECT_NAME).delete()
        self.stdout.write(self.style.WARNING(
            f"  Wiped {count} test users and project '{PROJECT_NAME}'"
        ))
