import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Checkbox,
  CheckboxGroup,
  VStack,
  HStack,
  Text,
  Alert,
  AlertIcon,
  Divider,
  Box,
  Heading
} from '@chakra-ui/react';
import { create_package_wizard, get_contract_projects_for_packages } from '../endpoints/api';

export default function PackageWizard({ isOpen, onClose, contractId, onPackageCreated }) {
  const [formData, setFormData] = useState({
    contract_id: contractId,
    package_name: '',
    total_hours: '',
    start_date: '',
    end_date: '',
    project_ids: [],
    segment_by_months: false
  });
  
  const [contractData, setContractData] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && contractId) {
      loadContractData();
    }
  }, [isOpen, contractId]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, contract_id: contractId }));
  }, [contractId]);

  const loadContractData = async () => {
    try {
      const data = await get_contract_projects_for_packages(contractId);
      setContractData(data.contract);
      setProjects(data.projects);
    } catch (error) {
      console.error('Error loading contract data:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // Limpiar el nombre del paquete cuando se activa segmentación
    if (name === 'segment_by_months' && checked) {
      setFormData(prev => ({ ...prev, package_name: '' }));
    }
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handleProjectSelection = (selectedProjects) => {
    setFormData(prev => ({
      ...prev,
      project_ids: selectedProjects.map(id => parseInt(id))
    }));
    
    if (errors.project_ids) {
      setErrors(prev => ({ ...prev, project_ids: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.total_hours || parseFloat(formData.total_hours) <= 0) {
      newErrors.total_hours = 'Las horas totales son requeridas y deben ser mayor a 0';
    }
    
    if (!formData.start_date) {
      newErrors.start_date = 'La fecha de inicio es requerida';
    }
    
    if (!formData.end_date) {
      newErrors.end_date = 'La fecha de fin es requerida';
    }
    
    if (formData.start_date && formData.end_date && formData.end_date < formData.start_date) {
      newErrors.end_date = 'La fecha de fin no puede ser anterior a la fecha de inicio';
    }
    
    if (formData.project_ids.length === 0) {
      newErrors.project_ids = 'Debe seleccionar al menos un proyecto';
    }
    
    // Solo validar nombre si NO está segmentado por meses
    if (!formData.segment_by_months && !formData.package_name.trim()) {
      newErrors.package_name = 'El nombre del paquete es requerido';
    }
    
    return newErrors;
  };

  const handleSubmit = async () => {
    const validationErrors = validateForm();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    
    setLoading(true);
    setErrors({});
    
    try {
      // Preparar datos para enviar
      const dataToSend = {
        ...formData,
        // Si está segmentado, no enviar package_name para que se genere automáticamente
        package_name: formData.segment_by_months ? '' : formData.package_name
      };
      
      console.log('Enviando datos:', dataToSend); // Para debug
      
      const response = await create_package_wizard(dataToSend);
      
      if (response.success) {
        console.log('Paquetes creados:', response.packages); // Para debug
        onPackageCreated(response.packages);
        onClose();
        resetForm();
      } else {
        console.error('Error en respuesta:', response); // Para debug
        setErrors(response.errors || { general: 'Error al crear el paquete' });
      }
    } catch (error) {
      console.error('Error en solicitud:', error); // Para debug
      if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else if (error.response?.data) {
        setErrors({ general: error.response.data.error || 'Error al crear el paquete' });
      } else {
        setErrors({ general: 'Error al crear el paquete' });
      }
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      contract_id: contractId,
      package_name: '',
      total_hours: '',
      start_date: '',
      end_date: '',
      project_ids: [],
      segment_by_months: false
    });
    setErrors({});
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="xl">
      <ModalOverlay />
      <ModalContent bg="gray.800" color="white">
        <ModalHeader>Generar Paquete de Horas</ModalHeader>
        <ModalCloseButton />
        
        <ModalBody>
          {contractData && (
            <Box mb={4} p={3} bg="gray.700" rounded="md">
              <Heading size="sm" mb={2}>Contrato Seleccionado</Heading>
              <Text><strong>Nombre:</strong> {contractData.name}</Text>
              <Text><strong>Cliente:</strong> {contractData.client}</Text>
            </Box>
          )}
          
          <VStack spacing={4} align="stretch">
            {errors.general && (
              <Alert status="error">
                <AlertIcon />
                {errors.general}
              </Alert>
            )}
            
            <FormControl>
              <FormLabel>
                <Checkbox
                  name="segment_by_months"
                  isChecked={formData.segment_by_months}
                  onChange={handleInputChange}
                >
                  Segmentar por meses
                </Checkbox>
              </FormLabel>
              {formData.segment_by_months && (
                <Text fontSize="sm" color="gray.400" mt={1}>
                  Los nombres de los paquetes se generarán automáticamente
                </Text>
              )}
            </FormControl>
            
            {!formData.segment_by_months && (
              <FormControl isInvalid={errors.package_name}>
                <FormLabel>Nombre del Paquete</FormLabel>
                <Input
                  name="package_name"
                  value={formData.package_name}
                  onChange={handleInputChange}
                  bg="gray.700"
                  borderColor="gray.600"
                  placeholder="Ingrese el nombre del paquete"
                />
                {errors.package_name && (
                  <Text color="red.500" fontSize="sm">{errors.package_name}</Text>
                )}
              </FormControl>
            )}
            
            <FormControl isInvalid={errors.total_hours}>
              <FormLabel>Horas Totales</FormLabel>
              <Input
                name="total_hours"
                type="number"
                step="0.01"
                min="0"
                value={formData.total_hours}
                onChange={handleInputChange}
                bg="gray.700"
                borderColor="gray.600"
                placeholder="Ejemplo: 100"
              />
              {errors.total_hours && (
                <Text color="red.500" fontSize="sm">{errors.total_hours}</Text>
              )}
              {formData.segment_by_months && formData.total_hours && (
                <Text fontSize="sm" color="gray.400" mt={1}>
                  Las horas se dividirán equitativamente entre los meses
                </Text>
              )}
            </FormControl>
            
            <HStack spacing={4}>
              <FormControl isInvalid={errors.start_date}>
                <FormLabel>Fecha Inicio</FormLabel>
                <Input
                  name="start_date"
                  type="date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                  bg="gray.700"
                  borderColor="gray.600"
                />
                {errors.start_date && (
                  <Text color="red.500" fontSize="sm">{errors.start_date}</Text>
                )}
              </FormControl>
              
              <FormControl isInvalid={errors.end_date}>
                <FormLabel>Fecha Fin</FormLabel>
                <Input
                  name="end_date"
                  type="date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                  bg="gray.700"
                  borderColor="gray.600"
                />
                {errors.end_date && (
                  <Text color="red.500" fontSize="sm">{errors.end_date}</Text>
                )}
              </FormControl>
            </HStack>
            
            {formData.segment_by_months && formData.start_date && formData.end_date && (
              <Box p={3} bg="gray.700" rounded="md">
                <Text fontSize="sm" color="teal.300" fontWeight="bold">
                  Información de Segmentación:
                </Text>
                <Text fontSize="sm" color="gray.300">
                  • Para fechas del 1° al último día del mes: "Paquete Enero 2025"
                </Text>
                <Text fontSize="sm" color="gray.300">
                  • Para mismo día: "Paquete 15/01/2025 - 14/02/2025"
                </Text>
              </Box>
            )}
            
            <Divider />
            
            <FormControl isInvalid={errors.project_ids}>
              <FormLabel>Proyectos de Soporte</FormLabel>
              <Text fontSize="sm" color="gray.400" mb={2}>
                Selecciona los proyectos que compartirán las horas de este paquete
              </Text>
              <CheckboxGroup
                value={formData.project_ids.map(id => id.toString())}
                onChange={handleProjectSelection}
              >
                <VStack align="start" spacing={2}>
                  {projects.map(project => (
                    <Checkbox key={project.id} value={project.id.toString()}>
                      <Box>
                        <Text fontWeight="medium">{project.name}</Text>
                        <Text fontSize="sm" color="gray.400">{project.description}</Text>
                      </Box>
                    </Checkbox>
                  ))}
                </VStack>
              </CheckboxGroup>
              {errors.project_ids && (
                <Text color="red.500" fontSize="sm">{errors.project_ids}</Text>
              )}
            </FormControl>
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={handleClose}>
            Cancelar
          </Button>
          <Button 
            colorScheme="teal" 
            onClick={handleSubmit}
            isLoading={loading}
            loadingText="Creando..."
          >
            Crear Paquete{formData.segment_by_months ? 's' : ''}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}