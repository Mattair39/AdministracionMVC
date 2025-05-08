import {
    Box,
    Button,
    Flex,
    Heading,
    Icon,
    IconButton,
    Table,
    Tbody,
    Td,
    Th,
    Thead,
    Tr,
    useToast,
    Spinner
  } from '@chakra-ui/react'
  import { AddIcon, EditIcon, DeleteIcon } from '@chakra-ui/icons'
  import { useEffect, useState } from 'react'
  import { useNavigate } from 'react-router-dom'
  import { get_contracts, delete_contract } from '../endpoints/api'
  
  export default function ContractsList () {
    const [contracts, setContracts] = useState(null)
    const nav   = useNavigate()
    const toast = useToast()
  
    const loadData = async () => {
      const data = await get_contracts()
      setContracts(data || [])
    }
  
    const handleDelete = async id => {
      if (await delete_contract(id)) {
        toast({ title: 'Contrato eliminado', status: 'success', duration: 1500 })
        loadData()
      }
    }
  
    useEffect(() => { loadData() }, [])
  
    if (contracts === null) return <Spinner color="teal" />
  
    return (
      <Box w="100%" maxW="1080px" bg="gray.800" p={6} rounded="lg">
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Contratos</Heading>
  
          <Button
            leftIcon={<Icon as={AddIcon} />}
            bg="teal.400"
            _hover={{ bg: 'teal.300' }}
            color="gray.900"
            onClick={() => nav('/contracts/new')}
          >
            Nuevo Contrato
          </Button>
        </Flex>
  
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th color="gray.400">Nombre</Th>
              <Th color="gray.400">Cliente</Th>
              <Th color="gray.400">Inicio</Th>
              <Th color="gray.400">Fin</Th>
              <Th color="gray.400" isNumeric>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {contracts.map(c => (
              <Tr key={c.id}>
                <Td>{c.contract_name}</Td>
                <Td>{c.client_name}</Td>
                <Td>{c.start_date}</Td>
                <Td>{c.end_date}</Td>
                <Td isNumeric>
                  <IconButton
                    size="sm"
                    icon={<EditIcon />}
                    mr={2}
                    onClick={() => nav(`/contracts/${c.id}`)}
                  />
                  <IconButton
                    size="sm"
                    colorScheme="red"
                    icon={<DeleteIcon />}
                    onClick={() => handleDelete(c.id)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    )
  }
  