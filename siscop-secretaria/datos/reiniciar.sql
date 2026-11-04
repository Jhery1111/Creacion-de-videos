-- Vacía los datos de movimiento del SISCOP LOCAL del video (no toca catálogos ni organigrama).
TRUNCATE correspondencia, notificaciones, contador_codigo, sesion_usuario, token_revocado,
         configuracion_unidad, solicitud_adscripcion, historial_dependencia RESTART IDENTITY CASCADE;
DELETE FROM estructura WHERE estructura_nombre = 'DIVISION DE CAPACITACION TECNOLOGICA';
