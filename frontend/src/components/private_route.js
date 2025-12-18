import { Heading } from "@chakra-ui/react"
import { useEffect } from "react"
import { useAuth } from "../contexts/useAuth"
import { useNavigate } from "react-router-dom";

const PrivateRoute = ({children}) => {
    const { isAuthenticated, loading } = useAuth();
    const nav = useNavigate();

    useEffect(() => {
        // Solo redirigir a login si no está cargando y no está autenticado
        if (!loading && !isAuthenticated) {
            nav('/login', { replace: true })
        }
    }, [loading, isAuthenticated, nav])

    if (loading) {
        return <Heading>Loading...</Heading>
    }
    
    if (isAuthenticated) {
        return children
    }
    
    // Mientras redirige, mostrar loading
    return <Heading>Loading...</Heading>
}

export default PrivateRoute;