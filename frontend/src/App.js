import "./App.css";
import {
  ChakraProvider,
  ColorModeScript,
  Flex,
  extendTheme
} from "@chakra-ui/react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./contexts/useAuth";
import TopBar from "./components/topBar";
import PrivateRoute from "./components/private_route";
import Login from "./routes/login";
import Register from "./routes/register";
import ContractsList from "./routes/contractsList";
import ContractForm from "./routes/contractForm";
import ContractDetail from "./routes/contractDetail";
import ProjectsList from "./routes/projectsList";
import ProjectForm from "./routes/projectForm";
import TicketsList from "./routes/TicketsList";
import TicketForm from "./routes/TicketForm";
import TicketDetail from "./routes/TicketDetail";
// ← NUEVA IMPORTACIÓN
import ApiView from "./routes/ApiView";
import Integrations from "./routes/Integrations";

const theme = extendTheme({
  config: { initialColorMode: "dark", useSystemColorMode: false },
  fonts: {
    heading: "'Inria Sans', sans-serif",
    body: "'Inria Sans', sans-serif"
  },
  colors: { brand: { 500: "#38b2ac", 600: "#319795" } },
  styles: {
    global: {
      body: {
        fontFamily: "'Inria Sans', sans-serif",
        bg: "gray.900",
        color: "gray.100"
      },
      "*": { fontFamily: "'Inria Sans', sans-serif" }
    }
  }
});

export default function App() {
  return (
    <ChakraProvider theme={theme}>
      <ColorModeScript initialColorMode />
      <Router>
        <AuthProvider>
          <TopBar />
          <Flex minH="100vh" align="flex-start" justify="center" pt={8}>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />

              <Route
                path="/"
                element={
                  <PrivateRoute>
                    <ContractsList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/contracts/new"
                element={
                  <PrivateRoute>
                    <ContractForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/contracts/:id"
                element={
                  <PrivateRoute>
                    <ContractDetail />
                  </PrivateRoute>
                }
              />

              <Route
                path="/projects"
                element={
                  <PrivateRoute>
                    <ProjectsList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/new"
                element={
                  <PrivateRoute>
                    <ProjectForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/projects/:id"
                element={
                  <PrivateRoute>
                    <ProjectForm />
                  </PrivateRoute>
                }
              />

              <Route
                path="/tickets"
                element={
                  <PrivateRoute>
                    <TicketsList />
                  </PrivateRoute>
                }
              />
              <Route
                path="/tickets/new"
                element={
                  <PrivateRoute>
                    <TicketForm />
                  </PrivateRoute>
                }
              />
              <Route
                path="/tickets/:ticketId"
                element={
                  <PrivateRoute>
                    <TicketDetail />
                  </PrivateRoute>
                }
              />

              {/* ← NUEVA RUTA PARA LA API */}
              <Route
                path="/api-view"
                element={
                  <PrivateRoute>
                    <ApiView />
                  </PrivateRoute>
                }
              />

              {/* ← NUEVA RUTA PARA INTEGRACIONES */}
              <Route
                path="/integrations"
                element={
                  <PrivateRoute>
                    <Integrations />
                  </PrivateRoute>
                }
              />
            </Routes>
          </Flex>
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
}