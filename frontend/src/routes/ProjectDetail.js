import React, { useState, useEffect } from "react";
import {
  Box, Flex, Heading, Button, Spinner, Badge, Text,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, IconButton,
  Grid, GridItem, VStack, HStack, Divider,
  Card, CardHeader, CardBody, Stat, StatLabel, StatNumber, StatHelpText
} from "@chakra-ui/react";
import { ViewIcon, AddIcon, CalendarIcon, TimeIcon } from "@chakra-ui/icons";
import { useParams, useNavigate } from "react-router-dom";
import { get_projects } from "../endpoints/api";

export default function ProjectDetail() {
  const { projectId } = useParams();
  const nav = useNavigate();
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadProject = async () => {
      try {
        const response = await fetch(`/api/projects/${projectId}/`, {
          credentials: 'include'
        });
        const projectData = await response.json();
        setProject(projectData);
      } catch (error) {
        console.error('Error loading project:', error);
      } finally {
        setLoading(false);
      }
    };

    if (projectId) {
      loadProject();
    }
  }, [projectId]);

  if (loading) return <Spinner color="teal" />;
  if (!project) return <div>Error cargando proyecto</div>;

  const packageHours = project.package_hours || {};
  const availableHours = packageHours.available_hours || 0;
  const totalHours = packageHours.total_package_hours || 0;
  const consumedHours = packageHours.consumed_hours || 0;

  const getStatusColor = (status) => {
    switch (status) {
      case 'Recibido': return 'orange';
      case 'En Proceso': return 'blue';
      case 'Entregado': return 'green';
      default: return 'gray';
    }
  };

  const getHoursStatusColor = (hours) => {
    if (hours <= 0) return 'red';
    if (hours <= 10) return 'orange';
    return 'green';
  };

  return (
    <Box w="100%" maxW="1400px" bg="gray.800" p={6} rounded="lg">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={2}>
          <Heading size="lg">{project.name}</Heading>
          <HStack>
            <Badge colorScheme="teal" variant="subtle">
              {project.contract_name}
            </Badge>
            <Text color="gray.400">{project.description}</Text>
          </HStack>
        </VStack>
        <Button onClick={() => nav(-1)} colorScheme="teal">
          Volver
        </Button>
      </Flex>

      {/* Información del Proyecto y Horas */}
      <Grid templateColumns="repeat(12, 1fr)" gap={6} mb={6}>
        {/* Info básica */}
        <GridItem colSpan={8}>
          <Card bg="gray.700">
            <CardHeader>
              <Heading size="md">Información del Proyecto</Heading>
            </CardHeader>
            <CardBody>
              <VStack align="start" spacing={3}>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Nombre:</Text>
                  <Text>{project.name}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Contrato:</Text>
                  <Text>{project.contract_name}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Descripción:</Text>
                  <Text>{project.description}</Text>
                </HStack>
                <HStack>
                  <Text fontWeight="bold" minW="120px">Creado:</Text>
                  <Text>{new Date(project.created_at).toLocaleDateString()}</Text>
                </HStack>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>

        {/* Horas de Paquetes */}
        <GridItem colSpan={4}>
          <Card bg="gray.700" borderLeft="4px" borderColor={getHoursStatusColor(availableHours) + ".400"}>
            <CardHeader>
              <HStack>
                <TimeIcon color="teal.400" />
                <Heading size="md">Horas de Paquetes</Heading>
              </HStack>
            </CardHeader>
            <CardBody>
              <VStack spacing={4}>
                <Stat textAlign="center">
                  <StatLabel color="gray.300">Horas Disponibles</StatLabel>
                  <StatNumber 
                    fontSize="3xl" 
                    color={getHoursStatusColor(availableHours) + ".400"}
                  >
                    {availableHours.toFixed(1)}h
                  </StatNumber>
                  <StatHelpText>
                    {totalHours > 0 ? 
                      `${((availableHours / totalHours) * 100).toFixed(1)}% disponible` : 
                      'Sin paquetes activos'
                    }
                  </StatHelpText>
                </Stat>
                
                <Divider />
                
                <VStack spacing={2} w="full">
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="gray.300">Total contratado:</Text>
                    <Badge colorScheme="blue">{totalHours.toFixed(1)}h</Badge>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="gray.300">Horas consumidas:</Text>
                    <Badge colorScheme="purple">{consumedHours.toFixed(1)}h</Badge>
                  </HStack>
                  <HStack justify="space-between" w="full">
                    <Text fontSize="sm" color="gray.300">Porcentaje usado:</Text>
                    <Badge colorScheme={consumedHours > totalHours ? "red" : "gray"}>
                      {totalHours > 0 ? ((consumedHours / totalHours) * 100).toFixed(1) : 0}%
                    </Badge>
                  </HStack>
                </VStack>
              </VStack>
            </CardBody>
          </Card>
        </GridItem>
      </Grid>

      {/* Tabs para Tickets y Paquetes */}
      <Tabs variant="enclosed" colorScheme="teal">
        <TabList mb="1em">
          <Tab>Tickets ({project.tickets?.length || 0})</Tab>
          <Tab>Paquetes ({project.packages?.length || 0})</Tab>
        </TabList>
        <TabPanels>
          
          {/* Tab de Tickets */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Flex justify="space-between" align="center">
                <Heading size="md">Tickets del Proyecto</Heading>
                <Button
                  leftIcon={<AddIcon />}
                  colorScheme="teal"
                  size="sm"
                  onClick={() => nav(`/tickets/new?project=${projectId}`)}
                >
                  Nuevo Ticket
                </Button>
              </Flex>

              {project.tickets && project.tickets.length > 0 ? (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>ID</Th>
                      <Th>Asunto</Th>
                      <Th>Estado</Th>
                      <Th>Asignado a</Th>
                      <Th>Solicitante</Th>
                      <Th>Horas</Th>
                      <Th>Creado</Th>
                      <Th isNumeric>Acciones</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {project.tickets.map(ticket => (
                      <Tr key={ticket.ticket_id}>
                        <Td>#{ticket.ticket_id}</Td>
                        <Td maxW="250px" isTruncated>{ticket.subject}</Td>
                        <Td>
                          <Badge colorScheme={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </Td>
                        <Td>
                          {ticket.assigned_user_name === 'Sin asignar' ? (
                            <Badge colorScheme="gray" variant="subtle">Sin asignar</Badge>
                          ) : (
                            ticket.assigned_user_name
                          )}
                        </Td>
                        <Td>{ticket.requester || '-'}</Td>
                        <Td>
                          <Badge variant="outline" colorScheme="blue">
                            {ticket.total_hours.toFixed(1)}h
                          </Badge>
                        </Td>
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
              ) : (
                <Box textAlign="center" py={8}>
                  <Text color="gray.400" mb={4}>
                    No hay tickets asociados a este proyecto
                  </Text>
                  <Button
                    leftIcon={<AddIcon />}
                    colorScheme="teal"
                    onClick={() => nav(`/tickets/new?project=${projectId}`)}
                  >
                    Crear primer ticket
                  </Button>
                </Box>
              )}
            </VStack>
          </TabPanel>

          {/* Tab de Paquetes */}
          <TabPanel>
            <VStack spacing={4} align="stretch">
              <Heading size="md">Paquetes de Horas</Heading>

              {project.packages && project.packages.length > 0 ? (
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>Nombre del Paquete</Th>
                      <Th>Fecha Inicio</Th>
                      <Th>Fecha Fin</Th>
                      <Th>Horas Totales</Th>
                      <Th>Estado</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {project.packages.map(packageItem => (
                      <Tr key={packageItem.id}>
                        <Td>{packageItem.package_name}</Td>
                        <Td>
                          <HStack>
                            <CalendarIcon color="gray.400" w={3} h={3} />
                            <Text>{new Date(packageItem.start_date).toLocaleDateString()}</Text>
                          </HStack>
                        </Td>
                        <Td>
                          <HStack>
                            <CalendarIcon color="gray.400" w={3} h={3} />
                            <Text>{new Date(packageItem.end_date).toLocaleDateString()}</Text>
                          </HStack>
                        </Td>
                        <Td>
                          <Badge colorScheme="blue" variant="solid">
                            {packageItem.total_hours.toFixed(1)}h
                          </Badge>
                        </Td>
                        <Td>
                          <Badge 
                            colorScheme={packageItem.is_active ? "green" : "gray"}
                            variant={packageItem.is_active ? "solid" : "outline"}
                          >
                            {packageItem.is_active ? "Activo" : "Inactivo"}
                          </Badge>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
              ) : (
                <Box textAlign="center" py={8}>
                  <Text color="gray.400">
                    No hay paquetes de horas asociados a este proyecto
                  </Text>
                </Box>
              )}
            </VStack>
          </TabPanel>

        </TabPanels>
      </Tabs>
    </Box>
  );
}