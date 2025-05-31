import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Input,
  Textarea,
  Select,
  Button,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Flex,
} from "@chakra-ui/react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { create_ticket, get_projects } from "../endpoints/api";

export default function TicketForm() {
  const nav = useNavigate();
  const [searchParams] = useSearchParams();
  const projectId = searchParams.get("project");
  
  const [form, setForm] = useState({
    subject: "",
    description: "",
    project: projectId || "",
    requester: "",
    status: "Recibido"
  });
  
  const [projects, setProjects] = useState([]);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      try {
        const projectsData = await get_projects();
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch (error) {
        console.error('Error loading data:', error);
        setProjects([]);
      }
    };
    
    loadData();
  }, []);

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({});
  };

  const onSubmit = async () => {
    if (!form.subject.trim()) {
      setErrors({ subject: "El asunto es requerido" });
      return;
    }
    
    if (!form.project) {
      setErrors({ project: "Debe seleccionar un proyecto" });
      return;
    }

    setLoading(true);
    try {
      // No enviamos assigned_user para nada
      const ticketData = {
        subject: form.subject,
        description: form.description,
        project: form.project,
        requester: form.requester,
        status: form.status
      };
      await create_ticket(ticketData);
      nav(-1);
    } catch (err) {
      if (err.response?.status === 400) {
        setErrors(err.response.data);
      } else {
        setErrors({ general: "Error al crear el ticket" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box maxW="600px" mx="auto" mt={8} p={6} bg="gray.700" rounded="md">
      <Heading size="md" mb={4}>Nuevo Ticket</Heading>

      {errors.general && (
        <Alert status="error" variant="solid" mb={4} rounded="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Error:</AlertTitle>
            <AlertDescription>{errors.general}</AlertDescription>
          </Box>
        </Alert>
      )}

      <Box mb={3}>
        <Heading size="sm" color="gray.300">Asunto</Heading>
        <Input
          name="subject"
          value={form.subject}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
          placeholder="Ingrese el asunto del ticket"
        />
        {errors.subject && (
          <Box color="red.500" fontSize="sm" mt={1}>{errors.subject}</Box>
        )}
      </Box>

      <Box mb={3}>
        <Heading size="sm" color="gray.300">Proyecto</Heading>
        <Select
          name="project"
          value={form.project}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
        >
          <option value="">Seleccionar proyecto</option>
          {Array.isArray(projects) && projects.map(project => (
            <option key={project.id} value={project.id} style={{color: 'black'}}>
              {project.name} - {project.contract_name}
            </option>
          ))}
        </Select>
        {errors.project && (
          <Box color="red.500" fontSize="sm" mt={1}>{errors.project}</Box>
        )}
      </Box>

      <Box mb={6}>
        <Heading size="sm" color="gray.300">Solicitante</Heading>
        <Input
          name="requester"
          value={form.requester}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
          placeholder="Nombre del solicitante"
        />
      </Box>

      <Box mb={6}>
        <Heading size="sm" color="gray.300">Descripción</Heading>
        <Textarea
          name="description"
          value={form.description}
          onChange={onChange}
          bg="gray.800"
          borderColor="gray.600"
          color="white"
          rows={6}
          placeholder="Describe el requerimiento..."
        />
      </Box>

      <Flex gap={3}>
        <Button colorScheme="teal" onClick={onSubmit} isLoading={loading} flex="1">
          Crear Ticket
        </Button>
        <Button variant="ghost" onClick={() => nav(-1)}>
          Cancelar
        </Button>
      </Flex>
    </Box>
  );
}