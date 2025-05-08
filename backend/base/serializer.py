# backend/base/serializer.py

from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Contract

# — Serializer para registro de usuario —————————————————————————————————————————————————————————————
class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['username', 'email', 'password']

    def create(self, validated_data):
        user = User(
            username=validated_data['username'],
            email=validated_data['email']
        )
        user.set_password(validated_data['password'])
        user.save()
        return user

# — Serializer “ligero” para exponer username en el TopBar —————————————————————————————————————————————
class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ['username']

# — Serializer de Contratos CRUD ————————————————————————————————————————————————————————————————
class ContractSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model  = Contract
        fields = [
            'id',
            'contract_name',
            'client_name',
            'start_date',
            'end_date',
            'created_at',
            'updated_at',
            'owner',
        ]
