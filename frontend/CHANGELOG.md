# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.19.0] - 2026-06-09

### Added
- 3D Map Viewer page (`Gameplay`) for previewing game boards and themes.
- Player piece management system with independent step controls (supports up to 4 pieces).
- Dynamic parsing of embedded 3D anchors (pattern: `Index_posN`) from `.glb` models for precise piece positioning.
- English UI for the 3D map viewer control panel.

### Changed
- Replaced hardcoded piece movement coordinates with a dynamic dictionary built from embedded `.glb` anchors.
- Removed artificial scaling from player pieces to use the exact 1:1 scale from the 3D model.
- Centered piece geometry programmatically based on its bounding box to fix Blender origin offset issues.

## [0.18.1] - 2026-06-02

### Fixed
- **Guest Mode Id Handling**: Implemented fix in `TeamCard` and `WaitingRoom` files allowing unregistered user leave team and room. 

## [0.18.0] - 2026-06-02

### Added
- **Guest Access**: Implemented the ability for unauthenticated users to join game lobbies as guests without requiring an account.
- **Guest Join Flow**: Added the `GuestJoinModal` component, prompting unauthenticated users to enter a temporary nickname and select a profile picture from a fetched list of default avatars.
- **Guest Session Management**: Integrated local generation and storage of a unique `guest_id` to reliably maintain the guest's identity and WebSocket connection across page reloads.
- **Dynamic Connection Routing**: Updated both `CodeInput.jsx` and `JoinRoom.jsx` to seamlessly intercept unauthenticated join attempts and route them through the new guest modal flow instead of redirecting to the login page.

## [0.17.1] - 2026-06-01

### Fixed
- **WebSocket State Synchronization**: Corrected the mapping of `player_connected` and `player_joined` socket events to use `user_id`, ensuring accurate real-time updates for the host when clients reconnect or refresh the page.
- **Lobby Race Conditions**: Removed conflicting `useEffect` hooks in the lobby state management that caused infinite redirection loops and "zombie" widgets when returning to the main page after a room closure.
- **Stale Session Cleanup**: Implemented automatic `localStorage` clearing for `activeRoom` and `guest_id` upon user logout, and ensured global socket states reset when joining a new room to prevent connection bugs.

## [0.17.0] - 2026-05-30

### Added
- **Lobby Joining Mechanics**: Implemented the ability for users to join game lobbies via direct invite links or explicit game codes.
- **Connection Processing**: Added a new `JoinRoom` intermediate page to handle REST API connections (`/api/rooms/join`) and validate user authentication prior to establishing the WebSocket connection.
- **Clipboard Integration**: Added intuitive UI buttons in the waiting room for hosts to easily copy the lobby code or the direct join link.

### Changed
- **WebSocket Architecture Redesign**: Migrated the core `useGameSocket` hook to utilize the `react-use-websocket` library. This provides a highly stable connection with automatic exponential backoff reconnections and reliable heartbeat pinging.
- **Synchronized Lobby Redirection**: Updated socket event handling to globally track the `room_closed` event. All connected players are now seamlessly and simultaneously redirected to the main page when the host stops the game.

## [0.16.0] - 2026-05-27

### Added
- **Team Management**: Added the ability to dynamically create and remove teams within the pre-game lobby interface, complete with smooth `framer-motion` UI transitions.
- **Real-time WebSocket Integration**: Established active WebSocket connections via the new `useGameSocket` hook to enable live, bi-directional communication with the game server.
- **Live Data Synchronization**: The waiting room now instantly receives and reflects real-time room information and player actions (e.g., team creation, deletion, state updates) directly from the server socket events.

## [0.15.4] - 2025-05-27

### Added
- **Lobby Creation Logic**: Added `Theme` option to choose. 

## [0.15.3] - 2026-05-27

### Changed
- **Map Creation Logic**: Refactored the map creation process by removing the `map template` parameter and replacing it with `map size`, which is now dynamically fetched from the API.
- **Form Validation**: Implemented mandatory field validation for map size to ensure data integrity during creation.

### Added
- **Navigation Enhancements**: Integrated preview links into the breadcrumb navigation on map editing pages, allowing quick access to the live map view directly from the editor.

## [0.15.2] - 2026-05-19

### Added
- **Map Cover Management**: Integrated `POST` (upload) and `DELETE` (remove) API endpoints and corresponding `react-query` mutations (`useUploadMapCoverMutation`, `useDeleteMapCoverMutation`) in `api/maps.js` to handle map cover images.

### Changed
- **Map Creator & Editor Enhancements**: Updated `MapCreator.jsx` and `MapEditor.jsx` to support uploading, editing, and deleting map cover images with a strict 3:2 aspect ratio using the reusable `ImageCropperModal`.
- **Map Data Synchronization**: Implemented automatic `queryClient` cache invalidation for map queries (`myMaps`, `publicMaps`) upon successful map creation and cover modifications to instantly reflect changes across the application.

## [0.15.1] - 2026-05-16

### Added
- **Registration Personalization Step**: Created the `AvatarStep.jsx` onboarding component, allowing users to select a display nickname and configure a 1:1 profile picture directly during the registration process.
- **Onboarding Flow Integration**: Embedded the profile personalization phase as the final step in both the standard `SignUp.jsx` wizard and the `GoogleSignUp.jsx` external provider flow, featuring dynamic finish/skip action mapping.

### Changed
- **Authentication Route Guard Enhancement**: Optimized the `canAccessAuth` condition within `App.jsx` to respect the lifecycle of `temp_google_token` in session storage. This prevents pre-verified external accounts from being prematurely redirected to the root (`/`) path by the global router before completing their profile customization.

## [0.15.0] - 2026-05-15

### Added
- **Profile Avatar Management**: Integrated `POST` (upload) and `DELETE` (remove) endpoints for user profile pictures in `MyProfile.jsx`.
- **Image Cropping Interface**: Implemented a dedicated cropping modal using `react-easy-crop` to ensure all uploaded avatars strictly adhere to a 1:1 aspect ratio before submission.
- **Avatar Processing Utility**: Created `cropUtils.js` utilizing the HTML5 Canvas API to transform UI crop coordinates into high-quality image blobs.
- **Avatar API Hooks**: Expanded `api/user.js` with `useUploadAvatarMutation` and `useDeleteAvatarMutation` to handle multipart/form-data uploads and avatar removal.
- **Reusable Cropping Modal**: Developed `ImageCropperModal.jsx` driven by `@headlessui/react` transitions with a custom background architecture that safely circumvents native scrollbar locking and layout shifts.
- **Card Pack Cover API Hooks**: Extended `api/card-packs.js` with `useUploadPackCoverMutation` and `useDeletePackCoverMutation` to handle multipart file multi-step uploads and explicit cover deletion.

### Changed
- **Profile Layout Refactoring**: Redesigned the avatar section to move action buttons below the image, ensuring the 250x250px profile picture remains fully visible without UI overlays.
- **Enhanced Loading UX**: Integrated `Spinner` components directly into the avatar container to provide clear visual feedback during asynchronous upload and deletion states.
- **Automatic Data Synchronization**: Added `queryClient` invalidation logic to automatically refresh user metadata across the application immediately after an avatar update.
- **Card Pack Creation Flow**: Upgraded `CardPackCreator.jsx` to intercept image selection, passing it to the `ImageCropperModal` with a 3:2 aspect ratio constraint. Implemented a sequential two-stage request pipeline that registers the pack draft first and then binds the media object using the newly provisioned entity ID.
- **Card Pack Editor Enhancements**: Updated `CardPackEditor.jsx` to trigger instant 3:2 aspect ratio cover updates, automatic query cache invalidation, and introduced a contextual "Delete cover" control accompanied by active mutation loading toggles.

## [0.14.1] - 2026-05-09

### Added
- **Waiting Room Page**: Developed `WaitingRoom.jsx` for the pre-game lobby interface, featuring team selection and player management.
- **Lobby Layout**: Implemented `LobbyLayout.jsx` to provide a consistent header and footer structure for game-specific pages.
- **Routing**: Integrated the new Waiting Room into `App.jsx` under the `/lobby/:id/waiting` path.
- **Team Selection UI**: Created a 4-team grid layout with player slots, status indicators, and join/remove functionality.
- **Invitation Sidebar**: Added a dedicated sidebar for game codes and invite links with "click-to-copy" buttons.
- **Host Controls**: Integrated conditional rendering for "Start Game" and "Stop Game" actions based on host status.

## [0.14.0] - 2026-05-09

### Added
- **Lobby Creation Page**: Implemented `LobbyCreator.jsx` with full form validation using `react-hook-form` and `zod`.
- **Lobby API Integration**: Created `api/lobby.js` with `useCreateRoomMutation` for room initialization and `usePublicMapsQuery` for dynamic map selection.
- **Form Validation & UX**: Added real-time validation for lobby names and map selection, including a disabled state for the submission button until requirements are met.
- **Dynamic Map Preview**: Integrated a live preview feature in the lobby creator that updates the map image and title based on the dropdown selection.
- **Success Workflow**: Implemented automated notifications upon room creation with a timed redirect to the lobby interface.

## [0.13.0] - 2026-05-09

### Added
- **Card Pack Preview Page**: Implemented `CardPackPreview.jsx` to provide a read-only, public view of a card pack's metadata, statistics, and full vocabulary list.
- **Maps Gallery**: Created `MapsGallery.jsx` with a tabbed interface (Community, Saved, My creations), supporting pagination, sorting, and status filtering.
- **Map List Card**: Implemented `MapListCard.jsx` component for the maps gallery to display detailed map statistics and a "Save to My maps" action for public maps.
- **Map API Extensions**: Expanded `api/maps.js` with new endpoints and hooks: `getPublicMaps`, `getSavedMaps`, and `useSaveMapMutation`.

### Changed
- **Dynamic Map Grid Visualization**: Refactored `MapFieldsEditor` and `MapPreviewBoard` to dynamically render a 1D array of fields into a 2D "snake-like" grid, supporting variable `max_fields_count` without hardcoded row/column limits.
- **Sticky Board Details**: Improved the layout of `MapPreviewBoard` by fixing the sticky positioning of the side details panel for smoother scrolling.
- **Packs Gallery Filtering**: Enhanced `PacksGallery.jsx` by adding a "Status" dropdown filter (All, Active, Draft) to the "My creations" tab to match the maps gallery functionality.

## [0.12.1] - 2026-05-07

### Changed
- **Dynamic Navigation Lists**: Updated the `Navigation.jsx` sidebar to support real data fetch and dynamic list expansion by adding "Show all" and "Show less" toggle buttons for the "My packs" and "My maps" sections.
- **Conditional Data Fetching**: Modified the API query hooks (`useMyPacksQuery`, `useMyMapsQuery`) within the navigation component to dynamically switch between a strict `{ limit: 4 }` constraint and an unlimited fetch based on the user's toggle state.
- **Smart UI Rendering**: Added logic to conditionally render the expansion toggle buttons only when the total number of items from the backend (`total > 4`) exceeds the default visible limit.

## [0.12.0] - 2026-05-07

### Added
- **Map Preview Page**: Implemented a new read-only `MapPreview.jsx` page allowing users to publicly inspect map layers, configurations, and data fields.
- **Map Preview Board**: Created the `MapPreviewBoard.jsx` component following Atomic Design principles. It features an interactive 10x4 visual grid where users can select specific cells to view their properties (time limit, reward, penalty) and trace data sources via direct links to the associated Card Packs.
- **Map Card Component**: Added `MapPreviewCard.jsx` to display comprehensive map metadata (image, title, creation date, total games played, rating, template, and field limit) utilizing a responsive CSS grid layout consistent with the overall design system.

## [0.11.1] - 2026-05-07

### Changed
- **Custom Confirmation Modal**: Upgraded `ConfirmWindow.jsx` into a fully accessible modal using `@headlessui/react` (`Dialog`, `Transition`). It now features a dark backdrop overlay (`bg-black/20`) and supports closing by clicking outside the modal or pressing the Escape key.
- **Account Deletion Flow**: Replaced the native browser `window.confirm` dialogue in `MyProfile.jsx` with the custom `ConfirmWindow` modal for the "Delete account permanently" action, managing its visibility via a new local state.
- **UX and Notifications**: Removed blocking native `alert()` calls in `MyProfile.jsx`. Integrated the global `useNotification` context to display smooth, animated success messages when copying the profile link, successfully updating the display name, or changing the password.

## [0.11.0] - 2026-05-07

### Added
- **Public Profile View**: Implemented `PublicProfile.jsx` to allow users to view other players' profiles via a dynamic `:username` route.
- **User Data Fetching**: Integrated `useUserByUsernameQuery` hook in `api/user.js` utilizing `@tanstack/react-query` to fetch public user metadata by username.
- **Profile UI Elements**: Added a dedicated layout for public profiles featuring the user's nickname, join date (formatted via `formatPackDate`), total games played, and username with a gamepad icon.
- **Loading States**: Integrated the `Spinner` component with a "Loading User Info" message to handle asynchronous data fetching states.

## [0.10.4] - 2026-05-07

### Changed
- **Project Structure**: `components` folder was split with different subfolders for easy file search.

## [0.10.3] - 2026-05-07

### Added
- **Delta Sync Support**: Integrated `id`-based syncing for both `WordsEditor` and `MapFieldsEditor`. Existing items fetched from the backend retain their IDs during updates, while newly added items are appended without IDs, strictly matching the API requirements for `PUT` routes to minimize database overhead.
- **Form Defaults in Map Editor**: Initialized the settings inputs in `MapFieldsEditor` with default functional values (`50` time limit, `10` reward, `1` penalty). The inputs automatically revert to these optimal values upon clearing/applying the form, preventing the need for repetitive manual entry.

### Changed
- **Additive Import Strategy**: Redesigned `WordImportForm` to operate strictly on an additive basis. The modal no longer displays previously saved words upon opening, reducing clutter. Successfully submitted strings are deduplicated and safely appended to the local state as new objects.
- **Grid Layout Simplification**: Removed the `notACellIndices` concept from the `MapFieldsEditor`. All 40 cells within the 10x4 grid are now strictly active and clickable.
- **Map Activation Constraint**: The "Activate" button inside `MapFieldsEditor` is now strictly disabled unless all 40 grid cells are successfully populated with field data (`isAllCellsFilled`).

## [0.10.2] - 2026-05-06

### Added
- **Interactive Map Grid**: Implemented a 10x4 CSS Grid in `MapFieldsEditor.jsx` for visual map configuration, allowing users to select cells by clicking or typing coordinates (supporting ranges like "1, 3, 5-7").
- **Field Editor State & Validation**: Added local state management (`gridFields`, `originalFields`) to track changes. The "Apply" button is dynamically disabled until all required parameters (card pack, time limit, reward, penalty) are filled.
- **Publish & Activate Flows for Maps**: Added conditional rendering for final action buttons based on the map's `status` and `is_public` flags (Activate for `DRAFT`, Publish for private `ACTIVE`), mirroring the logic in the Words Editor.
- **Maps API Expansion**: Expanded `api/maps.js` with new endpoints and `react-query` hooks: `useMapFieldsQuery` (GET), `useBulkSyncFieldsMutation` (PUT), `useActivateMapMutation` (POST), and `usePublishMapMutation` (POST).

### Changed
- **Grid Layout Architecture**: Replaced the placeholder flex container in the map editor with a fully functional `grid-cols-10 grid-rows-4` structure to accurately map a 40-cell 2D array.
- **Cell Visual States**: Updated cell UI to dynamically reflect their statuses: empty (with hover dot), filled (`bg-brand-500`), and invalid/inactive ("Not A Cell" restricted corners).

## [0.10.1] - 2026-05-06

### Added
- **Vocabulary Data Fetching**: Integrated `usePackCardsQuery` to automatically load and populate the words list from the backend when editing a card pack.
- **Save State Tracking**: Implemented an `originalWords` state to track backend data vs. local edits. The "Save" button is now dynamically disabled if no changes have been made (`!hasChanges`) or if the list contains fewer than 2 words.
- **Publish & Activate Flows**: Added conditional rendering for final action buttons based on the pack's `status` and `is_public` flags.
  - Displays an "Activate" button for packs in `DRAFT` status.
  - Displays a "Publish" button for packs in `ACTIVE` status that are private.
- **API Endpoints**: Expanded `api/card-packs.js` with new requests and mutations: `usePackCardsQuery` (GET), `useBulkSyncCardsMutation` (PUT), `useActivatePackMutation` (POST), and `usePublishPackMutation` (POST).

### Changed
- **WordsEditor Cleanup**: Removed all `framer-motion` animations from the `WordsEditor` list and buttons to simplify rendering and state management. The component now utilizes standard React state and DOM rendering.
- **Word Import Logic**: Updated `WordImportForm` to support initialization with existing words (`initialWords` prop) and apply string cleaning (`.trim()`) to prevent empty or space-only entries from being imported.

## [0.10.0] - 2026-05-05

### Added
- **Word Import Modal**: Transformed `WordImportForm` into a fully accessible modal using `@headlessui/react` `Dialog`, featuring a dark background overlay and clean open/close state management from the editor.
- **Dynamic Vocabulary List**: Implemented a "Show all" / "Show less" toggle in the `WordsEditor` component. The list now intelligently truncates at 20 items to keep the UI clean, allowing users to expand the view when needed.
- **List Animations**: Integrated `framer-motion` into the `WordsEditor` vocabulary list. Word cards now feature smooth entrance/exit animations (sliding in from the left), and the container dynamically and smoothly resizes using the `layout` prop when the list expands or collapses.

### Changed
- **Words Editor State**: Upgraded `WordsEditor.jsx` to manage local states for the import modal visibility and the expanded/collapsed view of the vocabulary array.

### Fixed
- **Git Tracking Chore**: Removed local `.env` files from the Git tracking index and updated `.gitignore` to securely handle local environment variables and prevent accidental leaks.

## [0.9.0] - 2026-05-05

### Added
- **Card Pack Editing**: Implemented the `CardPackEditor.jsx` component to handle updates to existing card packs. It pre-fills data and restricts changing the pack type.
- **Map Editing**: Implemented the `MapEditor.jsx` component to allow users to update existing map details (name and image). It fetches current map data and restricts template modification.
- **Editor API Integration**: Added `getPackById` (GET) and `updatePack` (PATCH) endpoints for card packs to `api/card-packs.js`, and equivalent endpoints (`getMapById`, `updateMap`) for maps to `api/maps.js` along with their respective `react-query` hooks.
- **Navigation Assets**: Added new SVG icons (`grayPlus.svg`, `greenGlove.svg`, `redGlove.svg`) for the sidebar navigation.

### Changed
- **Navigation Menu Update**: Refactored `Navigation.jsx` to include "My packs" and "My maps" sections. Implemented conditional rendering for pack/map avatars (displaying grey placeholders if no image exists) and integrated the new SVG icons.
- **Creator Form Validation**: Upgraded `CardPackCreator.jsx` and `MapCreator.jsx` to use `react-hook-form` and `zod` for strict client-side validation on the `name` and `image` fields, aligning the UX with the authentication forms.
- **Input Components Refactoring**:
  - Wrapped `TransparentInput.jsx` and `ImageInput.jsx` in `React.forwardRef` to seamlessly integrate with `react-hook-form`.
  - Added dynamic visual states (red/green borders and helper texts) for success and error validation outcomes.

### Fixed
- **File Input Bug**: Resolved an issue in `ImageInput.jsx` where `react-hook-form` passed a `null` value to the uncontrolled `<input type="file">`, causing React warnings. The `value` prop is now properly extracted and excluded from native DOM attributes.

## [0.8.3] - 2026-05-04

### Added
- **API Integration for Pack Creation**: Integrated the `/api/card-packs/` endpoint (POST) within `CardPackCreator.jsx` to allow users to save drafts of new card packs.
- **Dynamic Pack Types Fetching**: Replaced mock data in the `DropDown` component with a dynamic fetch from the `/api/card-packs/types` endpoint (GET), automatically mapping the response `name` to the component's expected `label`.
- **Form Validation & UX**: Implemented client-side validation in `CardPackCreator.jsx`, disabling the "Save to Draft" button until all required fields (Name, Type, Description) are populated.
- **Seamless Redirection Flow**: Added a delayed redirection mechanism using `react-router-dom`'s `useNavigate`. After successfully saving a draft, users are shown a success notification for 2.5 seconds before being automatically routed to the next step (`/edit/card-pack/:id/words`), utilizing the newly generated pack `id` from the API response.

### Changed
- **Input Component Updates**: Modified `TransparentInput.jsx` to function as a controlled component, accepting `value` and `onChange` props to manage local state within the creator form.
- **Hook Refactoring**: Adjusted `useCreatePackMutation` to accept and execute an `onSuccess` callback provided by the component, ensuring the automatic redirection logic correctly utilizes the returned API data without interfering with global notifications.
- 
## [0.8.2] - 2026-05-04

### Added
- **Global Notifications**: Implemented a global `NotificationContext` and a `Notification` component utilizing `framer-motion` for smooth slide-in animations from the right side of the screen (`x: 100`).
- **Date Formatting Utility**: Created `formatPackDate` helper (`utils/parseTime.js`) using `Intl.DateTimeFormat` to convert ISO 8601 strings into a localized "Month, Year" format (e.g., "May, 2026").
- **MyProfile Enhancements**: Updated the `MyProfile.jsx` page to display the user's registration date (`created_at`) and total games played (`games_played`), utilizing the new date formatting utility.
- **Save Pack Feedback**: Integrated the `useNotification` hook into the `useSavePackMutation` to provide immediate, auto-dismissing visual feedback upon successfully saving a community pack.

### Changed
- Refined the `Notification` component styling, applying a `bg-decorative-500/22` background with a 22% opacity modifier for success states.
- Optimized API hook structure by consolidating `getPublicPacks`, `getSavedPacks`, and `getMyPacks` into a unified `useQuery` call driven by the active tab configuration in the Packs Gallery.

## [0.8.1] - 2026-05-04

### Added
- **New Component**: `Spinner.jsx` - A reusable circular loading spinner component utilizing `framer-motion` and Tailwind CSS.
- **API Integration**: Integrated backend endpoints (`/api/card-packs/public`, `/api/card-packs/saved`, `/api/card-packs/me`) via `@tanstack/react-query` to fetch and display card packs.
- **Gallery Features**: Implemented pagination and dropdown sorting functionality for the Packs Gallery.
- **Save Pack Action**: Added API integration (`/api/card-packs/{pack_id}/save`) to allow users to save community packs to their personal collection.

### Changed
- Refactored `PacksGallery.jsx` to use a tabbed UI interface (Community, Saved, My Creations) instead of separate routes.
- Updated `CardPack.jsx` to conditionally render the "+ Save to My packs" button strictly for public packs, including an inline spinner during the save mutation.

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
- Displayed real user data (email, username) dynamically in the `MyProfile` and `ProfileSettings` components using the updated `AuthContext`.

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
- Added the **MyProfile Settings** modal (`ProfileSettings.jsx`) accessible directly from the global application Header.
- Integrated `@headlessui/react` to handle the MyProfile Settings dropdown, utilizing the `Popover` and `Transition` components for accessible, animated opening/closing behaviors and proper routing interception.

## [0.4.0] - 2026-04-22

### Added
- **[Major Feature] Packs Gallery:** Implemented a new main "Packs Gallery" page displaying all available categories of packs in one place.
- **[Major Feature] Category Lists:** Added dedicated pages for viewing comprehensive, filtered lists of packs based on their specific type.
- Implemented global **automatic scroll-to-top** behavior on route changes using a dedicated `TopScroller` utility component to improve UX during page transitions.
- Integrated `useLocation` hook from `react-router-dom` to dynamically detect navigation events and reset window scroll position.

### Changed
- Refactored the `RowNavigation` component using a more concise declarative syntax (ternary operators and object destructuring) for better code readability and maintainability.
- Optimized overall Single Page Application (SPA) navigation flow to ensure smooth transitions between the Main, MyProfile, and the new Gallery pages.

## [0.3.0] - 2026-04-22

### Added
- Implemented the **MyProfile** page (`MyProfile.jsx`) featuring account details, game statistics, and user settings.
- Created a reusable and "dumb" `Input` component to handle various text and password entries across the application.
- Integrated profile-specific UI elements:
  - MyProfile picture container with a custom upload action overlay.
  - User statistics dashboard (join date, games finished, and account credentials).
  - Quick action buttons for profile link sharing and account deletion.
- Added new graphical assets for the profile interface (`darkMail.svg`, `gamepad.svg`, `darkCopy.svg`, `redCross.svg`, etc.).

### Changed
- Refactored input logic by abstracting it into a standalone functional component to improve reusability and maintain consistency with Figma designs.
- Enhanced `MyProfile` layout with breadcrumb navigation for better user experience.

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