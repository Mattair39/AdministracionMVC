import {
    Box, VStack, FormControl, FormLabel,
    Input, Button, Spinner
  } from "@chakra-ui/react";
  import { useState, useEffect } from "react";
  import { useNavigate, useParams } from "react-router-dom";
  import {
    get_contracts,
    create_contract,
    update_contract
  } from "../endpoints/api";
  
  export default function ContractForm() {
    const { id } = useParams();
    const nav = useNavigate();
    const [form, setForm] = useState({
      contract_name: "",
      client_name: "",
      start_date: "",
      end_date: ""
    });
    const [loading, setLoading] = useState(!!id);
  
    useEffect(() => {
      if (!id) return;
      (async () => {
        const data = await get_contracts();
        const c = data.find((x) => x.id === +id);
        setForm({
          contract_name: c.contract_name,
          client_name: c.client_name,
          start_date: c.start_date,
          end_date: c.end_date
        });
        setLoading(false);
      })();
    }, [id]);
  
    if (loading) return <Spinner color="teal" />;
  
    const onChange = (e) => {
      setForm({ ...form, [e.target.name]: e.target.value });
    };
  
    const onSubmit = async () => {
      if (id) {
        await update_contract(id, form);
      } else {
        await create_contract(form);
      }
      nav("/");
    };
  
    return (
      <Box maxW="500px" mx="auto" mt={8} bg="gray.700" p={6} rounded="md">
        <VStack spacing={4} align="stretch">
          <FormControl>
            <FormLabel color="gray.300">Nombre</FormLabel>
            <Input
              name="contract_name"
              value={form.contract_name}
              onChange={onChange}
              color="white"
            />
          </FormControl>
          <FormControl>
            <FormLabel color="gray.300">Cliente</FormLabel>
            <Input
              name="client_name"
              value={form.client_name}
              onChange={onChange}
              color="white"
            />
          </FormControl>
          <FormControl>
            <FormLabel color="gray.300">Fecha Inicio</FormLabel>
            <Input
              name="start_date"
              type="date"
              value={form.start_date}
              onChange={onChange}
              color="white"
            />
          </FormControl>
          <FormControl>
            <FormLabel color="gray.300">Fecha Fin</FormLabel>
            <Input
              name="end_date"
              type="date"
              value={form.end_date}
              onChange={onChange}
              color="white"
            />
          </FormControl>
          <Button colorScheme="teal" onClick={onSubmit}>
            {id ? "Actualizar" : "Crear"}
          </Button>
        </VStack>
      </Box>
    );
  }
  