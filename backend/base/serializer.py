from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Contract, Project, Package, PackageProject, Ticket, Worklog
from django.core.exceptions import ValidationError as DjangoValidationError
from datetime import datetime, date, timedelta
import calendar

# Los serializadores los utilizo para transformar los modelos de Django en JSON y viceversa.

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["username"]

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User(username=validated_data["username"], email=validated_data["email"])
        user.set_password(validated_data["password"])
        user.save()
        return user

class ContractSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True) # Para anidar este serializer (Mostrar el nombre del propeitario del contrato).

    class Meta:
        model = Contract
        fields = [
            "id", "contract_name", "client_name",
            "start_date", "end_date",
            "created_at", "updated_at", "owner",
        ]

    def validate(self, data):
        sd = data.get("start_date", getattr(self.instance, "start_date", None)) # Si estamos editando, toma el valor actual del contrato.
        ed = data.get("end_date", getattr(self.instance, "end_date", None))
        if sd and ed and ed < sd:
            raise serializers.ValidationError({"end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."})
        return data

    def create(self, validated_data):
        obj = Contract(**validated_data)
        obj.clean() # Para llamar mis validaciones de models.py.
        obj.save()
        return obj

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.clean()
        instance.save()
        return instance

class ProjectSerializer(serializers.ModelSerializer):
    contract_name = serializers.CharField(source="contract.contract_name", read_only=True)
    contract = serializers.PrimaryKeyRelatedField(queryset=Contract.objects.all())
    # queryset para validar que el ID exista en la base de datos.
    class Meta:
        model = Project
        fields = [
            "id", "name", "description",
            "contract_name", "contract",
            "created_at", "updated_at",
        ]
        validators = [
            serializers.UniqueTogetherValidator(
                queryset=Project.objects.all(),
                fields=['name', 'contract'],
                message="Ya existe un proyecto con ese nombre para este contrato."
            )
        ]

    def validate(self, attrs):
        if not attrs.get("contract"):
            raise serializers.ValidationError({"contract": "Este campo es obligatorio."})
        return attrs

class PackageProjectSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    
    class Meta:
        model = PackageProject
        fields = ["id", "project", "project_name"]

class PackageSerializer(serializers.ModelSerializer):
    contract_name = serializers.CharField(source="contract.contract_name", read_only=True)
    projects = PackageProjectSerializer(source="package_projects", many=True, read_only=True) # Anidado que usa la relación inversa con paquetes.
    project_ids = serializers.ListField(
        child=serializers.IntegerField(), 
        write_only=True, 
        required=True
    )
    
    class Meta:
        model = Package
        fields = [
            "id", "package_name", "total_hours", "start_date", "end_date",
            "is_segmented", "contract", "contract_name", "projects", "project_ids",
            "created_at", "updated_at"
        ]

    def validate_project_ids(self, value):
        if not value:
            raise serializers.ValidationError("Debe seleccionar al menos un proyecto.")
        return value

    def create(self, validated_data):
        project_ids = validated_data.pop('project_ids')
        package = Package.objects.create(**validated_data) # Crea el paquete con los datos validados/restantes.
        
        for project_id in project_ids:
            try:
                project = Project.objects.get(id=project_id, contract=package.contract)
                PackageProject.objects.create(package=package, project=project) # Crea la relación entre el paquete y el proyecto.
            except Project.DoesNotExist:
                continue
                
        return package

    def update(self, instance, validated_data):
        project_ids = validated_data.pop('project_ids', None)
        
        for attr, value in validated_data.items(): # Para setear/actualizar los campos validados del paquete.
            setattr(instance, attr, value)
        instance.save()
        
        if project_ids is not None:
            instance.package_projects.all().delete()
            
            for project_id in project_ids:
                try:
                    project = Project.objects.get(id=project_id, contract=instance.contract)
                    PackageProject.objects.create(package=instance, project=project)
                except Project.DoesNotExist:
                    continue
        
        return instance

class PackageWizardSerializer(serializers.Serializer): # No está basado en un modelo especifico. 
    contract_id = serializers.IntegerField()
    package_name = serializers.CharField(max_length=120, required=False, allow_blank=True)
    total_hours = serializers.DecimalField(max_digits=8, decimal_places=2)
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    project_ids = serializers.ListField(child=serializers.IntegerField())
    segment_by_months = serializers.BooleanField(default=False)
    
    def validate(self, data):
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError({
                "end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."
            })
        
        try:
            contract = Contract.objects.get(id=data['contract_id'])
        except Contract.DoesNotExist:
            raise serializers.ValidationError({"contract_id": "Contrato no encontrado."})
        
        if not data['project_ids']:
            raise serializers.ValidationError({"project_ids": "Debe seleccionar al menos un proyecto."})
        
        # Solo validar nombre si no se encuentra segmentado por meses.
        if not data['segment_by_months'] and not data.get('package_name', '').strip():
            raise serializers.ValidationError({"package_name": "El nombre del paquete es requerido."})
        
        return data
    
    def create_packages(self, validated_data):
        contract = Contract.objects.get(id=validated_data['contract_id'])
        created_packages = []
        
        if not validated_data['segment_by_months']: # Para crear un solo paquete
            package = Package.objects.create(
                contract=contract,
                package_name=validated_data['package_name'],
                total_hours=validated_data['total_hours'],
                start_date=validated_data['start_date'],
                end_date=validated_data['end_date'],
                is_segmented=False,
                owner_id=self.context['request'].user.id
            )
            
            for project_id in validated_data['project_ids']:
                try:
                    project = Project.objects.get(id=project_id, contract=contract)
                    PackageProject.objects.create(package=package, project=project)
                except Project.DoesNotExist:
                    continue
            
            created_packages.append(package)
        else: # Para crear paquetes segmentados
            packages = self._create_segmented_packages(validated_data, contract)
            created_packages.extend(packages)
        
        return created_packages
    
    def _create_segmented_packages(self, data, contract):
        start_date = data['start_date']
        end_date = data['end_date']
        total_hours = data['total_hours']
        
        # Determinar tipo de nomenclatura
        is_full_month = (start_date.day == 1 and end_date.day >= 28)
        
        # Para calcular cuántos paquetes se van a crear
        packages_info = []
        current_date = start_date
        
        # Calcular todos los períodos primero
        while current_date <= end_date:
            if is_full_month:
                # Caso 1: Meses completos (1ro al último día del mes)
                last_day = calendar.monthrange(current_date.year, current_date.month)[1]
                pkg_end_date = current_date.replace(day=last_day)
                
                if pkg_end_date > end_date:
                    pkg_end_date = end_date
            else:
                # Caso 2: Del mismo día X al mismo día X del siguiente mes
                if current_date.month == 12:
                    next_month = current_date.replace(year=current_date.year + 1, month=1)
                else:
                    next_month = current_date.replace(month=current_date.month + 1)
                
                try:
                    calculated_end = next_month.replace(day=start_date.day)
                except ValueError:
                    last_day = calendar.monthrange(next_month.year, next_month.month)[1]
                    calculated_end = next_month.replace(day=last_day)
                
                if calculated_end > end_date:
                    pkg_end_date = end_date
                else:
                    pkg_end_date = calculated_end
            
            if current_date > end_date:
                break
                
            packages_info.append({
                'start_date': current_date,
                'end_date': pkg_end_date
            })
            
            # Avanzar al siguiente período
            if is_full_month:
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1, day=1)
            else:
                current_date = pkg_end_date + timedelta(days=1)
            
            if len(packages_info) > 50:  # Para dar un limite 
                break
        
        # Calcular horas por paquete (EQUITATIVAS)
        num_packages = len(packages_info)
        if num_packages == 0:
            return []
            
        hours_per_package = total_hours / num_packages
        
        # Crear los paquetes con horas equitativas
        packages = []
        for i, pkg_info in enumerate(packages_info): # Agrega un indice a cada elemento
            pkg_start = pkg_info['start_date']
            pkg_end = pkg_info['end_date']
            
            # Generar nombre automático con timestamp para evitar duplicados
            timestamp = datetime.now().strftime("%H%M%S")
            
            if is_full_month:
                month_names = [
                    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
                ]
                base_name = f"Paquete {contract.contract_name} - {month_names[pkg_start.month - 1]} {pkg_start.year}"
            else:
                base_name = f"Paquete {contract.contract_name} - {pkg_start.strftime('%d/%m/%Y')} - {pkg_end.strftime('%d/%m/%Y')}"
            
            # Verificar si ya existe y agregar contador si es necesario
            package_name = base_name
            counter = 1
            while Package.objects.filter(contract=contract, package_name=package_name).exists():
                package_name = f"{base_name} ({counter})"
                counter += 1
            
            # Crear paquete con horas equitativas
            package = Package.objects.create(
                contract=contract,
                package_name=package_name,
                total_hours=round(hours_per_package, 2),
                start_date=pkg_start,
                end_date=pkg_end,
                is_segmented=True,
                owner_id=self.context['request'].user.id
            )
            
            # Asociar proyectos
            for project_id in data['project_ids']:
                try:
                    project = Project.objects.get(id=project_id, contract=contract)
                    PackageProject.objects.create(package=package, project=project)
                except Project.DoesNotExist:
                    continue
            
            packages.append(package)
        
        return packages

class WorklogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(source="user.username", read_only=True)
    
    class Meta:
        model = Worklog
        fields = [
            "id", "work_date", "hours_logged", "description", 
            "user", "user_name", "created_at", "updated_at"
        ]

class TicketSerializer(serializers.ModelSerializer):
    project_name = serializers.CharField(source="project.name", read_only=True)
    assigned_user_name = serializers.SerializerMethodField()
    worklogs = WorklogSerializer(many=True, read_only=True)
    total_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = Ticket
        fields = [
            "ticket_id", "subject", "description", "project", "project_name",
            "assigned_user", "assigned_user_name", "requester", "status",
            "worklogs", "total_hours", "created_at", "updated_at"
        ]
    
    def get_assigned_user_name(self, obj):
        return obj.assigned_user.username if obj.assigned_user else "Sin asignar"
    
    def get_total_hours(self, obj):
        return sum(worklog.hours_logged for worklog in obj.worklogs.all())

class WorklogCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Worklog
        fields = ["work_date", "hours_logged", "description", "user"]
    
    def create(self, validated_data):
        validated_data['ticket'] = self.context['ticket']
        return super().create(validated_data)