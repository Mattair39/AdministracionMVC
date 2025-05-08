from django.db import models
from django.contrib.auth.models import User

class Contract(models.Model):
    contract_name = models.CharField(max_length=120)
    client_name   = models.CharField(max_length=120)
    start_date    = models.DateField()
    end_date      = models.DateField()

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    owner = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='contracts'
    )

    def __str__(self):
        return f"{self.contract_name} ({self.client_name})"
