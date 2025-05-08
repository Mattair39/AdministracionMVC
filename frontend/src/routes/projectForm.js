import {
    Box,
    VStack,
    FormControl,
    FormLabel,
    Input,
    Button,
    Spinner
  } from "@chakra-ui/react";
  import { useState, useEffect } from "react";
  import { useNavigate, useParams } from "react-router-dom";
  import {
    get_projects,
    get_contracts,
    create_project,
    update_project
  } from "../endpoints/api";
  
  export default function ProjectForm() {
    const { id } = useParams();
    const nav    = useNavigate();
  
    const [contracts, setContracts] = useState([]);
    const [form, setForm] = useState({
      name: "",
      description: "",
      contract: ""
    });
    const [loading, setLoading] = useState(!!id);
  
    useEffect(() => {
      (async () => {
        const cs = await get_contracts();
        setContracts(cs || []);
        if (id) {
          const ps = await get_projects();
          const p  = ps.find((x) => x.id === +id);
          setForm({
            name:        p.name,
            description: p.description,
            contract:    p.contract
          });
          setLoading(false);
        }
      })();
    }, [id]);
  
    if (loading) return <Spinner color="teal" />;
  
    const onChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
    };
  
    const onSubmit = async () => {
      if (id) await update_project(id, form);
      else    await create_project(form);
      nav("/projects");
    };
  
    return (
      <Box maxW="500px" mx="auto" mt={8} bg="gray.700" p={6} rounded="md">
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel color="gray.300">Nombre</FormLabel>
            <Input name="name" value={form.name} onChange={onChange} color="white" />
          </FormControl>
          <FormControl>
            <FormLabel color="gray.300">Descripción</FormLabel>
            <Input name="description" value={form.description} onChange={onChange} color="white" />
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
                  {c.contract_name}
                </option>
              ))}
            </Input>
          </FormControl>
          <Button colorScheme="teal" onClick={onSubmit}>
            {id ? "Actualizar" : "Crear"}
          </Button>
        </VStack>
      </Box>
    );
  }
  