import {
    VStack, Button, FormControl, FormLabel,
    Input, Heading, Text, Box, Divider
  } from "@chakra-ui/react";
  import { useState } from "react";
  import { useAuth } from "../contexts/useAuth";
  import { useNavigate } from "react-router-dom";
  
  const Login = () => {
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const { login_user, login_with_keycloak } = useAuth();
    const nav = useNavigate();
  
    return (
      <Box bg="gray.800" p={8} rounded="lg" shadow="lg" w="full" maxW="420px">
        <VStack spacing={6} align="stretch">
          <Heading textAlign="center" size="lg" color="gray.100">
            Iniciar Sesión
          </Heading>
  
          <FormControl>
            <FormLabel color="gray.300">Nombre de Usuario</FormLabel>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Usuario"
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
            />
          </FormControl>
  
          <FormControl>
            <FormLabel color="gray.300">Contraseña</FormLabel>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Contraseña"
              color="gray.100"
              _placeholder={{ color: "gray.500" }}
            />
          </FormControl>
  
          <Button colorScheme="teal" onClick={() => login_user(username, password)}>
            Login
          </Button>

          <Divider borderColor="gray.600" />

          <Button 
            colorScheme="blue" 
            variant="outline"
            onClick={login_with_keycloak}
          >
            Iniciar Sesión con Keycloak
          </Button>
  
          <Text
            fontSize="sm"
            textAlign="center"
            color="teal.300"
            _hover={{ textDecoration: "underline", cursor: "pointer" }}
            onClick={() => nav("/register")}
          >
            ¿No tienes cuenta? Regístrate
          </Text>
        </VStack>
      </Box>
    );
  };
  
  export default Login;
  