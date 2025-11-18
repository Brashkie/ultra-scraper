# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2025-01-18

### Agregado
- Sistema de scraping universal para HTTP/HTTPS
- Soporte para contenido estático (axios + cheerio)
- Soporte para contenido dinámico (Playwright)
- Sistema de plugins extensible
- Plugin de rotación de proxys
- Plugin de User-Agent aleatorio
- Plugin de rate limiting
- Sistema de eventos (beforeRequest, afterRequest, error)
- Extracción estructurada de datos con esquemas
- Sistema de reintentos automáticos
- Manejo robusto de errores
- TypeScript support completo
- Suite completa de tests con Jest
- Documentación completa
- Ejemplos de uso

### Características principales
- API simple e intuitiva
- Parsers de alto rendimiento
- Auto-reintentos con backoff exponencial
- Headers y proxys personalizables
- Extracción con selectores CSS
- Transformación de datos
- Timeout configurable
- Logger integrado

## [Unreleased]

### Planeado
- Soporte para WebSockets
- Cache inteligente de respuestas
- Soporte para CAPTCHA solving
- CLI para scraping desde terminal
- Dashboard de monitoreo
- Integración con bases de datos
- Más plugins (cookies, sessions, auth)
- Soporte para scraping paralelo
- Métricas y estadísticas
- Modo offline con replay

---

[1.0.0]: https://github.com/Brashkie/ultra-scraper/releases/tag/v1.0.0
