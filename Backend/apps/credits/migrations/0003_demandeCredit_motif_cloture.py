from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('credits', '0002_creditexception'),
    ]

    operations = [
        migrations.AddField(
            model_name='demandecredit',
            name='motif_cloture',
            field=models.TextField(blank=True, default=''),
        ),
    ]
