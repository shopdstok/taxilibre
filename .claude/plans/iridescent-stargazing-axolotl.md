# Plan: Improve TaxiLibre Interfaces and Activate Interior Links

## Context
The TaxiLibre application consists of three frontend interfaces (passenger, driver, admin). 
- Passenger-web has a Layout component with navigation and footer, but contains broken links:
  * Payment link points to "/payment" while the route expects "/payment/:rideId"
  * Footer links to /help, /contact, /faq, /terms, /privacy, /cookies lack corresponding routes
- Driver-web and admin-dashboard lack any navigation menu, making interior links inaccessible beyond direct URL access.
The goal is to improve all three interfaces by adding consistent navigation, fixing broken links, and ensuring all interior links are active.

## Approach
### 1. Passenger-web Improvements
#### a. Fix Payment Routing
- Create a new component `PaymentMethods.jsx` for managing payment methods (linked from "/payment")
- Update existing `Payment.jsx` to extract `rideId` from route params and use it for payment processing (keep route "/payment/:rideId")
- Update navigation in `Layout.jsx` to point Payment link to "/payment" (payment methods)
#### b. Create Missing Static Pages
- Create simple static pages for: Help, Contact, FAQ, Terms, Privacy, Cookies under `src/pages/`
#### c. Update Navigation & Footer
- Ensure navigation active styling works correctly (already implemented)
- Update footer links to point to newly created static pages
- Fix redirect after mock payment in `Payment.jsx` to go to a valid route (e.g., "/dashboard" or "/ride-history")
#### d. Ensure Consistent UI
- Verify responsive mobile menu works correctly

### 2. Driver-web Improvements
#### a. Create/Adapt Layout Component
- Use existing unused `Layout.tsx` as base or create new Layout component with:
  * Header with logo and user menu
  * Sidebar navigation (or top navigation) with items: Dashboard, Earnings, Ride History, Profile, Documents
  * Authentication-protected links
  * Footer with quick links, support, legal sections
#### b. Integrate Layout
- Replace current header/footer in `App-simple.jsx` with the Layout component
- Ensure `routes` are wrapped within Layout's main content area
#### c. Add Missing Static Pages
- Create same static pages (Help, Contact, FAQ, Terms, Privacy, Cookies) under driver-web src/pages/
#### d. Ensure Authentication
- Use existing auth context/store to protect routes and navigation items

### 3. Admin-dashboard Improvements
#### a. Create Layout Component
- Create Layout component with:
  * Header with logo and user menu
  * Sidebar navigation with items: Dashboard, Drivers, Rides, Users, Revenue, Support, Settings
  * Authentication-protected links
  * Footer with quick links, support, legal sections
#### b. Integrate Layout
- Wrap routes in `App.jsx` with Layout component
#### c. Add Missing Static Pages
- Create same static pages under admin-dashboard src/pages/
#### d. Ensure Authentication
- Use existing auth store to protect routes

## Verification Steps
1. Start each frontend in development mode:
   - `npm run dev:passenger`
   - `npm run dev:driver`
   - `npm run dev:admin`
2. Verify navigation:
   - All navigation links are visible and clickable
   - Active link styling indicates current route
   - Mobile menu toggles correctly
3. Verify routes:
   - Each navigation destination loads correct component
   - Footer links load static pages
   - Protected routes redirect unauthenticated users to login
4. Test payment flow:
   - Navigate to Payment Methods page
   - Simulate payment processing for a ride (if applicable)
5. Run existing test suite to ensure no regressions:
   - `npm test` in each relevant package
6. Check responsiveness across screen sizes

## Files to Modify/Create
### Passenger-web
- `src/App.jsx` - add new routes for static pages and payment methods
- `src/components/Layout.jsx` - update Payment link href
- `src/pages/PaymentMethods.jsx` (new)
- `src/pages/Help.jsx`, `Contact.jsx`, `FAQ.jsx`, `Terms.jsx`, `Privacy.jsx`, `Cookies.jsx` (new)
- `src/pages/Payment.jsx` - modify to use rideId param and fix redirect

### Driver-web
- `src/App-simple.jsx` - replace header/footer with Layout
- `src/components/Layout.tsx` - adapt or create new navigation
- Static pages under `src/pages/` (same as passenger-web)

### Admin-dashboard
- `src/App.jsx` - wrap routes with Layout
- `src/components/Layout.jsx` (new)
- Static pages under `src/pages/` (same as passenger-web)

---
*Plan ready for implementation. Proceed to coding phase upon approval.*