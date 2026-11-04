-- Reparte la historia en los últimos días para que el panel muestre actividad real.
UPDATE correspondencia SET fecha_registro = fecha_registro - interval '6 days' WHERE correspondencia_referencia LIKE 'Instructivo para el inventario%';
UPDATE correspondencia SET fecha_registro = fecha_registro - interval '3 days' WHERE correspondencia_referencia LIKE 'Informe de conectividad%';
UPDATE correspondencia SET fecha_registro = fecha_registro - interval '2 days' WHERE correspondencia_referencia LIKE 'Requerimiento de cuentas%';
UPDATE correspondencia SET fecha_registro = fecha_registro - interval '1 days' WHERE correspondencia_referencia LIKE 'Solicitud de soporte%';
UPDATE correspondencia SET fecha_registro = fecha_registro - interval '5 days' WHERE correspondencia_referencia LIKE 'Cronograma de mantenimiento%';
UPDATE correspondencia SET fecha_registro = fecha_registro - interval '2 days' WHERE correspondencia_referencia LIKE 'Actualización de credenciales%';
UPDATE detalle_correspondencia d SET
  detalle_fecha_llegada = c.fecha_registro + interval '20 minutes',
  detalle_fecha_recepcion = CASE WHEN d.detalle_fecha_recepcion IS NULL THEN NULL ELSE c.fecha_registro + interval '2 hours' END,
  detalle_fecha_atendido = CASE WHEN d.detalle_fecha_atendido IS NULL THEN NULL ELSE c.fecha_registro + interval '1 day' END
FROM correspondencia c WHERE c.correspondencia_id = d.correspondencia_id
  AND c.correspondencia_referencia NOT LIKE 'Solicitud de mantenimiento%';
UPDATE notificaciones n SET created_at = c.fecha_registro + interval '20 minutes'
FROM correspondencia c WHERE n.data->>'correspondenciaId' = c.correspondencia_id::text
  AND c.correspondencia_referencia NOT LIKE 'Solicitud de mantenimiento%';
-- El documento lleva fecha del día anterior a su registro (no puede ser posterior).
UPDATE correspondencia SET correspondencia_fecha_doc = (fecha_registro - interval '1 day')::date
WHERE fecha_registro < now() - interval '12 hours';
