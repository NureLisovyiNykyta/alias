# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0] - 2026-04-30

### Added
- Implemented a multi-step **Sign Up** flow (`SignUpFlow.jsx`) using a Stateful Wizard pattern with a reusable `AuthLayout` wrapper for progress tracking.
- Added dedicated UI components for registration stages: `EmailStep`, `UsernameStep`, and `PasswordStep`, featuring independent `react-hook-form` and `zod` validation.
- Integrated `@tanstack/react-query` to handle API requests (`/auth/check-email`, `/auth/check-username`, `/auth/register`) as separate mutations for each registration step.

## [0.5.1] - 2026-04-30

### Added
- Integrated `react-hook-form` and `zod` for robust client-side form validation on the **Sign In** page.
- Implemented dynamic error handling within the reusable `Input` component, visually indicating validation failures (red borders and error text).
- Added submitting state management to the login form, disabling the submit button during API calls to prevent duplicate requests.
- Resolved an issue with the "Show Password" toggle functionality in the `Input` component by correctly managing the DOM input type via local component state.
- Applied CSS workarounds to neutralize native browser autofill background colors, maintaining design consistency across Chromium-based browsers.

## [0.5.0] - 2026-04-30

### Added
- Implemented the **Sign In** UI page (`SignIn.jsx`) featuring a stylized two-column layout with a branded visual panel, email/password input fields, and a Google SSO placeholder.
- Added the **Profile Settings** modal (`ProfileSettings.jsx`) accessible directly from the global application Header.
- Integrated `@headlessui/react` to handle the Profile Settings dropdown, utilizing the `Popover` and `Transition` components for accessible, animated opening/closing behaviors and proper routing interception.

## [0.4.0] - 2026-04-22

### Added
- **[Major Feature] Packs Gallery:** Implemented a new main "Packs Gallery" page displaying all available categories of packs in one place.
- **[Major Feature] Category Lists:** Added dedicated pages for viewing comprehensive, filtered lists of packs based on their specific type.
- Implemented global **automatic scroll-to-top** behavior on route changes using a dedicated `ScrollToTop` utility component to improve UX during page transitions.
- Integrated `useLocation` hook from `react-router-dom` to dynamically detect navigation events and reset window scroll position.

### Changed
- Refactored the `RowNavigation` component using a more concise declarative syntax (ternary operators and object destructuring) for better code readability and maintainability.
- Optimized overall Single Page Application (SPA) navigation flow to ensure smooth transitions between the Main, Profile, and the new Gallery pages.

## [0.3.0] - 2026-04-22

### Added
- Implemented the **Profile** page (`Profile.jsx`) featuring account details, game statistics, and user settings.
- Created a reusable and "dumb" `Input` component to handle various text and password entries across the application.
- Integrated profile-specific UI elements:
  - Profile picture container with a custom upload action overlay.
  - User statistics dashboard (join date, games finished, and account credentials).
  - Quick action buttons for profile link sharing and account deletion.
- Added new graphical assets for the profile interface (`darkMail.svg`, `gamepad.svg`, `darkCopy.svg`, `redCross.svg`, etc.).

### Changed
- Refactored input logic by abstracting it into a standalone functional component to improve reusability and maintain consistency with Figma designs.
- Enhanced `Profile` layout with breadcrumb navigation for better user experience.

## [0.2.1] - 2026-04-21

### Added
- Implemented a new `MAPS` data collection and integrated horizontal UI cards within the `InfoCards` component.
- Created interactive "Map" preview cards featuring title, dimensions, and dynamic links to source card-packs.
- Added decorative badges (pills) for map dimensions using `bg-brand-300` and `font-noto`.

### Changed
- Refined typography in `InfoCards.jsx` to support data mapping from arrays, improving scalability for community content.
- Updated text decoration styles for internal links: applied `underline`, `decoration-solid`, and `decoration-skip-ink` to match Figma specifications.
- Optimized layout spacing in `InfoCards`, transitioning from a single-column list to a structured grid/flex distribution for different content types (Card Packs vs. Maps).

## [0.2.0] - 2026-04-21

### Added
- Created a standalone `CodeInput` component for game code entry and registration flow.
- Implemented a `DiscordLink` component to promote community engagement.
- Added "Copy to Clipboard" functionality for the Discord invitation link.
- Integrated the new semantic UI blocks into the primary landing page layout.

### Changed
- Refactored `Landing.jsx` by decomposing the large page structure into smaller, reusable functional components.
- Improved code maintainability by isolating business logic (e.g., input handling and clipboard API) from the main page view.
- Updated the grid layout in `MainLayout` to ensure consistent spacing between new UI sections.

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