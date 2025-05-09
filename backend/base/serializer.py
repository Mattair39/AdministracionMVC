from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Contract, Project

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ["username", "email", "password"]

    def create(self, validated_data):
        user = User(username=validated_data["username"], email=validated_data["email"])
        user.set_password(validated_data["password"])
        user.save()
        return user

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["username"]

class ContractSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model  = Contract
        fields = ["id", "contract_name", "client_name", "start_date", "end_date", "created_at", "updated_at", "owner"]

class ProjectSerializer(serializers.ModelSerializer):
    contract_name = serializers.CharField(source="contract.contract_name", read_only=True)
    contract_id   = serializers.PrimaryKeyRelatedField(queryset=Contract.objects.all(), source="contract", write_only=True, required=False)
    contract      = serializers.PrimaryKeyRelatedField(queryset=Contract.objects.all(), write_only=True, required=False)

    class Meta:
        model  = Project
        fields = ["id", "name", "description", "contract_name", "contract_id", "contract", "created_at", "updated_at"]

    def validate(self, attrs):
        if attrs.get("contract_id"):
            attrs["contract"] = attrs.pop("contract_id")
        if self.instance is None and "contract" not in attrs:
            raise serializers.ValidationError({"contract": "Este campo es obligatorio."})
        return attrs
