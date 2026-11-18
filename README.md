# SplitEasy — Gestión y Simplificación de Gastos Compartidos

**SplitEasy** es una aplicación web Full Stack diseñada para registrar, dividir y simplificar gastos compartidos dentro de grupos (viajes, salidas, convivencia o eventos), calculando automáticamente el balance neto de cada participante y minimizando la cantidad de transferencias necesarias para saldar las deudas.

---

## Enlaces en Producción

* **Aplicación Web (Frontend — Vercel):** [https://split-easy-bay.vercel.app](https://split-easy-bay.vercel.app)
* **API REST (Backend — Render):** [https://spliteasy-backend-p80n.onrender.com](https://spliteasy-backend-p80n.onrender.com)
* **Informe de Pruebas y Calidad:** Ver [`QA_REPORT.md`](./QA_REPORT.md)

> **Nota sobre el servidor en producción:** El backend se encuentra desplegado en el plan gratuito de Render. Tras 15 minutos de inactividad, el contenedor entra en reposo (*cold start*), por lo que la primera petición puede demorar entre **30 y 50 segundos** en reactivar el servidor. Una vez activo, todas las operaciones responden en milisegundos.

---

## Características Principales

* **Autenticación y Seguridad Stateless:** Registro e inicio de sesión con contraseñas encriptadas mediante **BCrypt** y emisión de tokens **JWT** (`Authorization: Bearer <token>`).
* **Gestión y Aislamiento de Grupos:** Creación de grupos con incorporación de integrantes registrados por correo electrónico. Cada usuario accede únicamente a los grupos de los que forma parte.
* **Control de Permisos por Autoría:**
  * Solo el usuario creador de un grupo puede eliminarlo.
  * Solo el autor de un gasto puede editarlo o eliminarlo.
* **División Exacta de Gastos:** Soporte para reparto equitativo automático (con ajuste de centavos) o asignación personalizada por participante. Validación contable tanto en interfaz como en servidor utilizando `BigDecimal` para garantizar exactitud financiera.
* **Simplificación Inteligente de Deudas:** Cálculo en tiempo real de balances netos (`total pagado - total consumido + pagos enviados - pagos recibidos`) y algoritmo voraz (*greedy*) que cruza deudores y acreedores para reducir las transferencias pendientes al mínimo posible.
* **Registro de Pagos en un Clic:** Liquidación directa desde las deudas sugeridas con formulario pre-rellenado y actualización inmediata de saldos.

---

## Arquitectura y Stack Tecnológico

El sistema sigue una arquitectura **Cliente-Servidor desacoplada**, organizada en el backend bajo el patrón en capas **Controlador → Servicio → Repositorio**:

### Frontend
* **React 18 + Vite:** Interfaz SPA reactiva y rápida.
* **React Router DOM:** Navegación con rutas públicas y privadas protegidas por sesión.
* **Axios:** Cliente HTTP con interceptores automáticos para adjuntar el token JWT y gestionar expiraciones.
* **Lucide React & CSS3:** Diseño fintech moderno de alto contraste y adaptable a dispositivos móviles.

### Backend
* **Java 25 + Spring Boot:** API RESTful estructurada por responsabilidades.
* **Spring Security + JJWT:** Seguridad sin estado, filtros de autenticación JWT y políticas CORS configurables.
* **Spring Data JPA / Hibernate:** Mapeo objeto-relacional y gestión transaccional.
* **Jakarta Bean Validation:** Validación declarativa de DTOs de entrada.

### Base de Datos e Infraestructura
* **PostgreSQL (Neon):** Base de datos relacional en la nube con 6 tablas normalizadas (`users`, `groups`, `group_members`, `expenses`, `expense_splits`, `payments`) y columnas `NUMERIC(12,2)`.
* **Docker + Render:** Empaquetado multi-stage con Maven y JRE optimizado (`-Xmx350m`) para despliegue continuo.
* **Vercel:** Despliegue continuo del frontend con enrutamiento SPA (`vercel.json`).

---

## Estructura del Repositorio

```text
spliteasy/
├── backend/
│   ├── src/main/java/com/spliteasy/backend/
│   │   ├── config/          # Seguridad, filtros JWT, UserDetails y CORS
│   │   ├── controller/      # Controladores REST (Auth, Group, Expense, Payment, Balance)
│   │   ├── dto/             # Objetos de transferencia y validaciones de entrada/salida
│   │   ├── entity/          # Entidades JPA mapeadas a PostgreSQL
│   │   ├── exception/       # Manejo global de errores (@RestControllerAdvice)
│   │   ├── repository/      # Interfaces Spring Data JPA
│   │   └── service/         # Lógica de negocio y algoritmo de simplificación de deudas
│   ├── src/main/resources/
│   │   └── application.properties
│   ├── Dockerfile           # Build multi-stage para producción
│   └── pom.xml
├── frontend/
│   ├── src/
│   │   ├── api/             # Configuración de Axios e interceptores
│   │   ├── components/      # Barra de navegación y componentes reutilizables
│   │   ├── context/         # Estado global de autenticación (AuthContext)
│   │   ├── pages/           # Vistas Login, Register, Dashboard y GroupDetail
│   │   ├── App.jsx          # Definición de rutas protegidas y públicas
│   │   └── index.css        # Sistema de estilos globales
│   ├── vercel.json          # Reglas de reescritura para rutas SPA
│   └── package.json
├── QA_REPORT.md             # Informe detallado de pruebas funcionales y de seguridad
└── README.md                # Documentación general del proyecto
```

---

## Endpoints Principales de la API

| Método | Endpoint | Descripción | Acceso |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registra un nuevo usuario y devuelve su JWT | Público |
| `POST` | `/api/auth/login` | Autentica credenciales y devuelve su JWT | Público |
| `GET` | `/api/groups` | Lista los grupos a los que pertenece el usuario | Autenticado |
| `POST` | `/api/groups` | Crea un nuevo grupo asignando al creador como miembro | Autenticado |
| `GET` | `/api/groups/{groupId}` | Obtiene el detalle e integrantes del grupo | Miembro |
| `POST` | `/api/groups/{groupId}/members` | Agrega un usuario existente al grupo mediante su email | Miembro |
| `DELETE` | `/api/groups/{groupId}` | Elimina el grupo y sus registros asociados | Creador |
| `GET` | `/api/groups/{groupId}/expenses` | Lista los gastos del grupo ordenados por fecha | Miembro |
| `POST` | `/api/groups/{groupId}/expenses` | Registra un gasto validando la suma exacta de divisiones | Miembro |
| `PUT` | `/api/groups/{groupId}/expenses/{id}` | Edita un gasto existente | Autor |
| `DELETE` | `/api/groups/{groupId}/expenses/{id}` | Elimina un gasto | Autor |
| `GET` | `/api/groups/{groupId}/payments` | Lista las transferencias registradas en el grupo | Miembro |
| `POST` | `/api/groups/{groupId}/payments` | Registra un pago entre dos integrantes | Miembro |
| `GET` | `/api/groups/{groupId}/summary` | Devuelve balances netos y deudas simplificadas | Miembro |

---

## Instalación y Ejecución en Local

### Requisitos Previos
* **Java JDK 25** (o superior) y **Maven**
* **Node.js 18+** y **npm**
* Una instancia de **PostgreSQL** (local o en Neon)

### 1. Configurar y levantar el Backend
1. Ingresar a la carpeta `backend/` y crear un archivo `.env` con las siguientes variables:
   ```env
   DB_URL=jdbc:postgresql://<host>:<puerto>/<nombre_bd>?sslmode=require
   DB_USERNAME=<tu_usuario_postgres>
   DB_PASSWORD=<tu_contraseña_postgres>
   JWT_SECRET=<clave_secreta_de_al_menos_32_caracteres>
   CORS_ALLOWED_ORIGINS=http://localhost:5173
   ```
2. Ejecutar el servidor Spring Boot:
   ```bash
   cd backend
   ./mvnw spring-boot:run
   ```
   *(En Windows: `mvnw.cmd spring-boot:run`). La API quedará disponible en `http://localhost:8080`.*

### 2. Configurar y levantar el Frontend
1. Ingresar a la carpeta `frontend/` y crear un archivo `.env`:
   ```env
   VITE_API_URL=http://localhost:8080/api
   ```
2. Instalar dependencias y ejecutar el servidor de desarrollo:
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   *La aplicación abrirá en `http://localhost:5173`.*