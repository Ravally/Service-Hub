# Service Hub Mobile App Launch Plan - Complete Roadmap

## Executive Summary

This plan provides a complete roadmap for launching Service Hub's mobile application using **Expo** (React Native). The implementation spans **24 weeks (~6 months)** and covers all phases from web foundation through mobile app launch and app store submission.

**Timeline**: 24 weeks total
- **Phase 2.3**: Job Forms & Checklists (Web Foundation) - 6 weeks
- **Phase 2.1**: Mobile App Development (Expo) - 10 weeks
- **Phase 2.2**: GPS Tracking & Route Optimization - 4 weeks
- **Testing & QA** - 2 weeks
- **Deployment & App Store** - 2 weeks

**Key Technology Decision: Expo**
- Managed workflow with over-the-air (OTA) updates
- Built-in modules for camera, GPS, push notifications
- Single codebase for iOS and Android
- Cloud build service (no Mac required for iOS builds)
- Faster development cycle (30-40% faster than bare React Native)
- Excellent Firebase integration

---

## Context & Current State

### Phase 1 Complete ✅

Phase 1 (Client Hub, Automated Communications, Time Tracking) has been completed:
- ✅ Enhanced client portal with self-service
- ✅ Automated email/SMS framework
- ✅ Time tracking with payroll export (Xero/MYOB formats)

### Existing Architecture Strengths

**Job Data Model** (from exploration):
- Jobs stored at: `users/{userId}/jobs/{jobId}`
- Existing arrays: `checklist[]`, `laborEntries[]`, `expenses[]`, `visits[]`, `lineItems[]`
- JobDetailView: 1,172 lines with comprehensive tabs

**Form Patterns**:
- Simple forms: local useState (~320 lines)
- Complex forms: nested arrays with conditionals (~560 lines)
- Validation: centralized in `utils/validation.js`
- Consistent Tailwind styling

**Data Management**:
- Firebase Auth with user-scoped collections
- Real-time subscriptions via `onSnapshot`
- Generic CRUD via `useFirestoreCollection`
- Context-based state management

**Current Gaps for Mobile**:
- ❌ No offline sync mechanism
- ❌ No conflict resolution
- ❌ No optimistic updates
- ❌ No local database (SQLite/IndexedDB)
- ❌ No background sync queue

---

## Technology Stack

### Web Application (Phase 2.3)
| Technology | Purpose |
|------------|---------|
| React 18 | UI framework (existing) |
| Firebase | Backend (existing) |
| Tailwind CSS | Styling (existing) |
| React contexts | State management |

### Mobile Application (Phase 2.1)
| Technology | Purpose |
|------------|---------|
| **Expo SDK 50+** | React Native framework |
| **Expo Location** | GPS tracking & navigation |
| **Expo Camera** | Photo capture |
| **Expo ImagePicker** | Photo library access |
| **Expo Notifications** | Push notifications |
| **Expo SQLite + WatermelonDB** | Offline database |
| **React Navigation 6** | App navigation |
| **Firebase** | Backend sync |
| **react-native-maps** | Map visualization |
| **Zustand** | Lightweight state |
| **EAS Build** | Cloud builds |
| **EAS Submit** | App store automation |

### Required NPM Packages (Mobile)
```json
{
  "expo": "~50.0.0",
  "expo-camera": "~14.0.0",
  "expo-image-picker": "~14.7.0",
  "expo-location": "~16.5.0",
  "expo-notifications": "~0.27.0",
  "expo-sqlite": "~13.0.0",
  "@react-navigation/native": "^6.1.0",
  "@react-navigation/stack": "^6.3.0",
  "@react-navigation/bottom-tabs": "^6.5.0",
  "@nozbe/watermelondb": "^0.27.0",
  "zustand": "^4.5.0",
  "react-native-maps": "^1.10.0",
  "react-native-paper": "^5.12.0",
  "date-fns": "^3.0.0",
  "firebase": "^10.3.0"
}
```

---

## Phase 2.3: Job Forms & Checklists (Web Foundation)

**Duration**: 6 weeks
**Goal**: Build customizable form builder on web that mobile will consume

### Why Start with Web Forms?

1. **Mobile Dependency**: Mobile app will render forms from templates stored in Firestore
2. **Data Structure**: Establishes form schema that both platforms use
3. **Business Value**: Immediate value to web users while mobile is in development
4. **Risk Reduction**: Validate form system before mobile complexity
5. **Parallel Work**: Mobile setup can happen while forms are tested

### Week 1-2: Data Models & Form Builder

#### New Firestore Collections

**Collection**: `users/{userId}/formTemplates/{templateId}`
```javascript
{
  id: string,
  name: string,
  description: string,
  type: 'job_form' | 'checklist' | 'inspection',
  fields: [
    {
      id: string,
      type: 'text' | 'number' | 'date' | 'select' | 'checkbox' | 'photo' | 'signature',
      label: string,
      placeholder: string,
      required: boolean,
      options: string[], // for select/multiselect
      validation: {
        min?: number,
        max?: number,
        pattern?: string,
        message?: string
      }
    }
  ],
  createdAt: string,
  updatedAt: string
}
```

**Collection**: `users/{userId}/formResponses/{responseId}`
```javascript
{
  id: string,
  templateId: string,
  jobId: string,
  clientId: string,
  submittedBy: string,
  submittedAt: string,
  responses: {
    [fieldId]: any
  },
  attachments: string[], // Firebase Storage URLs
  location: {
    lat: number,
    lng: number,
    accuracy: number,
    timestamp: string
  },
  offline: boolean,
  syncedAt: string
}
```

#### Files to Create

**1. src/constants/formFieldTypes.js** (~50 lines)
- Define all field types (text, number, date, select, photo, signature, etc.)
- Field type labels and icons
- Default validation rules per type

**2. src/hooks/data/useFormTemplates.js** (~150 lines)
- Wraps `useFirestoreCollection` for templates
- CRUD operations: add, update, delete, duplicate
- `getTemplateById(id)` helper

**3. src/hooks/data/useFormResponses.js** (~150 lines)
- CRUD for form responses
- `getResponsesByJob(jobId)`
- `getResponsesByTemplate(templateId)`
- `submitResponse(data)` with offline flag

**4. src/components/forms/FormBuilder.jsx** (~400 lines)
- Drag-and-drop form field builder
- Field configuration panel (type, label, validation)
- Live preview mode
- Save/load templates
- Duplicate templates

**5. src/components/forms/FormRenderer.jsx** (~300 lines)
- Dynamic form rendering from template
- Real-time validation
- Photo upload with compression
- Signature capture modal
- Save draft functionality

**6. src/components/forms/FormFieldEditor.jsx** (~200 lines)
- Edit individual field properties
- Validation rule builder
- Conditional logic (show field X if Y = value)

#### Export Hooks
Add to `src/hooks/data/index.js`:
```javascript
export { useFormTemplates } from './useFormTemplates';
export { useFormResponses } from './useFormResponses';
```

### Week 3-4: Checklist System & Job Integration

#### Update Job Model

**File**: `src/constants/initialStates.js`
```javascript
export const initialJobState = {
  // ... existing fields
  formTemplates: [], // templateIds attached to job
  formResponses: [], // responseIds
  checklist: [], // enhanced checklist items
  checklistTemplateId: null,
};

export const initialChecklistItem = {
  id: string,
  text: string,
  completed: boolean,
  completedBy: string, // staffId
  completedAt: string,
  required: boolean,
  notes: string,
  photos: string[],
  order: number
};
```

#### Files to Create

**7. src/components/forms/ChecklistBuilder.jsx** (~250 lines)
- Create/edit checklist templates
- Drag-and-drop reordering
- Mark items as required
- Attach to job types

**8. src/components/jobs/JobChecklistView.jsx** (~200 lines)
- Display active checklist
- Mark complete with photos/notes
- Progress indicator
- Completion percentage

#### Files to Modify

**9. src/components/JobDetailView.jsx**
- Add "Forms" tab
- Add "Checklist" tab
- "Attach Form" button to associate templates
- Show form responses in job detail

### Week 5-6: Testing & Sample Templates

#### Testing Checklist
- [ ] Create form template with 10+ fields
- [ ] Duplicate template
- [ ] Render form and submit response
- [ ] Attach form to job
- [ ] Complete checklist with photos
- [ ] View form responses in job detail
- [ ] Test validation (required fields, patterns)
- [ ] Test conditional fields

#### Sample Templates to Create
1. **Pool Service Checklist**
   - Test water chemistry
   - Clean skimmer baskets
   - Brush walls and floor
   - Chemical adjustments
   - Photo of pool

2. **HVAC Inspection Form**
   - System type (select)
   - Temperature readings (number)
   - Filter condition (select)
   - Refrigerant levels (number)
   - Signature field

3. **Pest Control Treatment**
   - Areas treated (multiselect)
   - Chemicals used (text)
   - Safety precautions (checkbox)
   - Next service date (date)
   - Before/after photos

4. **Property Inspection**
   - Room-by-room checklist
   - Condition ratings
   - Photo per room
   - Notes field
   - Client signature

5. **Equipment Maintenance**
   - Equipment ID
   - Maintenance type
   - Parts replaced
   - Hours of operation
   - Photo of serial number

### Deliverables Week 6
- ✅ Fully functional form builder
- ✅ Template library with 5+ industry templates
- ✅ Checklist system integrated into jobs
- ✅ Form responses viewable in job detail
- ✅ Documentation for admins
- ✅ Mobile-ready data structures in Firestore

---

## Phase 2.1: Mobile App with Expo

**Duration**: 10 weeks
**Goal**: Launch iOS/Android apps with core field service features

### Week 1: Project Setup & Authentication

#### Initialize Expo Project

```bash
# Create new Expo project
npx create-expo-app@latest service-hub-mobile --template blank

cd service-hub-mobile

# Install core dependencies
npx expo install expo-dev-client
npx expo install expo-location expo-camera expo-image-picker
npx expo install expo-notifications expo-sqlite
npx expo install @react-navigation/native @react-navigation/stack @react-navigation/bottom-tabs
npx expo install react-native-safe-area-context react-native-screens
npx expo install react-native-gesture-handler react-native-paper
npx expo install firebase @nozbe/watermelondb zustand date-fns

# Configure EAS
npm install -g eas-cli
eas login
eas init
eas build:configure
```

#### Project Structure

```
service-hub-mobile/
├── app.json
├── eas.json
├── App.js
├── src/
│   ├── navigation/
│   │   ├── AppNavigator.js
│   │   ├── AuthNavigator.js
│   │   └── TabNavigator.js
│   ├── screens/
│   │   ├── auth/
│   │   ├── jobs/
│   │   ├── clients/
│   │   ├── time/
│   │   └── profile/
│   ├── components/
│   ├── services/
│   │   ├── firebase.js
│   │   ├── sync.js
│   │   ├── location.js
│   │   └── notifications.js
│   ├── database/
│   │   ├── schema.js
│   │   └── models/
│   ├── hooks/
│   ├── store/
│   ├── utils/
│   └── constants/
└── .env
```

#### Key Configuration Files

**app.json** - Expo configuration with permissions
**eas.json** - Build profiles (development, preview, production)
**.env** - Firebase credentials and API keys

#### Authentication Service

**File**: `src/services/firebase.js` (~100 lines)
- Initialize Firebase with React Native persistence
- Use AsyncStorage for auth token caching
- Setup Firestore, Storage, Auth

**File**: `src/hooks/useAuth.js` (~150 lines)
- `onAuthStateChanged` listener
- Load user profile from Firestore
- Cache profile to AsyncStorage for offline
- `signIn(email, password)` method
- `logout()` with cache clear

#### Deliverables Week 1
- ✅ Expo project initialized
- ✅ EAS configured for builds
- ✅ Firebase auth working
- ✅ Basic navigation structure
- ✅ Login/logout flow
- ✅ Splash screen and app icon

### Week 2-3: Job Management & Today's Jobs

#### Screens to Build

**1. TodayJobsScreen.js** (~300 lines)
- FlatList of jobs assigned to current user
- Filter for today's date
- Search by job title/client
- Pull-to-refresh
- Status badges with color coding
- Empty state: "No jobs scheduled for today"

**2. JobDetailScreen.js** (~500 lines)
- Complete job information
- Client details with call/navigate buttons
- Tabs: Overview, Checklist, Forms, Time, Photos
- Action buttons: Start Job, Complete Job, Add Note
- Offline indicator banner
- Real-time updates

#### Components to Build

**3. JobCard.js** (~150 lines)
- Display job summary
- Client name, time, address
- Status badge
- Quick actions (call, navigate)
- Clock in/out button

#### Data Layer

**4. src/hooks/useJobs.js** (~200 lines)
- Real-time listener to Firestore jobs collection
- Local SQLite cache via WatermelonDB
- Sync status tracking
- `getJobById(id)`, `getJobsByDate(date)`, `getTodayJobs()`

#### Deliverables Week 2-3
- ✅ Today's jobs list
- ✅ Job detail with tabs
- ✅ Client info display
- ✅ Status management
- ✅ Offline job viewing
- ✅ Real-time updates

### Week 4-5: Time Tracking & GPS

#### GPS Location Service

**File**: `src/services/location.js` (~250 lines)
- `requestLocationPermissions()` - foreground & background
- `getCurrentLocation()` - single location fetch
- `startBackgroundLocationTracking()` - continuous tracking
- `stopBackgroundLocationTracking()`
- Background task to log waypoints to AsyncStorage

#### Clock In/Out Screen

**File**: `src/screens/time/ClockInOutScreen.js` (~350 lines)
- Display current job
- Large "Clock In" button (green)
- Captures GPS on clock in
- Active timer display (HH:MM:SS)
- Large "Clock Out" button (red) when active
- Auto-calculates hours
- Add break functionality
- Offline support with sync queue

#### Update Time Entry Model

**File (web)**: `src/constants/initialStates.js`
```javascript
export const initialTimeEntry = {
  // ... existing fields
  location: {
    clockIn: { lat, lng, accuracy, timestamp },
    clockOut: { lat, lng, accuracy, timestamp },
    waypoints: [{ lat, lng, accuracy, timestamp }]
  },
  offline: boolean,
  syncedAt: string
};
```

#### Deliverables Week 4-5
- ✅ Clock in/out with GPS
- ✅ Background location tracking
- ✅ GPS waypoint logging
- ✅ Active timer display
- ✅ Offline time tracking
- ✅ Sync to Firestore when online

### Week 6-7: Forms, Checklists & Photos

#### Dynamic Form Rendering

**File**: `src/screens/jobs/JobFormScreen.js` (~400 lines)
- Load form template from Firestore
- Dynamic rendering of all field types
- Photo capture integration
- Signature capture
- Real-time validation
- Save draft locally
- Submit with offline queue

**File**: `src/components/FormField.js` (~300 lines)
- Universal field component
- Handles: text, number, date, select, checkbox, photo, signature
- Validation display
- Error messages

#### Checklist Screen

**File**: `src/screens/jobs/JobChecklistScreen.js` (~250 lines)
- Display checklist items
- Checkbox with completion tracking
- Add photos to items
- Add notes
- Progress bar
- Mark all complete button

#### Photo Capture Component

**File**: `src/components/PhotoCapture.js` (~200 lines)
- Camera launch with permissions
- Photo library picker
- Image compression (max 1920px width, 80% quality)
- Upload to Firebase Storage
- Queue uploads for offline
- Show upload progress

#### Deliverables Week 6-7
- ✅ Form rendering from templates
- ✅ All field types working
- ✅ Photo capture & upload
- ✅ Signature capture
- ✅ Checklist completion
- ✅ Offline form submission

### Week 8-9: Offline Sync & WatermelonDB

#### WatermelonDB Schema

**File**: `src/database/schema.js` (~150 lines)
```javascript
tableSchema({
  name: 'jobs',
  columns: [
    { name: 'firebase_id', type: 'string', isIndexed: true },
    { name: 'client_id', type: 'string', isIndexed: true },
    { name: 'title', type: 'string' },
    { name: 'status', type: 'string', isIndexed: true },
    { name: 'start', type: 'number', isIndexed: true },
    { name: 'data', type: 'string' }, // Full JSON
    { name: 'synced_at', type: 'number' },
  ]
}),
// Similar for: clients, time_entries, form_responses
```

#### Sync Engine

**File**: `src/services/sync.js` (~400 lines)
- `initialize()` - Setup network listener and real-time subscriptions
- `syncAll()` - Bidirectional sync (push pending, pull latest)
- `pushPendingChanges()` - Upload offline queue to Firestore
- `pullLatestData()` - Fetch updates from Firestore
- `setupRealtimeListeners()` - Listen for remote changes
- Conflict resolution: last-write-wins with timestamp

#### Network Status Hook

**File**: `src/hooks/useOffline.js` (~100 lines)
- Monitor network status with NetInfo
- Expose `isOnline` boolean
- Auto-trigger sync when coming back online
- Display offline banner in UI

#### Deliverables Week 8-9
- ✅ WatermelonDB schema
- ✅ Sync engine functional
- ✅ Offline queue for mutations
- ✅ Network status monitoring
- ✅ Conflict resolution
- ✅ Background sync

### Week 10: Push Notifications & Polish

#### Push Notifications

**File**: `src/services/notifications.js` (~200 lines)
- Register for push notifications
- Save Expo push token to Firestore user document
- Schedule daily job reminder (7 AM)
- Handle notification taps
- Display in-app notifications

#### Update Firestore Rules

**File (web)**: `firestore.rules`
```javascript
match /users/{uid} {
  // Allow mobile users to update push tokens
  allow update: if isOwner(uid) &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['expoPushToken', 'updatedAt']);
}
```

#### Polish Tasks
- Loading skeletons for all screens
- Error boundaries with retry
- Haptic feedback on interactions
- Pull-to-refresh animations
- Empty states with illustrations
- Success/error toasts (react-native-paper Snackbar)
- Dark mode support
- Accessibility labels

#### Deliverables Week 10
- ✅ Push notifications working
- ✅ Daily job reminders
- ✅ Polished UI with animations
- ✅ Error handling
- ✅ Dark mode
- ✅ Accessibility

---

## Phase 2.2: GPS Tracking & Route Optimization

**Duration**: 4 weeks
**Goal**: Add GPS tracking, route optimization, and navigation

### Week 1-2: GPS Infrastructure

#### Update Job Model for Routes

**File (web)**: `src/constants/initialStates.js`
```javascript
export const initialJobState = {
  // ... existing
  route: {
    optimized: boolean,
    order: number,
    estimatedDuration: number,
    estimatedDistance: number,
  },
  gpsTracking: {
    enabled: boolean,
    trackingStarted: string,
    waypoints: [],
    totalDistance: number,
  }
};
```

#### New Firestore Collection

**Collection**: `users/{userId}/routes/{routeId}`
```javascript
{
  id: string,
  staffId: string,
  date: string,
  jobs: [], // jobIds in optimized order
  optimizedAt: string,
  totalDistance: number,
  totalDuration: number,
  status: 'planned' | 'in_progress' | 'completed'
}
```

#### Route Optimization Algorithm

**File**: `src/services/routeOptimization.js` (~300 lines)
- `optimizeRoute(jobs, startLocation)` - greedy nearest-neighbor
- `calculateDistance(point1, point2)` - Haversine formula
- Google Maps Distance Matrix API integration (optional)
- Return jobs in optimized order with distances

#### Deliverables Week 1-2
- ✅ Route data model
- ✅ Route optimization algorithm
- ✅ Distance calculations
- ✅ Save routes to Firestore

### Week 3-4: Navigation & Visualization

#### Route Optimization Screen

**File**: `src/screens/route/RouteOptimizationScreen.js` (~400 lines)
- Display today's jobs on map
- "Optimize Route" button
- Show optimized order with ETAs
- Manually reorder if needed
- Navigate to first/next job
- Mark jobs complete from route view

#### Navigation Screen

**File**: `src/screens/navigation/NavigationScreen.js` (~300 lines)
- MapView with current location
- Destination marker
- Polyline route
- Distance and ETA display
- "Open in Maps" button (Google Maps/Waze)
- Navigation instructions

#### Map Utilities

**File**: `src/utils/maps.js` (~100 lines)
- `openMaps(lat, lng, address)` - Launch system maps app
- `openWaze(lat, lng)` - Launch Waze with fallback
- Platform-specific URL schemes

#### Deliverables Week 3-4
- ✅ Route optimization UI
- ✅ Visual route on map
- ✅ Navigation integration
- ✅ Distance/duration tracking
- ✅ Route history

---

## Testing & QA Phase

**Duration**: 2 weeks
**Goal**: Comprehensive testing for production readiness

### Week 1: Unit & Integration Testing

#### Testing Setup
```bash
npm install --save-dev @testing-library/react-native jest-expo
```

**jest.config.js** - Configure Jest with Expo preset

#### Test Files to Create
- `src/hooks/__tests__/useJobs.test.js`
- `src/services/__tests__/sync.test.js`
- `src/services/__tests__/location.test.js`
- `src/components/__tests__/JobCard.test.js`
- `src/utils/__tests__/formatters.test.js`

#### Coverage Goals
- Utils: 90%+
- Services: 80%+
- Hooks: 75%+
- Components: 70%+

### Week 2: Device Testing

#### Test Matrix
| Device | OS | Screen | Priority |
|--------|----|---------| ---------|
| iPhone 15 Pro | iOS 17 | 6.1" | High |
| iPhone SE 3 | iOS 16 | 4.7" | High |
| Samsung S23 | Android 14 | 6.1" | High |
| Google Pixel 7 | Android 13 | 6.3" | Medium |

#### Test Scenarios
1. **Authentication** - Login, logout, persistence
2. **Offline** - Airplane mode during job, sync when online
3. **GPS** - Clock in with location, background tracking
4. **Camera** - Photo capture, compression, upload
5. **Performance** - Launch time <3s, 60fps transitions

---

## Deployment & App Store Submission

**Duration**: 2 weeks
**Goal**: Launch on iOS App Store and Google Play Store

### Week 1: Build & Prepare

#### iOS Setup

**Requirements**:
- Apple Developer Account ($99/year)
- App Store Connect setup
- Privacy policy URL
- Marketing materials (screenshots, video)

**EAS Build**:
```bash
eas build --platform ios --profile production
eas submit --platform ios
```

**App Store Connect**:
1. Create app record
2. App information (name, subtitle, keywords)
3. Upload screenshots (6.5", 5.5")
4. Upload preview video (optional)
5. Configure privacy details
6. Submit for review

#### Android Setup

**Requirements**:
- Google Play Console ($25 one-time)
- Privacy policy
- Marketing materials

**EAS Build**:
```bash
eas build --platform android --profile production
eas submit --platform android
```

**Play Console**:
1. Create app
2. Store listing (title, description, category)
3. Graphics (icon, feature graphic, screenshots)
4. Content rating
5. Submit for review

#### Privacy Policy
Create at `https://yourdomain.com/privacy-policy`:
- Data collection (location, photos)
- Firebase usage
- Data storage and security
- User rights
- Contact info

### Week 2: Phased Rollout

#### Phase 1: Internal Testing (Day 1-2)
- 10-20 internal testers
- Monitor crashes
- Fix showstoppers

#### Phase 2: Closed Beta (Day 3-5)
- 50-100 beta testers (customers)
- Monitor metrics (crash-free rate, DAU, session duration)
- Collect feedback

#### Phase 3: Open Beta (Day 6-9)
- TestFlight public link (iOS)
- Open testing track (Android)
- 500+ users
- Soft launch marketing

#### Phase 4: Public Release (Day 10-14)
- Submit for review
- Release to 100%
- Full marketing launch
- Press release, Product Hunt, social media

#### Monitoring

**Firebase Analytics Events**:
```javascript
logEvent('job_completed', { jobId, duration });
logEvent('time_clocked_in', { jobId, location });
logEvent('form_submitted', { templateId });
```

**Key Metrics**:
- Daily Active Users (DAU)
- Week 1, Day 7, Day 30 retention
- Session length
- Jobs completed per day
- Crash-free sessions >99%
- App rating >4.5 stars

#### Post-Launch Support
- Monitor reviews daily
- Respond to negative reviews within 24h
- In-app help/FAQ
- Weekly OTA updates for fixes
- Monthly major updates

---

## Critical Files Reference

### Web Application Files (Phase 2.3)

**New Files**:
1. `src/constants/formFieldTypes.js` - Field type definitions
2. `src/hooks/data/useFormTemplates.js` - Template CRUD
3. `src/hooks/data/useFormResponses.js` - Response CRUD
4. `src/components/forms/FormBuilder.jsx` - Visual form builder
5. `src/components/forms/FormRenderer.jsx` - Dynamic rendering
6. `src/components/forms/FormFieldEditor.jsx` - Field config
7. `src/components/forms/ChecklistBuilder.jsx` - Checklist templates
8. `src/components/jobs/JobChecklistView.jsx` - Checklist completion

**Modified Files**:
9. `src/constants/initialStates.js` - Add form/checklist fields
10. `src/components/JobDetailView.jsx` - Add Forms/Checklist tabs
11. `src/hooks/data/index.js` - Export new hooks

### Mobile Application Files (Phase 2.1)

**Configuration**:
1. `service-hub-mobile/app.json` - Expo config
2. `service-hub-mobile/eas.json` - Build profiles
3. `service-hub-mobile/.env` - Environment variables

**Core Services**:
4. `src/services/firebase.js` - Firebase init
5. `src/services/sync.js` - Sync engine
6. `src/services/location.js` - GPS tracking
7. `src/services/notifications.js` - Push notifications

**Database**:
8. `src/database/schema.js` - WatermelonDB schema
9. `src/database/models/Job.js` - Job model
10. `src/database/models/TimeEntry.js` - Time entry model

**Screens**:
11. `src/screens/jobs/TodayJobsScreen.js` - Main job list
12. `src/screens/jobs/JobDetailScreen.js` - Job details
13. `src/screens/jobs/JobFormScreen.js` - Form rendering
14. `src/screens/jobs/JobChecklistScreen.js` - Checklist
15. `src/screens/time/ClockInOutScreen.js` - Time tracking
16. `src/screens/navigation/NavigationScreen.js` - Map navigation

**Hooks**:
17. `src/hooks/useAuth.js` - Authentication
18. `src/hooks/useJobs.js` - Job data
19. `src/hooks/useOffline.js` - Network status
20. `src/hooks/useSync.js` - Sync operations

**Components**:
21. `src/components/JobCard.js` - Job list item
22. `src/components/FormField.js` - Universal form field
23. `src/components/PhotoCapture.js` - Camera integration

### Deployment Files

24. `firestore.rules` - Security rules update
25. `service-hub-mobile/README.md` - Setup instructions

---

## Data Migration & Security

### Schema Versioning

Add `schemaVersion: 2.0` to all documents after mobile launch.

**Migration Function** (Firebase Cloud Functions):
```javascript
exports.migrateToV2 = functions.https.onRequest(async (req, res) => {
  // Add formTemplates[], formResponses[], gpsTracking to jobs
  // Add location to time entries
});
```

### Firestore Security Rules

**Add mobile rules**:
```javascript
match /users/{uid}/jobs/{jobId} {
  // Allow mobile updates to GPS tracking and status
  allow update: if isOwner(uid) && isTech(uid) &&
    request.resource.data.diff(resource.data).affectedKeys()
      .hasOnly(['gpsTracking', 'route', 'status', 'checklist', 'updatedAt']);
}

match /users/{uid}/formResponses/{responseId} {
  allow create: if isOwner(uid);
  allow read, update: if isOwner(uid);
}
```

### Authentication Persistence

- Firebase tokens in secure AsyncStorage
- Biometric auth (Face ID, Touch ID)
- Auto-logout after 30 days inactivity
- Token refresh every 60 minutes

### Data Encryption

- **At Rest**: WatermelonDB encryption enabled
- **In Transit**: HTTPS/TLS for Firebase
- **Photos**: Firebase Storage with access rules

---

## Success Metrics & KPIs

### Week 1-4 Post-Launch
- **Adoption**: 30% of web users install mobile
- **Activation**: 70% complete first job
- **Retention**: 50% Day-7 retention
- **Engagement**: 3 jobs/day per user
- **Stability**: >98% crash-free

### Month 1-3 Post-Launch
- **Adoption**: 60% of web users on mobile
- **Retention**: 60% Day-30 retention
- **NPS**: >50
- **Rating**: >4.5 stars (iOS), >4.3 (Android)
- **Revenue Impact**: 20% increase in conversions

### Month 3-6 Post-Launch
- **Market Position**: Top 10 in "Field Service Management"
- **User Base**: 10,000+ active mobile users
- **Engagement**: 5+ jobs/day per user
- **Feature Adoption**: 80% use forms, 90% use time tracking
- **Churn Reduction**: 15% vs web-only

---

## Risk Mitigation

### Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Offline sync conflicts | High | Last-write-wins with timestamps; manual resolution UI |
| GPS battery drain | Medium | Balanced accuracy; stop when idle; user education |
| Photo storage costs | Medium | Compress to <500KB; cleanup old photos; monitor usage |
| App store rejection | High | Follow guidelines; legal review; comprehensive testing |
| Poor network performance | Medium | Aggressive caching; retry logic; offline-first |

### Business Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| Low adoption | High | In-app education; exclusive features; excellent onboarding |
| Feature parity expectations | Medium | Clear communication; phased rollout |
| Support overhead | Medium | FAQ; tutorials; chatbot |
| Competitor response | Low | Focus on AI; faster iteration; superior UX |

---

## Timeline Summary

### Month 1-2 (Phase 2.3)
**Weeks 1-6**: Job Forms & Checklists (Web)
- Form builder with all field types
- Checklist templates
- Integration with jobs
- 5+ sample templates

### Month 3-4 (Phase 2.1 - Part 1)
**Weeks 7-12**: Mobile Core Features
- Expo project setup
- Authentication & navigation
- Job management
- Time tracking with GPS

### Month 4-5 (Phase 2.1 - Part 2)
**Weeks 13-16**: Mobile Advanced Features
- Forms & checklists on mobile
- Photo capture & upload
- Offline sync with WatermelonDB
- Push notifications

### Month 5 (Phase 2.2)
**Weeks 17-20**: GPS & Route Optimization
- GPS waypoint logging
- Route optimization algorithm
- Map visualization
- Navigation integration

### Month 6 (Testing & Launch)
**Weeks 21-22**: Testing & QA
- Unit/integration tests
- Device testing
- UAT with beta users
- Bug fixes

**Weeks 23-24**: App Store Launch
- Build & submit
- Phased rollout
- Marketing launch
- Monitor & iterate

---

## Post-Launch Roadmap

### Version 1.1 (2-4 weeks post-launch)
- Voice notes for jobs
- Batch job status updates
- Improved route optimization
- Team messaging
- Job history search
- Export timesheets to PDF

### Version 1.2 (2-3 months post-launch)
- AI-powered job notes
- Automatic photo tagging
- Voice commands
- AR measurements
- Predictive scheduling

---

## Verification Checklist

### Phase 2.3 Complete
- [ ] Form builder creates templates
- [ ] All field types render correctly
- [ ] Forms submit with validation
- [ ] Checklists mark complete with photos
- [ ] Forms attached to jobs
- [ ] 5+ sample templates created

### Phase 2.1 Complete
- [ ] App builds for iOS and Android
- [ ] Login/logout works
- [ ] Jobs load and display
- [ ] Clock in/out captures GPS
- [ ] Forms render on mobile
- [ ] Photos upload to Firebase
- [ ] Offline mode works
- [ ] Sync resumes when online

### Phase 2.2 Complete
- [ ] Route optimization works
- [ ] GPS waypoints logged
- [ ] Map displays route
- [ ] Navigation opens system maps
- [ ] Distance/duration tracked

### Launch Ready
- [ ] App Store approved (iOS)
- [ ] Play Store approved (Android)
- [ ] >99% crash-free in beta
- [ ] 4.5+ star rating from testers
- [ ] Privacy policy published
- [ ] Marketing materials ready
- [ ] Support documentation complete

---

**Plan Status**: Approved ✅
**Last Updated**: 2026-02-11
**Total Duration**: 24 weeks (~6 months)
**Estimated Lines of Code**: ~15,000 lines (web + mobile)

---

## Next Steps After Approval

1. Create feature branch: `feature/phase2-forms`
2. Set up form builder components (Week 1)
3. Initialize Expo project (can run in parallel with web work)
4. Weekly progress reviews
5. Bi-weekly demos to stakeholders
