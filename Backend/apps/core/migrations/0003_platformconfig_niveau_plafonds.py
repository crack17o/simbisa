from django.db import migrations, models


_DEFAULTS = {
    'standard': {'max_usd': 300,   'max_mois': 6},
    'pro':      {'max_usd': 700,   'max_mois': 9},
    'pro_plus': {'max_usd': 1200,  'max_mois': 12},
    'premium':  {'max_usd': 2500,  'max_mois': 12},
}


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_platformconfig_maintenance_mode_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='platformconfig',
            name='niveau_plafonds',
            field=models.JSONField(
                default=dict,
                verbose_name='Plafonds par niveau de compte',
                help_text='Ex : {"standard": {"max_usd": 300, "max_mois": 6}, ...}',
            ),
        ),
    ]
