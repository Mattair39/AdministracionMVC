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
  Collapse,
  Text,
  HStack,
  VStack
} from "@chakra-ui/react";
import { AddIcon, ViewIcon, ChevronDownIcon, ChevronRightIcon } from "@chakra-ui/icons";
import { useNavigate } from "react-router-dom";
import { get_projects } from "../endpoints/api";

export default function ProjectsList() {
  const nav = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClients, setExpandedClients] = useState({});

  useEffect(() => {
    const loadProjects = async () => {
      try {
        const projectsData = await get_projects();
        setProjects(Array.isArray(projectsData) ? projectsData : []);
      } catch (error) {
        console.error('Error loading projects:', error);
        setProjects([]);
      } finally {
        setLoading(false);
      }
    };

    loadProjects();
  }, []);

  if (loading) return <Spinner color="teal" />;

  // Agrupar proyectos por cliente
  const groupedProjects = projects.reduce((acc, project) => {
    const clientName = project.client_name || 'Sin cliente';
    if (!acc[clientName]) {
      acc[clientName] = [];
    }
    acc[clientName].push(project);
    return acc;
  }, {});

  // Filtrar proyectos
  const filteredGroupedProjects = Object.keys(groupedProjects).reduce((acc, clientName) => {
    const clientProjects = groupedProjects[clientName].filter(project =>
      project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      project.contract_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      clientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    if (clientProjects.length > 0) {
      acc[clientName] = clientProjects;
    }
    return acc;
  }, {});

  const toggleClient = (clientName) => {
    setExpandedClients(prev => ({
      ...prev,
      [clientName]: !prev[clientName]
    }));
  };

  const getHoursStatusColor = (availableHours) => {
    if (availableHours <= 0) return 'red';
    if (availableHours <= 10) return 'orange';
    return 'green';
  };

  return (
    <Box w="100%" maxW="1400px" bg="gray.800" p={6} rounded="lg">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Proyectos</Heading>
        <Button
          leftIcon={<AddIcon />}
          colorScheme="teal"
          onClick={() => nav("/projects/new")}
        >
          Nuevo Proyecto
        </Button>
      </Flex>

      <Flex gap={4} mb={6}>
        <Input
          placeholder="Buscar proyectos, contratos o clientes..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg="gray.700"
          borderColor="gray.600"
          color="white"
          maxW="400px"
        />
      </Flex>

      <VStack spacing={4} align="stretch">
        {Object.keys(filteredGroupedProjects).map(clientName => (
          <Box key={clientName} bg="gray.700" rounded="md" overflow="hidden">
            {/* Header del Cliente */}
            <Flex
              p={4}
              bg="gray.600"
              cursor="pointer"
              onClick={() => toggleClient(clientName)}
              align="center"
              justify="space-between"
              _hover={{ bg: "gray.500" }}
            >
              <HStack>
                <IconButton
                  icon={expandedClients[clientName] ? <ChevronDownIcon /> : <ChevronRightIcon />}
                  size="sm"
                  variant="ghost"
                  color="white"
                />
                <Heading size="md" color="white">
                  {clientName}
                </Heading>
                <Badge colorScheme="teal" variant="subtle">
                  {filteredGroupedProjects[clientName].length} proyecto{filteredGroupedProjects[clientName].length !== 1 ? 's' : ''}
                </Badge>
              </HStack>
              
              <HStack>
                <Text fontSize="sm" color="gray.300">
                  Total horas disponibles:
                </Text>
                <Badge 
                  colorScheme={getHoursStatusColor(
                    filteredGroupedProjects[clientName].reduce((sum, p) => 
                      sum + (p.package_hours?.available_hours || 0), 0
                    )
                  )}
                  fontSize="sm"
                >
                  {filteredGroupedProjects[clientName].reduce((sum, p) => 
                    sum + (p.package_hours?.available_hours || 0), 0
                  ).toFixed(1)}h
                </Badge>
              </HStack>
            </Flex>

            {/* Tabla de Proyectos */}
            <Collapse in={expandedClients[clientName]}>
              <Table variant="simple" size="sm">
                <Thead>
                  <Tr>
                    <Th>Proyecto</Th>
                    <Th>Contrato</Th>
                    <Th>Horas de Paquetes</Th>
                    <Th>Horas Disponibles</Th>
                    <Th>Estado</Th>
                    <Th isNumeric>Acciones</Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {filteredGroupedProjects[clientName].map(project => {
                    const packageHours = project.package_hours || {};
                    const availableHours = packageHours.available_hours || 0;
                    const totalHours = packageHours.total_package_hours || 0;
                    const consumedHours = packageHours.consumed_hours || 0;
                    
                    return (
                      <Tr key={project.id}>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text fontWeight="bold">{project.name}</Text>
                            <Text fontSize="sm" color="gray.400" isTruncated maxW="200px">
                              {project.description}
                            </Text>
                          </VStack>
                        </Td>
                        <Td>{project.contract_name}</Td>
                        <Td>
                          <VStack align="start" spacing={1}>
                            <Text fontSize="sm">
                              Total: <Badge colorScheme="blue">{totalHours.toFixed(1)}h</Badge>
                            </Text>
                            <Text fontSize="sm">
                              Consumidas: <Badge colorScheme="purple">{consumedHours.toFixed(1)}h</Badge>
                            </Text>
                          </VStack>
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={getHoursStatusColor(availableHours)}
                            fontSize="md"
                            px={3}
                            py={1}
                          >
                            {availableHours.toFixed(1)}h
                          </Badge>
                        </Td>
                        <Td>
                          {totalHours > 0 ? (
                            <Badge 
                              colorScheme={availableHours > 0 ? "green" : "red"}
                              variant="subtle"
                            >
                              {availableHours > 0 ? "Activo" : "Sin horas"}
                            </Badge>
                          ) : (
                            <Badge colorScheme="gray" variant="subtle">
                              Sin paquetes
                            </Badge>
                          )}
                        </Td>
                        <Td isNumeric>
                          <IconButton
                            icon={<ViewIcon />}
                            size="sm"
                            colorScheme="teal"
                            onClick={() => nav(`/projects/${project.id}`)}
                          />
                        </Td>
                      </Tr>
                    );
                  })}
                </Tbody>
              </Table>
            </Collapse>
          </Box>
        ))}
      </VStack>

      {Object.keys(filteredGroupedProjects).length === 0 && (
        <Box textAlign="center" py={8}>
          <Heading size="md" color="gray.400">
            No se encontraron proyectos
          </Heading>
        </Box>
      )}
    </Box>
  );
}