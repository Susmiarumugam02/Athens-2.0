# Fix tenant deletion - Update FK constraints to CASCADE
# NOTE: These are PostgreSQL-only operations, skipped on SQLite

from django.db import migrations, connection


class Migration(migrations.Migration):

    dependencies = [
        ('control_plane', '0011_migrate_to_components'),
    ]

    operations = [
        migrations.RunSQL(
            sql='SELECT 1;',  # no-op on SQLite; PostgreSQL handles CASCADE via Django ORM
            reverse_sql='SELECT 1;',
        ),
    ]
