# Informe de Pruebas y Aseguramiento de Calidad (QA) — SplitEasy

**Proyecto:** SplitEasy (Aplicación Web Full Stack de Gastos Compartidos)  
**Entornos Validados:**  
* **Local:** Frontend (`http://localhost:5173`) + Backend (`http://localhost:8080`) + PostgreSQL (Neon)  
* **Producción:** Frontend (`https://split-easy-bay.vercel.app`) + Backend (`https://spliteasy-backend-p80n.onrender.com`) + PostgreSQL (Neon)  
**Estado General:** Aprobado

---

## 1. Alcance y Estrategia de Pruebas

Se ejecutaron pruebas funcionales *end-to-end* (E2E), pruebas de validación de reglas de negocio, verificación de integridad contable y pruebas de control de acceso y permisos sobre la API REST y la interfaz de usuario. Para validar escenarios multi-usuario en simultáneo sin colisión de almacenamiento local (`localStorage`), se utilizaron sesiones aisladas mediante ventanas estándar y ventanas de incógnito.

---

## 2. Matriz de Casos de Prueba Ejecutados

| ID | Módulo | Escenario / Caso de Prueba | Resultado Esperado | Resultado Obtenido | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **CP-01** | Autenticación | Registro de usuario nuevo con datos válidos y verificación de duplicados. | Crea el usuario con contraseña encriptada (BCrypt), devuelve JWT (`201 Created`) y rechaza emails repetidos (`400 Bad Request`). | Registro exitoso en Neon PostgreSQL, redirección al Dashboard y bloqueo de correos duplicados. | **Aprobado** |
| **CP-02** | Autenticación | Inicio de sesión con credenciales válidas e inválidas. | Devuelve token JWT (`200 OK`) con credenciales válidas y muestra alerta controlada ante contraseña incorrecta. | Login operativo en local y producción; mensaje de error claro ante datos inválidos. | **Aprobado** |
| **CP-03** | Seguridad y Aislamiento | Acceso a grupos desde un usuario externo no miembro. | El listado `/api/groups` solo muestra grupos propios; cualquier consulta directa a un ID ajeno responde `403 Forbidden`. | Un segundo usuario recién registrado visualiza su panel vacío y no tiene acceso a grupos de terceros. | **Aprobado** |
| **CP-04** | Grupos y Miembros | Creación de grupo e incorporación de integrantes por correo electrónico. | El creador queda vinculado automáticamente al grupo; al invitar a un usuario registrado por email, este pasa a visualizar el grupo. | Grupo creado correctamente; al invitar al segundo usuario, el grupo aparece en su panel y permite operar en conjunto. | **Aprobado** |
| **CP-05** | Gastos (Validación Contable) | Carga de gasto con división desigual que no suma el total vs. división exacta. | La interfaz bloquea el envío indicando diferencia en rojo y el backend rechaza desbalances con `400 Bad Request`. Con suma exacta, guarda en `201 Created`. | Validación en vivo funcional ("Falta asignar" / "¡Cuadra perfecto!") y reparto equitativo con ajuste exacto de centavos. | **Aprobado** |
| **CP-06** | Permisos de Autoría | Intento de edición/borrado de gasto por un miembro que no es el autor, y borrado de grupo por no creador. | La UI oculta los controles de edición/eliminación a usuarios no autorizados y el backend protege los endpoints con `403 Forbidden`. | Verificado entre Usuario 1 (creador/autor) y Usuario 2 (miembro): solo el autor/creador visualiza y ejecuta acciones destructivas. | **Aprobado** |
| **CP-07** | Balances y Simplificación | Cálculo de saldos netos y generación de transferencias mínimas tras múltiples gastos. | Calcula `Pagado - Consumido` por integrante y genera la lista mínima de pagos sugeridos. | Ante gastos de $100,00 (consumo $60/$40) y $60,00 (consumo $30/$30) pagados por un integrante, calcula exactamente `+$70,00` y `-$70,00`. | **Aprobado** |
| **CP-08** | Pagos / Liquidación | Registro de pago parcial y total desde el botón "Saldar" de deudas simplificadas. | Pre-rellena pagador, receptor y monto; registra la transferencia (`201 Created`) y actualiza balances y deudas pendientes. | Pago de $40,00 redujo el saldo a `+$30,00` / `-$30,00`; pago restante dejó el grupo en `$0,00` con estado "al día". | **Aprobado** |
| **CP-09** | Persistencia | Cierre de sesión, nuevo inicio de sesión y recarga completa de navegador (`F5`). | Todos los grupos, miembros, gastos y pagos persisten intactos en la base de datos relacional. | Persistencia verificada en Neon PostgreSQL sin pérdida de datos ni inconsistencias decimales. | **Aprobado** |
| **CP-10** | Infraestructura SPA | Recarga directa (`F5`) sobre rutas internas en producción (`/dashboard`, `/groups/{id}`). | Vercel resuelve la ruta mediante `vercel.json` sin devolver error `404 Not Found`. | Navegación y recarga directa funcionando sin errores 404 en `https://split-easy-bay.vercel.app`. | **Aprobado** |

---

## 3. Incidentes Detectados y Resueltos Durante el Ciclo

1. **Construcción de imagen Docker en Render (`mvnw`):**
   * *Descripción:* Durante el primer despliegue en Render, la compilación falló porque `.gitignore` excluía la carpeta `.mvn/wrapper/`.
   * *Resolución:* Se actualizó `backend/Dockerfile` a un *build multi-stage* basado en la imagen oficial `maven:3.9-eclipse-temurin-21`, eliminando la dependencia del *wrapper* local.
2. **Política CORS y variables de entorno entre Vercel y Render:**
   * *Descripción:* Al configurar las URLs de producción, un formato de hipervínculo en `CORS_ALLOWED_ORIGINS` bloqueó las peticiones *preflight* del navegador y requirió re-compilación del bundle de Vite (`VITE_API_URL`).
   * *Resolución:* Se limpió la variable `CORS_ALLOWED_ORIGINS=https://split-easy-bay.vercel.app` en Render, se configuró `VITE_API_URL` en modo *Config* en Vercel y se ejecutó un *Redeploy* limpio.
3. **Aislamiento de sesión en pruebas multi-usuario:**
   * *Descripción:* Al abrir dos cuentas distintas en pestañas del mismo navegador estándar, el `localStorage` compartía el último token guardado.
   * *Resolución:* Comportamiento esperado por diseño *stateless* en navegador; se validaron los escenarios multi-usuario utilizando sesiones separadas (navegador estándar + ventana de incógnito).

---

## 4. Conclusión

La aplicación **SplitEasy** cumple con todos los requerimientos funcionales, reglas contables, políticas de autorización y criterios de despliegue en la nube definidos en la especificación del proyecto, encontrándose lista para su entrega y presentación.