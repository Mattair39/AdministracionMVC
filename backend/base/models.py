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
        # Validación: end_date >= start_date
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
