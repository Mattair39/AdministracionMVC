from django.urls import path
from .views import (
    CustomTokenObtainPairView,
    CustomRefreshTokenView,
    logout,
    is_authenticated,
    register,
    ContractListCreateAPIView,
    ContractRetrieveUpdateDestroyAPIView,
    ProjectListCreateAPIView,
    ProjectRetrieveUpdateDestroyAPIView,
    PackageListCreateAPIView,
    PackageRetrieveUpdateDestroyAPIView,
    create_package_wizard,
    get_contract_projects_for_packages,
    TicketListCreateAPIView,
    TicketRetrieveUpdateDestroyAPIView,
    get_users_for_assignment,
    create_worklog,
    delete_worklog,
    get_project_hours_info,
    check_project_package_coverage,
    get_projects_hours_alerts,
    get_project_hours_alert_extended,  # NUEVA IMPORTACIÓN
)

urlpatterns = [
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CustomRefreshTokenView.as_view(), name="token_refresh"),
    path("logout/", logout, name="logout"),
    path("authenticated/", is_authenticated, name="is_authenticated"),
    path("register/", register, name="register"),
    
    path("contracts/", ContractListCreateAPIView.as_view(), name="contract-list"),
    path("contracts/<int:pk>/", ContractRetrieveUpdateDestroyAPIView.as_view(), name="contract-detail"),
    
    path("projects/", ProjectListCreateAPIView.as_view(), name="project-list"),
    path("projects/<int:pk>/", ProjectRetrieveUpdateDestroyAPIView.as_view(),  name="project-detail"),
    
    path("packages/", PackageListCreateAPIView.as_view(), name="package-list"),
    path("packages/<int:pk>/", PackageRetrieveUpdateDestroyAPIView.as_view(), name="package-detail"),
    path("packages/wizard/", create_package_wizard, name="package-wizard"),
    path("contracts/<int:contract_id>/projects-for-packages/", get_contract_projects_for_packages, name="contract-projects-packages"),
    
    path("tickets/", TicketListCreateAPIView.as_view(), name="ticket-list"),
    path("tickets/<int:ticket_id>/", TicketRetrieveUpdateDestroyAPIView.as_view(), name="ticket-detail"),
    path("users/", get_users_for_assignment, name="users-list"),
    path("tickets/<int:ticket_id>/worklogs/", create_worklog, name="create-worklog"),
    path("worklogs/<int:worklog_id>/", delete_worklog, name="delete-worklog"),
    path("projects/<int:project_id>/hours-info/", get_project_hours_info, name="project-hours-info"),
    path("projects/<int:project_id>/package-coverage/", check_project_package_coverage, name="project-package-coverage"),
    path("projects/hours-alerts/", get_projects_hours_alerts, name="projects-hours-alerts"),
    
    # NUEVA RUTA: Para alertas extendidas con información de paquetes automáticos
    path("projects/<int:project_id>/hours-alert-extended/", get_project_hours_alert_extended, name="project-hours-alert-extended"),
]