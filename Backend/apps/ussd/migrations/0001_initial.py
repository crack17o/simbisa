import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ('clients', '0001_initial'),
    ]

    operations = [
        migrations.CreateModel(
            name='UssdInteractionLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('session_id', models.CharField(db_index=True, max_length=64)),
                ('msisdn', models.CharField(db_index=True, max_length=20)),
                ('user_input', models.CharField(blank=True, max_length=32)),
                ('response_type', models.CharField(max_length=3)),
                ('response_message', models.TextField()),
                ('menu_state', models.CharField(blank=True, max_length=40)),
                ('channel', models.CharField(default='simulator', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True, db_index=True)),
            ],
            options={
                'db_table': 'ussd_interaction_log',
                'ordering': ['-created_at'],
            },
        ),
        migrations.CreateModel(
            name='UssdProfile',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('pin_hash', models.CharField(blank=True, max_length=128)),
                ('is_active', models.BooleanField(default=True)),
                ('failed_pin_attempts', models.PositiveSmallIntegerField(default=0)),
                ('locked_until', models.DateTimeField(blank=True, null=True)),
                ('client', models.OneToOneField(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='ussd_profile',
                    to='clients.client',
                )),
            ],
            options={
                'db_table': 'ussd_profile',
            },
        ),
    ]
