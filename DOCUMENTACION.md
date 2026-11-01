# CERQUITA · Documentación técnica y de despliegue

Plataforma de transporte con negociación de tarifas. Inicia en Colombia (Bello y Medellín).

## 1. Piezas del sistema

| Pieza | Qué es | Dónde vive |
|---|---|---|
| **Base de datos y seguridad** | PostgreSQL con reglas de acceso (RLS), autenticación, almacenamiento privado y tiempo real | Supabase, proyecto `cerquita` (región us-east-1) |
| **Web pasajero/conductor** (`index.html`) | Versión de apoyo en navegador | GitHub Pages |
| **Panel de administración** (`admin.html`) | Control de la operación | GitHub Pages |
| **App del celular** (carpeta `cerquita-movil`) | App nativa Android (Expo / React Native) | Se compila a APK con EAS |

Direcciones publicadas:
- Web: `https://yersonmorenodiaz7-cmyk.github.io/cerquita-transporte/`
- Administración: `https://yersonmorenodiaz7-cmyk.github.io/cerquita-transporte/admin.html`

## 2. Cómo funciona un viaje

1. El pasajero indica recogida y destino, elige categoría y **propone su precio**. El servidor calcula la tarifa de referencia y rechaza ofertas fuera del rango permitido.
2. Los conductores **conectados, aprobados y de esa categoría** reciben la solicitud en tiempo real. Pueden aceptar, contraofertar o rechazar (una oferta por conductor, con un máximo de ofertas por viaje).
3. El pasajero compara ofertas y **elige una**. Las demás se cierran.
4. Conductor y pasajero comparten el estado: *en camino → llegó → en viaje → finalizado*. Hay chat mientras el viaje está activo y botón de emergencia (SOS).
5. Al finalizar se califican mutuamente. Se registra el pago con su comisión.
6. Si nadie acepta en 10 minutos, la solicitud **expira sola**.

## 3. Roles y permisos

| Rol | Puede |
|---|---|
| **pasajero** | Pedir viajes, elegir ofertas, chatear, calificar, reclamar, usar códigos de descuento |
| **conductor** (cuenta aprobada) | Conectarse, ofertar, avanzar el viaje, ver sus ganancias, subir documentos |
| **operador** | Consultar viajes, pagos, usuarios, reclamaciones y alertas |
| **supervisor** | Lo anterior + aprobar conductores y documentos, activar planes, enviar notificaciones |
| **administrador** | Todo: tarifas, comisión, categorías, zonas, promociones, roles, suspensiones, auditoría |

Las reglas se aplican **en la base de datos** (no solo en la pantalla): aunque alguien modifique la app, no puede saltarse los permisos.

## 4. Modelo de negocio (se cambia desde el panel, sin tocar código)

**El pasajero le paga directamente al conductor** (efectivo o transferencia). CERQUITA no recibe el dinero del viaje: gana así:

1. **El conductor recarga su saldo** en la app (Wompi: tarjeta, PSE o Nequi) o por un medio manual que el personal acredita en el panel.
2. **Sin saldo no hay viajes:** necesita un saldo mínimo para conectarse (hoy $5.000) y saldo suficiente para cubrir la comisión de cada viaje que ofrece.
3. **Al finalizar cada carrera, la app descuenta la comisión del saldo** (hoy 10 % de la tarifa acordada). Si el saldo cae por debajo del mínimo, el conductor se desconecta y se le avisa que recargue.
4. **Todo movimiento queda registrado** (recargas, comisiones, ajustes) y se consulta en el panel, en **Billeteras**.

Otras piezas, configurables desde el panel:
- **Planes para conductores (opcional):** permiten una comisión menor a quienes los activen.
- **Promociones:** códigos de descuento para pasajeros. El pasajero paga menos al conductor y **CERQUITA le devuelve ese descuento al conductor en su saldo**, así el conductor gana lo mismo.
- **Tarifas por categoría** (base, multiplicador y valor por km) y **zonas de cobertura**: Bello, Medellín e Itagüí.

## 5. Tablas principales

`profiles`, `drivers`, `vehicles`, `driver_documents`, `driver_locations`, `rides`, `offers`, `payments`, `ratings`, `messages`, `notifications`, `broadcasts`, `claims`, `sos_alerts`, `trusted_contacts`, `plans`, `driver_subscriptions`, `promotions`, `promo_redemptions`, `settings`, `service_categories`, `zones`, `audit_log`.

Las acciones críticas son funciones seguras de la base de datos: `accept_offer`, `advance_ride`, `cancel_ride`, `check_promo`, `send_broadcast`.

## 6. Seguridad

- Autenticación con correo y contraseña (Supabase Auth). Todos inician como **pasajero**; solo un administrador cambia roles.
- RLS activo en todas las tablas. Cada usuario ve solo lo suyo; el personal ve según su rol.
- Documentos de conductores en almacenamiento **privado**: cada uno solo accede a su carpeta; el personal los abre con enlaces temporales.
- Auditoría de aprobaciones, suspensiones, cambios de rol y de configuración.
- La llave pública (`anon`) puede estar en la app y la web; **la llave `service_role` jamás**.
- La llave de Google Maps no se sube a GitHub: va solo en el `app.json` de tu computador, y conviene restringirla a tu app en Google Cloud.

## 7. Puesta en marcha

### Web y panel
1. Sube `index.html`, `admin.html` y este archivo a un repositorio de GitHub.
2. En **Settings → Pages**, elige la rama `main` y `/ (root)`.
3. En Supabase → **Authentication → URL Configuration**, pon la dirección publicada como *Site URL*.

### Primer administrador
1. Crea una cuenta en la web o en la app.
2. En Supabase → SQL Editor: `update public.profiles set role = 'admin' where email = 'TU_CORREO';`
3. Cierra sesión y vuelve a entrar.

### App del celular (APK)
1. Instala Node.js (LTS).
2. En la carpeta `cerquita-movil`: pon tu llave de Google Maps en `app.json`, y ejecuta `npm install` y `npx expo install --fix`.
3. Ejecuta `eas build --profile preview --platform android` y descarga el APK con el código QR.

### Operar el día a día
- **Aprobar conductores:** panel → Conductores → revisar documentos → Aprobar.
- **Cambiar tarifas o comisión:** panel → Tarifas y zonas.
- **Atender emergencias:** panel → Alertas SOS (ver ubicación en Google Maps → Marcar atendida).
- **Respaldo:** Supabase hace copias automáticas según el plan; considera activar copias diarias antes de operar con usuarios reales.

## 8. Pendiente antes de operar con público

- **Wompi en producción:** hoy las recargas funcionan con las claves de pruebas; para dinero real se cambian por las de producción.
- **Verificación de identidad** (documento + selfie) y verificación del teléfono por SMS.
- **Notificaciones push** con el teléfono apagado (Firebase Cloud Messaging); hoy llegan con la app abierta.
- **Llamadas protegidas** (número enmascarado).
- **Detección de zonas de cobertura** al pedir un viaje (las zonas ya existen en la base de datos).
- **Cumplimiento legal:** requisitos del servicio de transporte en Colombia (habilitación, seguros, tipo de vehículos), políticas de privacidad y tratamiento de datos (Ley 1581 de 2012), y términos y condiciones. Una aplicación no reemplaza las autorizaciones legales para prestar el servicio.
- **Activar contraseñas filtradas** en Supabase (Authentication → Passwords), si tu plan lo permite.
- **Publicación en tiendas:** Play Store y App Store requieren cuentas de desarrollador y la llave de Google Maps de producción.
