# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.1] - 2026-04-20

### Added
- Configured path aliases (using `@` for `src` directory) to simplify imports and avoid relative path nesting.
- Integrated `react-router-dom` for application navigation.
- Implemented `ProtectedRoute` component to handle authentication-based redirects.
- Established public and private route structures to secure unauthorized access.
- Integrated **Zen Antique** font specifically for the project logo.
- Defined `text-logo` utility with 48px size and -5% letter spacing as per Figma
- Added a `Header` component with logo.
- Added a `Footer` component with copyright information.
- Added left side navigation bar with icons and labels.

## [0.1.0] - 2026-04-20

### Added
- Initialized the frontend core using React and Vite.
- Integrated and configured Tailwind CSS v4 with the official Vite plugin.
- Established a global Design System:
  - Configured color tokens (Brand, Decorative, Surface, Text).
  - Implemented typography system (Inter for UI, Noto Sans for content).
  - Defined semantic text styles (Title, Headline-1, Headline-2, Paragraph, Label).
- Created a reusable `Button` UI component supporting multiple variants:
  - **Primary**: Brand-colored main action button.
  - **Secondary**: Light-tinted alternative action button.
  - **Tertiary**: Bordered button with custom shadows and states (Hover, Active, Disabled).
- Added core graphical assets and icon placeholders.