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
import ProjectsList from "./routes/projectsList";
import ProjectForm from "./routes/projectForm";

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
      <ColorModeScript initialColorMode="dark" />
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
                    <ContractForm />
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
            </Routes>
          </Flex>
        </AuthProvider>
      </Router>
    </ChakraProvider>
  );
}
