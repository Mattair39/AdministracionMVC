import { Box, Button, Table, Thead, Tbody, Tr, Th, Td, IconButton } from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { get_projects, delete_project } from "../endpoints/api";

export default function ProjectsList() {
  const [projects, setProjects] = useState([]);
  const nav = useNavigate();

  useEffect(() => {
    get_projects().then(setProjects);
  }, []);

  const onDelete = async (id) => {
    await delete_project(id);
    setProjects((prev) => prev.filter(p => p.id !== id));
  };

  return (
    <Box p={6} bg="gray.800" rounded="lg">
      <Button leftIcon={<AddIcon />} colorScheme="teal" mb={4}
              onClick={() => nav("/projects/new")}>
        Nuevo Proyecto
      </Button>

      <Table variant="simple" colorScheme="whiteAlpha">
        <Thead>
          <Tr>
            <Th>Nombre</Th>
            <Th>Descripción</Th>
            <Th>Contrato</Th>
            <Th isNumeric>Acciones</Th>
          </Tr>
        </Thead>
        <Tbody>
          {projects.map(p => (
            <Tr key={p.id}>
              <Td>{p.name}</Td>
              <Td>{p.description}</Td>
              <Td>{p.contract_name}</Td>
              <Td isNumeric>
                <IconButton icon={<EditIcon />} size="sm" mr={2}
                            onClick={() => nav(`/projects/${p.id}`)} />
                <IconButton icon={<DeleteIcon />} size="sm" colorScheme="red"
                            onClick={() => onDelete(p.id)} />
              </Td>
            </Tr>
          ))}
        </Tbody>
      </Table>
    </Box>
  );
}
