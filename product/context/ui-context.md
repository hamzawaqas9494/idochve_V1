# Product UI Context

Match the marketing-site visual system so product chrome looks like the mockups already shown on idochive.com. This is an application workspace, not a marketing landing page.

## Theme

Controlled, technical, calm, accountable, institutional, sovereign. Light paper workspace, navy navigation, teal for processing, violet for review and inference, red only for blocked access.

## Colors

Use tokens. No raw hex in components.

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
| Attention amber | `--amber` | `#C47B17` |

## Typography

| Role | Font | Variable |
| --- | --- | --- |
| English UI | Inter, Geist fallback | `--font-sans` |
| Arabic UI | IBM Plex Sans Arabic | `--font-ar` |
| Audit / IDs | IBM Plex Mono | `--font-mono` |

Arabic line-height 1.75. Do not tighten Arabic tracking.

## Status language

Never convey state by color alone. Pair color with a label:

- `pending_review`
- `approved`
- `rejected`
- `changes_requested`
- `access denied`
- `insufficient evidence`

## Layout patterns

Primary product navigation (from `idochive.md` Section 35):

1. Home
2. Documents
3. Search
4. Intelligence (Release 2+)
5. Workflows
6. Tasks
7. Reports
8. Audit
9. Administration

- App shell: navy side or top nav, paper content, metadata panel
- Document viewer beside metadata and citations
- Forms: labels above fields
- Dialogs: focus trap, Escape to close, `aria-modal`

## Icons

Functional stroke icons only (lucide-react). No robots, glowing brains, or decorative AI illustration.

## Components

Product UI uses shadcn/ui in `product/ui` only. Map shadcn theme variables to the tokens above. No raw hex in components. Do not copy marketing `src/` or Ghost AI patterns.
