from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('ussd', '0001_initial'),
    ]

    operations = [
        migrations.AlterField(
            model_name='ussdinteractionlog',
            name='channel',
            field=models.CharField(default='simulator', max_length=100),
        ),
    ]
