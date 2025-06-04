import {
  Box,
  VStack,
  FormControl,
  FormLabel,
  Input,
  Button,
  Spinner,
  useToast,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  useDisclosure,
  Text,
  HStack
} from "@chakra-ui/react";
import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  get_projects,
  get_contracts,
  create_project,
  update_project,
  delete_project
} from "../endpoints/api";

export default function ProjectForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const { isOpen, onOpen, onClose } = useDisclosure();
  const cancelRef = useRef();

  const [contracts, setContracts] = useState([]);
  const [form, setForm] = useState({
    name: "",
    description: "",
    contract: ""
  });
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const cs = await get_contracts();
        setContracts(cs || []);
        if (id) {
          const ps = await get_projects();
          const p = ps.find((x) => x.id === +id);
          if (p) {
            setForm({
              name: p.name,
              description: p.description,
              contract: p.contract
            });
            setProjectToDelete(p);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast({
          title: "Error",
          description: "No se pudieron cargar los datos",
          status: "error",
          duration: 3000,
          isClosable: true,
        });
      }
    })();
  }, [id, toast]);

  if (loading) return <Spinner color="teal" />;

  const onChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const onSubmit = async () => {
    // Validaciones básicas
    if (!form.name || !form.name.trim()) {
      toast({
        title: "Error",
        description: "El nombre del proyecto es requerido",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    if (!form.contract) {
      toast({
        title: "Error",
        description: "Debe seleccionar un contrato",
        status: "error",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setSubmitting(true);
    
    try {
      // Preparar datos exactamente como los necesita el backend
      const projectData = {
        name: form.name.trim(),
        description: form.description || "",
        contract: parseInt(form.contract, 10)
      };

      console.log('Datos a enviar:', projectData);
      console.log('Contratos disponibles:', contracts);

      if (id) {
        await update_project(id, projectData);
        toast({
          title: "Éxito",
          description: "Proyecto actualizado correctamente",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      } else {
        await create_project(projectData);
        toast({
          title: "Éxito",
          description: "Proyecto creado correctamente",
          status: "success",
          duration: 3000,
          isClosable: true,
        });
      }
      nav("/projects");
    } catch (error) {
      console.error('Error completo:', error);
      console.error('Status:', error.response?.status);
      console.error('Data:', error.response?.data);
      console.error('Headers:', error.response?.headers);
      
      let errorMessage = "Error desconocido";
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (typeof error.response.data === 'object') {
          // Mostrar errores específicos de campos
          const errors = Object.entries(error.response.data)
            .map(([field, messages]) => `${field}: ${Array.isArray(messages) ? messages.join(', ') : messages}`)
            .join('\n');
          errorMessage = errors || "Error en la validación de datos";
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = () => {
    onOpen();
  };

  const handleDeleteConfirm = async () => {
    setDeleting(true);
    try {
      await delete_project(id);
      toast({
        title: "Proyecto eliminado",
        description: `El proyecto "${projectToDelete?.name}" ha sido eliminado exitosamente`,
        status: "success",
        duration: 3000,
        isClosable: true,
      });
      nav("/projects");
    } catch (error) {
      console.error('Error al eliminar:', error);
      toast({
        title: "Error",
        description: "No se pudo eliminar el proyecto. Verifique si tiene tickets o paquetes asociados.",
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setDeleting(false);
      onClose();
    }
  };

  return (
    <>
      <Box maxW="500px" mx="auto" mt={8} bg="gray.700" p={6} rounded="md">
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel color="gray.300">Nombre</FormLabel>
            <Input 
              name="name" 
              value={form.name} 
              onChange={onChange} 
              color="white" 
              bg="gray.800"
              placeholder="Nombre del proyecto"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel color="gray.300">Descripción</FormLabel>
            <Input 
              name="description" 
              value={form.description} 
              onChange={onChange} 
              color="white" 
              bg="gray.800"
              placeholder="Descripción del proyecto"
            />
          </FormControl>
          
          <FormControl>
            <FormLabel color="gray.300">Contrato</FormLabel>
            <Input
              as="select"
              name="contract"
              value={form.contract}
              onChange={onChange}
              color="white"
              bg="gray.800"
            >
              <option value="" disabled>Selecciona un contrato</option>
              {contracts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contract_name} - {c.client_name}
                </option>
              ))}
            </Input>
          </FormControl>
          
          <Button 
            colorScheme="teal" 
            onClick={onSubmit}
            isLoading={submitting}
            loadingText={id ? "Actualizando..." : "Creando..."}
          >
            {id ? "Actualizar" : "Crear"}
          </Button>

          <HStack spacing={2}>
            <Button 
              variant="ghost" 
              onClick={() => nav("/projects")}
              color="gray.300"
              _hover={{ bg: "gray.600" }}
              flex={1}
            >
              Cancelar
            </Button>
            
            {/* Mostrar botón eliminar solo cuando se está editando */}
            {id && (
              <Button 
                colorScheme="red"
                variant="outline"
                onClick={handleDeleteClick}
                _hover={{ bg: "red.600", borderColor: "red.600", color: "white" }}
                flex={1}
              >
                Eliminar
              </Button>
            )}
          </HStack>
        </VStack>
      </Box>

      {/* Modal de confirmación para eliminar */}
      <AlertDialog
        isOpen={isOpen}
        leastDestructiveRef={cancelRef}
        onClose={onClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.700" color="white">
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Eliminar Proyecto
            </AlertDialogHeader>

            <AlertDialogBody>
              <Text>
                ¿Estás seguro de que deseas eliminar el proyecto "{projectToDelete?.name}"?
              </Text>
              <Text mt={2} fontSize="sm" color="gray.400">
                Esta acción no se puede deshacer. Asegúrate de que no tenga tickets o paquetes asociados.
              </Text>
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button 
                ref={cancelRef} 
                onClick={onClose}
                variant="ghost"
                color="gray.300"
                _hover={{ bg: "gray.600" }}
              >
                Cancelar
              </Button>
              <Button 
                colorScheme="red" 
                onClick={handleDeleteConfirm}
                ml={3}
                isLoading={deleting}
                loadingText="Eliminando..."
              >
                Eliminar
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </>
  );
}