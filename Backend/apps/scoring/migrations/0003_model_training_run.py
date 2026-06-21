from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('scoring', '0002_scoringrule'),
    ]

    operations = [
        migrations.CreateModel(
            name='ModelTrainingRun',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('model_name', models.CharField(default='XGBoost', max_length=100)),
                ('model_version', models.CharField(blank=True, default='', max_length=120)),
                ('status', models.CharField(choices=[('success', 'Succès'), ('skipped', 'Ignoré'), ('failed', 'Échec')], default='success', max_length=20)),
                ('n_samples', models.PositiveIntegerField(default=0)),
                ('n_features', models.PositiveIntegerField(default=0)),
                ('details', models.JSONField(default=dict)),
            ],
            options={
                'db_table': 'model_training_run',
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='modeltrainingrun',
            index=models.Index(fields=['model_name', 'status', 'created_at'], name='model_train_model_n_2b4d6e_idx'),
        ),
    ]

