from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('savings', '0002_operationepargne_mode_paiement_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='compteepargne',
            name='objectif_periodicite',
            field=models.CharField(
                blank=True,
                choices=[('mensuel', 'Mensuel'), ('annuel', 'Annuel')],
                default='mensuel',
                max_length=10,
            ),
        ),
    ]
