# Generated by Django 5.1.5 on 2025-02-01 05:33

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('taskmanage', '0008_delete_page'),
    ]

    operations = [
        migrations.CreateModel(
            name='Record',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('study_time', models.DurationField()),
            ],
        ),
    ]
