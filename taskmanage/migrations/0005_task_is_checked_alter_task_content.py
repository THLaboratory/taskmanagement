# Generated by Django 5.1.5 on 2025-01-19 14:18

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taskmanage', '0004_remove_task_description_remove_task_title_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='task',
            name='is_checked',
            field=models.BooleanField(default=False),
        ),
        migrations.AlterField(
            model_name='task',
            name='content',
            field=models.TextField(default='Untitled'),
            preserve_default=False,
        ),
    ]
