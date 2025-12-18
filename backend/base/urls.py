# backend/base/urls.py - ARCHIVO COMPLETO FINAL
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
    get_project_hours_alert_extended,
    get_ticket_status_info,
    get_available_status_transitions,
    validate_ticket_status_change,
    update_ticket_status_with_validation,
    get_all_ticket_statuses,
    simple_tickets_api,
    get_current_user,
)

urlpatterns = [
    path("token/", CustomTokenObtainPairView.as_view(), name="token_obtain_pair"),
    path("token/refresh/", CustomRefreshTokenView.as_view(), name="token_refresh"),
    path("logout/", logout, name="logout"),
    path("authenticated/", is_authenticated, name="is_authenticated"),
    path("register/", register, name="register"),
    path("auth/me/", get_current_user, name="get_current_user"),
    
    # Contratos
    path("contracts/", ContractListCreateAPIView.as_view(), name="contract-list"),
    path("contracts/<int:pk>/", ContractRetrieveUpdateDestroyAPIView.as_view(), name="contract-detail"),
    
    # Proyectos
    path("projects/", ProjectListCreateAPIView.as_view(), name="project-list"),
    path("projects/<int:pk>/", ProjectRetrieveUpdateDestroyAPIView.as_view(),  name="project-detail"),
    
    # Paquetes
    path("packages/", PackageListCreateAPIView.as_view(), name="package-list"),
    path("packages/<int:pk>/", PackageRetrieveUpdateDestroyAPIView.as_view(), name="package-detail"),
    path("packages/wizard/", create_package_wizard, name="package-wizard"),
    path("contracts/<int:contract_id>/projects-for-packages/", get_contract_projects_for_packages, name="contract-projects-packages"),
    
    # Tickets
    path("tickets/", TicketListCreateAPIView.as_view(), name="ticket-list"),
    path("tickets/<int:ticket_id>/", TicketRetrieveUpdateDestroyAPIView.as_view(), name="ticket-detail"),
    path("users/", get_users_for_assignment, name="users-list"),
    path("tickets/<int:ticket_id>/worklogs/", create_worklog, name="create-worklog"),
    path("worklogs/<int:worklog_id>/", delete_worklog, name="delete-worklog"),
    
    # Proyectos
    path("projects/<int:project_id>/hours-info/", get_project_hours_info, name="project-hours-info"),
    path("projects/<int:project_id>/package-coverage/", check_project_package_coverage, name="project-package-coverage"),
    path("projects/hours-alerts/", get_projects_hours_alerts, name="projects-hours-alerts"),
    path("projects/<int:project_id>/hours-alert-extended/", get_project_hours_alert_extended, name="project-hours-alert-extended"),
    
    # Tickets 
    path("tickets/<int:ticket_id>/status-info/", get_ticket_status_info, name="ticket-status-info"),
    path("tickets/<int:ticket_id>/status-transitions/", get_available_status_transitions, name="ticket-status-transitions"),
    path("tickets/<int:ticket_id>/validate-status-change/", validate_ticket_status_change, name="validate-ticket-status-change"),
    path("tickets/<int:ticket_id>/update-status/", update_ticket_status_with_validation, name="update-ticket-status"),
    path("ticket-statuses/", get_all_ticket_statuses, name="all-ticket-statuses"),
    
    path("simple-api/", simple_tickets_api, name="simple-tickets-api"),
    
]