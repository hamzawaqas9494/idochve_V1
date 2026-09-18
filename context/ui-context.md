# UI Context

## Theme

Controlled, technical, calm, accountable, institutional, sovereign. Dark navy heroes and light paper body sections. Architecture and product evidence instead of decorative AI. Generous whitespace. One strong message per section.

## Colors

All components must use these tokens. No raw hex in components.

| Role | CSS Variable | Value |
| --- | --- | --- |
| Midnight navy | `--navy-950` | `#071225` |
| Deep navy | `--navy-900` | `#0B1F3A` |
| Royal blue | `--blue-600` | `#1457FF` |
| Intelligence teal | `--teal-600` | `#0F9AA8` |
| Governance violet | `--violet-600` | `#6D4AFF` |
| Page ground | `--paper-50` | `#F6F8FC` |
| Surface | `--white` | `#FFFFFF` |
| Border | `--border` | `#DCE3EE` |
| Ink | `--ink` | `#0B1730` |
| Muted | `--muted` | `#56647A` |
| Danger | `--danger` | `#D64545` |
| Success | `--success` | `#168A65` |
| Paper stage | `--paper-warm` | `#C4B8A5` |

## Typography

| Role | Font | Variable |
| --- | --- | --- |
| English UI | Geist, Inter fallback | `--font-sans` |
| Arabic UI | IBM Plex Sans Arabic | `--font-ar` |
| Audit / IDs | Geist Mono, IBM Plex Mono | `--font-mono` |

Arabic line-height 1.75. Do not tighten Arabic tracking.

## Border Radius

| Context | Token |
| --- | --- |
| Buttons / inputs | `0.5rem` |
| Cards | `0.75rem` |
| Modals / mockups | `1rem` |
| Pills | `999px` |

## Component Library

Custom accessible primitives. No generic startup card grids. No glassmorphism stacks. No robot or glowing-brain imagery.

## Layout Patterns

- Header: transparent over dark hero, compact solid after scroll
- Page: max width 72rem, generous vertical rhythm
- Diagrams: interactive layers on desktop, stacked cards on small screens
- Forms: labels above fields
- RTL: logical properties (`ps`/`pe`, `start`/`end`)

## Icons

Functional stroke icons only. Inline 16–20px. Never decorative illustration as the primary explanation.
