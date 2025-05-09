from django.conf import settings
from rest_framework import generics
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .models import Contract, Project
from .serializer import ContractSerializer, ProjectSerializer, UserRegistrationSerializer

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
