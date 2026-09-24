---
name: Academic Equivalence Institutional
colors:
  surface: '#f9f9ff'
  surface-dim: '#d1daf4'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8ff'
  surface-container-highest: '#d9e2fc'
  on-surface: '#121b2e'
  on-surface-variant: '#434655'
  inverse-surface: '#273044'
  inverse-on-surface: '#edf0ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006a63'
  on-secondary: '#ffffff'
  secondary-container: '#99efe5'
  on-secondary-container: '#006f67'
  tertiary: '#355683'
  on-tertiary: '#ffffff'
  tertiary-container: '#4e6e9d'
  on-tertiary-container: '#eaf0ff'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#9cf2e8'
  secondary-fixed-dim: '#80d5cb'
  on-secondary-fixed: '#00201d'
  on-secondary-fixed-variant: '#00504a'
  tertiary-fixed: '#d5e3ff'
  tertiary-fixed-dim: '#a8c8fc'
  on-tertiary-fixed: '#001c3b'
  on-tertiary-fixed-variant: '#264774'
  background: '#f9f9ff'
  on-background: '#121b2e'
  surface-variant: '#d9e2fc'
typography:
  display-lg:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-xl:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  code-tabular:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '500'
    lineHeight: 18px
    letterSpacing: 0.02em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  margin: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system serves a high-stakes academic administration environment: the evaluation, tracking, and resolution of university course equivalencies and credit transfers. The visual atmosphere is institutional, dependable, and rigorously organized, designed to eliminate cognitive fatigue for administrative staff, faculty evaluators, and students navigating complex legal-academic workflows.

### Brand Personality & Emotional Tone
- **Authoritative & Trustworthy:** Anchored in classical academic governance, projecting stability, compliance, and procedural rigor without feeling archaic.
- **Calm & High-Clarity:** Prioritizes structured density, effortless readability of legal texts and course syllabi, and unambiguous status tracking.
- **Accessible & Dignified:** Eliminates distracting visual trends, harsh saturations, and unnecessary motion in favor of high-contrast typography, predictable hit zones, and purposeful feedback states.

### Design Movement: Modern Institutional Rationalism
The interface blends contemporary enterprise SaaS layout patterns with institutional European editorial restraint:
- **Zero Decorative Noise:** Strictly no heavy glassmorphism, aggressive gradient overlays, or fluorescent neon accents.
- **Surface Layering:** Pure white modular panels rest over a cool, resting canvas `#F5F7FA`, separated by delicate hairline dividers `#DCE3EC`.
- **Informational Hierarchy:** Relies on typographic weight, tabular numerical alignment, and subtle functional tinting rather than heavy elevation.

## Colors

The color palette reinforces the dual nature of the application: a formal institutional authority balanced with an active, accessible web application.

### Functional Palette Structure
- **Institutional Primary (`#173B67`):** Used for persistent structural navigation, top-level institutional headers, formal document headers, and permanent branding marks.
- **Interactive Action (`#2563EB`):** Dedicated exclusively to actionable triggers, active tab states, primary links, focus indicators, and workflow progression buttons.
- **Interactive Soft Selection (`#EAF2FF`):** Used for table row highlights, selected card containers, active dropdown options, and subtle focus halos.
- **Secondary Academic Accents (`#0F766E`):** Represents verified syllabus comparisons, program matching scores, and faculty department markers.
- **Canvas Base (`#F5F7FA`):** A cool, low-fatigue slate grey background setting off card surfaces.
- **Card & Surface (`#FFFFFF`):** High-clarity focal surfaces for applications, forms, and data tables.
- **Text Primary (`#172033`):** High-contrast deep slate ensuring WCAG AAA legibility for legal descriptions and course data.
- **Text Secondary (`#64748B`):** Calibrated for secondary metadata, timestamps, input placeholders, and column labels.
- **Structural Borders (`#DCE3EC`):** Architectural boundary color used for card borders, form field boundaries, and table grid lines.

### Status Semantic System
State badges use high-contrast dark foreground typography over soft tinted backgrounds to maintain instant scanability without visual dominance:
- **Approved / Ready:** Text `#15803D` | Background `#DCFCE7` | Border `#86EFAC`
- **Under Review / Caution:** Text `#B45309` | Background `#FEF3C7` | Border `#FDE68A`
- **Rejected / Error:** Text `#B91C1C` | Background `#FEE2E2` | Border `#FECACA`
- **Information / Submitted:** Text `#0369A1` | Background `#E0F2FE` | Border `#BAE6FD`
- **Draft / Inactive / Canceled:** Text `#475569` | Background `#F1F5F9` | Border `#E2E8F0`

## Typography

The typography is built entirely on **Inter** to ensure maximum typographic economy, structural clarity, and high screen legibility across dense data displays.

### Typographic Principles & OpenType Features
- **Tabular Numerals (`font-feature-settings: 'tnum' 1, 'cv05' 1`):** Required on all course codes (e.g., `MAT-201`), credit unit values, validation percentages, dates, and application identification numbers (`#SOL-2024-0891`).
- **Disambiguation (`'cv05' 1, 'zero' 1`):** Enabled to clearly distinguish zero (`0`) from uppercase `O`, and uppercase `I` from lowercase `l`.
- **Rhythm & Proportions:** Paragraph text maintains comfortable 140–150% line-height to facilitate skimming detailed syllabi comparisons and evaluator remarks.

## Layout & Spacing

The layout is built around a predictable, responsive 12-column grid system configured to manage data-dense institutional records and side-by-side course equivalence views.

### Screen Adaptations & Grid
- **Desktop (>= 1280px):** Fixed or max-width 1440px canvas. 12 columns with 24px (`1.5rem`) gutters and 32px (`2rem`) page margins. Permits dual-column comparison panels (Origin Subject vs. Target Subject) with an inspector sidebar.
- **Tablet (768px - 1279px):** Fluid 8-column layout with 20px gutters and 24px margins. Sidebars collapse into dismissible slide-overs or stacked sections.
- **Mobile (< 768px):** 4-column layout with 16px gutters and 16px margins. Side-by-side subject comparators stack vertically with segmented navigation toggles.

### Layout Rhythm
- `space-xs` (4px): Micro gaps between icons and labels, badge internal vertical padding.
- `space-sm` (8px): Stack gap between form labels and inputs, list item separation.
- `space-md` (16px): Standard form field spacing, card internal padding, button inline padding.
- `space-lg` (24px): Gap between distinct card sections, table module margins.
- `space-xl` (32px): Separation between major workflow steps and master grid sections.

## Elevation & Depth

To maintain an uncluttered and trustworthy institutional aesthetic, this design system avoids heavy, atmospheric shadows and fuzzy layering. Instead, visual planes are established using **crisp structural borders (`#DCE3EC`)** combined with **subtle, ultra-diffused resting shadows**.

### Elevation Scale
1. **Level 0 (Base Canvas):** Background `#F5F7FA`. Zero elevation, non-interactive floor.
2. **Level 1 (Cards, Modules, Data Grids):** Surface `#FFFFFF`, border `1px solid #DCE3EC`, shadow `0 1px 3px 0 rgba(23, 32, 51, 0.04), 0 1px 2px -1px rgba(23, 32, 51, 0.02)`.
3. **Level 2 (Hover States, Floating Action Panels, Pinned Headers):** Surface `#FFFFFF`, border `1px solid #DCE3EC`, shadow `0 4px 6px -1px rgba(23, 32, 51, 0.07), 0 2px 4px -2px rgba(23, 32, 51, 0.04)`.
4. **Level 3 (Modals, Dropdown Menus, Popover Annotations):** Surface `#FFFFFF`, border `1px solid #DCE3EC`, shadow `0 12px 24px -4px rgba(23, 32, 51, 0.10), 0 4px 8px -2px rgba(23, 32, 51, 0.05)`.

### Backdrop Overlays
- Modal Backdrops use `rgba(23, 59, 103, 0.45)` (Institutional Blue tint) with a soft `backdrop-filter: blur(2px)` to maintain context while focusing user attention on legal declarations or file uploads.

## Shapes

The geometric personality balances professional sobriety with modern friendliness. A disciplined intermediate border-radius curve avoids both the rigidity of raw rectangles and the playfulness of circular pill treatments.

### Corner Radius Tokens
- **Base Components (`rounded-md`, 10px / 0.625rem):** Used for standard input fields, select menus, buttons, action chips, and nested sub-panels.
- **Structural Cards (`rounded-lg`, 12px / 0.75rem):** Standard radius for dashboard widgets, summary panels, and data comparison containers.
- **Large Panels & Modals (`rounded-xl`, 16px / 1rem):** Master workflow modals, demonstration banners, and file dropzones.
- **Badges & Tags (6px):** Compact micro-radius that preserves a crisp, tabular shape without rounding off critical badge real estate.

## Components

### 1. Buttons
- **Primary Action:** Solid `#2563EB` background with `#FFFFFF` text. Height: 40px (md), 36px (sm). Border radius: 10px. Hover: `#1D4ED8`. Active: `#1E40AF`. Focus: 2px offset ring with `#2563EB`.
- **Secondary / Outline:** Background `#FFFFFF`, 1px solid border `#DCE3EC`, text `#172033`. Hover: `#F8FAFC` background with border `#CBD5E1`.
- **Institutional Tertiary:** Background `#173B67` with `#FFFFFF` text for permanent actions (e.g., "Emitir Resolución Oficial").
- **Ghost:** Transparent background, text `#475569`. Hover: `#F1F5F9` background, text `#172033`.

### 2. Status Badges & Chips
- Formed with 11px or 12px semi-bold text, 6px border radius, 4px vertical by 10px horizontal padding.
- Built-in 6px circular indicator dot aligned to the left of the text for accessibility.
- **Status Variants:**
  - *Borrador:* Text `#475569`, Background `#F1F5F9`, Border `#E2E8F0`.
  - *Enviada:* Text `#0369A1`, Background `#E0F2FE`, Border `#BAE6FD`.
  - *En revisión:* Text `#B45309`, Background `#FEF3C7`, Border `#FDE68A`.
  - *Aprobada:* Text `#15803D`, Background `#DCFCE7`, Border `#86EFAC`.
  - *Rechazada:* Text `#B91C1C`, Background `#FEE2E2`, Border `#FECACA`.
  - *Requiere ajustes:* Text `#B45309`, Background `#FFFBEB`, Border `#FCD34D`, with warning icon.
  - *Cancelada:* Text `#475569`, Background `#F8FAFC`, Border `#CBD5E1`.

### 3. Demonstration Mode Banner (Modo Demostración)
- Compact, non-intrusive full-width ribbon or card header.
- Background: `#FEF3C7` (amber tint). Border: `1px solid #FCD34D`. Text: `#92400E`.
- Displays a `LucideFlaskConical` or `LucideInfo` icon (16px), concise text ("Modo Demostración: Los cambios realizados no afectarán el expediente oficial"), and an inline action link ("Restablecer datos"). Height: 36px to 44px.

### 4. Input Fields & Selects
- Height: 40px. Padding: 0 12px.
- Background `#FFFFFF`, 1px solid border `#DCE3EC`, text `#172033`, placeholder `#94A3B8`.
- Focus state: Border transitions to `#2563EB` with a `0 0 0 3px #EAF2FF` soft halo ring.
- Error state: Border `#B91C1C` with `0 0 0 3px #FEE2E2` halo ring.

### 5. Checkboxes & Radio Buttons
- 18px x 18px dimensions. Border `1.5px solid #CBD5E1`, background `#FFFFFF`, border-radius 4px (checkbox) or 50% (radio).
- Checked: `#2563EB` fill with white checkmark icon.

### 6. Cards & Subject Comparison Matrix
- Main container: `#FFFFFF` background, 1px solid `#DCE3EC`, 12px border-radius, `space-lg` (24px) internal padding.
- Equivalence Comparator: Splits into two side-by-side modules (Origin University Syllabus vs. Target University Course). Selected or matched units display an active outline with `#EAF2FF` background accents and a teal `#0F766E` compatibility score chip.

### 7. Iconography
- Strict adoption of 1.75px stroke-width Lucide icons (`size=18px` for buttons and data points, `size=20px` for section headers).
- Icons inherit the text color of their parent state to prevent visual fragmentation.