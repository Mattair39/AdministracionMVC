from rest_framework import serializers
from django.contrib.auth.models import User
from .models import Contract, Project
from django.core.exceptions import ValidationError as DjangoValidationError

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model  = User
        fields = ["username"]


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


class ContractSerializer(serializers.ModelSerializer):
    owner = UserSerializer(read_only=True)

    class Meta:
        model  = Contract
        fields = [
            "id", "contract_name", "client_name",
            "start_date", "end_date",
            "created_at", "updated_at", "owner",
        ]

    def validate(self, data):
        sd = data.get("start_date", getattr(self.instance, "start_date", None))
        ed = data.get("end_date",   getattr(self.instance, "end_date", None))
        if sd and ed and ed < sd:
            raise serializers.ValidationError({"end_date": "La fecha de fin no puede ser anterior a la fecha de inicio."})
        return data

    def create(self, validated_data):
        # Aplica clean() de modelo para cojer validaciones de Django
        obj = Contract(**validated_data)
        obj.clean()
        obj.save()
        return obj

    def update(self, instance, validated_data):
        for attr, val in validated_data.items():
            setattr(instance, attr, val)
        instance.clean()
        instance.save()
        return instance


class ProjectSerializer(serializers.ModelSerializer):
    contract_name = serializers.CharField(source="contract.contract_name", read_only=True)
    contract_id   = serializers.PrimaryKeyRelatedField(
        queryset=Contract.objects.all(), source="contract",
        write_only=True, required=False
    )
    contract      = serializers.PrimaryKeyRelatedField(
        queryset=Contract.objects.all(), write_only=True, required=False
    )

    class Meta:
        model  = Project
        fields = [
            "id", "name", "description",
            "contract_name", "contract_id", "contract",
            "created_at", "updated_at",
        ]

    def validate(self, attrs):
        # Normalizar contract / contract_id
        if not attrs.get("contract") and attrs.get("contract_id"):
            attrs["contract"] = attrs["contract_id"]
        if not attrs.get("contract"):
            raise serializers.ValidationError({"contract": "Este campo es obligatorio."})

        # Validación de unicidad por contrato
        contract = attrs["contract"]
        name     = attrs.get("name", getattr(self.instance, "name", None))
        qs = Project.objects.filter(contract=contract, name=name)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError({"name": "Ya existe un proyecto con ese nombre para este contrato."})

        attrs.pop("contract_id", None)
        return attrs
