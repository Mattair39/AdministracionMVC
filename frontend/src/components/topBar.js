import { Flex, Heading, Button, Spacer, Text } from "@chakra-ui/react"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom"

export default function TopBar() {
  const { isAuthenticated, loading, user, logout_user } = useAuth()
  const nav = useNavigate()
  if (loading) return null
  return (
    <Flex bg="gray.800" p={4} align="center">
      <Heading size="md" color="gray.100" cursor="pointer" onClick={() => nav('/')}>
        Proyecto Core MVC
      </Heading>
      {isAuthenticated && (
        <Button colorScheme="teal" ml={4} onClick={() => nav('/')}>
          Contratos
        </Button>
      )}
      <Spacer />
      {isAuthenticated && (
        <Text color="gray.100" mr={4}>
          {user}
        </Text>
      )}
      {isAuthenticated && (
        <Button colorScheme="red" onClick={logout_user}>
          Cerrar Sesión
        </Button>
      )}
    </Flex>
  )
}
