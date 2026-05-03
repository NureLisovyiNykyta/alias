# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.8.0] - 2026-05-03

### Added
- **Creation & Editing Pages UI**: Implemented the layout and interface for the core game entity creation and management flows.
- **New Pages**:
  - `CardPackCreator.jsx` (and `TaskCreator.jsx`): UI page for creating and configuring new card-packs, including naming, availability, and image upload.
  - `MapCreatorPage.jsx`: UI page for creating new maps, integrating map template selection and draft saving capabilities.
  - `EditMapValuesPage.jsx`: UI page for editing existing map metadata and configurations with integrated breadcrumb navigation.
- **New Components**:
  - `MapTemplateSelector.jsx`: A composite, reusable component that combines a `DropDown` with a dynamic visual map preview area to select map layouts.
  - `StatusLabel.jsx`: A standardized label component to display the current state/status of an entity (e.g., "Draft").

### Changed
- Integrated existing UI elements (`RowNavigation`, `TransparentInput`, `ImageInput`, `Switch`, `TextArea`) into complex page layouts to form cohesive entity creation forms.

## [0.7.1] - 2026-05-03

### Added
- **UI Expansion & Refactoring**: Implemented a suite of new specialized input components to avoid "God Object" complexity in the core `Input` component and prepare for the card-pack creation UI.
- **New Components**:
  - `TransparentInput.jsx`: A minimalist, underlined input field designed for secondary forms and entity naming (e.g., card-pack titles).
  - `TextArea.jsx`: A fixed-size (636x144px) multi-line text input with custom scroll styling and disabled resizing to maintain layout integrity.
  - `ImageInput.jsx`: A stylized file upload component that masks native browser inputs, featuring dynamic filename display and specific image format constraints (`.png`, `.jpg`, `.jpeg`).
  - `Switch.jsx`: A high-fidelity toggle component with "pill" background animations using `framer-motion` and `layoutId` for smooth transitions between states.
  - `DropDown.jsx`: A fully accessible, animated select component built with `@headlessui/react`, supporting custom icons, search-like styling, and `framer-motion` transitions.
- **Animation System**: Integrated `framer-motion` for spring-based UI transitions, specifically for the new `Switch` and `DropDown` components.

### Changed
- Improved component architecture by separating form-style inputs (Auth) from content-creation inputs (Gallery/Editor), ensuring better maintainability and cleaner CSS via Tailwind.

## [0.7.0] - 2026-05-03

### Added
- Implemented a multi-step **Forgot Password** flow (`ForgotPassword.jsx`) encompassing email request, new password creation, and verification code submission.
- Created `ResetPasswordStep.jsx` to handle the specific logic and UI for entering and confirming a new password during the recovery process.
- Updated `EmailStep` and `VerificationStep` components with `customSubmit` and `isExternalPending` props to support reusability across both Sign Up and Forgot Password flows.
- Added API integration for `/auth/forgot-password` and `/auth/reset-password` endpoints.

### Changed
- Refactored `SignIn.jsx` to use the official `<GoogleLogin>` component from `@react-oauth/google` to properly retrieve a JWT `id_token` (credential) as required by the backend, replacing the custom button implementation.

### Fixed
- Resolved a race condition in `App.jsx` causing premature redirects by introducing an `isCheckingAuth` state to temporarily suspend routing decisions while user data is being fetched.
- Ensured a stable and fully functional Google OAuth authentication process.

## [0.6.2] - 2026-05-01

### Added
- Integrated `@react-oauth/google` for seamless Google Single Sign-On (SSO) authentication.
- Implemented `GoogleSignUpFlow` (`GoogleSignUp.jsx`) to handle registration for new users authenticating via Google, bypassing email verification steps.
- Created `GooglePasswordStep` component to specifically handle password creation and final registration submission using the Google token.
- Configured API hooks (`useGoogleLoginMutation`, `useGoogleRegisterMutation`) to communicate with the respective backend Google authentication endpoints.

## [0.6.1] - 2026-05-01

### Added
- Implemented **Step 4 (Email Verification)** in the Sign Up flow (`VerificationStep.jsx`) to handle 6-digit OTP codes.
- Added visual success indicators (green borders and specific success messages) for all input fields across the Sign Up wizard upon valid `react-hook-form` validation.
- Displayed real user data (email, username) dynamically in the `Profile` and `ProfileSettings` components using the updated `AuthContext`.

### Changed
- Refactored `AuthContext` to use a cookie-based `isAuthenticated` state (`refreshToken`), eliminating UI blocking while waiting for `/users/me` requests.
- Updated the `SignIn` page to utilize `react-query` (`useLoginMutation`) and URL-encoded form data submissions as required by the backend API.
- Integrated programmatic token storage (`setTokens`) into the Sign In and Sign Up (Step 3) processes to maintain session persistence.

## [0.6.0] - 2026-04-30

### Added
- Implemented a multi-step **Sign Up** flow (`SignUp.jsx`) using a Stateful Wizard pattern with a reusable `AuthLayout` wrapper for progress tracking.
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
- Created a standalone `VerificationCodeInput` component for game code entry and registration flow.
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