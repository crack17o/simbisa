from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('scoring', '0004_rename_model_train_model_n_2b4d6e_idx_model_train_model_n_23fcd9_idx_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='decisioncredit',
            name='recommandation_ia',
            field=models.CharField(
                blank=True,
                choices=[('approuver', 'Approuver'), ('prudence', 'Prudence'), ('rejeter', 'Rejeter')],
                default='prudence',
                max_length=20,
            ),
        ),
    ]
