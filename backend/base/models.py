from django.db import models
from django.contrib.auth.models import User
from django.core.exceptions import ValidationError

class Contract(models.Model):
    contract_name = models.CharField(max_length=120, unique=True)
    client_name   = models.CharField(max_length=120)
    start_date    = models.DateField()
    end_date      = models.DateField()
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)
    owner         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='contracts')

    def clean(self):
        if self.end_date < self.start_date:
            raise ValidationError({"end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."})

    def __str__(self):
        return f"{self.contract_name} ({self.client_name})"

class Project(models.Model):
    name        = models.CharField(max_length=120)
    description = models.CharField(max_length=250)
    contract    = models.ForeignKey(Contract, on_delete=models.CASCADE, related_name='projects')
    owner       = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projects')
    created_at  = models.DateTimeField(auto_now_add=True)
    updated_at  = models.DateTimeField(auto_now=True)

    class Meta:
        constraints = [
            models.UniqueConstraint(fields=["contract", "name"], name="unique_project_name_per_contract")
        ]

    def __str__(self):
        return self.name

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