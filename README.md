# CERQUITA

Plataforma de transporte con negociación de tarifas. Una sola página (`index.html`) conectada a Supabase: pasajero, conductor y administración.

## Qué incluye
- Registro e inicio de sesión (Supabase Auth, correo y contraseña).
- **Pasajero:** solicita un viaje, propone su precio, compara ofertas en tiempo real, acepta, sigue el viaje, califica y usa el botón de emergencia.
- **Conductor:** se registra con su vehículo, sube documentos (almacenamiento privado), se conecta, recibe solicitudes de su categoría, acepta o contraoferta, y avanza el viaje (llegada, inicio, fin).
- **Administración:** aprueba o suspende conductores, consulta documentos, viajes e ingresos, atiende alertas SOS y cambia comisión, tarifa base y límites de oferta.
- Reglas de negocio y seguridad en la base de datos (RLS y validaciones), no solo en la interfaz.

## Configuración
En `index.html`, arriba del script, están `SUPABASE_URL` y `SUPABASE_KEY` (llave pública *anon*). Es seguro publicarla; la protección real son las políticas RLS. **Nunca** pongas la llave `service_role` en este archivo.

## Primer administrador
1. Abre la app y crea tu cuenta.
2. En Supabase → SQL Editor ejecuta (con tu correo):
   ```sql
   update public.profiles set role = 'admin' where email = 'TU_CORREO';
   ```
3. Cierra sesión y vuelve a entrar: aparece la pestaña **Administración**.

## Despliegue
Es un sitio estático. Opciones gratuitas:
- **GitHub Pages:** Settings → Pages → Deploy from a branch → `main` / root.
- **Vercel o Netlify:** importa el repositorio, sin comando de build.

Después, en Supabase → Authentication → URL Configuration, agrega la dirección publicada como *Site URL*.

## Pendiente para producción
- Confirmación de correo o verificación por teléfono (SMS) en Supabase Auth.
- Mapa real (Mapbox o Google Maps) y búsqueda de direcciones; hoy el mapa es esquemático con 8 puntos de Bello y Medellín.
- Pasarela de pagos (Wompi): los pagos en efectivo se registran; transferencias y billeteras quedan como pendientes hasta integrar la pasarela.
- Chat, llamadas protegidas, notificaciones push y contactos de confianza (las tablas ya existen).
- Cumplimiento: requisitos legales del servicio de transporte en Colombia y tratamiento de datos personales (políticas de privacidad).
