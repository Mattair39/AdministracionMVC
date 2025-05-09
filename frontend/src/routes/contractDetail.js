import {
  Box, Flex, Heading, Button, IconButton, Spinner,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  get_contract, update_contract,
  get_projects, delete_project
} from "../endpoints/api";

export default function ContractDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(null);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([ get_contract(id), get_projects(id) ])
      .then(([ctr, projs]) => {
        setForm(ctr);
        setProjects(projs);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spinner color="teal" />;

  const onFieldChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const save = async () => {
    await update_contract(id, form);
    nav("/");
  };

  const reloadProjects = async () => {
    const projs = await get_projects(id);
    setProjects(projs);
  };

  const onDeleteProject = async projId => {
    await delete_project(projId);
    reloadProjects();
  };

  return (
    <Box w="100%" maxW="1080px" bg="gray.800" p={6} rounded="lg">
      <Flex justify="space-between" align="center" mb={6}>
        <Heading size="lg">Contrato / {form.contract_name}</Heading>
        <Button onClick={() => nav("/")} colorScheme="teal">Volver</Button>
      </Flex>

      <Tabs variant="enclosed" colorScheme="teal">
        <TabList mb="1em">
          <Tab>General</Tab>
          <Tab>Proyectos</Tab>
        </TabList>
        <TabPanels>

          <TabPanel>
            <Box maxW="500px">
              <Heading size="md" mb={4}>Editar Contrato</Heading>
              {/* --- Campos existentes --- */}
              <Box mb={3}>
                <Heading size="sm" color="gray.300">Nombre</Heading>
                <input
                  name="contract_name"
                  value={form.contract_name}
                  onChange={onFieldChange}
                  style={{
                    width:"100%", padding:"8px", background:"#2D3748",
                    border:"1px solid #4A5568", color:"white", borderRadius:4
                  }}
                />
              </Box>
              <Box mb={3}>
                <Heading size="sm" color="gray.300">Cliente</Heading>
                <input
                  name="client_name"
                  value={form.client_name}
                  onChange={onFieldChange}
                  style={{
                    width:"100%", padding:"8px", background:"#2D3748",
                    border:"1px solid #4A5568", color:"white", borderRadius:4
                  }}
                />
              </Box>
              <Box mb={3}>
                <Heading size="sm" color="gray.300">Fecha Inicio</Heading>
                <input
                  type="date"
                  name="start_date"
                  value={form.start_date}
                  onChange={onFieldChange}
                  style={{
                    width:"100%", padding:"8px", background:"#2D3748",
                    border:"1px solid #4A5568", color:"white", borderRadius:4
                  }}
                />
              </Box>
              <Box mb={3}>
                <Heading size="sm" color="gray.300">Fecha Fin</Heading>
                <input
                  type="date"
                  name="end_date"
                  value={form.end_date}
                  onChange={onFieldChange}
                  style={{
                    width:"100%", padding:"8px", background:"#2D3748",
                    border:"1px solid #4A5568", color:"white", borderRadius:4
                  }}
                />
              </Box>
              <Button colorScheme="teal" onClick={save}>Guardar</Button>
            </Box>
          </TabPanel>

          <TabPanel>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">Proyectos asociados</Heading>
              <Button
                leftIcon={<AddIcon />}
                colorScheme="teal"
                onClick={() => nav(`/projects/new?contract=${id}`)}
              >
                Nuevo Proyecto
              </Button>
            </Flex>

            <Table variant="simple">
              <Thead>
                <Tr><Th>Nombre</Th><Th>Descripción</Th><Th isNumeric>Acciones</Th></Tr>
              </Thead>
              <Tbody>
                {projects.map(p => (
                  <Tr key={p.id}>
                    <Td>{p.name}</Td>
                    <Td>{p.description}</Td>
                    <Td isNumeric>
                      <IconButton
                        icon={<EditIcon />} size="sm" mr={2}
                        onClick={() => nav(`/projects/${p.id}?contract=${id}`)}
                      />
                      <IconButton
                        icon={<DeleteIcon />} size="sm" colorScheme="red"
                        onClick={() => onDeleteProject(p.id)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>

        </TabPanels>
      </Tabs>
    </Box>
  );
}
