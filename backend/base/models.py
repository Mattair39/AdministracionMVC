from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class Contract(models.Model):
    contract_name = models.CharField(max_length=120, unique=True)
    client_name = models.CharField(max_length=120)
    start_date = models.DateField()
    end_date = models.DateField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contracts')

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."})

    def __str__(self):
        return f"{self.contract_name} ({self.client_name})"

class Project(models.Model):
    name = models.CharField(max_length=120)
    description = models.CharField(max_length=250)
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='projects')
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contract", "name"], name="unique_project_name_per_contract")
        ]

    def __str__(self):
        return self.name

    def get_hours_info(self):
        """Obtiene información de horas disponibles y consumidas del proyecto"""
        from django.utils import timezone
        from django.db.models import Sum
        from decimal import Decimal
        
        today = timezone.now().date()
        
        # Obtener paquetes activos (que incluyan la fecha actual)
        active_packages = Package.objects.filter(
            package_projects__project=self,
            start_date__lte=today,
            end_date__gte=today
        )
        
        # Calcular horas disponibles (suma de paquetes activos)
        available_hours = active_packages.aggregate(
            total=Sum('total_hours')
        )['total'] or Decimal('0.00')
        
        # Calcular horas consumidas (suma de worklogs de todos los tickets del proyecto)
        consumed_hours = Worklog.objects.filter(
            ticket__project=self
        ).aggregate(
            total=Sum('hours_logged')
        )['total'] or Decimal('0.00')
        
        return {
            'available_hours': float(available_hours),
            'consumed_hours': float(consumed_hours),
            'has_active_packages': active_packages.exists(),
            'active_packages_count': active_packages.count()
        }

    def check_package_coverage(self, work_date):
        """Verifica si hay paquetes que cubran una fecha específica"""
        from datetime import datetime
        
        if isinstance(work_date, str):
            # Parsear fecha ISO con posible timezone
            work_date = datetime.fromisoformat(work_date.replace('Z', '+00:00')).date()
        
        covering_packages = Package.objects.filter(
            package_projects__project=self,
            start_date__lte=work_date,
            end_date__gte=work_date
        )
        
        return {
            'has_package': covering_packages.exists(),
            'packages_count': covering_packages.count(),
            'packages': [
                {
                    'id': pkg.id,
                    'name': pkg.package_name,
                    'total_hours': float(pkg.total_hours),
                    'start_date': pkg.start_date.isoformat(),
                    'end_date': pkg.end_date.isoformat()
                }
                for pkg in covering_packages
            ]
        }

    def get_hours_alert(self):
        """Obtiene el tipo de alerta según las reglas del negocio"""
        hours_info = self.get_hours_info()
        
        if hours_info['available_hours'] > 0:
            percentage = (hours_info['consumed_hours'] / hours_info['available_hours']) * 100
            
            if percentage >= 100:
                return {
                    'type': 'error',
                    'message': f'Las horas de soporte han sido consumidas completamente ({hours_info["consumed_hours"]:.2f}h/{hours_info["available_hours"]:.2f}h)',
                    'percentage': round(percentage, 1)
                }
            elif percentage >= 85:
                return {
                    'type': 'warning', 
                    'message': f'Se ha consumido el {percentage:.1f}% de las horas de soporte disponibles ({hours_info["consumed_hours"]:.2f}h/{hours_info["available_hours"]:.2f}h)',
                    'percentage': round(percentage, 1)
                }
        elif hours_info['consumed_hours'] > 0 and hours_info['available_hours'] == 0:
            return {
                'type': 'info',
                'message': f'Se han registrado {hours_info["consumed_hours"]:.2f}h sin paquetes de horas disponibles',
                'percentage': None
            }
        
        return None

class Package(models.Model):
    contract = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='packages')
    package_name = models.CharField(max_length=120)
    total_hours = models.DecimalField(max_digits=8, decimal_places=2)
    start_date = models.DateField()
    end_date = models.DateField()
    is_segmented = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='packages')

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["contract", "package_name"], 
                name="unique_package_name_per_contract"
            )
        ]

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."})

    def __str__(self):
        return f"{self.package_name} - {self.contract.contract_name}"

class PackageProject(models.Model):
    package = models.ForeignKey(Package, on_delete=models.CASCADE, related_name='package_projects')
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='project_packages')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["package", "project"], 
                name="unique_package_project"
            )
        ]

    def __str__(self):
        return f"{self.package.package_name} - {self.project.name}"

class Ticket(models.Model):
    STATUS_CHOICES = [
        ('Recibido', 'Recibido'),
        ('En Proceso', 'En Proceso'),
        ('Entregado', 'Entregado'),
    ]
    
    ticket_id = models.AutoField(primary_key=True)
    subject = models.CharField(max_length=200)
    description = models.TextField()
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='tickets')
    assigned_user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='assigned_tickets', null=True, blank=True)
    requester = models.CharField(max_length=200, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Recibido')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    owner = models.ForeignKey(User, on_delete=models.CASCADE, related_name='created_tickets')

    def __str__(self):
        return f"#{self.ticket_id} - {self.subject}"

class Worklog(models.Model):
    ticket = models.ForeignKey(Ticket, on_delete=models.CASCADE, related_name='worklogs')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='worklogs')
    work_date = models.DateTimeField()
    hours_logged = models.DecimalField(max_digits=8, decimal_places=2)
    description = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Ticket #{self.ticket.ticket_id} - {self.hours_logged}h - {self.user.username}"