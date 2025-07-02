from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal


class HoursCalculatorService:
    """
    - Calcular horas de paquetes activos
    - Calcular horas consumidas en worklogs
    - Generar resumen de horas disponibles
    """
    
    def __init__(self, project):
        
        self.project = project
        self.today = timezone.now().date()
    
    def get_active_packages_hours(self):
        from ..models import Package
        
        active_packages = Package.objects.filter(
            package_projects__project=self.project,
            start_date__lte=self.today,
            end_date__gte=self.today
        )
        
        total_hours = active_packages.aggregate(
            total=Sum('total_hours')
        )['total']
        
        return total_hours or Decimal('0.00')
    
    def get_consumed_hours(self):
        from ..models import Worklog
        
        consumed_hours = Worklog.objects.filter(
            ticket__project=self.project
        ).aggregate(total=Sum('hours_logged'))['total']
        
        return consumed_hours or Decimal('0.00')
    
    def get_available_hours(self):
        total_package_hours = self.get_active_packages_hours()
        consumed_hours = self.get_consumed_hours()
        
        available_hours = total_package_hours - consumed_hours
        return max(Decimal('0.00'), available_hours)
    
    def calculate_hours_summary(self):
        """
        Genera un resumen completo de las horas del proyecto.
        
        Returns:
            dict: Diccionario con el resumen de horas
                - total_package_hours: Horas totales de paquetes activos
                - consumed_hours: Horas consumidas en worklogs
                - available_hours: Horas disponibles (mínimo 0)
        """
        total_package_hours = self.get_active_packages_hours()
        consumed_hours = self.get_consumed_hours()
        available_hours = max(Decimal('0.00'), total_package_hours - consumed_hours)
        
        return {
            'total_package_hours': float(total_package_hours),
            'consumed_hours': float(consumed_hours),
            'available_hours': float(available_hours)
        }
    
    def is_package_hours_exhausted(self):
        return self.get_available_hours() <= 0
    
    def is_package_hours_low(self, threshold=10):
        available_hours = self.get_available_hours()
        return 0 < available_hours <= threshold
    
    def get_hours_status(self):
        total_package_hours = self.get_active_packages_hours()
        
        if total_package_hours <= 0:
            return 'no_packages'
        
        if self.is_package_hours_exhausted():
            return 'exhausted'
        elif self.is_package_hours_low():
            return 'low'
        else:
            return 'normal'