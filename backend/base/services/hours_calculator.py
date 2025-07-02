"""
Servicio para el cálculo de horas de proyectos.
Implementa el principio de Responsabilidad Única (SRP) al separar
toda la lógica de cálculo de horas en una clase dedicada.
"""

from django.utils import timezone
from django.db.models import Sum
from decimal import Decimal


class HoursCalculatorService:
    """
    Servicio dedicado al cálculo de horas de proyectos.
    
    Responsabilidades:
    - Calcular horas de paquetes activos
    - Calcular horas consumidas en worklogs
    - Generar resumen de horas disponibles
    """
    
    def __init__(self, project):
        """
        Inicializa el calculador para un proyecto específico.
        
        Args:
            project: Instancia del modelo Project
        """
        self.project = project
        self.today = timezone.now().date()
    
    def get_active_packages_hours(self):
        """
        Calcula las horas totales de paquetes activos.
        
        Un paquete es considerado activo si la fecha actual
        está dentro del rango start_date y end_date.
        
        Returns:
            Decimal: Total de horas de paquetes activos
        """
        # Importación local para evitar circular imports
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
        """
        Calcula las horas consumidas en todos los worklogs del proyecto.
        
        Incluye TODOS los worklogs del proyecto, sin filtro de fechas,
        ya que las horas una vez consumidas no se "devuelven".
        
        Returns:
            Decimal: Total de horas consumidas
        """
        # Importación local para evitar circular imports
        from ..models import Worklog
        
        consumed_hours = Worklog.objects.filter(
            ticket__project=self.project
        ).aggregate(total=Sum('hours_logged'))['total']
        
        return consumed_hours or Decimal('0.00')
    
    def get_available_hours(self):
        """
        Calcula las horas disponibles (paquetes activos - consumidas).
        
        Las horas disponibles no pueden ser negativas, el mínimo es 0.
        
        Returns:
            Decimal: Horas disponibles (mínimo 0)
        """
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
        """
        Verifica si las horas del paquete están agotadas.
        
        Returns:
            bool: True si las horas disponibles son 0 o menores
        """
        return self.get_available_hours() <= 0
    
    def is_package_hours_low(self, threshold=10):
        """
        Verifica si las horas del paquete están por agotarse.
        
        Args:
            threshold (int): Umbral de horas para considerar "pocas horas"
        
        Returns:
            bool: True si las horas disponibles están por debajo del umbral
        """
        available_hours = self.get_available_hours()
        return 0 < available_hours <= threshold
    
    def get_hours_status(self):
        """
        Obtiene el estado de las horas del proyecto.
        
        Returns:
            str: Estado de las horas ('exhausted', 'low', 'normal', 'no_packages')
        """
        total_package_hours = self.get_active_packages_hours()
        
        if total_package_hours <= 0:
            return 'no_packages'
        
        if self.is_package_hours_exhausted():
            return 'exhausted'
        elif self.is_package_hours_low():
            return 'low'
        else:
            return 'normal'