# Picker Copilot 🤖
### Asistente de IA para soporte y operaciones de delivery

🔗 **Demo:** [Ver proyecto en producción](https://retopicker.vercel.app/)  
💻 **Código fuente:** [Repositorio en GitHub](https://github.com/RoyDeveloper23/retopicker)

## ¿Qué problema elegí resolver?

En las operaciones de delivery, atender una consulta puede requerir revisar distintas fuentes: pedidos, eventos, intentos de asignación, tracking y políticas operativas. Esto dificulta identificar rápidamente qué ocurrió, por qué falló una entrega y cuál debería ser el siguiente paso.

Desarrollé **Picker Copilot**, un prototipo que utiliza IA generativa para facilitar las consultas operativas, reunir contexto relevante y ayudar a identificar incidencias desde una sola interfaz.

La idea central es utilizar la IA no solo para responder preguntas, sino para convertir datos dispersos en información útil para el equipo de soporte.

## ¿Qué encontré en los datos?

Trabajé con conjuntos de datos ficticios de pedidos, trazabilidad, asignaciones, comercios, conversaciones, registros de API e históricos operativos.

- **Incidencias que requieren seguimiento:** de los 30 pedidos de la muestra actual, 5 estaban en estado `FAILED` y 2 en `SEARCHING`. Estos casos pueden requerir investigar la causa del fallo o dar seguimiento a la asignación de un repartidor.
- **El estado no siempre explica el problema:** los eventos y registros de tracking permiten reconstruir mejor lo ocurrido y aportar contexto a una consulta de soporte.
- **Las reglas operativas también necesitan validación:** encontré una contradicción entre dos secciones de las políticas de compensación por retrasos. Esto evidencia que la IA debe apoyarse en reglas claras y señalar inconsistencias, en lugar de asumir qué política es correcta.
- **La calidad de los datos condiciona la respuesta:** relacionar correctamente los identificadores de distintas fuentes es fundamental para evitar conclusiones incorrectas.

## ¿Qué construí?

- **Asistente conversacional con Gemini:** permite consultar información operativa en lenguaje natural.
- **Acceso controlado a los datos:** el asistente utiliza funciones específicas del servidor para consultar pedidos, tracking y otras fuentes disponibles.
- **Dashboard operativo:** presenta indicadores y facilita identificar situaciones que requieren atención.
- **Historial de conversaciones:** permite retomar consultas anteriores en el mismo navegador.
- **Vista dividida:** permite consultar el dashboard mientras se interactúa con el asistente.

## ¿Qué haría con una semana más?

1. **Evaluar la precisión de las respuestas:** crear casos de prueba representativos de consultas de soporte y medir si el asistente responde correctamente con la información disponible.
2. **Mejorar la gestión de incidencias:** priorizar casos según su urgencia y las políticas operativas, explicando qué información respalda cada recomendación.
3. **Fortalecer las fuentes de conocimiento:** resolver contradicciones en las políticas y validar la consistencia de los datos antes de utilizarlos en respuestas.
4. **Validar con usuarios:** probar el asistente con escenarios reales de soporte, recoger retroalimentación y medir si reduce el tiempo de investigación de un caso.
5. **Incorporar memoria contextual al asistente:** desarrollar un mecanismo que le permita recordar información relevante de conversaciones anteriores y utilizarla en futuras consultas, manteniendo la continuidad del soporte, evitando preguntas repetitivas y ofreciendo respuestas cada vez más contextualizadas.

## Tecnologías

Next.js · TypeScript · React · Tailwind CSS · Google Gemini API · Vercel

## Alcance del proyecto

Picker Copilot es un prototipo experimental construido con datos ficticios. Su objetivo es demostrar cómo la IA puede apoyar la investigación de incidencias y el acceso a información operativa. No está conectado a sistemas reales de delivery ni sustituye el criterio del equipo de soporte.

---

