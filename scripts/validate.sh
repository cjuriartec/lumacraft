#!/bin/bash

# Este script ejecuta todas las validaciones necesarias para asegurar que el proyecto esté en buen estado.
# Se detendrá inmediatamente si alguna de las validaciones falla.

# Colores para la salida
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Iniciando validación completa de Lumacraft...${NC}\n"

# 1. Linting
echo -e "${BLUE}🔍 [1/4] Ejecutando lint:fix...${NC}"
if npm run lint:fix; then
  echo -e "${GREEN}✅ Linting completado correctamente.${NC}\n"
else
  echo -e "${RED}❌ Error en el linting.${NC}"
  exit 1
fi

# 2. Type Checking
echo -e "${BLUE}⌨️ [2/4] Verificando tipos (TypeScript)...${NC}"
if npx tsc --noEmit; then
  echo -e "${GREEN}✅ Verificación de tipos exitosa.${NC}\n"
else
  echo -e "${RED}❌ Errores de TypeScript encontrados.${NC}"
  exit 1
fi

# 3. Tests
echo -e "${BLUE}🧪 [3/4] Ejecutando todos los tests (Unitarios, Componentes, Integración, Smoke, E2E)...${NC}"
# Nota: Algunos tests pueden requerir que Supabase esté corriendo localmente.
if npm run test:all; then
  echo -e "${GREEN}✅ Todos los tests pasaron correctamente.${NC}\n"
else
  echo -e "${RED}❌ Algunos tests fallaron.${NC}"
  exit 1
fi

# 4. Build
echo -e "${BLUE}🏗️ [4/4] Verificando build de producción...${NC}"
if npm run build; then
  echo -e "${GREEN}✅ Build generado correctamente.${NC}\n"
else
  echo -e "${RED}❌ El build falló.${NC}"
  exit 1
fi

echo -e "${GREEN}✨ ¡Felicidades! Todos los procesos de validación han pasado con éxito. ✨${NC}"
