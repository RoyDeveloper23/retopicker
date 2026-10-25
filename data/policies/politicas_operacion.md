# Políticas de operación y soporte (ficticio)

Versión 3.2 · Última edición: 2026-09-30 · Dueña: Operaciones LATAM

## 1. Tiempos de respuesta
Todo el soporte entra por el chat del panel de Picker.
- Clientes finales: primera respuesta en menos de 5 minutos.
- Comercios: primera respuesta en menos de 10 minutos.
- Comercios con prioridad **Alta** (ver hoja Comercios) se atienden primero.

## 2. Pedido sin asignar
- Si un pedido lleva más de 10 minutos en SEARCHING, avisar al comercio.
- Si todos los proveedores rechazaron (PNF), ofrecer al comercio reintentar o despachar con flota propia.
- Antes de reintentar, revisar el motivo del rechazo: si fue por distancia o por límite de efectivo, reintentar con el mismo proveedor va a fallar igual.

## 3. Repartidor detenido o retrasado
- Si un repartidor asignado no se mueve por más de **10 minutos**, reasignar el pedido de inmediato a otro proveedor.
- Si el pedido va en camino y el ETA ya pasó, escribirle al cliente con la ubicación del repartidor y un nuevo tiempo estimado.

## 4. Compensaciones
- Si el pedido llega más de **20 minutos tarde** respecto al SLA del comercio, se reembolsa el **100%** del costo de envío al comercio.
- Las penalidades de cada contrato están en la hoja Comercios.
- Pedidos cancelados por el proveedor después de asignados: no se cobra el envío al comercio.

## 5. Cancelaciones y reembolsos
- Picker no procesa reembolsos al cliente final: el pago lo cobra el comercio. Soporte deriva al comercio y le avisa al cliente cuándo esperar respuesta.
- Si el pedido era en efectivo, no hay nada que reembolsar.

## 6. Farmacias
- Pedidos con medicamentos no se reasignan sin avisar antes a la sucursal (registro de quién recoge).
- Pedidos con cadena de frío (insulina, vacunas): máximo 45 minutos desde que se recoge.

## 7. Fuera de alcance de soporte
- Compras adicionales, cambios de productos o facturación del pedido: derivar al comercio.
- Pagos a repartidores de flota propia: derivar a Finanzas (pagos los martes).

## Anexo A. Tabla de compensaciones (actualizada 2026-08-01)

| Retraso sobre el SLA | Compensación al comercio |
|---|---|
| 0 a 15 min | Ninguna |
| 15 a 30 min | 50% del costo de envío |
| Más de 30 min | 100% del costo de envío |
