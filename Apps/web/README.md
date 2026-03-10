# KidsMind Web App

> AI-powered educational platform for children aged 3-15 and their parents.

KidsMind is a safe, multilingual learning companion that adapts to each child's age, interests, and pace. Parents create accounts, set up child profiles with parental controls (daily time limits, subject filters, PIN protection), and monitor usage through a dedicated dashboard. The web client is built entirely with React 19, TypeScript in strict mode, and CSS Modules -- no Tailwind, no external state management library.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Getting Started](#4-getting-started)
5. [Architecture Decisions](#5-architecture-decisions)
6. [Design System](#6-design-system)
7. [Internationalization](#7-internationalization)
8. [Theming](#8-theming)
9. [Animations](#9-animations)
10. [Forms & Validation](#10-forms--validation)
11. [Multi-Step Onboarding](#11-multi-step-onboarding)
12. [Accessibility](#12-accessibility)
13. [Performance](#13-performance)
14. [Component API Reference](#14-component-api-reference)
15. [Hook API Reference](#15-hook-api-reference)
16. [Utility Functions](#16-utility-functions)
17. [Adding a New Page](#17-adding-a-new-page)
18. [Adding a New Language](#18-adding-a-new-language)
19. [Contributing](#19-contributing)

---

## 1. Project Overview

KidsMind is an AI-powered educational platform designed for children aged 3 to 15 and their parents. It provides age-adaptive AI chat, voice learning, gamified badges, a parent dashboard, and robust safety controls -- all wrapped in a child-friendly interface.

**Key features:**

- **6 languages** -- English, French, Spanish, Italian, Arabic (RTL), Chinese
- **Dark and light themes** -- persisted in `localStorage`, respects `prefers-color-scheme`
- **WCAG 2.1 AA** -- skip navigation, ARIA attributes, `prefers-reduced-motion` support
- **CSS Modules** -- one `.module.css` per component, scoped class names, no global style leakage
- **TypeScript strict mode** -- `strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`, zero `any`

---

## 2. Tech Stack

| Category        | Technology             | Version   |
| --------------- | ---------------------- | --------- |
| UI Library      | React                  | 19.2      |
| Language        | TypeScript             | ~5.9.3    |
| Build Tool      | Vite                   | 7.2       |
| Routing         | React Router DOM       | 7.13      |
| Icons           | lucide-react           | 0.577     |
| Styling         | CSS Modules            | (built-in)|
| Linting         | ESLint 9 + typescript-eslint | 9.39 / 8.46 |

**Not used:** Tailwind CSS, Redux, Zustand, Context API for global state, Styled Components, Sass/SCSS.

All application state is managed via local `useState` hooks within components and custom hooks. No global state management library is required at this stage.

---

## 3. Project Structure

```
Apps/web/src/
├── App.tsx                    # Root component with BrowserRouter and lazy-loaded routes
├── main.tsx                   # React 19 entry point (createRoot + StrictMode)
├── components/
│   ├── AgeGroupSelector/      # Three age-group selection cards (3-6, 7-11, 12-15)
│   ├── CTASection/            # Call-to-action gradient banner with animated background
│   ├── FeaturesGrid/          # Six feature tiles grid (chat, voice, badges, dashboard, safety, language)
│   ├── Footer/                # Four-column footer with links and language selector
│   ├── GetStarted/
│   │   ├── StepIndicator/     # Step progress display with numbered circles and connectors
│   │   ├── StepParentAccount/ # Step 1: email, password (with strength meter), country, terms
│   │   ├── StepChildProfile/  # Step 2: nickname, age group cards, grade level, avatar, language
│   │   ├── StepPreferences/   # Step 3: daily time limit slider, subjects, voice toggle, PIN
│   │   └── StepWelcome/       # Step 4: confirmation summary with confetti animation
│   ├── HeroSection/           # Hero with animated owl/rocket illustration (HeroIllustration.tsx)
│   ├── HowItWorks/            # Three-step "how it works" section
│   ├── LoginForm/             # Login form with email, password, error banner, forgot link
│   ├── NavBar/                # Fixed navigation bar with hamburger menu and language dropdown
│   ├── SafetyBanner/          # Safety features highlight banner
│   ├── TestimonialCarousel/   # Auto-advancing testimonial carousel with star ratings
│   └── shared/
│       ├── AuthLayout/        # Split-screen layout for auth pages (illustration + form)
│       ├── AvatarPicker/      # 4x4 emoji avatar grid selection with radiogroup role
│       ├── FormField/         # Reusable labeled input/select/checkbox with error display
│       ├── PasswordField/     # Password input with show/hide toggle and strength meter
│       └── ProgressBar/       # Animated horizontal progress bar with ARIA progressbar role
├── hooks/
│   ├── useForm.ts             # Generic form state management + validation
│   ├── useInterval.ts         # setInterval wrapper with automatic cleanup
│   ├── useLanguage.ts         # i18n language management (lang, setLang, t, isRTL)
│   ├── useMultiStep.ts        # Multi-step flow navigation (index, progress, next/prev/goto)
│   ├── useScrollPosition.ts   # Scroll position tracking with requestAnimationFrame
│   ├── useScrollReveal.ts     # IntersectionObserver-based reveal animation trigger
│   └── useTheme.ts            # Dark/light theme toggle with localStorage persistence
├── pages/
│   ├── HomePage.tsx           # Landing page (NavBar + Hero + lazy-loaded sections)
│   ├── LoginPage.tsx          # Login page (AuthLayout + LoginForm)
│   └── GetStartedPage.tsx     # Multi-step onboarding (AuthLayout + 4 steps)
├── styles/
│   ├── animations.css         # All @keyframes definitions (18 animations)
│   ├── globals.css            # CSS reset, font imports, CSS custom properties, reduced-motion
│   └── themes.css             # Light and dark theme CSS variable definitions
├── types/
│   └── index.ts               # All TypeScript types, interfaces, and type aliases
└── utils/
    ├── constants.ts           # Static data arrays (LANGUAGES, AGE_GROUPS, FEATURES, STEPS, TESTIMONIALS)
    ├── cssVariables.ts        # Theme application utility (applyTheme sets data-theme attribute)
    ├── translations.ts        # 6-language translation map (Record<LanguageCode, TranslationMap>)
    └── validators.ts          # Pure validation functions for all form fields
```

---

## 4. Getting Started

**Prerequisites:** Node.js 18+ and npm 9+.

```bash
cd Apps/web
npm install
npm run dev       # Start Vite dev server (default: http://localhost:5173)
npm run build     # TypeScript type-check + Vite production build
npm run preview   # Preview the production build locally
npm run lint      # Run ESLint across the project
```

**Routes:**

| Path            | Page              | Loading    |
| --------------- | ----------------- | ---------- |
| `/`             | HomePage          | Eager      |
| `/login`        | LoginPage         | Lazy       |
| `/get-started`  | GetStartedPage    | Lazy       |

---

## 5. Architecture Decisions

| Decision | Rationale |
| -------- | --------- |
| **Local state only** | The app has no cross-page shared state yet. Each page uses `useState` directly or via the `useForm`/`useMultiStep` hooks. Redux/Context will be added when the dashboard requires global session state. |
| **CSS Modules per component** | Every component gets a co-located `.module.css` file. Vite generates hashed class names at build time, eliminating global namespace collisions without runtime cost. |
| **Lazy loading via `React.lazy`** | `LoginPage` and `GetStartedPage` are lazy-loaded at the route level. Inside `HomePage`, below-the-fold sections (`AgeGroupSelector`, `FeaturesGrid`, `HowItWorks`, `SafetyBanner`, `TestimonialCarousel`, `CTASection`, `Footer`) are also lazy-loaded with `Suspense` and a skeleton placeholder. |
| **Custom hooks for all shared logic** | Form state (`useForm`), multi-step navigation (`useMultiStep`), theming (`useTheme`), i18n (`useLanguage`), scroll tracking (`useScrollPosition`, `useScrollReveal`), and intervals (`useInterval`) are each encapsulated in a dedicated hook. |
| **Flat translation map** | All translation strings are keyed by `TranslationMap` fields in a single `Record<LanguageCode, TranslationMap>`. This keeps translations type-safe -- adding a key to `TranslationMap` causes a compile error in every language that has not provided it yet. |
| **Pure validation functions** | All validators are stateless pure functions in `validators.ts`. They return translation keys (not translated strings), so error messages respect the active language. |

---

## 6. Design System

### Color Tokens

| Token | Light | Dark | Usage |
| ----- | ----- | ---- | ----- |
| `--bg-primary` | `#FFF8F0` | `#0F0F1A` | Page background |
| `--bg-surface` | `#FFFFFF` | `#1A1A2E` | Card and panel backgrounds |
| `--bg-surface-alt` | `#F5F0FF` | `#1E1E35` | Alternate surface for contrast |
| `--bg-surface-hover` | `#FFF0E8` | `#252540` | Hover state on surfaces |
| `--accent-main` | `#FF6B35` | `#FF8C5A` | Primary brand accent (CTAs, links) |
| `--accent-main-hover` | `#E85520` | `#FF6B35` | Hover state for primary accent |
| `--accent-learn` | `#4ECDC4` | `#5EDDD4` | Learning/education accent (teal) |
| `--accent-fun` | `#FFE66D` | `#FFD93D` | Fun/gamification accent (yellow) |
| `--accent-grow` | `#95E1A0` | `#7BD88F` | Growth/progress accent (green) |
| `--accent-safety` | `#6C63FF` | `#8B85FF` | Safety/security accent (purple) |
| `--text-primary` | `#2D2D2D` | `#F0EBE3` | Main body text |
| `--text-secondary` | `#5A5A72` | `#B0AABF` | Secondary/supporting text |
| `--text-muted` | `#9A9AB0` | `#706A80` | Muted/placeholder text |
| `--text-on-accent` | `#FFFFFF` | `#FFFFFF` | Text on colored backgrounds |
| `--border-subtle` | `rgba(0,0,0,0.08)` | `rgba(255,255,255,0.08)` | Subtle borders and dividers |
| `--gradient-cta` | `linear-gradient(135deg, #FF6B35, #4ECDC4)` | `linear-gradient(135deg, #FF8C5A, #5EDDD4)` | CTA button and banner gradients |

### Font Variables

| Token | Value | Usage |
| ----- | ----- | ----- |
| `--font-display` | `'Baloo 2', cursive` | Headings (h1-h6) |
| `--font-body` | `'Nunito', sans-serif` | Body text, inputs, buttons |
| `--font-cjk` | `'Noto Sans SC', sans-serif` | Chinese language fallback (applied when `lang="zh"`) |

### Spacing Scale

| Token | Value |
| ----- | ----- |
| `--spacing-xs` | `0.25rem` (4px) |
| `--spacing-sm` | `0.5rem` (8px) |
| `--spacing-md` | `1rem` (16px) |
| `--spacing-lg` | `1.5rem` (24px) |
| `--spacing-xl` | `2rem` (32px) |
| `--spacing-2xl` | `3rem` (48px) |
| `--spacing-3xl` | `4rem` (64px) |
| `--spacing-4xl` | `6rem` (96px) |

### Border Radius

| Token | Value |
| ----- | ----- |
| `--radius-sm` | `8px` |
| `--radius-md` | `12px` |
| `--radius-lg` | `16px` |
| `--radius-xl` | `24px` |
| `--radius-full` | `100px` |

### Layout

| Token | Value |
| ----- | ----- |
| `--max-width` | `1200px` |
| `--nav-height` | `72px` |

---

## 7. Internationalization

KidsMind supports **6 languages**:

| Code | Language  | Direction | Flag |
| ---- | --------- | --------- | ---- |
| `en` | English   | LTR       | GB   |
| `fr` | Francais  | LTR       | FR   |
| `es` | Espanol   | LTR       | ES   |
| `it` | Italiano  | LTR       | IT   |
| `ar` | Arabic    | **RTL**   | SA   |
| `zh` | Chinese   | LTR       | CN   |

**How it works:**

- All user-facing strings live in `src/utils/translations.ts` as a `Record<LanguageCode, TranslationMap>`.
- The `TranslationMap` interface in `src/types/index.ts` defines every string key. Adding a new key causes a TypeScript compile error in every language entry that has not defined it.
- The `useLanguage` hook returns `{ t, lang, setLang, isRTL }`:
  - `t` is the active `TranslationMap` object -- access strings via `t.hero_title`, `t.nav_login`, etc.
  - `lang` is the current `LanguageCode`.
  - `setLang(code)` switches the language.
  - `isRTL` is `true` when the active language is Arabic.
- Language is persisted in `localStorage` under the key `km_lang`.
- On first visit, the hook detects the browser's `navigator.language` and selects a matching language if available; otherwise defaults to English.
- When `isRTL` is `true`, the hook sets `dir="rtl"` on the `<html>` element. CSS uses logical properties (`margin-inline-start`, `padding-inline-end`, etc.) so layout mirrors automatically.
- Chinese content uses the `--font-cjk` (`Noto Sans SC`) font family, applied via a `[lang="zh"]` CSS selector in `globals.css`.

---

## 8. Theming

KidsMind supports two themes: **light** and **dark**.

**Mechanism:**

1. The `useTheme` hook reads the initial theme from `localStorage` (key: `km_theme`). If no stored preference exists, it respects the user's `prefers-color-scheme` media query.
2. Calling `toggleTheme()` switches between `'light'` and `'dark'`.
3. The hook calls `applyTheme(theme)` from `src/utils/cssVariables.ts`, which sets `data-theme="light"` or `data-theme="dark"` on the `<html>` element.
4. All color tokens are defined in `src/styles/themes.css` under `[data-theme="light"]` and `[data-theme="dark"]` selectors.
5. Components reference tokens via `var(--token-name)` -- they never hard-code color values.

**Usage in components:**

```tsx
const { theme, toggleTheme } = useTheme();

<button onClick={toggleTheme}>
  {theme === 'light' ? 'Switch to dark' : 'Switch to light'}
</button>
```

---

## 9. Animations

All `@keyframes` are defined in `src/styles/animations.css`. Every animation is automatically disabled when the user has `prefers-reduced-motion: reduce` enabled (handled by the global rule in `globals.css`).

| Keyframe Name | Description |
| ------------- | ----------- |
| `float` | Gentle vertical floating with slight rotation (hero illustration) |
| `orbit` | Circular orbit path around a center point (decorative elements) |
| `pulseGlow` | Pulsing box-shadow glow effect (safety badge) |
| `slideDown` | Fade in while sliding down from above (navbar, dropdowns) |
| `gradientShift` | Animated background-position shift for gradient backgrounds (CTA section) |
| `starTwinkle` | Opacity and scale pulsing for star decorations |
| `bounceIcon` | Subtle vertical bounce for icons on hover |
| `carouselFadeIn` | Fade in with horizontal slide for testimonial transitions |
| `progressBar` | Width animation from 0% to target for progress bars |
| `slideInFromRight` | Slide and fade in from the right (forward step transitions) |
| `slideInFromLeft` | Slide and fade in from the left (backward step transitions) |
| `shakeError` | Horizontal shake for form fields with validation errors |
| `errorSlideDown` | Slide down and fade in for error message appearance |
| `drawCheckmark` | SVG stroke-dashoffset animation to draw a checkmark (welcome step) |
| `confettiFall` | Confetti pieces falling with rotation and scaling (welcome step) |
| `switchOn` | Horizontal slide for toggle switch thumb |
| `pinFocusPulse` | Pulsing box-shadow for focused PIN input boxes |
| `spinRing` | 360-degree rotation for loading spinners |

**Reduced motion:** The global rule in `globals.css` sets `animation-duration: 0.01ms !important` and `transition-duration: 0.01ms !important` on all elements when `prefers-reduced-motion: reduce` is active.

---

## 10. Forms & Validation

### useForm Hook

The `useForm` hook provides generic form state management with validation.

**Pattern:**

```tsx
const { values, errors, handleChange, handleBlur, handleSubmit, isValid, isDirty, reset } = useForm(
  { email: '', password: '' },          // initial values
  (vals) => validateLoginForm(vals)      // validation function
);
```

- **Progressive error display:** Errors only appear for fields that have been touched (via `handleBlur`) or changed (via `handleChange`). On `handleSubmit`, all fields are marked as touched so all errors become visible.
- **Async submission:** `handleSubmit` accepts an async callback. It sets `isSubmitting = true` during the call and resets it afterward.
- **Dirty tracking:** `isDirty` is `true` when any field value differs from its initial value.

### validators.ts

All validators are pure functions that return translation error keys (e.g., `'error_email_required'`), not pre-translated strings. This means error messages automatically respect the active language when resolved via `t[errorKey]`.

**Individual field validators:**

- `validateEmail(email)` -- RFC-compliant regex check
- `validatePassword(password)` -- minimum 8 characters, 1 uppercase, 1 number
- `getPasswordStrength(password)` -- returns `0 | 1 | 2 | 3` score
- `validateNickname(nickname)` -- 2-20 characters
- `validatePinCode(pin)` -- exactly 4 numeric digits

**Composite form validators:**

- `validateLoginForm({ email, password })` -- validates login fields together
- `validateParentAccountStep(values)` -- step 1: email, password, confirm, country, terms
- `validateChildProfileStep(values)` -- step 2: nickname, age group, grade level
- `validatePreferencesStep(values)` -- step 3: PIN, confirm PIN, minimum 2 subjects

---

## 11. Multi-Step Onboarding

The onboarding flow consists of **4 steps** managed by the `GetStartedPage` component:

| Step | Component | Collects |
| ---- | --------- | -------- |
| 1 | `StepParentAccount` | Email, password (with strength meter), confirm password, country, terms agreement |
| 2 | `StepChildProfile` | Nickname, age group (3-6 / 7-11 / 12-15), grade level, avatar emoji, preferred language |
| 3 | `StepPreferences` | Daily time limit (slider, 15-120 min), allowed subjects (toggle chips), voice on/off, parent PIN |
| 4 | `StepWelcome` | Confirmation summary with masked email, child profile, safety settings, confetti celebration |

**Data flow:**

1. `GetStartedPage` uses `useMultiStep(4)` for navigation state and holds partial form data in three `useState` hooks (`parentData`, `childData`, `preferencesData`).
2. Each step component receives the translation map `t` and an `onComplete` callback.
3. When a step's form is valid and submitted, the step calls `onComplete(data)`, which merges the data into the parent state and advances to the next step via `goToNextStep()`.
4. Step transitions are animated with `slideInFromRight` (forward) or `slideInFromLeft` (backward), controlled by a `direction` state variable.
5. The `StepIndicator` component displays numbered circles connected by lines, with completed steps showing checkmarks.
6. The `ProgressBar` component shows a horizontal bar representing `progressPercent` from `useMultiStep`.

---

## 12. Accessibility

KidsMind targets **WCAG 2.1 AA** compliance:

- **Skip navigation link** -- The `HomePage` renders a `<main id="main-content">` landmark, and the NavBar provides keyboard-accessible navigation.
- **ARIA attributes on all interactive elements:**
  - `role="radiogroup"` on the avatar picker grid and age group selection
  - `role="radio"` with `aria-checked` on individual avatar and age group buttons
  - `role="switch"` with `aria-checked` on the voice toggle
  - `role="progressbar"` with `aria-valuenow`, `aria-valuemin`, `aria-valuemax` on the progress bar
  - `role="alert"` on all error messages for screen reader announcement
  - `role="listbox"` and `role="option"` with `aria-selected` on the language dropdown
  - `aria-expanded` and `aria-haspopup` on dropdown trigger buttons
  - `aria-label` on all icon-only buttons (theme toggle, show/hide password, PIN digits)
  - `aria-invalid` on form inputs with errors
  - `aria-describedby` linking inputs to their error and hint text
- **`aria-live` regions** -- The nickname preview in `StepChildProfile` uses `aria-live="polite"` so screen readers announce changes dynamically.
- **Focus management** -- `:focus-visible` is styled globally with a 3px `var(--accent-main)` outline. The `.srOnly` utility class in `globals.css` provides visually hidden text for screen readers.
- **`prefers-reduced-motion`** -- All animations and transitions are reduced to near-zero duration when this media query is active.
- **`aria-hidden="true"`** -- Decorative elements (emoji spans, illustrations, confetti, icons) are hidden from the accessibility tree.

---

## 13. Performance

- **Route-level code splitting** -- `LoginPage` and `GetStartedPage` are lazy-loaded via `React.lazy()` in `App.tsx`. The `Suspense` fallback shows a centered spinner using the `spinRing` animation.
- **Section-level code splitting** -- Inside `HomePage`, all sections below the hero (`AgeGroupSelector`, `FeaturesGrid`, `HowItWorks`, `SafetyBanner`, `TestimonialCarousel`, `CTASection`, `Footer`) are lazy-loaded with a `SectionSkeleton` fallback.
- **CSS Modules** -- Vite tree-shakes unused CSS at build time because each component's styles are imported explicitly.
- **Synchronous validation** -- All validator functions are pure and synchronous (sub-millisecond execution). No async validation or debouncing overhead.
- **Scoped re-renders** -- Each onboarding step is an independent component with its own `useForm` instance. Changing a field in step 2 does not re-render step 1 or step 3.
- **Scroll position optimization** -- `useScrollPosition` uses `requestAnimationFrame` to throttle scroll event processing, preventing layout thrashing.
- **IntersectionObserver** -- `useScrollReveal` uses `IntersectionObserver` (not scroll listeners) for element visibility detection, with automatic `disconnect()` after first reveal when `once: true`.

---

## 14. Component API Reference

### AuthLayout

Split-screen layout wrapper for authentication pages.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `illustrationVariant` | `'login' \| 'register'` | -- | Which SVG illustration to show in the left panel |
| `children` | `React.ReactNode` | -- | Form content rendered in the right panel |
| `t` | `TranslationMap` | -- | Active translation map |
| `lang` | `LanguageCode` | -- | Current language code |
| `onSetLang` | `(code: LanguageCode) => void` | -- | Language change callback |
| `theme` | `ThemeMode` | -- | Current theme (`'light'` or `'dark'`) |
| `onToggleTheme` | `() => void` | -- | Theme toggle callback |

### FormField

Reusable form field with label, input/select/checkbox, error display, and hint text.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `id` | `string` | -- | Unique ID for the input element and label association |
| `label` | `string` | -- | Label text displayed above the input |
| `type` | `'text' \| 'email' \| 'number' \| 'select' \| 'checkbox'` | `'text'` | Input type to render |
| `value` | `string` | -- | Current field value |
| `error` | `string \| undefined` | `undefined` | Error message to display (triggers shake animation) |
| `placeholder` | `string \| undefined` | `undefined` | Placeholder text for input or first disabled option for select |
| `hint` | `string \| undefined` | `undefined` | Hint text displayed below the input |
| `required` | `boolean \| undefined` | `undefined` | Shows a red asterisk after the label |
| `autoComplete` | `string \| undefined` | `undefined` | HTML autocomplete attribute value |
| `onChange` | `(value: string) => void` | -- | Value change callback |
| `onBlur` | `(() => void) \| undefined` | `undefined` | Blur callback (used for touch-based validation) |
| `children` | `React.ReactNode \| undefined` | `undefined` | `<option>` elements when `type="select"` |

### PasswordField

Password input with visibility toggle and optional strength meter.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `id` | `string` | -- | Unique input ID |
| `label` | `string` | -- | Label text |
| `value` | `string` | -- | Current password value |
| `error` | `string \| undefined` | `undefined` | Error message |
| `placeholder` | `string \| undefined` | `undefined` | Placeholder text |
| `showStrengthMeter` | `boolean \| undefined` | `undefined` | Show the 4-segment strength bar below input |
| `autoComplete` | `'current-password' \| 'new-password' \| undefined` | `undefined` | Autocomplete hint |
| `onChange` | `(value: string) => void` | -- | Value change callback |
| `onBlur` | `(() => void) \| undefined` | `undefined` | Blur callback |
| `t` | `TranslationMap \| undefined` | `undefined` | Translation map for strength labels (Weak/Fair/Strong) |

### AvatarPicker

4x4 emoji avatar grid selection with radiogroup semantics.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `selectedEmoji` | `string` | -- | Currently selected emoji character |
| `onSelect` | `(emoji: string) => void` | -- | Selection callback |
| `label` | `string` | -- | Accessible group label |

### ProgressBar

Animated horizontal progress bar.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `percent` | `number` | -- | Fill percentage (clamped to 0-100) |
| `label` | `string \| undefined` | `undefined` | Label text and ARIA label |
| `animated` | `boolean \| undefined` | `undefined` | Enable CSS animation on fill |

### StepIndicator

Visual step tracker for the multi-step onboarding flow.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `steps` | `OnboardingStep[]` | -- | Array of step configuration objects |
| `currentIndex` | `number` | -- | Zero-based index of the current step |
| `t` | `TranslationMap` | -- | Translation map for step title labels |

### LoginForm

Full login form with email, password, server error banner, and navigation links.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `t` | `TranslationMap` | -- | Active translation map |
| `onSuccess` | `() => void` | -- | Callback invoked after successful login |

### StepParentAccount

Step 1 of onboarding: parent account creation.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `t` | `TranslationMap` | -- | Active translation map |
| `lang` | `LanguageCode` | -- | Current language code (pre-fills language field) |
| `onComplete` | `(data: ParentAccountFormData) => void` | -- | Callback with validated form data |

### StepChildProfile

Step 2 of onboarding: child profile creation.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `t` | `TranslationMap` | -- | Active translation map |
| `lang` | `LanguageCode` | -- | Current language code (pre-fills preferred language) |
| `onComplete` | `(data: ChildProfileFormData) => void` | -- | Callback with validated form data |

### StepPreferences

Step 3 of onboarding: safety and learning preferences.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `t` | `TranslationMap` | -- | Active translation map |
| `onComplete` | `(data: PreferencesFormData) => void` | -- | Callback with validated form data |

### StepWelcome

Step 4 of onboarding: confirmation summary and celebration.

| Prop | Type | Default | Description |
| ---- | ---- | ------- | ----------- |
| `t` | `TranslationMap` | -- | Active translation map |
| `parentData` | `Partial<ParentAccountFormData>` | -- | Data collected in step 1 |
| `childData` | `Partial<ChildProfileFormData>` | -- | Data collected in step 2 |
| `preferencesData` | `Partial<PreferencesFormData>` | -- | Data collected in step 3 |
| `onFinish` | `() => void` | -- | Callback when user clicks the final CTA |

---

## 15. Hook API Reference

### useForm

Generic form state management with validation, dirty tracking, and async submission.

```ts
function useForm<T extends object>(
  initialValues: T,
  validate: (values: T) => FormErrors
): UseFormReturn<T>
```

**Parameters:**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `initialValues` | `T` | Default values for all form fields |
| `validate` | `(values: T) => FormErrors` | Synchronous validation function returning `{ fieldName: 'error_key' }` |

**Returns:**

| Property | Type | Description |
| -------- | ---- | ----------- |
| `values` | `T` | Current form values |
| `errors` | `FormErrors` | Validation errors for touched/changed fields |
| `isDirty` | `boolean` | `true` if any field differs from initial values |
| `isValid` | `boolean` | `true` if `validate(values)` returns no errors |
| `isSubmitting` | `boolean` | `true` during async `handleSubmit` execution |
| `handleChange` | `(field: keyof T, value: unknown) => void` | Update a field and re-validate |
| `handleBlur` | `(field: keyof T) => void` | Mark a field as touched to show its errors |
| `handleSubmit` | `(onSubmit: (values: T) => Promise<void>) => Promise<void>` | Touch all fields, validate, and call `onSubmit` if valid |
| `reset` | `() => void` | Reset to initial values and clear all state |

**Example:**

```tsx
const { values, errors, handleChange, handleBlur, handleSubmit } = useForm(
  { email: '', password: '' },
  validateLoginForm
);

<input
  value={values.email}
  onChange={(e) => handleChange('email', e.target.value)}
  onBlur={() => handleBlur('email')}
/>
```

---

### useMultiStep

Multi-step flow navigation with progress tracking.

```ts
function useMultiStep(totalSteps: number, initialStep?: number): UseMultiStepReturn
```

**Parameters:**

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `totalSteps` | `number` | -- | Total number of steps in the flow |
| `initialStep` | `number` | `0` | Starting step index |

**Returns:**

| Property | Type | Description |
| -------- | ---- | ----------- |
| `currentStepIndex` | `number` | Zero-based current step index |
| `totalSteps` | `number` | Total number of steps |
| `progressPercent` | `number` | Progress as a percentage (0-100) |
| `isFirstStep` | `boolean` | `true` if on step 0 |
| `isFinalStep` | `boolean` | `true` if on the last step |
| `goToNextStep` | `() => void` | Advance to next step (clamped) |
| `goToPreviousStep` | `() => void` | Go back one step (clamped) |
| `goToStep` | `(index: number) => void` | Jump to a specific step (clamped) |

**Example:**

```tsx
const { currentStepIndex, goToNextStep, progressPercent } = useMultiStep(4);
```

---

### useTheme

Dark/light theme toggle with localStorage persistence and system preference detection.

```ts
function useTheme(): { theme: ThemeMode; toggleTheme: () => void }
```

**Returns:**

| Property | Type | Description |
| -------- | ---- | ----------- |
| `theme` | `ThemeMode` (`'light' \| 'dark'`) | Current active theme |
| `toggleTheme` | `() => void` | Switch between light and dark |

**Example:**

```tsx
const { theme, toggleTheme } = useTheme();
```

---

### useLanguage

Internationalization hook providing translations, language state, and RTL detection.

```ts
function useLanguage(): {
  lang: LanguageCode;
  setLang: (code: LanguageCode) => void;
  t: TranslationMap;
  isRTL: boolean;
}
```

**Returns:**

| Property | Type | Description |
| -------- | ---- | ----------- |
| `lang` | `LanguageCode` | Current language code (`'en'`, `'fr'`, `'es'`, `'it'`, `'ar'`, `'zh'`) |
| `setLang` | `(code: LanguageCode) => void` | Change the active language |
| `t` | `TranslationMap` | Object with all translated strings for the active language |
| `isRTL` | `boolean` | `true` when the active language is Arabic |

**Example:**

```tsx
const { lang, setLang, t, isRTL } = useLanguage();

<h1>{t.hero_title}</h1>
<button onClick={() => setLang('fr')}>Francais</button>
```

---

### useScrollReveal

IntersectionObserver-based element visibility detection for scroll-triggered animations.

```ts
function useScrollReveal(options?: ScrollRevealOptions): {
  ref: React.RefObject<HTMLElement | null>;
  isVisible: boolean;
}
```

**Parameters (optional):**

| Parameter | Type | Default | Description |
| --------- | ---- | ------- | ----------- |
| `threshold` | `number` | `0.15` | Visibility threshold (0-1) |
| `rootMargin` | `string` | `'0px 0px -60px 0px'` | IntersectionObserver root margin |
| `once` | `boolean` | `true` | Disconnect observer after first reveal |

**Returns:**

| Property | Type | Description |
| -------- | ---- | ----------- |
| `ref` | `React.RefObject<HTMLElement \| null>` | Attach to the target element |
| `isVisible` | `boolean` | `true` when the element is visible in the viewport |

**Example:**

```tsx
const { ref, isVisible } = useScrollReveal({ threshold: 0.2 });

<section ref={ref} style={{ opacity: isVisible ? 1 : 0 }}>
  Content
</section>
```

---

### useScrollPosition

Scroll position tracking with `requestAnimationFrame` throttling.

```ts
function useScrollPosition(): {
  scrollY: number;
  isScrolled: boolean;
}
```

**Returns:**

| Property | Type | Description |
| -------- | ---- | ----------- |
| `scrollY` | `number` | Current `window.scrollY` value |
| `isScrolled` | `boolean` | `true` when `scrollY > 20` (useful for navbar shadow) |

**Example:**

```tsx
const { isScrolled } = useScrollPosition();

<nav className={isScrolled ? styles.navScrolled : styles.nav}>
```

---

### useInterval

Safe `setInterval` wrapper with automatic cleanup on unmount.

```ts
function useInterval(callback: () => void, delay: number | null): void
```

**Parameters:**

| Parameter | Type | Description |
| --------- | ---- | ----------- |
| `callback` | `() => void` | Function to call on each interval tick |
| `delay` | `number \| null` | Interval in milliseconds. Pass `null` to pause the interval. |

**Example:**

```tsx
useInterval(() => {
  setSlide((prev) => (prev + 1) % totalSlides);
}, 3500);
```

---

## 16. Utility Functions

### validateEmail

```ts
function validateEmail(email: string): string
```

Validates email format using an RFC-compliant regex. Returns a translation error key (`'error_email_required'` or `'error_email_invalid'`) or an empty string if valid.

```ts
validateEmail('')                 // 'error_email_required'
validateEmail('bad')              // 'error_email_invalid'
validateEmail('user@example.com') // ''
```

### validatePassword

```ts
function validatePassword(password: string): string
```

Enforces minimum 8 characters, at least 1 uppercase letter, and at least 1 number. Returns a translation error key or empty string.

```ts
validatePassword('')           // 'error_password_required'
validatePassword('short')      // 'error_password_too_short'
validatePassword('alllower1')  // 'error_password_no_uppercase'
validatePassword('AllUpper')   // 'error_password_no_number'
validatePassword('Valid1pwd')  // ''
```

### getPasswordStrength

```ts
function getPasswordStrength(password: string): 0 | 1 | 2 | 3
```

Scores password strength from 0 (empty/very short) to 3 (strong). Criteria: length >= 8, mixed case, digits, special characters.

```ts
getPasswordStrength('')            // 0
getPasswordStrength('abc')         // 0
getPasswordStrength('abcdefgh')    // 1
getPasswordStrength('Abcdefgh')    // 2
getPasswordStrength('Abcdefg1!')   // 3
```

### validateNickname

```ts
function validateNickname(nickname: string): string
```

Enforces 2-20 character limit. Returns a translation error key or empty string.

```ts
validateNickname('')     // 'error_nickname_required'
validateNickname('A')    // 'error_nickname_too_short'
validateNickname('Sam')  // ''
```

### validatePinCode

```ts
function validatePinCode(pin: string): string
```

Requires exactly 4 numeric digits. Returns a translation error key or empty string.

```ts
validatePinCode('')      // 'error_pin_required'
validatePinCode('12')    // 'error_pin_must_be_4_digits'
validatePinCode('abcd')  // 'error_pin_must_be_4_digits'
validatePinCode('1234')  // ''
```

### validateLoginForm

```ts
function validateLoginForm(values: { email: string; password: string }): FormErrors
```

Combines `validateEmail` and `validatePassword`. Returns a `FormErrors` object with `email` and/or `password` keys.

### validateParentAccountStep

```ts
function validateParentAccountStep(values: ParentAccountFormData): FormErrors
```

Validates all step 1 fields: email, password, confirm password match, country, and terms agreement.

### validateChildProfileStep

```ts
function validateChildProfileStep(values: ChildProfileFormData): FormErrors
```

Validates step 2 fields: nickname, age group, and grade level.

### validatePreferencesStep

```ts
function validatePreferencesStep(values: PreferencesFormData): FormErrors
```

Validates step 3 fields: PIN code, confirm PIN match, and minimum 2 allowed subjects.

### applyTheme

```ts
function applyTheme(theme: ThemeMode): void
```

Sets `data-theme` attribute on `document.documentElement`. Called internally by `useTheme`.

---

## 17. Adding a New Page

1. **Create the page component** in `src/pages/`:

   ```tsx
   // src/pages/DashboardPage.tsx
   import { useTheme } from '../hooks/useTheme';
   import { useLanguage } from '../hooks/useLanguage';

   export default function DashboardPage() {
     const { theme } = useTheme();
     const { t, lang } = useLanguage();

     return (
       <div data-theme={theme} lang={lang}>
         <h1>{t.dashboard_title}</h1>
       </div>
     );
   }
   ```

2. **Add the route** in `src/App.tsx` with lazy loading:

   ```tsx
   const DashboardPage = React.lazy(() => import('./pages/DashboardPage'));

   // Inside <Routes>:
   <Route path="/dashboard" element={<DashboardPage />} />
   ```

3. **Add translation keys** to `TranslationMap` in `src/types/index.ts`:

   ```ts
   export interface TranslationMap {
     // ... existing keys ...
     dashboard_title: string;
   }
   ```

   Then add the translated values for all 6 languages in `src/utils/translations.ts`.

4. **Lazy import** ensures automatic code splitting -- no additional configuration needed.

---

## 18. Adding a New Language

1. **Add the code** to the `LanguageCode` type in `src/types/index.ts`:

   ```ts
   export type LanguageCode = 'en' | 'fr' | 'es' | 'it' | 'ar' | 'zh' | 'de';
   ```

2. **Add the language entry** in `src/utils/constants.ts`:

   ```ts
   export const LANGUAGES: Language[] = [
     // ... existing ...
     { code: 'de', label: 'Deutsch', flag: '\u{1F1E9}\u{1F1EA}', dir: 'ltr' },
   ];
   ```

3. **Add the full translation entry** in `src/utils/translations.ts`:

   ```ts
   const translations: Translations = {
     // ... existing ...
     de: {
       dir: 'ltr',
       nav_login: 'Anmelden',
       nav_start: 'Loslegen',
       // ... every key from TranslationMap must be defined ...
     },
   };
   ```

   TypeScript will produce a compile error if any key from `TranslationMap` is missing.

4. **Test RTL** if the new language uses right-to-left script. Set `dir: 'rtl'` in the language entry and verify that all CSS logical properties (`margin-inline-start`, `padding-inline-end`, etc.) produce correct layouts.

---

## 19. Contributing

### Code Standards

- **TypeScript strict mode** -- `strict: true` is enforced. Zero `any` types. All function parameters and return types must be explicitly typed or correctly inferred.
- **CSS Modules only** -- Every component gets a co-located `.module.css` file. Use `var(--token)` for all colors, spacing, and typography. Never hard-code hex values in component styles.
- **Logical CSS properties** -- Use `margin-inline-start` instead of `margin-left`, `padding-inline-end` instead of `padding-right`, etc. This ensures correct behavior in RTL languages.
- **`prefers-reduced-motion`** -- All new animations must be wrapped or covered by the global reduced-motion media query in `globals.css`. Avoid adding animation overrides that bypass this rule.
- **WCAG 2.1 AA** -- All interactive elements must have accessible names (via `aria-label`, visible label, or `aria-labelledby`). Form errors must use `role="alert"`. Decorative elements must have `aria-hidden="true"`.
- **Pure validators** -- Validation functions return translation keys, not translated strings. Keep them in `src/utils/validators.ts`.
- **No global state** -- Use `useState` within components or custom hooks. If cross-page state becomes necessary, discuss the approach before introducing a state management library.

### File Naming

- Components: `PascalCase/PascalCase.tsx` + `PascalCase.module.css`
- Hooks: `camelCase.ts` (prefixed with `use`)
- Utilities: `camelCase.ts`
- Types: `src/types/index.ts` (single barrel file)
