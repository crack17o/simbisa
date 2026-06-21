from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import django.core.validators


def seed_default_rate(apps, schema_editor):
    PlatformConfig = apps.get_model('core', 'PlatformConfig')
    PlatformConfig.objects.get_or_create(pk=1, defaults={'cdf_per_usd': 2250})


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name='PlatformConfig',
            fields=[
                ('id', models.PositiveSmallIntegerField(default=1, editable=False, primary_key=True, serialize=False)),
                ('cdf_per_usd', models.PositiveIntegerField(
                    default=2250,
                    help_text='Nombre de francs congolais équivalant à un dollar américain.',
                    validators=[django.core.validators.MinValueValidator(1)],
                    verbose_name='CDF pour 1 USD',
                )),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('updated_by', models.ForeignKey(
                    blank=True,
                    null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='platform_config_updates',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={
                'verbose_name': 'Configuration plateforme',
                'verbose_name_plural': 'Configuration plateforme',
                'db_table': 'platform_config',
            },
        ),
        migrations.RunPython(seed_default_rate, migrations.RunPython.noop),
    ]
