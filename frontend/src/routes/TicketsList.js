import React, { useState, useEffect } from "react";
import {
  Box,
  Flex,
  Heading,
  Button,
  IconButton,
  Spinner,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Input,
  Select
} from "@chakra-ui/react";
import { AddIcon, ViewIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { get_tickets, get_projects } from "../endpoints/api";

export default function TicketsList() {
  const nav = useNavigate();
  const [tickets, setTickets] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ticketsData, projectsData] = await Promise.all([
          get_tickets(),
          get_projects()
        ]);
        setTickets(ticketsData);
        setProjects(projectsData);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) return <Spinner color="teal" />;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Recibido': return 'orange';
      case 'En Proceso': return 'blue';
      case 'Entregado': return 'green';
      default: return 'gray';
    }
  };

  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ticket.ticket_id.toString().includes(searchTerm);
    const matchesStatus = !statusFilter || ticket.status === statusFilter;
    const matchesProject = !projectFilter || ticket.project.toString() === projectFilter;
    
    return matchesSearch && matchesStatus && matchesProject;
  });

  return (
    <Box w="100%" maxW="1400px" bg="gray.800" p={6} rounded="lg">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Tickets</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="teal"
          onClick={() => nav("/tickets/new")}
        >
          Nuevo Ticket
        </Button>
      </Flex>

      <Flex gap={4} mb={6}>
        <Input
          placeholder="Buscar por ID o asunto..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg="gray.700"
          borderColor="gray.600"
          color="white"
          maxW="300px"
        />
        <Select
          placeholder="Filtrar por estado"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          bg="gray.700"
          borderColor="gray.600"
          color="white"
          maxW="200px"
        >
          <option value="Recibido" style={{color: 'black'}}>Recibido</option>
          <option value="En Proceso" style={{color: 'black'}}>En Proceso</option>
          <option value="Entregado" style={{color: 'black'}}>Entregado</option>
        </Select>
        <Select
          placeholder="Filtrar por proyecto"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          bg="gray.700"
          borderColor="gray.600"
          color="white"
          maxW="300px"
        >
          {projects.map(project => (
            <option key={project.id} value={project.id} style={{color: 'black'}}>
              {project.name} - {project.contract_name}
            </option>
          ))}
        </Select>
      </Flex>

      <Table variant="simple">
        <Thead>
          <Tr>
            <Th>ID</Th>
            <Th>Asunto</Th>
            <Th>Proyecto</Th>
            <Th>Asignado a</Th>
            <Th>Estado</Th>
            <Th>Horas</Th>
            <Th>Creado</Th>
            <Th isNumeric>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {filteredTickets.map(ticket => (
            <Tr key={ticket.ticket_id}>
              <Td>#{ticket.ticket_id}</Td>
              <Td maxW="300px" isTruncated>{ticket.subject}</Td>
              <Td>{ticket.project_name}</Td>
              <Td>
                {ticket.assigned_user_name || (
                  <Badge colorScheme="gray" variant="subtle">Sin asignar</Badge>
                )}
              </Td>
              <Td>
                <Badge colorScheme={getStatusColor(ticket.status)}>
                  {ticket.status}
                </Badge>
              </Td>
              <Td>{ticket.total_hours || 0}h</Td>
              <Td>{new Date(ticket.created_at).toLocaleDateString()}</Td>
              <Td isNumeric>
                <IconButton
                  icon={<ViewIcon />}
                  size="sm"
                  colorScheme="teal"
                  onClick={() => nav(`/tickets/${ticket.ticket_id}`)}
                />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>

      {filteredTickets.length === 0 && (
        <Box textAlign="center" py={8}>
          <Heading size="md" color="gray.400">
            No se encontraron tickets
          </Heading>
        </Box>
      )}
    </Box>
  );
}