import {
    Box,
    Flex,
    Heading,
    Button,
    IconButton,
    Table,
    Thead,
    Tbody,
    Tr,
    Th,
    Td,
    Spinner,
    useToast,
    Icon
  } from "@chakra-ui/react";
  import { AddIcon, EditIcon, DeleteIcon } from "@chakra-ui/icons";
  import { useEffect, useState } from "react";
  import { useNavigate } from "react-router-dom";
  import {
    get_projects,
    delete_project
  } from "../endpoints/api";
  
  export default function ProjectsList() {
    const [projects, setProjects] = useState(null);
    const nav   = useNavigate();
    const toast = useToast();
  
    const load = async () => {
      const data = await get_projects();
      setProjects(data || []);
    };
  
    useEffect(() => {
      load();
    }, []);
  
    if (projects === null) return <Spinner color="teal" />;
  
    const onDelete = async (id) => {
      if (await delete_project(id)) {
        toast({ title: "Proyecto eliminado", status: "success", duration: 1500 });
        load();
      }
    };
  
    return (
      <Box w="100%" maxW="1080px" bg="gray.800" p={6} rounded="lg">
        <Flex justify="space-between" align="center" mb={6}>
          <Heading size="lg">Proyectos</Heading>
          <Button
            leftIcon={<Icon as={AddIcon} />}
            bg="teal.400"
            _hover={{ bg: "teal.300" }}
            color="gray.900"
            onClick={() => nav("/projects/new")}
          >
            Nuevo Proyecto
          </Button>
        </Flex>
        <Table variant="simple">
          <Thead>
            <Tr>
              <Th color="gray.400">Nombre</Th>
              <Th color="gray.400">Descripción</Th>
              <Th color="gray.400">Contrato</Th>
              <Th color="gray.400" isNumeric>Acciones</Th>
            </Tr>
          </Thead>
          <Tbody>
            {projects.map((p) => (
              <Tr key={p.id}>
                <Td>{p.name}</Td>
                <Td>{p.description}</Td>
                <Td>{p.contract}</Td>
                <Td isNumeric>
                  <IconButton
                    size="sm"
                    icon={<EditIcon />}
                    mr={2}
                    onClick={() => nav(`/projects/${p.id}`)}
                  />
                  <IconButton
                    size="sm"
                    colorScheme="red"
                    icon={<DeleteIcon />}
                    onClick={() => onDelete(p.id)}
                  />
                </Td>
              </Tr>
            ))}
          </Tbody>
        </Table>
      </Box>
    );
  }
  