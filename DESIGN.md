## web application/stitch/projects/6397571726793844136/screens/79ce584c527b409388f63e1a78d16b10

name: Obsidian Violet
description: A cinematic, high-contrast dark theme designed for media exploration and playback. Built around deep obsidian surfaces and vibrant electric violet accents.

# Visual Identity

## Color Palette

The palette is designed for "Theater Mode" consumption, where UI elements recede to let content lead.

### Surfaces

- **Surface (Primary)**: `#101417` — The core canvas for all screens.
- **Surface Dim**: `#0b0f11` — Used for deep background layers and containers.
- **Surface Bright**: `#363a3d` — Used for subtle borders and secondary containers.
- **Surface Container**: `#191c1f` — Elevated elements like sidebars or settings cards.

### Brand & Accents

- **Primary (Electric Violet)**: `#8B5CF6` — The main brand color, used for active states, CTAs, and hover borders.
- **On-Primary**: `#FFFFFF` — High-contrast text on primary backgrounds.
- **Primary Fixed Dim**: `#A78BFA` — Softer variant for secondary brand highlights.

### Typography

- **Primary Font**: Inter (Sans-serif)
- **Hierarchy**:
  - **Headline Large**: 32px / Bold / Tracking: -0.02em (Page titles)
  - **Headline Medium**: 24px / Semi-bold (Section headers)
  - **Label Small**: 12px / Medium / Tracking: 0.05em / Uppercase (System labels, metadata)
  - **Body Large**: 16px / Regular (Primary descriptions)

# Component Patterns

## Media Explorer Grid (Mosaic)

- **Structure**: Gapless grid (`gap-0`) of video tiles.
- **Interactions**:
  - **Hover State**: `transform: scale(1.05)`, `z-index: 10`, `border: 2px solid #8B5CF6`.
  - **Function**: Hover triggers silent video preview; Click opens Player.

## Theater Player

- **Layout**: Full-screen video focus.
- **Navigation**:
  - **Edge Zones**: Invisible 15% width zones on left/right for Prev/Next.
  - **Visual Cue**: Subtle `<` and `>` arrows appear only on zone hover.
- **Controls**: Auto-hiding playback bar at the bottom.

## Empty State

- **Composition**: Centered illustrative icon with a clear "Configure Library Route" primary CTA.
- **Purpose**: Onboarding users into the folder selection flow.

# Layout System

- **Sidebar**: Persistent left-side navigation with 64px width (collapsed) or 256px (expanded).
- **Transitions**: 300ms ease-in-out for all hover and scale effects to maintain a "cinematic" feel.

---
