from django.urls import path
from .views import (
    CustomTokenObtainPairView,
    CustomRefreshTokenView,
    logout,
    is_authenticated,
    register,

    ContractListCreateAPIView,
    ContractRetrieveUpdateDestroyAPIView,
)

urlpatterns = [
    # auth + jwt
    path('token/',           CustomTokenObtainPairView.as_view(),           name='token_obtain_pair'),
    path('token/refresh/',   CustomRefreshTokenView.as_view(),              name='token_refresh'),
    path('logout/',          logout,                                       name='logout'),
    path('authenticated/',   is_authenticated,                             name='is_authenticated'),
    path('register/',        register,                                     name='register'),

    # CRUD de contratos
    path('contracts/',       ContractListCreateAPIView.as_view(),           name='contract-list'),
    path('contracts/<int:pk>/', ContractRetrieveUpdateDestroyAPIView.as_view(), name='contract-detail'),
]
