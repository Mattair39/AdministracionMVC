from django.conf import settings
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from django.contrib.auth.models import User
from .models import Contract, Project, Package, PackageProject, Ticket, Worklog
from .serializer import (
    ContractSerializer, ProjectSerializer, UserRegistrationSerializer,
    PackageSerializer, PackageWizardSerializer, TicketSerializer, WorklogSerializer, WorklogCreateSerializer
)
from rest_framework import status

class CustomTokenObtainPairView(TokenObtainPairView):
    def post(self, request, *args, **kwargs):
        resp = super().post(request, *args, **kwargs)
        tokens = resp.data
        samesite, secure = ("Lax", False) if settings.DEBUG else ("None", True)
        res = Response({"success": True})
        res.set_cookie("access_token",  tokens["access"], httponly=True, secure=secure, samesite=samesite, path="/")
        res.set_cookie("refresh_token", tokens["refresh"], httponly=True, secure=secure, samesite=samesite, path="/")
        return res

class CustomRefreshTokenView(TokenRefreshView):
    def post(self, request, *args, **kwargs):
        request.data["refresh"] = request.COOKIES.get("refresh_token")
        resp = super().post(request, *args, **kwargs)
        tok = resp.data
        samesite, secure = ("Lax", False) if settings.DEBUG else ("None", True)
        res = Response({"refreshed": True})
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
        return Response(ser.data)
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

class ProjectListCreateAPIView(generics.ListCreateAPIView):
    serializer_class   = ProjectSerializer
    permission_classes = [IsAuthenticated]
    def get_queryset(self):
        qs = Project.objects.all()
        cid = self.request.query_params.get("contract")
        if cid and cid.isdigit():
            qs = qs.filter(contract_id=int(cid))
        return qs
    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

class ProjectRetrieveUpdateDestroyAPIView(generics.RetrieveUpdateDestroyAPIView):
    queryset         = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticated]

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
        # El assigned_user puede ser None, no lo establecemos por defecto
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

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def create_worklog(request, ticket_id):
    try:
        ticket = Ticket.objects.get(ticket_id=ticket_id)
        serializer = WorklogCreateSerializer(data=request.data, context={'ticket': ticket})
        
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=status.HTTP_201_CREATED)
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