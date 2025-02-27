# Generated by Django 5.1.5 on 2025-01-26 14:49

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taskmanage', '0006_rename_content_task_task'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='task',
            constraint=models.UniqueConstraint(fields=('date', 'task'), name='unique_task_per_date'),
        ),
    ]
