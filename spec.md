# Especificación Técnica del Proyecto: SplitEasy

## 1. Visión General del Producto
**SplitEasy** es una aplicación web Full Stack de gestión de gastos compartidos diseñada para grupos de personas (viajes, compañeros de vivienda, eventos o parejas). Permite registrar quién pagó cada gasto, dividir los montos de forma personalizada entre los participantes y calcular automáticamente el balance neto de cada miembro, optimizando la cantidad de transferencias necesarias para saldar todas las deudas del grupo.

---

## 2. Arquitectura y Stack Tecnológico

El sistema sigue una arquitectura **Cliente-Servidor desacoplada**, comunicándose exclusivamente mediante peticiones HTTP/HTTPS con intercambio de datos en formato JSON.

* **Frontend (Cliente Web):**
  * **Tecnología:** React (con Vite) + CSS moderno / Tailwind CSS.
  * **Responsabilidad:** Renderizado de vistas, validaciones preventivas en formularios, manejo de estado de sesión (JWT) y consumo de la API REST.
  * **Despliegue:** Vercel o Netlify.
* **Backend (API REST):**
  * **Tecnología:** Java 17+ con Spring Boot 3 (Spring Web, Spring Data JPA, Spring Security + JWT, Bean Validation).
  * **Arquitectura interna en 3 capas:**
    1. *Controladores (`controllers`):* Exponen los endpoints REST, reciben DTOs, validan formatos de entrada y devuelven códigos de estado HTTP adecuados. No contienen lógica de negocio.
    2. *Servicios (`services`):* Contienen toda la lógica de negocio, verificación de permisos, validaciones contables y el algoritmo de simplificación de deudas.
    3. *Repositorios (`repositories`):* Interfaces de Spring Data JPA encargadas de la persistencia y consultas a la base de datos.
  * **Despliegue:** Render (empaquetado mediante `Dockerfile`).
* **Base de Datos:**
  * **Tecnología:** PostgreSQL (relacional).
  * **Despliegue:** Neon (Cloud PostgreSQL).

---

## 3. Requerimientos Funcionales (RF)

* **RF-01 | Registro e Inicio de Sesión:** Los usuarios pueden crear una cuenta con nombre, correo electrónico y contraseña, e iniciar sesión para obtener un token de autenticación (JWT).
* **RF-02 | Gestión de Grupos:** Un usuario autenticado puede crear grupos nuevos, visualizar únicamente los grupos de los que forma parte, agregar otros usuarios registrados mediante su correo electrónico y eliminar el grupo (acción restringida al creador).
* **RF-03 | Registro de Gastos con División Personalizada:** Dentro de un grupo, cualquier integrante puede cargar un gasto especificando quién pagó, monto total, descripción, categoría, fecha y el monto exacto que corresponde a cada participante involucrado.
* **RF-04 | Historial y Control de Edición de Gastos:** Todos los miembros del grupo pueden ver el historial de gastos ordenado cronológicamente (del más reciente al más antiguo). Solo el usuario que registró el gasto puede editarlo o eliminarlo.
* **RF-05 | Cálculo Automático de Balances y Simplificación de Deudas:** El sistema calcula el saldo neto de cada integrante del grupo y genera una lista optimizada de transferencias sugeridas para saldar las cuentas con la menor cantidad de movimientos posibles.
* **RF-06 | Registro de Pagos (Liquidación):** Los integrantes pueden registrar pagos directos realizados entre dos miembros del grupo para saldar deudas, recalculando los balances al instante.

---

## 4. Reglas de Negocio (RN) y Casos Borde

### 4.1. Seguridad y Aislamiento de Datos
* **RN-01 (Encriptación):** Las contraseñas jamás se almacenan en texto plano; se encriptan utilizando el algoritmo `BCrypt` antes de persistirse.
* **RN-02 (Aislamiento por Grupo):** Todo endpoint que opere sobre un grupo, gasto o pago debe verificar que el usuario autenticado pertenezca al grupo correspondiente. Si no es miembro, la API responderá con `403 Forbidden`.
* **RN-03 (Propiedad del Grupo):** Únicamente el usuario registrado en el campo `created_by` del grupo puede eliminarlo (`DELETE /api/groups/{id}`).
* **RN-04 (Propiedad del Gasto y del Pago):** Únicamente el usuario que creó un gasto (`created_by`) puede modificarlo o eliminarlo. De igual manera, solo quien registró un pago puede eliminarlo en caso de error de carga.

### 4.2. Integridad Contable y Precisión Numérica
* **RN-05 (Tipo de Dato Monetario):** Todos los cálculos financieros en el backend utilizarán `BigDecimal` (escala de 2 decimales con redondeo `RoundingMode.HALF_UP`) y en PostgreSQL se almacenarán como `NUMERIC(12, 2)` para evitar errores de precisión de punto flotante.
* **RN-06 (Cuadre Exacto de Divisiones):** Al crear o editar un gasto, la suma de los montos asignados a cada participante debe ser estrictamente igual al monto total del gasto:
  $$\sum_{i=1}^{n} \text{montoParticipante}_i = \text{montoTotal}$$
  Si existe una diferencia (incluso de $\$0.01$), el backend rechazará la operación con `400 Bad Request`.
* **RN-07 (Montos Válidos):** El monto total de un gasto y el monto de un pago deben ser mayores a cero ($\text{monto} > 0$). Las divisiones individuales deben ser mayores o iguales a cero ($\text{montoParticipante}_i \ge 0$).

### 4.3. Algoritmo de Simplificación de Deudas
Para cada integrante $u$ del grupo, el balance neto se define como:
$$\text{Balance}(u) = (\text{Total Pagado en Gastos}_u + \text{Total Pagos Enviados}_u) - (\text{Total Consumido en Divisiones}_u + \text{Total Pagos Recibidos}_u)$$

* Si $\text{Balance}(u) > 0$, el usuario es **acreedor** (le deben dinero).
* Si $\text{Balance}(u) < 0$, el usuario es **deudor** (debe dinero).
* Si $\text{Balance}(u) = 0$, el usuario está **saldado**.

**Lógica de optimización (Algoritmo Voraz / Greedy):**
1. Se separan los integrantes en dos listas: *Acreedores* (ordenados de mayor a menor saldo positivo) y *Deudores* (ordenados de mayor a menor deuda absoluta).
2. Se toma al mayor deudor y al mayor acreedor, y se genera una transferencia sugerida por el mínimo entre lo que el deudor debe y lo que el acreedor espera recibir:
   $$\text{Transferencia} = \min(|\text{Balance}_{\text{deudor}}|, \text{Balance}_{\text{acreedor}})$$
3. Se actualizan ambos saldos y se repite el proceso hasta que todos los balances queden en $\$0.00$.

### 4.4. Casos Borde Contemplados
* **CB-01 (Agregar miembro inexistente):** Si se intenta agregar a un grupo un correo electrónico que no está registrado en SplitEasy, la API devuelve `404 Not Found` indicando que el usuario debe registrarse primero.
* **CB-02 (Agregar miembro duplicado):** Si el usuario ya pertenece al grupo, la API devuelve `409 Conflict` evitando duplicados en la tabla intermedia.
* **CB-03 (Gasto pagado por alguien que no consumió):** Un miembro puede pagar el $100\%$ de un gasto y asignar $\$0.00$ a su propia división (ejemplo: pagar una entrada para otros dos amigos). El algoritmo lo contempla correctamente dejando su balance positivo por el total pagado.
* **CB-04 (Pago entre miembros sin deuda o por monto superior):** Se permite registrar pagos libres entre miembros del grupo; si alguien paga de más, su balance pasa a ser positivo y el sistema invertirá automáticamente la sugerencia de deuda.
* **CB-05 (Grupo sin gastos o con cuentas saldadas):** Si todos los balances son $\$0.00$, el endpoint de balances devuelve una lista vacía de transferencias sugeridas (`[]`), mostrando en la interfaz el estado *"Todas las deudas están saldadas"*.
* **CB-06 (Eliminación de grupo con historial):** Al eliminar un grupo (por su creador), se eliminan en cascada sus membresías, gastos, divisiones y pagos asociados para mantener la integridad referencial.

---

## 5. Modelo de Datos (PostgreSQL)

### Tablas y Relaciones

1. **`users`**
   * `id` (`BIGSERIAL`, PK)
   * `name` (`VARCHAR(100)`, NOT NULL)
   * `email` (`VARCHAR(150)`, UNIQUE, NOT NULL)
   * `password_hash` (`VARCHAR(255)`, NOT NULL)
   * `created_at` (`TIMESTAMP`, DEFAULT `CURRENT_TIMESTAMP`)

2. **`groups`**
   * `id` (`BIGSERIAL`, PK)
   * `name` (`VARCHAR(100)`, NOT NULL)
   * `description` (`VARCHAR(255)`, NULL)
   * `created_by` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `created_at` (`TIMESTAMP`, DEFAULT `CURRENT_TIMESTAMP`)

3. **`group_members`**
   * `id` (`BIGSERIAL`, PK)
   * `group_id` (`BIGINT`, FK $\rightarrow$ `groups.id` ON DELETE CASCADE, NOT NULL)
   * `user_id` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `joined_at` (`TIMESTAMP`, DEFAULT `CURRENT_TIMESTAMP`)
   * *Restricción:* `UNIQUE (group_id, user_id)`

4. **`expenses`**
   * `id` (`BIGSERIAL`, PK)
   * `group_id` (`BIGINT`, FK $\rightarrow$ `groups.id` ON DELETE CASCADE, NOT NULL)
   * `paid_by` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `created_by` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `description` (`VARCHAR(200)`, NOT NULL)
   * `category` (`VARCHAR(50)`, NOT NULL) — Valores: `COMIDA`, `TRANSPORTE`, `ALOJAMIENTO`, `ENTRETENIMIENTO`, `SERVICIOS`, `OTROS`.
   * `total_amount` (`NUMERIC(12, 2)`, NOT NULL)
   * `expense_date` (`DATE`, NOT NULL)
   * `created_at` (`TIMESTAMP`, DEFAULT `CURRENT_TIMESTAMP`)

5. **`expense_splits`**
   * `id` (`BIGSERIAL`, PK)
   * `expense_id` (`BIGINT`, FK $\rightarrow$ `expenses.id` ON DELETE CASCADE, NOT NULL)
   * `user_id` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `amount_owed` (`NUMERIC(12, 2)`, NOT NULL)

6. **`payments`**
   * `id` (`BIGSERIAL`, PK)
   * `group_id` (`BIGINT`, FK $\rightarrow$ `groups.id` ON DELETE CASCADE, NOT NULL)
   * `from_user_id` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `to_user_id` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `amount` (`NUMERIC(12, 2)`, NOT NULL)
   * `payment_date` (`DATE`, NOT NULL)
   * `created_by` (`BIGINT`, FK $\rightarrow$ `users.id`, NOT NULL)
   * `created_at` (`TIMESTAMP`, DEFAULT `CURRENT_TIMESTAMP`)

---

## 6. Contrato de la API REST

Todos los endpoints bajo `/api/groups/**`, `/api/expenses/**` y `/api/payments/**` requieren el header `Authorization: Bearer <token>`.

### 6.1. Autenticación (`/api/auth`)
| Método | Endpoint | Descripción | Respuesta Exitosa |
| :--- | :--- | :--- | :--- |
| `POST` | `/api/auth/register` | Registra un nuevo usuario. | `201 Created` (Token JWT + datos usuario) |
| `POST` | `/api/auth/login` | Autentica credenciales y devuelve JWT. | `200 OK` (Token JWT + datos usuario) |

### 6.2. Grupos (`/api/groups`)
| Método | Endpoint | Descripción | Respuesta Exitosa |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/groups` | Lista los grupos del usuario autenticado. | `200 OK` (Lista de grupos) |
| `POST` | `/api/groups` | Crea un grupo y agrega al creador como miembro. | `201 Created` (Detalle del grupo) |
| `GET` | `/api/groups/{id}` | Obtiene detalle del grupo y sus integrantes. | `200 OK` (Grupo + lista de miembros) |
| `POST` | `/api/groups/{id}/members` | Agrega un integrante por su email. | `201 Created` (Lista actualizada) |
| `DELETE` | `/api/groups/{id}` | Elimina el grupo (solo si es el creador). | `204 No Content` |

### 6.3. Gastos (`/api/groups/{groupId}/expenses` y `/api/expenses`)
| Método | Endpoint | Descripción | Respuesta Exitosa |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/groups/{groupId}/expenses` | Lista gastos del grupo ordenados por fecha desc. | `200 OK` (Lista de gastos + splits) |
| `POST` | `/api/groups/{groupId}/expenses` | Crea un gasto validando la suma de divisiones. | `201 Created` (Gasto creado) |
| `PUT` | `/api/expenses/{id}` | Edita un gasto existente (solo el creador). | `200 OK` (Gasto actualizado) |
| `DELETE` | `/api/expenses/{id}` | Elimina un gasto (solo el creador). | `204 No Content` |

### 6.4. Balances y Pagos (`/api/groups/{groupId}/balances` y `/payments`)
| Método | Endpoint | Descripción | Respuesta Exitosa |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/groups/{groupId}/balances` | Devuelve el balance neto por miembro y la lista simplificada de deudas. | `200 OK` (`{ balances: [], simplifiedDebts: [] }`) |
| `GET` | `/api/groups/{groupId}/payments` | Lista el historial de pagos realizados en el grupo. | `200 OK` (Lista de pagos) |
| `POST` | `/api/groups/{groupId}/payments` | Registra un pago de un miembro a otro. | `201 Created` (Pago registrado) |
| `DELETE` | `/api/payments/{id}` | Elimina un pago registrado (solo quien lo cargó). | `204 No Content` |

---

## 7. Vistas del Frontend (React)

1. **Vista de Acceso (`/login` y `/register`):** Formularios con validación de formato de correo y longitud de contraseña, con mensajes claros de error ante credenciales inválidas.
2. **Panel Principal / Dashboard (`/dashboard`):** Tarjetas con los grupos a los que pertenece el usuario, botón para crear un nuevo grupo y resumen rápido.
3. **Vista Detalle de Grupo (`/groups/:id`):**
   * **Cabecera:** Nombre del grupo, lista de integrantes, formulario/modal para invitar por correo y botón de eliminar grupo (visible solo para el creador).
   * **Panel de Balances y Deudas Simplificadas:** Tarjetas visuales indicando quién le debe a quién y cuánto, con botón de *"Saldar deuda"* que precarga el formulario de pago.
   * **Historial de Gastos:** Lista cronológica con categoría, pagador, monto total, desglose por participante y botones de editar/eliminar (visibles solo para el autor del gasto).
   * **Modal de Nuevo/Editar Gasto:** Permite cargar el monto total e ingresar los importes individuales por miembro mostrando en tiempo real cuánto falta asignar para llegar a $\$0.00$ de diferencia antes de habilitar el botón guardar.

---

## 8. Variables de Entorno y Seguridad

El repositorio no contendrá credenciales sensibles. Toda configuración externa se inyectará mediante variables de entorno:

* **Backend (`application.properties`):**
  * `DB_URL`: Cadena de conexión JDBC hacia PostgreSQL (Neon).
  * `DB_USERNAME`: Usuario de la base de datos.
  * `DB_PASSWORD`: Contraseña de la base de datos.
  * `JWT_SECRET`: Clave secreta en Base64 de al menos 256 bits para firmar tokens.
  * `CORS_ALLOWED_ORIGINS`: URL del frontend en producción (ej. `https://spliteasy.vercel.app`).
* **Frontend (`.env`):**
  * `VITE_API_URL`: URL base del backend desplegado en Render (ej. `https://spliteasy-api.onrender.com/api`).