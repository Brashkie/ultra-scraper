# Contribuir a Ultra Scraper

¡Gracias por tu interés en contribuir a Ultra Scraper! 🎉

## 📋 Tabla de Contenidos

- [Código de Conducta](#código-de-conducta)
- [¿Cómo puedo contribuir?](#cómo-puedo-contribuir)
- [Proceso de desarrollo](#proceso-de-desarrollo)
- [Guías de estilo](#guías-de-estilo)
- [Proceso de Pull Request](#proceso-de-pull-request)

## Código de Conducta

Este proyecto se adhiere a un código de conducta. Al participar, se espera que mantengas este código. Por favor, reporta comportamientos inaceptables.

## ¿Cómo puedo contribuir?

### Reportar Bugs

Si encuentras un bug, por favor crea un issue con la siguiente información:

- Descripción clara del problema
- Pasos para reproducir
- Comportamiento esperado vs. actual
- Versión de Node.js y del paquete
- Screenshots si aplica

### Sugerir Mejoras

Las sugerencias de mejoras son bienvenidas. Por favor:

- Describe claramente la mejora
- Explica por qué sería útil
- Proporciona ejemplos de uso si es posible

### Tu Primera Contribución de Código

¿No estás seguro por dónde empezar? Busca issues etiquetados como:

- `good first issue` - problemas sencillos para comenzar
- `help wanted` - problemas donde necesitamos ayuda

## Proceso de Desarrollo

### 1. Fork y Clone

```bash
# Fork el repositorio en GitHub
# Luego clona tu fork
git clone https://github.com/tu-usuario/ultra-scraper.git
cd ultra-scraper
```

### 2. Instalar Dependencias

```bash
npm install
```

### 3. Crear una Rama

```bash
git checkout -b feature/mi-nueva-caracteristica
# o
git checkout -b fix/mi-bug-fix
```

### 4. Desarrollar

Realiza tus cambios siguiendo las guías de estilo.

### 5. Ejecutar Tests

```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests en modo watch
npm run test:watch

# Verificar cobertura
npm run test:coverage
```

### 6. Verificar Linting

```bash
# Verificar código
npm run lint

# Corregir automáticamente
npm run lint:fix
```

### 7. Compilar

```bash
npm run build
```

### 8. Commit

Usa mensajes de commit descriptivos siguiendo este formato:

```
tipo: descripción breve

Descripción más detallada si es necesario.

Fixes #123
```

Tipos de commit:
- `feat`: Nueva característica
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Formateo, sin cambios en código
- `refactor`: Refactorización de código
- `test`: Agregar o modificar tests
- `chore`: Mantenimiento, dependencias, etc.

Ejemplo:
```bash
git commit -m "feat: añadir soporte para cookies en scraper"
```

### 9. Push

```bash
git push origin feature/mi-nueva-caracteristica
```

### 10. Pull Request

Abre un Pull Request en GitHub con:

- Título descriptivo
- Descripción de los cambios
- Referencias a issues relacionados
- Screenshots si aplica

## Guías de Estilo

### TypeScript

- Usa TypeScript para todo el código nuevo
- Define tipos explícitos cuando sea necesario
- Evita `any` siempre que sea posible
- Usa interfaces para objetos complejos

### Código

```typescript
// ✅ Bueno
interface UserData {
  name: string;
  age: number;
}

function getUserData(id: string): Promise<UserData> {
  // ...
}

// ❌ Malo
function getUserData(id: any): any {
  // ...
}
```

### Nombres

- Usa camelCase para variables y funciones
- Usa PascalCase para clases e interfaces
- Usa UPPER_SNAKE_CASE para constantes
- Nombres descriptivos y claros

```typescript
// ✅ Bueno
const userAge = 25;
const MAX_RETRIES = 3;

class HttpClient {
  private requestTimeout: number;
}

// ❌ Malo
const ua = 25;
const max = 3;

class httpclient {
  private t: number;
}
```

### Comentarios

- Usa JSDoc para funciones públicas
- Comenta código complejo
- No comentes lo obvio

```typescript
/**
 * Obtiene el contenido de una URL
 * @param url - URL a scrapear
 * @param options - Opciones de configuración
 * @returns Promise con la respuesta del scraper
 */
async get(url: string, options?: ScraperOptions): Promise<ScraperResponse> {
  // ...
}
```

### Tests

- Cada función pública debe tener tests
- Usa nombres descriptivos para los tests
- Agrupa tests relacionados con `describe`
- Un test por concepto

```typescript
describe('HttpClient', () => {
  describe('fetch', () => {
    it('should fetch a webpage successfully', async () => {
      // ...
    });

    it('should handle errors gracefully', async () => {
      // ...
    });
  });
});
```

## Proceso de Pull Request

1. **Asegúrate de que los tests pasen**: `npm test`
2. **Actualiza la documentación** si es necesario
3. **Agrega tests** para nuevas funcionalidades
4. **Mantén commits limpios**: considera hacer squash si es necesario
5. **Espera la revisión**: responde a los comentarios constructivamente
6. **Mantén la conversación respetuosa** y profesional

## Estructura del Proyecto

```
ultra-scraper/
├── src/                  # Código fuente
│   ├── core/            # Clases principales
│   ├── plugins/         # Plugins
│   ├── types/           # Definiciones de tipos
│   ├── utils/           # Utilidades
│   └── index.ts         # Punto de entrada
├── tests/               # Tests
├── examples/            # Ejemplos de uso
├── docs/                # Documentación adicional
└── dist/                # Código compilado (gitignored)
```

## Recursos

- [Documentación de TypeScript](https://www.typescriptlang.org/docs/)
- [Guía de Jest](https://jestjs.io/docs/getting-started)
- [Convenciones de Commit](https://www.conventionalcommits.org/)

## Preguntas

Si tienes preguntas, puedes:

1. Abrir un issue con la etiqueta `question`
2. Revisar issues existentes
3. Consultar la documentación

¡Gracias por contribuir! 🚀
