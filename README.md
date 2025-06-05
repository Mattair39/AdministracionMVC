# Proyescto Core MVC  – Gestión de Paquetes y Alertas de Horas, Contratos y Proyectos 

Aplicación web con **autenticación JWT** (almacenado en cookies _HttpOnly_) y CRUD relacionado de **Contratos** y **Proyectos**, desarrollada bajo el patrón **MVC** con **Django + Django REST Framework** en el backend y **React + Chakra UI** en el frontend. Contempla la administración del sistema mediante la aplicación de validaciones para elementos sensibles del Core y relaciona los elementos de las tablas de manera orgánica y lo muestra mediante dropdowns y Tabs relacionados.

---

## Descripción del Proyecto

1. **Autenticación segura**  
   - Emisión de _access_ y _refresh tokens_ con **SimpleJWT**.  
   - Los tokens se guardan en cookies _HttpOnly_ (`samesite=None, secure`) para mitigar XSS.  
   - Endpoint `/authenticated/` que verifica la validez del token en cookie.

2. **Gestión de Contratos**  
   - CRUD completo de contratos: `contract_name`, `client_name`, `start_date`, `end_date`.  
   - **Validación en back-end**:  
     - ❗️ `end_date ≥ start_date` (no puede grabar un contrato con fecha de fin anterior).  
     - 🚨 `contract_name` debe ser **único** por usuario (se valida en el serializer).  

3. **Gestión de Proyectos**  
   - CRUD completo de proyectos: `name`, `description`, `contract_id`.  
   - **Relación FK**: Al crear/editar un proyecto no se escribe manualmente la clave foránea, sino que el frontend muestra un **dropdown** con todos los contratos, forzando la selección de un contrato existente.  
   - **Validación en back-end**:  
     - ❗️ `name` debe ser **único** dentro de cada contrato.

4. **Frontend desacoplado**  
   - React con `AuthContext` para encapsular login, logout, registro y refresco automático de tokens.  
   - Rutas privadas con React Router v6 que bloquean componentes hasta tener un JWT válido.

---

## Tabla de Contenidos

1. [Instalación](#instalación)  
2. [Uso](#uso)  
3. [Validaciones Backend](#validaciones-backend)  
4. [Dropdown de Relación](#dropdown-de-relación)  
5. [Características](#características)  
6. [Contribuir](#contribuir)  
7. [Licencia](#licencia)

---

## Instalación

### Requisitos previos

- **Node.js** y **yarn** (o **npm**) instalados para el frontend (Versión utilizada - **Node: v22.14.0**) (Versión utilizada - **yarn: 1.22.22**).
- **Python 3.8 o superior** instalado para el backend  (Versión utilizada: **3.13.0**).
- **Django**, **Django REST Framework**, **django-cors-headers** y  **SimpleJWT** instalados en el backend.
- **Chakra UI** y **Axios** en el frontend.

La base de datos SQLite se utiliza por defecto y no requiere de configuraciones adicionales por parte del usuario.

### Pasos para instalar y ejecutar el proyecto

#### Configuración del Backend

1. Clonar el siguiente repositorio:
   ```bash
   git clone https://github.com/Mattair39/Proyecto-Login-MVC-DJANGO-REACT.git](https://github.com/Mattair39/AdministracionMVC.git
   ```
2. Ubicarse en la carpeta principal del proyecto:
   ```bash
   cd ../login
   ```
3. Ir a la carpeta backend:
   ```bash
   cd backend
   ```
4. Instalar Django:
   ```bash
   pip install django
   ```
5. Instalar Django REST Framework:
   ```bash
   pip install djangorestframework
   ```
6. Instalar django-cors-headers:
   ```bash
   pip install django-cors-headers
   ```
7. Instalar SimpleJWT
    ```bash
   pip install djangorestframework-simplejwt
   ```
8. Entrar a la carpeta base (donde se encuentra **manage.py**):
   ```bash
   cd base
   ```
9. Aplicar las migraciones:
   ```bash
   python manage.py migrate
   ```
10. Iniciar el servidor del backend:
   ```bash
   python manage.py runserver
   ```
El servidor estará disponible en **http://127.0.0.1:8000/**

---
#### Configuración del Frontend

1. Regresar a la carpeta raíz del proyecto y ubícarse en **frontend**:
   ```bash
   cd ../../../frontend
   ```
2. Instalar yarn:
   ```bash
   npm install 
   ```
3. Entrar a la carpeta **base**:
   ```bash
   cd base
   ```
4. Instalar el cliente HTTP **(Axios)**:
   ```bash
   npm install axios
   ```
---
### Ejecución
#### Iniciar el Backend (Django)

1. Desde la carpeta backend/base (donde se encuentra manage.py):
   ```bash
   python manage.py runserver
   ```
2. El servidor de Django estará disponible en **http://127.0.0.1:8000/**

#### Iniciar el Frontend (React)

1. Ir a la carpeta frontend y ejecutar:
   ```bash
   npm start
   ```
2. La aplicación de React estará disponible en **http://localhost:3000**

#### Deployment Render

El sitio también se encuentra deployado en: **https://administracionmvc-static.onrender.com**

---

## Uso del Proyecto

**1. Registro:**

**/register** → nombre de usuario, correo, contraseña y confirmación.

**2. Login:**

Ingresa a la aplicación mediante el ingreso de tu **usuario** y **contraseña**.

**3. CRUD Contratos:**

Listado, creación, edición, eliminación de Contratos, además de contar con un Tab donde se permite ver todos los proyectos asociados al contrato y editarlos desde esta instancia.

**4. CRUD Proyectos:**

Listado **(filtrado por contrato)**, creación, edición, eliminación.

**Validaciones Backend**

*Email de usuario*

-Se valida en el serializer de registro que no exista otro usuario con el mismo email.

Responde con HTTP 400 si el email ya está en uso.

*Fecha de contrato*

-end_date no puede ser anterior a start_date.

*Unicidad de nombres*

-contract_name único por usuario.

-project.name único por contrato.

**Todas estas validaciones ocurren en el servidor, antes de persistir en la base de datos.**

---

## Características

- 🔐 **JWT + Cookies HttpOnly**
- 🔄 **Refresco automático de tokens**
- 🚧 **Rutas privadas** en React
- 📅 **Validación** de rango de fechas en Django
- 📋 **Unicidad de nombres** de contratos y proyectos
- 📑 **Relación** Contrato → Proyecto mediante dropdown
    
---

## Contribución

Para contribuir a este proyecto, se deben seguir estos:

1. Realizar un fork del repositorio.
2. Crea una nueva rama (`git checkout -b feature/new-feature`).
3. Realiza tus cambios y haz un commit (`git commit -m "Add New Feature"`).
4. Haz un push a la rama (`git push origin feature/new-feature`).
5. Abrir un Pull Request.

---

## Créditos

Este proyecto fue desarrollado por:

- **Gabriel Arguello (Universidad de las Américas)**  
  - [GitHub](https://github.com/Mattair39)  

---

## Licencia

Este proyecto está licenciado bajo la [MIT License](https://choosealicense.com/licenses/mit/). Puedes usar, modificar y distribuir este proyecto libremente.

--- 
