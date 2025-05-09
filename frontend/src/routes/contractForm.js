// src/routes/ContractForm.jsx
import { useState } from "react";
import {
  Box,
  Heading,
  Input,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
} from "@chakra-ui/react";
import { useNavigate } from "react-router-dom";
import { create_contract, update_contract } from "../endpoints/api";

const fieldLabels = {
  contract_name: "Nombre",
  client_name:   "Cliente",
  start_date:    "Fecha Inicio",
  end_date:      "Fecha Fin",
};

export default function ContractForm({ existing }) {
  const nav = useNavigate();
  const [form, setForm] = useState(
    existing || {
      contract_name: "",
      client_name:   "",
      start_date:    "",
      end_date:      "",
    }
  );
  const [errors, setErrors] = useState({});

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
  };

  const onSubmit = async () => {
    try {
      if (existing) {
        await update_contract(existing.id, form);
      } else {
        await create_contract(form);
      }
      // Aquí redirigimos a la ruta raíz donde muestras la lista de contratos
      nav("/");
    } catch (err) {
      if (err.response?.status === 400) {
        const data = { ...err.response.data };
        if (data.contract_name) {
          data.contract_name = ["Ya existe un contrato con ese nombre."];
        }
        if (data.end_date) {
          data.end_date = [data.end_date];
        }
        setErrors(data);
      }
    }
  };

  return (
    <Box maxW="400px" mx="auto" mt={8} p={6} bg="gray.700" rounded="md">
      <Heading size="md" mb={4}>
        {existing ? "Editar Contrato" : "Nuevo Contrato"}
      </Heading>

      {Object.keys(errors).length > 0 && (
        <Alert status="error" variant="solid" mb={4} rounded="md">
          <AlertIcon />
          <Box>
            <AlertTitle mb={2}>Corrige los siguientes errores:</AlertTitle>
            {Object.entries(errors).map(([field, msgs]) => (
              <AlertDescription key={field} display="block">
                <strong>{fieldLabels[field] || field}:</strong>{" "}
                {Array.isArray(msgs) ? msgs.join(" ") : msgs}
              </AlertDescription>
            ))}
          </Box>
        </Alert>
      )}

      <Box mb={3}>
        <Heading size="sm" color="gray.300">
          Nombre
        </Heading>
        <Input
          name="contract_name"
          value={form.contract_name}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
        />
      </Box>

      <Box mb={3}>
        <Heading size="sm" color="gray.300">
          Cliente
        </Heading>
        <Input
          name="client_name"
          value={form.client_name}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
        />
      </Box>

      <Box mb={3}>
        <Heading size="sm" color="gray.300">
          Fecha Inicio
        </Heading>
        <Input
          type="date"
          name="start_date"
          value={form.start_date}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
        />
      </Box>

      <Box mb={6}>
        <Heading size="sm" color="gray.300">
          Fecha Fin
        </Heading>
        <Input
          type="date"
          name="end_date"
          value={form.end_date}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
        />
      </Box>

      <Button colorScheme="teal" w="full" onClick={onSubmit}>
        {existing ? "Actualizar" : "Crear"}
      </Button>
    </Box>
  );
}
