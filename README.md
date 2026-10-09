# N’Orla — Donde la vida anida

![Portada de N’Orla](docs/cover.webp)

**Demo:** https://diegoextremiana.github.io/Norla/

Web de presentación de **N’Orla**, una herramienta manual para la recogida selectiva de residuos en entornos costeros sensibles. El producto nace como Trabajo de Fin de Grado de diseño a partir de la problemática observada en las playas de anidación de tortugas de Cabo Verde; esta web lo cuenta como un recorrido narrativo guiado por el scroll.

## El proyecto

N’Orla combina dos sistemas en una misma herramienta:

- **Cribar:** recoge y separa los residuos de la superficie de la arena sin alterar el sustrato.
- **Filtrar:** retiene los residuos de la superficie del agua usando lana como material natural.

Está pensada para voluntarios, ONG y comunidades locales que trabajan donde la maquinaria no es adecuada, y sigue una lógica de economía circular: el plástico recogido se transforma en nuevos componentes de la propia herramienta.

## La web

Una sola página dividida en paneles que se apilan al hacer scroll:

| Sección | Qué muestra |
| --- | --- |
| Portada | Logotipo, claim y render del producto, que se separan al bajar |
| 01 La orilla | Fotografía a sangre y una frase que se ilumina palabra a palabra |
| 02 Herramienta | Despiece animado de la herramienta y sus dos modos, cribar y filtrar |
| 03 Diseñada para no invadir | Por qué una herramienta manual frente a la limpieza mecanizada |
| 04 Del residuo al recurso | Diagrama circular playa → residuo → recogida → transformación → N’Orla |
| 05 Materiales | Plástico recuperado y lana, con texturas generadas con filtros SVG |
| 06 Para quién | Voluntarios, ONG, equipos de limpieza y comunidades locales |
| 07 El origen | Cabo Verde, la pregunta del proyecto y la identidad visual (huella dactilar con forma de tortuga) |

## Tecnología

HTML, CSS y JavaScript nativos, sin frameworks, dependencias ni paso de build.

- **Módulos ES** organizados en `js/core` (utilidades) y `js/modules` (una escena por sección).
- **Un único bucle `requestAnimationFrame`** que solo corre mientras hay scroll o alguna animación activa.
- **Geometría calculada a partir del scroll**, sin leer `getBoundingClientRect` en cada frame, y escrituras al DOM solo cuando un valor cambia.
- **Muelles críticamente amortiguados** que suavizan el progreso del scroll y se pueden interrumpir.
- **Paneles `sticky` con efecto de pila:** el panel inferior retrocede mientras el siguiente sube.
- **SVG generado por código** para los anillos de la huella, dibujados con `stroke-dashoffset`.
- **Accesibilidad:** respeta `prefers-reduced-motion`, textos alternativos en las imágenes y navegación por anclas corregida para paneles fijos.
- **Rendimiento:** imágenes WebP, carga diferida y precarga de la imagen principal.

```
├── index.html
├── css/
│   ├── base.css, layout.css, components.css
│   └── sections/        estilos de cada sección
├── js/
│   ├── main.js          punto de entrada
│   ├── core/            bucle, layout, matemáticas, muelles
│   └── modules/         una escena por sección
└── assets/img/          imágenes optimizadas de la web
```

## Ejecutar en local

No necesita instalación. Al usar módulos ES hay que servirla por HTTP (abrir `index.html` directamente no funciona):

```bash
npx serve .
# o
python -m http.server
```

## Créditos

- **Idea y proyecto (TFG):** Diana Extremiana
- **Desarrollo web:** Diego Extremiana
- **Fotografías de campo:** Cabo Verde Natura 2000
