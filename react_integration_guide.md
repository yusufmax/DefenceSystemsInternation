# React, Tailwind, TypeScript & shadcn Integration Guide

This guide describes how to integrate the customized **GlobePulse** component into your React codebase.

---

## 🚀 1. Setup & Project Initialization

If your codebase is not yet configured for **React + TypeScript + Tailwind CSS + shadcn**, follow these steps to set up the environment.

### Step 1: Create a React Project (e.g. Next.js or Vite)
To create a new **Next.js** project with TypeScript and Tailwind:
```bash
npx create-next-app@latest my-app --typescript --tailwind --eslint
cd my-app
```
Or for **Vite** (React + TS):
```bash
npx create-vite@latest my-app --template react-ts
cd my-app
# Follow standard setup to install Tailwind CSS
```

### Step 2: Initialize shadcn UI via CLI
Run the shadcn initialization command in your project root:
```bash
npx shadcn@latest init
```
During initialization, select:
- **Style**: Default or New York
- **Base color**: Slate or Zinc
- **CSS variables**: Yes
- **Alias configuration**: `@/*` (which sets the import path to match your root folder structure).

---

## 📁 2. Default Paths & Directory Importance

### Component Path: `/components/ui/`
In a shadcn project, the CLI defaults to installing atomic UI primitives (e.g., buttons, inputs, dialogs) into **`components/ui/`**.
- проект components should go to `/components/` or `/components/sections/` for layout/page-specific structures.
- **Why `/components/ui/` is critical**: 
  1. **CLI Automation**: The shadcn CLI relies on the `/components/ui/` folder mapping to add/update components without interfering with your main project pages.
  2. **Modular Architecture**: Keeping reusable base primitives separate from business logic components ensures clean dependencies.

---

## 📦 3. Installing Dependencies

The **GlobePulse** component requires the lightweight Canvas WebGL library `cobe`. Install it by running:
```bash
npm install cobe
```

---

## 🎨 4. How the Uzbekistan Globe is Designed

The customized component located in [cobe-globe-pulse.tsx](file:///Users/yusufmax/Desktop/dfi/components/ui/cobe-globe-pulse.tsx) has been upgraded with the following:

1. **Precision Coordinate Grid**:
   A mapped grid of 30+ coordinates covers the geometric territory of Uzbekistan (from Karakalpakstan in the west to the Fergana Valley in the east).
2. **Uzbekistan Flag Colorizer**:
   Points are automatically colored based on latitude bands:
   - **Azure Blue**: `lat > 42.8`
   - **Red Border**: `42.5 < lat <= 42.8`
   - **White**: `40.3 < lat <= 42.5`
   - **Red Border**: `40.0 < lat <= 40.3`
   - **Green**: `lat <= 40.0`
3. **Uzbekistan Focus**:
   Centered directly at `lat 41.3775, lon 64.5853` using projected Y-axis rotation (`phi`) and X-axis rotation (`theta`).
4. **Cross-Browser 2D Projection**:
   We built a custom 3D-to-2D matrix projection inside the `onRender` callback:
   - Evaluates unit-sphere coordinates $x, y, z$.
   - Rotates values dynamically on click/drag by `phi` and `theta`.
   - Checks if points are on the front hemisphere ($z > 0.05$) to automatically toggle opacity.
   - Sets CSS custom properties `--cobe-x` and `--cobe-y` directly on the container.
   - **This removes dependencies on experimental CSS Anchor Positioning**, ensuring it renders flawlessly on Safari, Firefox, Chrome, and mobile devices!
