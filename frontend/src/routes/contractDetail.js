import React, { useState, useEffect } from "react";
import {
  Box, Flex, Heading, Button, IconButton, Spinner,
  Tabs, TabList, TabPanels, Tab, TabPanel,
  Table, Thead, Tbody, Tr, Th, Td, useDisclosure
} from "@chakra-ui/react";
import { AddIcon, EditIcon, DeleteIcon } from "@chakra-ui/icons";
import { useParams, useNavigate } from "react-router-dom";
import {
  get_contract, update_contract,
  get_projects, delete_project,
  get_packages, delete_package
} from "../endpoints/api";
import PackageWizard from "../components/PackageWizard";

export default function ContractDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(null);
  const [projects, setProjects] = useState([]);
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);
  const { isOpen, onOpen, onClose } = useDisclosure();

  useEffect(() => {
    const loadData = async () => {
      try {
        const [ctr, projs, pkgs] = await Promise.all([
          get_contract(id), 
          get_projects(id), 
          get_packages(id)
        ]);
        setForm(ctr);
        setProjects(projs || []);
        setPackages(pkgs || []);
      } catch (error) {
        console.error('Error loading data:', error);
        setProjects([]);
        setPackages([]);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      loadData();
    }
  }, [id]);

  if (loading) return <Spinner color="teal" />;
  if (!form) return <div>Error cargando contrato</div>;

  const onFieldChange = e => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const save = async () => {
    try {
      await update_contract(id, form);
      nav("/");
    } catch (error) {
      console.error('Error saving contract:', error);
    }
  };

  const reloadProjects = async () => {
    try {
      const projs = await get_projects(id);
      setProjects(projs || []);
    } catch (error) {
      console.error('Error loading projects:', error);
    }
  };

  const reloadPackages = async () => {
    try {
      const pkgs = await get_packages(id);
      setPackages(pkgs || []);
    } catch (error) {
      console.error('Error loading packages:', error);
    }
  };

  const onDeleteProject = async projId => {
    try {
      await delete_project(projId);
      reloadProjects();
    } catch (error) {
      console.error('Error deleting project:', error);
    }
  };

  const onDeletePackage = async pkgId => {
    try {
      await delete_package(pkgId);
      reloadPackages();
    } catch (error) {
      console.error('Error deleting package:', error);
    }
  };

  const onPackageCreated = (newPackages) => {
    reloadPackages();
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
          <Tab>Paquetes</Tab>
        </TabList>
        <TabPanels>

          <TabPanel>
            <Box maxW="500px">
              <Heading size="md" mb={4}>Editar Contrato</Heading>
              <Box mb={3}>
                <Heading size="sm" color="gray.300">Nombre</Heading>
                <input
                  name="contract_name"
                  value={form.contract_name || ''}
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
                  value={form.client_name || ''}
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
                  value={form.start_date || ''}
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
                  value={form.end_date || ''}
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

          <TabPanel>
            <Flex justify="space-between" align="center" mb={4}>
              <Heading size="md">Paquetes de Horas</Heading>
              <Button
                leftIcon={<AddIcon />}
                colorScheme="teal"
                onClick={onOpen}
              >
                Generar Paquete de Horas
              </Button>
            </Flex>

            <Table variant="simple">
              <Thead>
                <Tr>
                  <Th>Nombre</Th>
                  <Th>Horas Totales</Th>
                  <Th>Fecha Inicio</Th>
                  <Th>Fecha Fin</Th>
                  <Th>Segmentado</Th>
                  <Th isNumeric>Acciones</Th>
                </Tr>
              </Thead>
              <Tbody>
                {packages.map(pkg => (
                  <Tr key={pkg.id}>
                    <Td>{pkg.package_name}</Td>
                    <Td>{pkg.total_hours}</Td>
                    <Td>{pkg.start_date}</Td>
                    <Td>{pkg.end_date}</Td>
                    <Td>{pkg.is_segmented ? 'Sí' : 'No'}</Td>
                    <Td isNumeric>
                      <IconButton
                        icon={<DeleteIcon />} size="sm" colorScheme="red"
                        onClick={() => onDeletePackage(pkg.id)}
                      />
                    </Td>
                  </Tr>
                ))}
              </Tbody>
            </Table>
          </TabPanel>

        </TabPanels>
      </Tabs>

      <PackageWizard
        isOpen={isOpen}
        onClose={onClose}
        contractId={id}
        onPackageCreated={onPackageCreated}
      />
    </Box>
  );
}