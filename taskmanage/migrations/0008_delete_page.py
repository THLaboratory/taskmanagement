# Generated by Django 5.1.5 on 2025-02-01 05:18

from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('taskmanage', '0007_task_unique_task_per_date'),
    ]

    operations = [
        migrations.DeleteModel(
            name='Page',
        ),
    ]
