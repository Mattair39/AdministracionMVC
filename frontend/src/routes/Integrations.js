import {
  Box,
  Button,
  Container,
  Flex,
  FormControl,
  FormLabel,
  Heading,
  Input,
  VStack,
  Text,
  useToast,
  Divider,
  Badge,
  Icon,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Spinner
} from '@chakra-ui/react'
import { useState } from 'react'
import { CheckCircleIcon, WarningIcon } from '@chakra-ui/icons'
import { send_food_to_fitflow } from '../endpoints/api'

export default function Integrations() {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    calories: '',
    protein: '',
    carbs: '',
    fat: '',
    fiber: ''
  })
  const [lastResponse, setLastResponse] = useState(null)
  const toast = useToast()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setLastResponse(null)

    try {
      // Validaciones básicas
      if (!formData.name || !formData.calories || !formData.protein || !formData.carbs || !formData.fat) {
        toast({
          title: 'Campos requeridos',
          description: 'Por favor completa todos los campos obligatorios',
          status: 'warning',
          duration: 3000
        })
        setLoading(false)
        return
      }

      // Convertir valores numéricos
      const dataToSend = {
        name: formData.name,
        calories: parseFloat(formData.calories),
        protein: parseFloat(formData.protein),
        carbs: parseFloat(formData.carbs),
        fat: parseFloat(formData.fat),
        fiber: formData.fiber ? parseFloat(formData.fiber) : 0
      }

      console.log('Enviando alimento a FitFlow:', dataToSend)

      const response = await send_food_to_fitflow(dataToSend)
      
      console.log('Respuesta de FitFlow:', response)
      
      setLastResponse(response)

      toast({
        title: '✅ Alimento enviado a FitFlow',
        description: 'Los datos fueron cifrados con Vault y enviados correctamente',
        status: 'success',
        duration: 5000,
        isClosable: true
      })

      // Limpiar formulario
      setFormData({
        name: '',
        calories: '',
        protein: '',
        carbs: '',
        fat: '',
        fiber: ''
      })

    } catch (error) {
      console.error('Error enviando persona:', error)
      
      toast({
        title: '❌ Error al enviar',
        description: error.message || 'No se pudo enviar los datos a FitFlow',
        status: 'error',
        duration: 5000,
        isClosable: true
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container maxW="container.lg" py={8}>
      <VStack spacing={8} align="stretch">
        
        {/* Header */}
        <Box bg="gray.800" p={6} rounded="lg" borderWidth={1} borderColor="teal.500">
          <Flex align="center" mb={2}>
            <Icon as={CheckCircleIcon} color="teal.400" boxSize={6} mr={3} />
            <Heading size="lg" color="teal.400">
              Integraciones con FitFlow
            </Heading>
          </Flex>
          <Text color="gray.400" mt={2}>
            Envía información nutricional de alimentos desde ProyectoCoreMVC hacia FitFlow
          </Text>
          <Badge colorScheme="purple" mt={3} fontSize="sm">
            🔐 Cifrado con Vault KMS activado
          </Badge>
        </Box>

        {/* Información del flujo */}
        <Alert status="info" bg="blue.900" borderRadius="md">
          <AlertIcon />
          <Box>
            <AlertTitle>Flujo de Cifrado</AlertTitle>
            <AlertDescription>
              1. Completas el formulario → 
              2. Django cifra con Vault → 
              3. Envía datos cifrados → 
              4. FitFlow descifra con Vault → 
              5. Procesa la información
            </AlertDescription>
          </Box>
        </Alert>

        {/* Formulario */}
        <Box bg="gray.800" p={8} rounded="lg">
          <Heading size="md" mb={6} color="teal.300">
            🍎 Enviar Alimento a FitFlow
          </Heading>

          <form onSubmit={handleSubmit}>
            <VStack spacing={5}>
              
              {/* Nombre del alimento */}
              <FormControl isRequired>
                <FormLabel color="gray.300">Nombre del Alimento</FormLabel>
                <Input
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder="Ej: Manzana Verde"
                  bg="gray.700"
                  borderColor="gray.600"
                  _hover={{ borderColor: 'teal.400' }}
                  _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px #38b2ac' }}
                />
              </FormControl>

              {/* Fila 1: Calorías y Proteínas */}
              <Flex gap={4} w="100%">
                <FormControl isRequired>
                  <FormLabel color="gray.300">Calorías (kcal)</FormLabel>
                  <Input
                    name="calories"
                    type="number"
                    step="0.1"
                    value={formData.calories}
                    onChange={handleChange}
                    placeholder="Ej: 52"
                    bg="gray.700"
                    borderColor="gray.600"
                    _hover={{ borderColor: 'teal.400' }}
                    _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px #38b2ac' }}
                    min="0"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300">Proteínas (g)</FormLabel>
                  <Input
                    name="protein"
                    type="number"
                    step="0.1"
                    value={formData.protein}
                    onChange={handleChange}
                    placeholder="Ej: 0.3"
                    bg="gray.700"
                    borderColor="gray.600"
                    _hover={{ borderColor: 'teal.400' }}
                    _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px #38b2ac' }}
                    min="0"
                  />
                </FormControl>
              </Flex>

              {/* Fila 2: Carbohidratos y Grasas */}
              <Flex gap={4} w="100%">
                <FormControl isRequired>
                  <FormLabel color="gray.300">Carbohidratos (g)</FormLabel>
                  <Input
                    name="carbs"
                    type="number"
                    step="0.1"
                    value={formData.carbs}
                    onChange={handleChange}
                    placeholder="Ej: 14"
                    bg="gray.700"
                    borderColor="gray.600"
                    _hover={{ borderColor: 'teal.400' }}
                    _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px #38b2ac' }}
                    min="0"
                  />
                </FormControl>

                <FormControl isRequired>
                  <FormLabel color="gray.300">Grasas (g)</FormLabel>
                  <Input
                    name="fat"
                    type="number"
                    step="0.1"
                    value={formData.fat}
                    onChange={handleChange}
                    placeholder="Ej: 0.2"
                    bg="gray.700"
                    borderColor="gray.600"
                    _hover={{ borderColor: 'teal.400' }}
                    _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px #38b2ac' }}
                    min="0"
                  />
                </FormControl>
              </Flex>

              {/* Fila 3: Fibra (opcional) */}
              <FormControl>
                <FormLabel color="gray.300">Fibra (g) - Opcional</FormLabel>
                <Input
                  name="fiber"
                  type="number"
                  step="0.1"
                  value={formData.fiber}
                  onChange={handleChange}
                  placeholder="Ej: 2.4"
                  bg="gray.700"
                  borderColor="gray.600"
                  _hover={{ borderColor: 'teal.400' }}
                  _focus={{ borderColor: 'teal.400', boxShadow: '0 0 0 1px #38b2ac' }}
                  min="0"
                />
              </FormControl>

              <Divider />
Alimento 
              {/* Botón de envío */}
              <Button
                type="submit"
                colorScheme="teal"
                size="lg"
                w="100%"
                isLoading={loading}
                loadingText="Cifrando y enviando..."
                leftIcon={loading ? <Spinner size="sm" /> : <Icon as={CheckCircleIcon} />}
              >
                {loading ? 'Cifrando y enviando...' : '🔐 Cifrar y Enviar a FitFlow'}
              </Button>
            </VStack>
          </form>
        </Box>

        {/* Respuesta del servidor */}
        {lastResponse && (
          <Alert 
            status="success" 
            bg="green.900" 
            borderRadius="md"
            flexDirection="column"
            alignItems="flex-start"
          >
            <Flex>
              <AlertIcon />
              <AlertTitle>Respuesta de FitFlow</AlertTitle>
            </Flex>
            <AlertDescription mt={2} w="100%">
              <Box as="pre" fontSize="sm" p={3} bg="gray.800" borderRadius="md" overflow="auto">
                {JSON.stringify(lastResponse, null, 2)}
              </Box>
            </AlertDescription>
          </Alert>
        )}

        {/* Información técnica */}
        <Box bg="gray.800" p={4} rounded="md" borderLeft="4px" borderColor="purple.500">
          <Text fontSize="sm" color="gray.400">
            <strong>ℹ️ Nota técnica:</strong> Este formulario envía los datos a través de una comunicación
            cifrada usando HashiCorp Vault Transit Engine. Los datos son cifrados en Django antes de enviarlos
            y descifrados automáticamente en FitFlow mediante un middleware de descifrado.
          </Text>
        </Box>

      </VStack>
    </Container>
  )
}
