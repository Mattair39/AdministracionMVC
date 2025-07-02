from django.conf import settings
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User
from django.utils import timezone
from django.db.models import Sum, Q
from .models import Contract, Project, Package, PackageProject, Ticket, Worklog
from .serializer import (
    ContractSerializer, ProjectSerializer, UserRegistrationSerializer,
    PackageSerializer, PackageWizardSerializer, TicketSerializer, WorklogSerializer, WorklogCreateSerializer
)
# NUEVO: Importar el servicio de cálculo de horas para implementar SRP
from .services.hours_calculator import HoursCalculatorService
from rest_framework import status
from datetime import datetime, time
import re


class CustomTokenObtainPairView(TokenObtainPairView): # Extiende la vista estándar de JWT para implementar autenticación basada en cookies HTTP-only.
    def post(self, request, *args, **kwargs):
        resp = super().post(request, *args, **kwargs)
        tokens = resp.data # Valida Credenciales y devuelve access y refresh tokens.
        samesite, secure = ("Lax", False) if settings.DEBUG else ("None", True)
        res = Response({"success": True})
        res.set_cookie("access_token",  tokens["access"], httponly=True, secure=secure, samesite=samesite, path="/") # Crea cookies seguras
        res.set_cookie("refresh_token", tokens["refresh"], httponly=True, secure=secure, samesite=samesite, path="/")
        return res

class CustomRefreshTokenView(TokenRefreshView): # Renueva el access token usando el refresh token almacenado en cookies.
    def post(self, request, *args, **kwargs):
        request.data["refresh"] = request.COOKIES.get("refresh_token")
        resp = super().post(request, *args, **kwargs) # Inyecta en request
        tok = resp.data
        samesite, secure = ("Lax", False) if settings.DEBUG else ("None", True)
        res = Response({"refreshed": True}) # Renueva el token
        res.set_cookie("access_token", tok.get("access"), httponly=True, secure=secure, samesite=samesite, path="/")
        return res

@api_view(["POST"])
def logout(request):
    res = Response({"success": True})
    res.delete_cookie("access_token", path="/", samesite="Lax")
    res.delete_cookie("refresh_token", path="/", samesite="Lax")
    return res

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def is_authenticated(request):
    return Response({"authenticated": True})

@api_view(["POST"])
@permission_classes([AllowAny])
def register(request):
    ser = UserRegistrationSerializer(data=request.data)
    if ser.is_valid():
        ser.save()
        return Response(ser.data) # Respuesta con datos del usuario.
    return Response(ser.errors)

class ContractListCreateAPIView(generics.ListCreateAPIView):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ContractRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Contract.objects.all()
    serializer_class = ContractSerializer
    permission_classes = [IsAuthenticated]

# FUNCIÓN WRAPPER: Mantiene compatibilidad con el código existente
# Implementa el principio de Responsabilidad Única (SRP)
def calculate_available_hours(project):
    """
    Función wrapper para mantener compatibilidad con el código existente.
    
    NOTA: Esta función ahora delega al HoursCalculatorService para cumplir
    con el principio de Responsabilidad Única (SRP). La lógica de cálculo
    está encapsulada en una clase dedicada.
    
    Args:
        project: Instancia del modelo Project
    
    Returns:
        dict: Información de horas del proyecto
            - total_package_hours: Horas totales de paquetes activos
            - consumed_hours: Horas consumidas en worklogs
            - available_hours: Horas disponibles (mínimo 0)
    """
    calculator = HoursCalculatorService(project)
    return calculator.calculate_hours_summary()

class ProjectListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = Project.objects.all().select_related('contract').order_by('contract__client_name', 'name')
        cid = self.request.query_params.get("contract")
        if cid and cid.isdigit():
            qs = qs.filter(contract_id=int(cid))
        return qs
    
    def list(self, request, *args, **kwargs):
        queryset = self.get_queryset()
        projects_data = []
        
        for project in queryset:
            # CAMBIO: Usar directamente el servicio para mayor eficiencia y claridad
            # Aplicación del principio SRP - el servicio se encarga únicamente del cálculo
            calculator = HoursCalculatorService(project)
            hours_info = calculator.calculate_hours_summary()
            
            project_data = {
                'id': project.id,
                'name': project.name,
                'description': project.description,
                'contract': project.contract.id,
                'contract_name': project.contract.contract_name,
                'client_name': project.contract.client_name,
                'created_at': project.created_at,
                'updated_at': project.updated_at,
                'package_hours': hours_info
            }
            projects_data.append(project_data)
        
        return Response(projects_data)
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ProjectRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all().select_related('contract')
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]
    
    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        serializer = self.get_serializer(instance)
        
        # CAMBIO: Usar directamente el servicio
        # Aplicación del principio SRP - separación de responsabilidades
        calculator = HoursCalculatorService(instance)
        hours_info = calculator.calculate_hours_summary()
        
        # Obtener tickets asociados
        tickets = Ticket.objects.filter(project=instance).select_related('assigned_user').prefetch_related('worklogs')
        tickets_data = []
        for ticket in tickets:
            total_hours = sum(worklog.hours_logged for worklog in ticket.worklogs.all())
            tickets_data.append({
                'ticket_id': ticket.ticket_id,
                'subject': ticket.subject,
                'status': ticket.status,
                'assigned_user_name': ticket.assigned_user.username if ticket.assigned_user else 'Sin asignar',
                'requester': ticket.requester,
                'total_hours': float(total_hours),
                'created_at': ticket.created_at,
            })
        
        # Obtener paquetes asociados
        packages = Package.objects.filter(package_projects__project=instance)
        packages_data = []
        today = timezone.now().date()
        
        for package in packages:
            is_active = package.start_date <= today <= package.end_date
            packages_data.append({
                'id': package.id,
                'package_name': package.package_name,
                'total_hours': float(package.total_hours),
                'start_date': package.start_date,
                'end_date': package.end_date,
                'is_active': is_active
            })
        
        data = serializer.data
        data['package_hours'] = hours_info
        data['tickets'] = tickets_data
        data['packages'] = packages_data
        
        return Response(data)

class PackageListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = PackageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = Package.objects.all().select_related('contract').prefetch_related('package_projects__project')
        contract_id = self.request.query_params.get("contract")
        if contract_id and contract_id.isdigit():
            qs = qs.filter(contract_id=int(contract_id))
        return qs
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class PackageRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Package.objects.all().select_related('contract').prefetch_related('package_projects__project')
    serializer_class = PackageSerializer
    permission_classes = [IsAuthenticated]

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_package_wizard(request):
    serializer = PackageWizardSerializer(data=request.data, context={'request': request})
    
    if serializer.is_valid():
        try:
            packages = serializer.create_packages(serializer.validated_data)
            response_serializer = PackageSerializer(packages, many=True)
            return Response({
                'success': True,
                'packages': response_serializer.data,
                'count': len(packages)
            }, status=status.HTTP_201_CREATED)
        except Exception as e:
            return Response({
                'success': False,
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'success': False,
        'errors': serializer.errors
    }, status=status.HTTP_400_BAD_REQUEST)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_contract_projects_for_packages(request, contract_id):
    try:
        contract = Contract.objects.get(id=contract_id)
        projects = Project.objects.filter(contract=contract)
        
        projects_data = [{
            'id': p.id,
            'name': p.name,
            'description': p.description
        } for p in projects]
        
        return Response({
            'contract': {
                'id': contract.id,
                'name': contract.contract_name,
                'client': contract.client_name
            },
            'projects': projects_data
        })
    except Contract.DoesNotExist:
        return Response({'error': 'Contrato no encontrado'}, status=404)

class TicketListCreateAPIView(generics.ListCreateAPIView):
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        qs = Ticket.objects.all().select_related('project', 'assigned_user').prefetch_related('worklogs')
        project_id = self.request.query_params.get("project")
        if project_id and project_id.isdigit():
            qs = qs.filter(project_id=int(project_id))
        return qs.order_by('-created_at')
    
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class TicketRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Ticket.objects.all().select_related('project', 'assigned_user').prefetch_related('worklogs')
    serializer_class = TicketSerializer
    permission_classes = [IsAuthenticated]
    lookup_field = 'ticket_id'

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_users_for_assignment(request):
    try:
        users = User.objects.all().values('id', 'username')
        return Response(list(users))
    except Exception as e:
        return Response({'error': str(e)}, status=500)

def parse_time_input(time_str):
    """Convierte formato HH:MM a decimal de horas"""
    if not time_str:
        return 0
    
    # Si es decimal, se devuelve
    try:
        return float(time_str)
    except ValueError:
        pass
    
    # Parsear formato HH:MM
    time_pattern = re.match(r'^(\d{1,2}):(\d{2})$', time_str.strip())
    if time_pattern:
        hours = int(time_pattern.group(1))
        minutes = int(time_pattern.group(2))
        return hours + (minutes / 60.0)
    
    raise ValueError("Formato de tiempo inválido. Use HH:MM o decimal.")

# FUNCIÓN MODIFICADA: create_worklog con generación automática de paquetes
@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_worklog(request, ticket_id):
    try:
        ticket = Ticket.objects.get(ticket_id=ticket_id)
        
        # Procesar el formato de horas
        data = request.data.copy()
        hours_to_add = 0
        
        if 'hours_logged' in data:
            try:
                hours_to_add = parse_time_input(data['hours_logged'])
                data['hours_logged'] = hours_to_add
            except ValueError as e:
                return Response({'hours_logged': [str(e)]}, status=status.HTTP_400_BAD_REQUEST)
        
        # NUEVA FUNCIONALIDAD: Verificar si se necesita crear paquete adicional
        project = ticket.project
        work_date = data.get('work_date')
        
        # Convertir work_date si es string
        if isinstance(work_date, str):
            try:
                from datetime import datetime
                work_date = datetime.fromisoformat(work_date.replace('Z', '+00:00')).date()
            except:
                work_date = timezone.now().date()
        
        # Verificar y crear paquete adicional si es necesario
        auto_package_info = project.check_and_create_additional_package_if_needed(
            hours_to_add, work_date
        )
        
        # Crear el worklog normalmente
        serializer = WorklogCreateSerializer(data=data, context={'ticket': ticket})
        
        if serializer.is_valid():
            worklog = serializer.save()
            
            # Preparar respuesta con información del paquete automático
            response_data = serializer.data
            
            if auto_package_info['package_created']:
                response_data['auto_package_created'] = {
                    'message': f'Se ha creado automáticamente un paquete adicional para cubrir el exceso de {auto_package_info["excess_hours"]:.2f} horas',
                    'package': auto_package_info['package'],
                    'excess_hours': auto_package_info['excess_hours']
                }
            
            return Response(response_data, status=status.HTTP_201_CREATED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
    except Ticket.DoesNotExist:
        return Response({'error': 'Ticket no encontrado'}, status=404)

@api_view(["DELETE"])
@permission_classes([IsAuthenticated])
def delete_worklog(request, worklog_id):
    try:
        worklog = Worklog.objects.get(id=worklog_id)
        worklog.delete()
        return Response({'success': True}, status=status.HTTP_204_NO_CONTENT)
    except Worklog.DoesNotExist:
        return Response({'error': 'Worklog no encontrado'}, status=404)

# Para alerta de horas - USANDO EL MÉTODO EXISTENTE DEL MODELO

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_project_hours_info(request, project_id):
    """Obtiene información de horas disponibles y consumidas del proyecto"""
    try:
        project = Project.objects.get(id=project_id)
        # NOTA: Mantiene compatibilidad usando el método existente del modelo
        # que internamente puede usar el servicio si se actualiza
        hours_info = project.get_hours_info()
        return Response(hours_info)
    except Project.DoesNotExist:
        return Response({'error': 'Proyecto no encontrado'}, status=404)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def check_project_package_coverage(request, project_id):
    """Verifica cobertura de paquetes para una fecha específica"""
    try:
        project = Project.objects.get(id=project_id)
        work_date = request.query_params.get('work_date')
        
        if not work_date:
            return Response(
                {'error': 'work_date parameter is required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        coverage_info = project.check_package_coverage(work_date)
        return Response(coverage_info)
    except Project.DoesNotExist:
        return Response({'error': 'Proyecto no encontrado'}, status=404)
    except ValueError as e:
        return Response(
            {'error': f'Invalid date format: {str(e)}'}, 
            status=status.HTTP_400_BAD_REQUEST
        )

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def get_projects_hours_alerts(request):
    """Obtiene alertas de horas para múltiples proyectos"""
    project_ids = request.data.get('project_ids', [])
    
    if not project_ids:
        return Response(
            {'error': 'project_ids list is required'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    
    alerts = {}
    projects = Project.objects.filter(id__in=project_ids)
    
    for project in projects:
        alert = project.get_hours_alert()
        if alert:
            alerts[project.id] = alert
    
    return Response(alerts)

# NUEVA FUNCIÓN: Alerta extendida de horas con información de paquetes automáticos
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def get_project_hours_alert_extended(request, project_id):
    """
    Obtiene alerta de horas extendida que puede incluir información de paquetes automáticos
    """
    try:
        project = Project.objects.get(id=project_id)
        
        # Verificar si hay parámetros de paquete automático en query params
        auto_package_id = request.query_params.get('auto_package_id')
        auto_package_info = None
        
        if auto_package_id:
            try:
                auto_package = Package.objects.get(id=auto_package_id)
                auto_package_info = {
                    'package_created': True,
                    'package': {
                        'id': auto_package.id,
                        'name': auto_package.package_name,
                        'total_hours': float(auto_package.total_hours),
                        'start_date': auto_package.start_date.isoformat(),
                        'end_date': auto_package.end_date.isoformat()
                    }
                }
            except Package.DoesNotExist:
                pass
        
        alert = project.get_hours_alert_with_auto_package_info(auto_package_info)
        return Response(alert if alert else {})
        
    except Project.DoesNotExist:
        return Response({'error': 'Proyecto no encontrado'}, status=404)