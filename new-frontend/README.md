# 🚨 ResQNet HQ: Decentralized Tactical Emergency Response

**ResQNet HQ** is a high-fidelity, mission-critical command center designed for decentralized emergency response. It bridges the gap between AI-driven triage and community-led action, providing a robust platform for situational awareness, resource allocation, and decentralized governance.

---

## 🤖 AI Agent & Developer Context

This project is a **React + TypeScript + Vite** Single Page Application (SPA) that prioritizes a "Tactical/Military-Grade" aesthetic. It is built to feel like a live, high-stakes monitoring system.

### 🎨 Design System: "Tactical Precision"
The visual identity is defined by high contrast, glassmorphism, and "live" feedback loops.

- **Base Colors:**
  - `bg-base`: `#0A0A0B` (Deep Space Black)
  - `bg-surface`: `#141416` (Dark Slate)
  - `bg-elevated`: `#1C1C1E` (Command Grey)
- **Functional Colors:**
  - `brand-primary`: `#FF3B30` (Emergency Red) - Used for critical SOS alerts, primary buttons, and active scanning.
  - `brand-secondary`: `#007AFF` (Tactical Blue) - Used for ambient background animations, radar pulses, and secondary UI elements.
  - `brand-accent`: `#34C759` (Success Green) - Used for "Active" status, "For" votes, and successful deployments.
- **Typography:**
  - **Inter:** Used for all primary UI text to ensure maximum legibility.
  - **JetBrains Mono:** Used for tactical data, incident IDs, timestamps, and coordinate readouts.
- **Atmospheric Effects:**
  - **Scanning Lines:** A global `scanning-line-blue` moves across the background to simulate active data processing.
  - **Floating Particles:** Blue-hued particles provide depth and a sense of "live" activity.
  - **Pulse Soft:** Subtle opacity pulsing (`animate-pulse-soft`) on indicators to signal real-time connectivity.

---

## 🚀 Core Modules

### 1. 📡 SOS Feed (`SOSFeed.tsx`)
The heartbeat of the system. A real-time stream of incoming emergency signals.
- **AI Triage:** Every incident includes a "Transcript Analysis" slide-over powered by AI.
- **Priority Highlighting:** Critical incidents feature a soft red pulsing background to demand immediate attention.
- **Incident Lifecycle:** Tracks status from "Pending" to "Intercepting" and "Resolved."

### 🗺️ 2. Tactical Map (`TacticalMap.tsx`)
A high-precision situational awareness tool.
- **Radar Pulse:** A multi-layered blue radar animation centered on the map simulates active scanning.
- **Unit Tracking:** Visualizes the location of active incidents and volunteer units.
- **Scanning Overlay:** A localized scanning line reinforces the "live map" aesthetic.

### 🗳️ 3. Governance DAO (`Governance.tsx`)
Decentralized decision-making for emergency protocols.
- **Active Proposals:** Staggered entrance animations for new proposals.
- **Voting Mechanics:** Real-time visualization of "For" vs. "Against" sentiment.
- **Voting Power:** A dedicated card tracks the user's influence within the network.

### 👷 4. Volunteer Network (`Volunteers.tsx`)
Management of rapid-response units.
- **Unit Status:** Tracks EMTs, Firefighters, and Search & Rescue specialists.
- **Deployment Status:** Real-time indicators for "Active" vs. "Standby" units.
- **Staggered Lists:** Smooth loading animations for large volunteer rosters.

---

## 🛠️ Technical Specifications

- **Framework:** React 18+ with TypeScript.
- **Styling:** Tailwind CSS (v4) with custom `@theme` variables in `src/index.css`.
- **Animations:** `framer-motion` for all layout transitions, staggered reveals, and interactive hover states.
- **Icons:** `lucide-react` for a consistent, crisp SVG icon set.
- **Routing:** `react-router-dom` (v6) for seamless SPA navigation.
- **State:** Currently utilizes local React state (`useState`, `useEffect`) and mock data from `src/constants.ts`.

---

## 📂 Project Structure

- `src/App.tsx`: The application shell. Contains the global layout, sidebar, and route definitions.
- `src/index.css`: The "Source of Truth" for the design system. Defines custom Tailwind themes, keyframes, and global animation classes.
- `src/constants.ts`: Centralized mock data repository. Modify `MOCK_INCIDENTS`, `MOCK_VOLUNTEERS`, and `MOCK_PROPOSALS` to test UI changes.
- `src/components/`: Reusable UI components (Sidebar, Status Badges, Tactical Buttons).
- `src/pages/`: Feature-specific page components.

---

## 🛠️ Development Guidelines

1. **Maintain the Vibe:** Every new component should use `glass-panel` and `tactical-border` classes. Avoid rounded corners larger than `rounded-sm` (4px).
2. **Animation First:** Use `motion.div` for any element that enters or exits the screen. Stagger children animations for a polished feel.
3. **Color Contrast:** Ensure text is always legible against dark backgrounds. Use `text-text-secondary` for labels and `text-text-primary` for values.
4. **Mock Data Integrity:** When adding features, ensure they are backed by the data structures in `constants.ts` to allow for easy future backend integration.

---

## 🔮 Future Roadmap
- **Real-time Sync:** Integration with WebSockets or Firebase for live multi-user coordination.
- **Advanced AI:** Real-time audio processing and automated unit dispatching logic.
- **Mobile Tactical App:** A mobile-first interface for field volunteers.

---

© 2026 ResQNet Foundation. Built for Resilience.
