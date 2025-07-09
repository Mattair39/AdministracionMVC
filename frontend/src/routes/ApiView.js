// src/routes/ApiView.js - ENFOQUE DE NEGOCIO

import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Button,
  Spinner,
  Alert,
  AlertIcon,
  Text,
  VStack,
  HStack,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Badge,
  Grid,
  GridItem,
  Card,
  CardBody,
  CardHeader,
  Flex,
  Divider
} from "@chakra-ui/react";
import { useAuth } from "../contexts/useAuth";

export default function ApiView() {
  const { isAuthenticated, user } = useAuth();
  const [ticketsData, setTicketsData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [connectionInfo, setConnectionInfo] = useState(null);

  const loadTickets = async () => {
    try {
      setLoading(true);
      setError(null);

      const endpoints = [
        '/api/simple-api/',
        'http://localhost:8000/api/simple-api/'
      ];

      let success = false;
      let lastError = null;

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint, {
            method: 'GET',
            credentials: 'include',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
            }
          });

          if (response.ok) {
            const data = await response.json();
            
            setTicketsData(data);
            setConnectionInfo({
              endpoint: endpoint,
              timestamp: new Date().toLocaleString(),
              user: data.user || user
            });
            
            success = true;
            break;
          } else {
            const errorText = await response.text();
            lastError = `Error ${response.status}: ${errorText.substring(0, 100)}`;
          }
        } catch (err) {
          lastError = `Error de conexión: ${err.message}`;
        }
      }

      if (!success) {
        throw new Error(lastError || 'No se pudo cargar la información de tickets');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadTickets();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const getStatusColor = (status) => {
    const colors = {
      'Recibido': 'orange',
      'En Proceso': 'blue', 
      'Entregado': 'green',
      'Pausado': 'yellow',
      'Cancelado': 'red'
    };
    return colors[status] || 'gray';
  };

  if (!isAuthenticated) {
    return (
      <Box p={6} w="full" textAlign="center">
        <Alert status="warning" mb={4} bg="orange.900" color="orange.100">
          <AlertIcon />
          Debe iniciar sesión para ver esta información
        </Alert>
      </Box>
    );
  }

  if (loading) {
    return (
      <Box textAlign="center" py={10} w="full">
        <Spinner size="xl" color="teal.500" />
        <Text mt={4} color="gray.300">Cargando información de tickets...</Text>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={6} w="full">
        <Alert status="error" mb={4} bg="red.900" color="red.100">
          <AlertIcon />
          <VStack align="start" spacing={1}>
            <Text fontWeight="bold">Error al cargar los datos</Text>
            <Text fontSize="sm">{error}</Text>
          </VStack>
        </Alert>
        
        <Button onClick={loadTickets} colorScheme="red">
          🔄 Intentar de nuevo
        </Button>
      </Box>
    );
  }

  return (
    <Box p={6} maxW="container.xl" mx="auto" w="full">
      {/* Header */}
      <Flex justify="space-between" align="center" mb={6}>
        <VStack align="start" spacing={1}>
          <Heading size="lg" color="teal.400">
            📊 Dashboard de Tickets
          </Heading>
          <Text color="gray.400" fontSize="sm">
            Resumen completo de tickets y proyectos
          </Text>
        </VStack>
        <Button onClick={loadTickets} colorScheme="teal" size="sm">
          🔄 Actualizar
        </Button>
      </Flex>

      {/* Estadísticas Principales */}
      {ticketsData?.success && (
        <Card mb={6} bg="gray.800" borderColor="gray.700">
          <CardHeader>
            <Heading size="md" color="gray.100">📈 Resumen General</Heading>
          </CardHeader>
          <CardBody>
            <StatGroup>
              <Stat>
                <StatLabel color="gray.400">Total de Tickets</StatLabel>
                <StatNumber color="teal.400">
                  {ticketsData?.total_tickets || 0}
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="gray.400">Horas Registradas</StatLabel>
                <StatNumber color="blue.400">
                  {ticketsData?.total_hours || 0}h
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="gray.400">Promedio por Ticket</StatLabel>
                <StatNumber color="purple.400">
                  {ticketsData?.total_tickets > 0 
                    ? (ticketsData.total_hours / ticketsData.total_tickets).toFixed(1)
                    : 0}h
                </StatNumber>
              </Stat>
              <Stat>
                <StatLabel color="gray.400">Eficiencia</StatLabel>
                <StatNumber color="green.400">
                  {ticketsData?.tickets?.filter(t => t.status === 'Entregado').length || 0} Completados
                </StatNumber>
              </Stat>
            </StatGroup>
          </CardBody>
        </Card>
      )}

      {/* Tickets por Estado */}
      {ticketsData?.tickets && (
        <Card mb={6} bg="gray.800" borderColor="gray.700">
          <CardHeader>
            <Heading size="md" color="gray.100"> Estado de Tickets</Heading>
          </CardHeader>
          <CardBody>
            <HStack spacing={4} wrap="wrap">
              {['Recibido', 'En Proceso', 'Entregado', 'Pausado', 'Cancelado'].map(status => {
                const count = ticketsData.tickets.filter(t => t.status === status).length;
                if (count === 0) return null;
                
                return (
                  <Badge
                    key={status}
                    colorScheme={getStatusColor(status)}
                    px={4}
                    py={2}
                    borderRadius="lg"
                    fontSize="sm"
                    fontWeight="semibold"
                  >
                    {status}: {count}
                  </Badge>
                );
              })}
            </HStack>
          </CardBody>
        </Card>
      )}

      {/* Lista de Tickets */}
      <Card mb={6} bg="gray.800" borderColor="gray.700">
        <CardHeader>
          <Heading size="md" color="gray.100">
            🎫 Tickets Activos ({ticketsData?.tickets?.length || 0})
          </Heading>
        </CardHeader>
        <CardBody>
          {!ticketsData?.tickets?.length ? (
            <VStack spacing={4} py={8}>
              <Text fontSize="4xl">📋</Text>
              <Text color="gray.500" textAlign="center">
                No hay tickets registrados
              </Text>
              <Text color="gray.600" fontSize="sm" textAlign="center">
                Los tickets aparecerán aquí cuando se creen en el sistema
              </Text>
            </VStack>
          ) : (
            <Grid templateColumns="repeat(auto-fill, minmax(400px, 1fr))" gap={4}>
              {ticketsData.tickets.map((ticket, index) => (
                <GridItem key={ticket.ticket_id || index}>
                  <Card 
                    variant="outline" 
                    size="sm" 
                    bg="gray.700" 
                    borderColor="gray.600"
                    _hover={{ borderColor: "teal.500", transform: "translateY(-2px)" }}
                    transition="all 0.2s"
                  >
                    <CardHeader pb={2}>
                      <Flex justify="space-between" align="center">
                        <Text fontWeight="bold" color="teal.400" fontSize="sm">
                          Ticket #{ticket.ticket_id}
                        </Text>
                        <Badge colorScheme={getStatusColor(ticket.status)} size="sm">
                          {ticket.status}
                        </Badge>
                      </Flex>
                    </CardHeader>
                    <CardBody pt={0}>
                      <VStack align="stretch" spacing={3}>
                        <Text fontWeight="semibold" fontSize="sm" noOfLines={2} color="gray.100">
                          {ticket.subject}
                        </Text>
                        
                        <Text color="gray.400" fontSize="xs" noOfLines={2}>
                          {ticket.description}
                        </Text>
                        
                        <Divider borderColor="gray.600" />
                        
                        <VStack align="stretch" spacing={1}>
                          <HStack justify="space-between" fontSize="xs">
                            <Text color="gray.500">👨‍💼 Responsable:</Text>
                            <Text color="gray.300" fontWeight="medium">
                              {ticket.assigned_user}
                            </Text>
                          </HStack>
                          
                          <HStack justify="space-between" fontSize="xs">
                            <Text color="gray.500">⏱️ Tiempo invertido:</Text>
                            <Text color="blue.300" fontWeight="bold">
                              {ticket.total_hours}h
                            </Text>
                          </HStack>
                          
                          <HStack justify="space-between" fontSize="xs">
                            <Text color="gray.500">📁 Proyecto:</Text>
                            <Text color="gray.300" noOfLines={1} fontWeight="medium">
                              {ticket.project_name}
                            </Text>
                          </HStack>
                          
                          <HStack justify="space-between" fontSize="xs">
                            <Text color="gray.500">🏢 Cliente:</Text>
                            <Text color="green.300" noOfLines={1} fontWeight="medium">
                              {ticket.client_name}
                            </Text>
                          </HStack>
                          
                          <HStack justify="space-between" fontSize="xs">
                            <Text color="gray.500">📝 Registros:</Text>
                            <Text color="gray.300">
                              {ticket.worklogs_count} entradas
                            </Text>
                          </HStack>
                        </VStack>
                        
                        <Divider borderColor="gray.600" />
                        
                        <HStack justify="space-between" fontSize="xs">
                          <Text color="gray.600">
                            📅 {ticket.created_at ? new Date(ticket.created_at).toLocaleDateString() : 'N/A'}
                          </Text>
                          <Text color="gray.600">
                            🔄 {ticket.requester}
                          </Text>
                        </HStack>
                      </VStack>
                    </CardBody>
                  </Card>
                </GridItem>
              ))}
            </Grid>
          )}
        </CardBody>
      </Card>

      {/* Información de Conexión al Final */}
      {connectionInfo && (
        <Box 
          mt={8} 
          p={3} 
          bg="gray.800" 
          borderRadius="md" 
          border="1px solid" 
          borderColor="gray.700"
        >
          <Text color="gray.500" fontSize="xs" textAlign="center">
            Usuario: {connectionInfo.user} • Endpoint: {connectionInfo.endpoint} • 
            Conectado: {connectionInfo.timestamp}
          </Text>
        </Box>
      )}
    </Box>
  );
}