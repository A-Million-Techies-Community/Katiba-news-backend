from django.db import migrations


def create_admin_group(apps, schema_editor):
    apps.get_model('auth', 'Group').objects.get_or_create(name='Workspace Administrator')


class Migration(migrations.Migration):
    dependencies = [('users', '0010_staffapplication')]
    operations = [migrations.RunPython(create_admin_group, migrations.RunPython.noop)]
