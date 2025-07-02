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
        from django.utils import timezone
        from django.db.models import Sum
        from decimal import Decimal
        
        today = timezone.now().date()
        
        active_packages = Package.objects.filter(
            package_projects__project=self,
            start_date__lte=today,
            end_date__gte=today
        )
        
        available_hours = active_packages.aggregate(
            total=Sum('total_hours')
        )['total'] or Decimal('0.00')
        
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
        from datetime import datetime
        
        if isinstance(work_date, str):
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

    def check_and_create_additional_package_if_needed(self, new_hours, work_date):
        from django.utils import timezone
        from decimal import Decimal
        from datetime import timedelta, datetime
        import math
        
        hours_info = self.get_hours_info()
        total_hours_after_add = hours_info['consumed_hours'] + float(new_hours)
        available_hours = hours_info['available_hours']
        
        if total_hours_after_add <= available_hours:
            return {
                'package_created': False,
                'excess_hours': 0,
                'package': None
            }
        
        excess_hours = total_hours_after_add - available_hours
        
        contract = self.contract
        
        if isinstance(work_date, str):
            work_date = datetime.fromisoformat(work_date.replace('Z', '+00:00')).date()
        
        timestamp = datetime.now().strftime("%H%M%S")
        base_name = f"Paquete Adicional - {work_date.strftime('%d/%m/%Y')}"
        
        package_name = base_name
        counter = 1
        while Package.objects.filter(contract=contract, package_name=package_name).exists():
            package_name = f"{base_name} ({counter})"
            counter += 1
        
        package_hours = max(1.0, math.ceil(excess_hours))
        
        start_date = work_date
        end_date = start_date + timedelta(days=30)
        
        additional_package = Package.objects.create(
            contract=contract,
            package_name=package_name,
            total_hours=Decimal(str(package_hours)),
            start_date=start_date,
            end_date=end_date,
            is_segmented=False,
            owner=self.owner
        )
        
        PackageProject.objects.create(
            package=additional_package,
            project=self
        )
        
        return {
            'package_created': True,
            'excess_hours': excess_hours,
            'package_hours_created': package_hours,
            'package': {
                'id': additional_package.id,
                'name': additional_package.package_name,
                'total_hours': float(additional_package.total_hours),
                'start_date': additional_package.start_date.isoformat(),
                'end_date': additional_package.end_date.isoformat()
            }
        }

    def get_hours_alert_with_auto_package_info(self, auto_package_info=None):
        hours_info = self.get_hours_info()
        alert = self.get_hours_alert()
        
        if auto_package_info and auto_package_info['package_created']:
            package_info = auto_package_info['package']
            
            if alert and alert['type'] == 'error':
                alert['message'] += f" | Se ha creado automáticamente el paquete '{package_info['name']}' con {package_info['total_hours']}h adicionales"
                alert['auto_package'] = package_info
            else:
                alert = {
                    'type': 'success',
                    'message': f'Se ha creado automáticamente un paquete adicional: {package_info["name"]} ({package_info["total_hours"]}h) para cubrir el exceso de horas',
                    'auto_package': package_info,
                    'percentage': None
                }
        
        return alert

    def get_hours_calculator(self):
        from .services.hours_calculator import HoursCalculatorService
        return HoursCalculatorService(self)
    
    def get_hours_info_new(self):
        calculator = self.get_hours_calculator()
        return calculator.calculate_hours_summary()
    
    def has_available_hours(self):
        calculator = self.get_hours_calculator()
        return calculator.get_available_hours() > 0
    
    def get_hours_status(self):
        calculator = self.get_hours_calculator()
        return calculator.get_hours_status()

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