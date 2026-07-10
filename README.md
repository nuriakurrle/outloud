# Вголос! (Outloud!) — Generative Poster & Merch Designer

A generative design toolkit for the social project **Вголос! (Outloud!)**. It creates event posters and merch in the project's chalk-drawing style, strictly in black and white.

**Live demo:** https://nuriakurrle.github.io/outloud/

## Features

- **Poster Maker** — generative chalk posters: layouts, chalk patterns (lines, wavy, grid), text with chalk fonts, logos and illustrations, free-hand drawing with chalk brushes, undo/redo, and PNG export (flat or layered).
- **Interactive** — turn a webcam shot or an uploaded photo into a chalk stencil using on-device body segmentation (MediaPipe), then refine it with drawing tools.
- **Merch** — put your design on products: a T-shirt canvas and a 3D cap viewer (three.js) with the artwork applied as a decal.
- **Trilingual UI** — German, English and Ukrainian.

## Tech stack

- React 18 + React Router (hash routing)
- Vite + Tailwind CSS
- three.js via @react-three/fiber and @react-three/drei (3D cap)
- MediaPipe Selfie Segmentation (interactive stencils)
- svg-brush (chalk stroke rendering)

## Getting started

```bash
npm install
npm run dev
```

Then open the URL Vite prints (default http://localhost:5173).

To create a production build in `dist/`:

```bash
npm run build
```

## Deployment

Every push to `main` is built and deployed to GitHub Pages automatically via GitHub Actions ([.github/workflows/deploy.yml](.github/workflows/deploy.yml)). The Vite `base` is set to `/outloud/`.

## Project structure

```
src/
  pages/            Home, Interactive, Merch
  components/
    ChalkPosterGenerator/   poster maker (canvas, panels, toolbar)
    DesignerBase/           shared designer state, drag & drawing hooks
    MerchDesigner/          T-shirt canvas + 3D cap viewer
  lib/              chalk engine, stencilizer, segmentation, export, ...
  i18n.tsx          DE / EN / UK translations
```

## Design principles

The visual palette is intentionally minimal: **#FFFFFF white and #000000 black only**, matching the chalk-on-wall aesthetic of the Outloud! campaign.

## Authors

- Nuria Kurrle
- Oleksii Rak

Created for the Generative Design course (4th semester, Hochschule München).

## Attributions

See [ATTRIBUTIONS.md](ATTRIBUTIONS.md). The initial layout was bootstrapped from a [Figma design](https://www.figma.com/design/yCPHVySoflvQ33SAZjSgao/Poster-Layout-Customization-Website).
