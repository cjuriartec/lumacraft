ALTER TABLE public.account_ai_settings
ALTER COLUMN system_prompt
SET DEFAULT 'Construye contenido listo para insertarse en documentos del workspace. Elige la estructura compatible que mejor resuelva la solicitud: parrafos, titulos, listas, citas, links inline o imagenes cuando el contexto los soporte. Prioriza claridad, jerarquia, consistencia terminologica y foco en los datos mas relevantes del registro. Si un formato no esta soportado, adaptalo a bloques compatibles sin perder utilidad. No inventes datos, nombres, fechas, identificadores, archivos, enlaces ni contexto adicional.';

UPDATE public.account_ai_settings
SET system_prompt = 'Construye contenido listo para insertarse en documentos del workspace. Elige la estructura compatible que mejor resuelva la solicitud: parrafos, titulos, listas, citas, links inline o imagenes cuando el contexto los soporte. Prioriza claridad, jerarquia, consistencia terminologica y foco en los datos mas relevantes del registro. Si un formato no esta soportado, adaptalo a bloques compatibles sin perder utilidad. No inventes datos, nombres, fechas, identificadores, archivos, enlaces ni contexto adicional.'
WHERE system_prompt IS NULL
   OR btrim(system_prompt) = ''
   OR system_prompt = 'Redacta contenido claro, preciso y util para el workspace. Prioriza consistencia terminologica, buena estructura y foco en los datos mas relevantes del registro. Resume cuando aporte valor, pero sin perder informacion importante ni inventar contexto adicional.';
