from django.core.management.base import BaseCommand
from environment.models import EmissionFactor

class Command(BaseCommand):
    help = 'Seed initial ESG data'

    def handle(self, *args, **options):
        # Create emission factors
        emission_factors = [
            {'source': 'Grid Electricity (India)', 'factor_value': 0.82, 'unit': 'kgCO2e/kWh', 'scope': 'scope2'},
            {'source': 'Diesel Generator', 'factor_value': 2.68, 'unit': 'kgCO2e/L', 'scope': 'scope1'},
            {'source': 'Petrol Vehicle', 'factor_value': 2.31, 'unit': 'kgCO2e/L', 'scope': 'scope3'},
            {'source': 'Natural Gas', 'factor_value': 2.03, 'unit': 'kgCO2e/m3', 'scope': 'scope1'},
            {'source': 'LPG', 'factor_value': 3.03, 'unit': 'kgCO2e/kg', 'scope': 'scope1'},
        ]

        for factor_data in emission_factors:
            factor, created = EmissionFactor.objects.get_or_create(
                source=factor_data['source'],
                defaults=factor_data
            )
            if created:
                self.stdout.write(f'Created emission factor: {factor.source}')
            else:
                self.stdout.write(f'Emission factor already exists: {factor.source}')

        self.stdout.write(self.style.SUCCESS('Successfully seeded ESG data'))