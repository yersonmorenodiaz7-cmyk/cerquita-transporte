// Agrega, sin tocar tu app.json, la configuración de segundo plano y de notificaciones push.
const fs = require('fs');

module.exports = ({ config }) => {
  const plugins = (config.plugins || []).filter(p => (Array.isArray(p) ? p[0] : p) !== 'expo-location');
  plugins.push(['expo-location', {
    isAndroidBackgroundLocationEnabled: true,
    isAndroidForegroundServiceEnabled: true,
    locationAlwaysAndWhenInUsePermission: 'CERQUITA usa tu ubicación para recibir solicitudes cercanas, incluso con la app minimizada.',
    locationWhenInUsePermission: 'CERQUITA usa tu ubicación para conectar pasajeros y conductores cercanos.',
  }]);
  const android = { ...(config.android || {}) };
  android.permissions = Array.from(new Set([...(android.permissions || []),
    'ACCESS_FINE_LOCATION', 'ACCESS_COARSE_LOCATION', 'ACCESS_BACKGROUND_LOCATION',
    'FOREGROUND_SERVICE', 'FOREGROUND_SERVICE_LOCATION', 'POST_NOTIFICATIONS', 'VIBRATE']));
  // Se activa solo cuando agregas el archivo google-services.json (Firebase)
  if (fs.existsSync('./google-services.json')) android.googleServicesFile = './google-services.json';
  return { ...config, plugins, android };
};
