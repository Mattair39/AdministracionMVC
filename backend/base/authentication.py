from rest_framework_simplejwt.authentication import JWTAuthentication

class CookiesJWTAuthentication(JWTAuthentication):
    def authenticate(self, request): # (Contiene toda la información de la petición HTTP (headers, cookies)).
        access_token = request.COOKIES.get('access_token')
        
        if not access_token:
            return None
        
        validated_token = self.get_validated_token(access_token) # (Formato correcto, no expirado y firma válida). 
        try:
            user = self.get_user(validated_token) # Extrae el user_id del token validado.
        except:
            return None
        
        return(user, validated_token)
    
    # (Permite que el frontend con React se autentique con el backend utilizando JWT en cookies).