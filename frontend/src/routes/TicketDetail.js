import React, { useState, useEffect } from "react";
import {
  Box, Flex, Heading, Button, IconButton, Spinner, Select,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, Input, Textarea,
  Alert, AlertIcon, AlertDescription
} from "@chakra-ui/react";
import { DeleteIcon } from "@chakra-ui/icons";
import { useParams, useNavigate } from "react-router-dom";
import {
  get_ticket, update_ticket,
  get_users, create_worklog, delete_worklog,
  get_project_hours_info
} from "../endpoints/api";

export default function TicketDetail() {
  const { ticketId } = useParams();
  const nav = useNavigate();
  const [ticket, setTicket] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  // NUEVO: Estado para la alerta de horas
  const [hoursAlert, setHoursAlert] = useState(null);
  const [worklogForm, setWorklogForm] = useState({
    work_date: new Date().toISOString().slice(0, 16),
    hours_logged: '',
    description: '',
    user: ''
  });

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ticketData, usersData] = await Promise.all([
          get_ticket(ticketId),
          get_users()
        ]);
        setTicket(ticketData);
        
        const usersArray = Array.isArray(usersData) ? usersData : [];
        setUsers(usersArray);
        
        if (usersArray.length > 0) {
          setWorklogForm(prev => ({ ...prev, user: usersArray[0].id }));
        }

        // NUEVO: Cargar alerta de horas si hay proyecto
        if (ticketData && ticketData.project) {
          await loadHoursAlert(ticketData.project);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    if (ticketId) {
      loadData();
    }
  }, [ticketId]);

  // NUEVA FUNCIÓN: Cargar alerta de horas
  const loadHoursAlert = async (projectId) => {
    try {
      const hoursData = await get_project_hours_info(projectId);
      
      if (hoursData.available_hours > 0) {
        const percentage = (hoursData.consumed_hours / hoursData.available_hours) * 100;
        
        if (percentage >= 100) {
          setHoursAlert({
            type: 'error',
            message: `Las horas de soporte han sido consumidas completamente (${hoursData.consumed_hours.toFixed(2)}h/${hoursData.available_hours.toFixed(2)}h)`
          });
        } else if (percentage >= 85) {
          setHoursAlert({
            type: 'warning',
            message: `Se ha consumido el ${percentage.toFixed(1)}% de las horas de soporte disponibles (${hoursData.consumed_hours.toFixed(2)}h/${hoursData.available_hours.toFixed(2)}h)`
          });
        } else {
          setHoursAlert(null);
        }
      } else if (hoursData.consumed_hours > 0 && hoursData.available_hours === 0) {
        setHoursAlert({
          type: 'info',
          message: `Se han registrado ${hoursData.consumed_hours.toFixed(2)}h sin paquetes de horas disponibles`
        });
      } else {
        setHoursAlert(null);
      }
    } catch (error) {
      console.error('Error loading hours alert:', error);
      setHoursAlert(null);
    }
  };

  if (loading) return <Spinner color="teal" />;
  if (!ticket) return <div>Error cargando ticket</div>;

  const handleTicketChange = (field, value) => {
    setTicket(prev => ({ ...prev, [field]: value }));
  };

  const saveTicket = async () => {
    try {
      await update_ticket(ticketId, {
        subject: ticket.subject,
        description: ticket.description,
        assigned_user: ticket.assigned_user || null,
        requester: ticket.requester,
        status: ticket.status,
        project: ticket.project
      });
    } catch (error) {
      console.error('Error saving ticket:', error);
    }
  };

  const handleWorklogChange = (e) => {
    const { name, value } = e.target;
    setWorklogForm(prev => ({ ...prev, [name]: value }));
  };

  // Función para convertir horas decimales a formato HH:MM
  const decimalToTime = (decimal) => {
    const hours = Math.floor(decimal);
    const minutes = Math.round((decimal - hours) * 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  // Función para validar formato HH:MM
  const validateTimeFormat = (timeStr) => {
    const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
    return timeRegex.test(timeStr);
  };

  const addWorklog = async () => {
    if (!worklogForm.hours_logged || !worklogForm.description) return;
    
    // Validar formato de tiempo
    if (!validateTimeFormat(worklogForm.hours_logged)) {
      alert('Por favor, ingrese las horas en formato HH:MM (ej: 02:30)');
      return;
    }
    
    try {
      await create_worklog(ticketId, worklogForm);
      const updatedTicket = await get_ticket(ticketId);
      setTicket(updatedTicket);
      setWorklogForm({
        work_date: new Date().toISOString().slice(0, 16),
        hours_logged: '',
        description: '',
        user: users.length > 0 ? users[0].id : ''
      });

      // NUEVO: Actualizar alerta después de agregar worklog
      if (updatedTicket && updatedTicket.project) {
        await loadHoursAlert(updatedTicket.project);
      }
    } catch (error) {
      console.error('Error creating worklog:', error);
      if (error.response?.data?.hours_logged) {
        alert('Error en formato de horas: ' + error.response.data.hours_logged[0]);
      }
    }
  };

  const removeWorklog = async (worklogId) => {
    try {
      await delete_worklog(worklogId);
      const updatedTicket = await get_ticket(ticketId);
      setTicket(updatedTicket);

      // NUEVO: Actualizar alerta después de eliminar worklog
      if (updatedTicket && updatedTicket.project) {
        await loadHoursAlert(updatedTicket.project);
      }
    } catch (error) {
      console.error('Error deleting worklog:', error);
    }
  };

  return (
    <Box w="100%" maxW="1200px" bg="gray.800" p={6} rounded="lg">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Ticket #{ticket.ticket_id} - {ticket.subject}</Heading>
        <Button onClick={() => nav(-1)} colorScheme="teal">Volver</Button>
      </Flex>

      {/* NUEVA SECCIÓN: Alerta de horas - Solo se muestra si existe */}
      {hoursAlert && (
        <Alert 
          status={hoursAlert.type}
          variant="left-accent"
          mb={4}
          rounded="md"
          fontSize="sm"
          bg={hoursAlert.type === 'error' ? 'red.900' : hoursAlert.type === 'warning' ? 'orange.900' : 'blue.900'}
          borderColor={hoursAlert.type === 'error' ? 'red.500' : hoursAlert.type === 'warning' ? 'orange.500' : 'blue.500'}
          color="white"
        >
          <AlertIcon color="white" />
          <AlertDescription color="white" fontWeight="medium">
            ¡Atención! {hoursAlert.message}
          </AlertDescription>
        </Alert>
      )}

      <Flex mb={6} gap={4}>
        <Box bg="orange.500" px={3} py={1} rounded="md" color="white" fontSize="sm">
          {ticket.status}
        </Box>
        <Box bg="gray.600" px={3} py={1} rounded="md" color="white" fontSize="sm">
          {ticket.project_name}
        </Box>
      </Flex>

      <Box mb={6}>
        <Flex gap={6} mb={4}>
          <Box>
            <Heading size="sm" color="gray.300">Solicitante</Heading>
            <Input
              value={ticket.requester || ""}
              onChange={(e) => handleTicketChange('requester', e.target.value)}
              onBlur={saveTicket}
              bg="gray.700"
              borderColor="gray.600"
              color="white"
            />
          </Box>
          <Box>
            <Heading size="sm" color="gray.300">Usuario asignado</Heading>
            <Select
              value={ticket.assigned_user || ""}
              onChange={(e) => handleTicketChange('assigned_user', e.target.value || null)}
              onBlur={saveTicket}
              bg="gray.700"
              borderColor="gray.600"
              color="white"
            >
              <option value="" style={{color: 'black'}}>Sin asignar</option>
              {Array.isArray(users) && users.map(user => (
                <option key={user.id} value={user.id} style={{color: 'black'}}>{user.username}</option>
              ))}
            </Select>
          </Box>
          <Box>
            <Heading size="sm" color="gray.300">Estado</Heading>
            <Select
              value={ticket.status}
              onChange={(e) => handleTicketChange('status', e.target.value)}
              onBlur={saveTicket}
              bg="gray.700"
              borderColor="gray.600"
              color="white"
            >
              <option value="Recibido" style={{color: 'black'}}>Recibido</option>
              <option value="En Proceso" style={{color: 'black'}}>En Proceso</option>
              <option value="Entregado" style={{color: 'black'}}>Entregado</option>
            </Select>
          </Box>
        </Flex>
      </Box>

      <Tabs variant="enclosed" colorScheme="teal">
        <TabList mb="1em">
          <Tab>Descripción</Tab>
          <Tab>Registros de trabajo</Tab>
        </TabList>
        <TabPanels>

          <TabPanel>
            <Box>
              <Heading size="sm" color="gray.300" mb={2}>Descripción del requerimiento</Heading>
              <Textarea
                value={ticket.description}
                onChange={(e) => handleTicketChange('description', e.target.value)}
                onBlur={saveTicket}
                bg="gray.700"
                borderColor="gray.600"
                color="white"
                rows={10}
                placeholder="Describe el requerimiento..."
              />
            </Box>
          </TabPanel>

          <TabPanel>
            <Box mb={6}>
              <Heading size="md" mb={4}>Agregar registro de trabajo</Heading>
              <Flex gap={4} mb={4} align="end">
                <Box>
                  <Heading size="sm" color="gray.300">Usuario</Heading>
                  <Select
                    name="user"
                    value={worklogForm.user}
                    onChange={handleWorklogChange}
                    bg="gray.700"
                    borderColor="gray.600"
                    color="white"
                    w="200px"
                  >
                    <option value="" style={{color: 'black'}}>Seleccionar usuario</option>
                    {Array.isArray(users) && users.map(user => (
                      <option key={user.id} value={user.id} style={{color: 'black'}}>{user.username}</option>
                    ))}
                  </Select>
                </Box>
                <Box>
                  <Heading size="sm" color="gray.300">Fecha del trabajo</Heading>
                  <Input
                    type="datetime-local"
                    name="work_date"
                    value={worklogForm.work_date}
                    onChange={handleWorklogChange}
                    bg="gray.700"
                    borderColor="gray.600"
                    color="white"
                    w="200px"
                  />
                </Box>
                <Box>
                  <Heading size="sm" color="gray.300">Duración (HH:MM)</Heading>
                  <Input
                    name="hours_logged"
                    value={worklogForm.hours_logged}
                    onChange={handleWorklogChange}
                    bg="gray.700"
                    borderColor="gray.600"
                    color="white"
                    w="150px"
                    placeholder="02:30"
                    pattern="[0-9]{1,2}:[0-5][0-9]"
                  />
                </Box>
                <Box flex="1">
                  <Heading size="sm" color="gray.300">Descripción del trabajo</Heading>
                  <Input
                    name="description"
                    value={worklogForm.description}
                    onChange={handleWorklogChange}
                    bg="gray.700"
                    borderColor="gray.600"
                    color="white"
                    placeholder="Describe el trabajo realizado..."
                  />
                </Box>
                <Button colorScheme="orange" onClick={addWorklog}>
                  Agregar línea
                </Button>
              </Flex>
              <Box fontSize="sm" color="gray.400" mt={2}>
                * Ingrese las horas en formato HH:MM (ejemplo: 02:30 para 2 horas y 30 minutos)
              </Box>
            </Box>

            <Box>
              <Heading size="md" mb={4}>Registros de trabajo</Heading>
              <Table variant="simple">
                <Thead>
                  <Tr>
                    <Th>Usuario</Th>
                    <Th>Fecha del trabajo</Th>
                    <Th>Duración</Th>
                    <Th>Descripción del trabajo</Th>
                    <Th isNumeric></Th>
                  </Tr>
                </Thead>
                <Tbody>
                  {Array.isArray(ticket.worklogs) && ticket.worklogs.map(worklog => (
                    <Tr key={worklog.id}>
                      <Td>{worklog.user_name}</Td>
                      <Td>{new Date(worklog.work_date).toLocaleString()}</Td>
                      <Td>
                        <Flex direction="column">
                          <Box fontWeight="bold">
                            {decimalToTime(parseFloat(worklog.hours_logged))}
                          </Box>
                          <Box fontSize="xs" color="gray.400">
                            ({parseFloat(worklog.hours_logged).toFixed(2)}h)
                          </Box>
                        </Flex>
                      </Td>
                      <Td>{worklog.description}</Td>
                      <Td isNumeric>
                        <IconButton
                          icon={<DeleteIcon />}
                          size="sm"
                          colorScheme="red"
                          onClick={() => removeWorklog(worklog.id)}
                        />
                      </Td>
                    </Tr>
                  ))}
                </Tbody>
              </Table>
              
              {Array.isArray(ticket.worklogs) && ticket.worklogs.length > 0 && (
                <Box mt={4} p={3} bg="gray.700" rounded="md">
                  <Heading size="sm" color="teal.300">
                    Total de horas registradas: {decimalToTime(parseFloat(ticket.total_hours || 0))} ({parseFloat(ticket.total_hours || 0).toFixed(2)}h)
                  </Heading>
                </Box>
              )}
            </Box>
          </TabPanel>

        </TabPanels>
      </Tabs>
    </Box>
  );
}