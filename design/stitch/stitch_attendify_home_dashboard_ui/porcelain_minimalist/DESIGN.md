---
name: Porcelain Minimalist
colors:
  surface: '#f9f9ff'
  surface-dim: '#d3daef'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f1f3ff'
  surface-container: '#e9edff'
  surface-container-high: '#e1e8fd'
  surface-container-highest: '#dce2f7'
  on-surface: '#141b2b'
  on-surface-variant: '#464555'
  inverse-surface: '#293040'
  inverse-on-surface: '#edf0ff'
  outline: '#777587'
  outline-variant: '#c7c4d8'
  surface-tint: '#4d44e3'
  primary: '#3525cd'
  on-primary: '#ffffff'
  primary-container: '#4f46e5'
  on-primary-container: '#dad7ff'
  inverse-primary: '#c3c0ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#684000'
  on-tertiary: '#ffffff'
  tertiary-container: '#885500'
  on-tertiary-container: '#ffd4a4'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e2dfff'
  primary-fixed-dim: '#c3c0ff'
  on-primary-fixed: '#0f0069'
  on-primary-fixed-variant: '#3323cc'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#f9f9ff'
  on-background: '#141b2b'
  surface-variant: '#dce2f7'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 44px
    letterSpacing: -0.03em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 34px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0em
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.03em
  metric-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  gutter-desktop: 1.5rem
  margin: 1.25rem
  margin-tablet: 2rem
  margin-desktop: 3rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style
The design system embodies an Apple-grade, high-craft utility aesthetic tailored for high-frequency tracking, modern presence monitoring, and operational clarity. It merges the calm precision of modern iOS Human Interface Guidelines with a soft tactile layer.

### Core Tenets
- **Calm Authority**: Eliminates noise through deep charcoal typography, expansive warm-porcelain negative space, and disciplined color restraint.
- **Atmospheric Clarity**: High-elevation pure white surfaces float cleanly over an off-white canvas without harsh separators or structural clutter.
- **Intentional Density**: Visual hierarchy leads with micro-metrics, smooth radial gauges, and refined progress bars rather than loud decorative elements.
- **Tactile Softness**: Generous radii (24px–28px) and pill-shaped touch surfaces evoke hardware-like, tangible interactions.

## Colors
The palette is rooted in an ultra-clean, low-glare surface structure accented with focused data-driven hues.

### Primary Accent
- `primary` (`#4F46E5`): Reserved strictly for primary callouts, active tab indicators, high-leverage interactive controls, and completed progress sectors. Never used for decorative fills or large-area backgrounds.

### Functional Status System
- **Safe** (`#10B981`): Muted sage emerald indicating attendance compliance, healthy ratios, and positive validation.
- **Warning** (`#F59E0B`): Warm amber for pending thresholds, borderline attendance, and actionable notices.
- **Critical** (`#EF4444`): Crisp coral red for unexcused absences, critical threshold breaches, and urgent alerts.

### Canvas & Surface Structure
- **Canvas Base**: `#F5F5F7` (Apple porcelain soft neutral off-white).
- **Surface (Elevated Cards & Sheets)**: `#FFFFFF` (Pure white).
- **Surface Subtle / Well**: `#EEF0F3` (Inset controls, progress track backgrounds, segmented picker troughs).
- **Dividers & Inactive Outlines**: `rgba(17, 24, 39, 0.06)` (Subtle hairline strokes).

### Typography Grays
- **Primary Text**: `#111827` (Deep charcoal, offering softer contrast than pure black).
- **Secondary Text**: `#6B7280` (Balanced neutral slate for captions, metadata, and labels).
- **Muted / Tertiary Text**: `#9CA3AF` (De-emphasized timestamps and inactive iconography).

## Typography
Plus Jakarta Sans is utilized for its structural proximity to Apple's native SF Pro system: clear aperture geometries, tight default tracking at display scales, and legible small-scale numerals.

### Typographic Rules
- **Numerical Hierarchy**: Metric callouts (`metric-xl`, `headline-lg`) must use tabular figures or proportional spacing with negative tracking to avoid loose rhythm.
- **Section Headers**: Uppercase micro-labels (`label-sm`) with `0.03em` tracking are applied above cards or section groupings to establish clear categorization.
- **Contrast Pairing**: Primary metrics (`#111827`) must sit beside or above secondary labels (`#6B7280`) without intermediate gray steps to prevent visual mud.

## Layout & Spacing
The layout relies on a content-centric fluid column system paired with generous iOS-inspired whitespace margins.

### Breakpoints & Layout Logic
- **Mobile (<640px)**: 1-column fluid stacking, `margin: 1.25rem` (20px), `gutter: 1rem`. Cards span edge-to-edge within the layout margin. Bottom dock float margin is strictly preserved at `1.25rem` from the screen base.
- **Tablet (641px–1024px)**: 6 or 8-column layout, `margin-tablet: 2rem` (32px), `gutter: 1.25rem`. Dashboard cards shift into balanced 2-column metric grids.
- **Desktop (>1024px)**: 12-column layout, max content width capped at `1120px` to maintain focused scanability. Outer canvas auto-centers.

### Spacing Philosophy
Internal card padding is fixed to `1.5rem` (24px) for dashboard widgets. Groupings within cards use `space-sm` (8px) and `space-md` (16px), ensuring compact information hierarchy without feeling compressed.

## Elevation & Depth
Depth relies on ambient diffusion rather than harsh direct drop-shadows, creating cards that feel resting directly on top of the soft `#F5F5F7` porcelain surface.

### Elevation Hierarchy
- **Level 0 (Canvas)**: `#F5F5F7` background. Completely flat.
- **Level 1 (Dashboard Cards & Containers)**: `#FFFFFF` background. Shadow: `0px 8px 24px -4px rgba(17, 24, 39, 0.04), 0px 2px 6px -1px rgba(17, 24, 39, 0.02)`. Micro hairline border: `1px solid rgba(17, 24, 39, 0.03)` for crisp separation against near-identical surfaces.
- **Level 2 (Dropdowns, Floating Overlays, Modals)**: `#FFFFFF` background. Shadow: `0px 16px 36px -6px rgba(17, 24, 39, 0.08), 0px 4px 12px -2px rgba(17, 24, 39, 0.03)`.
- **Level 3 (Floating Capsule Navigation Dock)**: Blended surface (`rgba(255, 255, 255, 0.88)` with `backdrop-filter: blur(20px)`). Shadow: `0px 20px 40px -8px rgba(17, 24, 39, 0.12), 0px 4px 12px rgba(17, 24, 39, 0.04)`. Border: `1px solid rgba(255, 255, 255, 0.7)`.

## Shapes
Geometry emphasizes ultra-smooth, continuous curves with a prominent radius range that mirrors modern hardware display corners.

### Component-Specific Corner Radii
- **Dashboard Containers & Large Cards**: `24px` to `28px` (translates to `1.5rem`–`1.75rem`).
- **Internal Metric Blocks & Inset Panels**: `16px` (`1rem`).
- **Buttons, Status Pills, and Badges**: Fully rounded continuous pills (`9999px`).
- **Floating Bottom Capsule Dock**: `9999px` (Strict pill geometry).
- **Circular Indicators & Icon Badges**: `50%` roundness.

## Components

### 1. Dashboard Cards
- **Structure**: Pure white `#FFFFFF`, `24px`–`28px` border radius, padding `24px`.
- **Borders**: 1px subtle hairline `rgba(17, 24, 39, 0.04)`.
- **Header**: Flex layout with metric title (`headline-sm`), uppercase metadata pill, or subtle icon trigger.

### 2. Floating Capsule Bottom Navigation Dock
- **Container**: Floating centered pill pinned above safe area (`bottom: 24px`), height `64px`, padding `6px 8px`.
- **Material**: Translucent frosted white `rgba(255, 255, 255, 0.9)` with 20px backdrop blur.
- **Active Tab**: Pill container (`background: #4F46E5`, text/icon: `#FFFFFF`, smooth spring animation, horizontal padding `16px`).
- **Inactive Tabs**: Circular icon buttons (`48px x 48px`), background transparent, icon color `#6B7280`, subtle tap states (`background: rgba(17, 24, 39, 0.04)`).

### 3. Metric Gauges & Progress Indicators
- **Gauges**: Circular radial meters with a track color of `#EEF0F3` (stroke width `8px`–`10px`, rounded cap). Active progress utilizes `#4F46E5` for overall completion, transitioning to `#10B981` upon reaching target benchmarks.
- **Linear Progress**: Height `8px`, track `#EEF0F3`, rounded `9999px`. Active fill `#4F46E5`.

### 4. Status Badges & Chips
- **Geometry**: Compact pill (`height: 24px`–`28px`, padding `0 10px`, typography `label-sm`).
- **Safe**: Background `rgba(16, 185, 129, 0.12)`, text `#047857`.
- **Warning**: Background `rgba(245, 158, 11, 0.12)`, text `#B45309`.
- **Critical**: Background `rgba(239, 68, 68, 0.12)`, text `#B91C1C`.
- **Neutral / Informational**: Background `#EEF0F3`, text `#4B5563`.

### 5. Buttons
- **Primary**: Background `#4F46E5`, text `#FFFFFF`, radius `9999px`, height `48px`, font `label-lg`. Tap scale feedback: `0.98`.
- **Secondary / Soft**: Background `#FFFFFF`, border `1px solid rgba(17, 24, 39, 0.08)`, text `#111827`, height `48px`, radius `9999px`.
- **Icon Only**: Height and width `44px`, circle `50%`, background `#FFFFFF` with Level 1 elevation.

### 6. Lists & Log Items
- **Items**: Row height `56px`–`64px`, vertical divider replaced with pure spacing and subtle `#EEF0F3` inset splitters (margin-left `64px` to align with text rather than avatar/icon).
- **Interactions**: Tap highlight uses gentle wash `rgba(17, 24, 39, 0.03)` with `16px` rounded selection boundaries.