ALTER TABLE public.account_ai_settings
ALTER COLUMN system_prompt
SET DEFAULT 'Redacta contenido claro, preciso y util para el workspace. Prioriza consistencia terminologica, buena estructura y foco en los datos mas relevantes del registro. Resume cuando aporte valor, pero sin perder informacion importante ni inventar contexto adicional.';

UPDATE public.account_ai_settings
SET system_prompt = 'Redacta contenido claro, preciso y util para el workspace. Prioriza consistencia terminologica, buena estructura y foco en los datos mas relevantes del registro. Resume cuando aporte valor, pero sin perder informacion importante ni inventar contexto adicional.'
WHERE system_prompt IS NULL
   OR btrim(system_prompt) = '';
