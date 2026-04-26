# RESONANCE 2.0 (Crown Chaser Game)

<!-- 
  SCOPE: Workspace-level rules and project context.
  OVERRIDE: This file takes precedence over global defaults.
-->

## Project Context
- **Event**: Vibe Jam 2026 (Deadline: May 1, 2026)
- **Goal**: High-speed, zero-gravity kinetic tag game.
- **Tech**: Three.js, Vanilla JS/CSS, ZzFX. Single HTML file architecture.

## Mandatory Constraints (Vibe Jam Rules)
- **Rule 02**: Must include tracking widget `<script async src="https://vibej.am/2026/widget.js"></script>`.
- **Rule 03**: At least 90% of code must be written by AI.
- **Rule 05**: Web-accessible, free-to-play, zero login/signup.
- **Rule 08**: NO loading screens, NO heavy downloads. Instant drop-in.

## Implementation Architecture
- **Movement**: Physics-based grapple (Hooke's Law) + centripetal tethering.
- **Collision**: $O(1)$ Spatial Hashing (3D grid).
- **Memory**: Zero GC allocation trail buffer (rotating pre-allocated arrays).
- **Audio**: Procedural Web Audio (ZzFX), strictly suspended until user interaction.
- **Multiplayer**: Simulated Asynchronous AI (bots) with local logic.

## Webring Portal
- Fly into exit portal to redirect to `https://vibej.am/portal/2026`.
- Pass parameters: `speed_x`, `speed_y`, `speed_z`, `color`, `username`, `ref`.
- Accept incoming players via these same URL parameters.

## Operational Rules
- **Mandatory**: Commit and push all changes after every single prompt response.
- **Technical Logging**: Every commit must include a detailed breakdown of the mathematical or architectural logic implemented (e.g., Hooke's Law parameters, spatial hash cell logic, or shader optimizations).

## Strict Telemetry & Iteration Protocol
After any modification to physics, entities, or the core loop, the workspace MUST execute the following workflow:
1. **The Telemetry Dump:** The human developer will run the game with the Dev Console active and paste the output of `Debug.dumpReport()` into the prompt.
2. **The AI Audit:** The AI will immediately halt feature development and analyze the telemetry dump, specifically looking for:
   - Accumulator stress (Steps > 1 per frame).
   - Speed cap violations (Player velocity exceeding calculated limits).
   - Combo decay anomalies.
3. **The Tuning Proposal:** The AI will respond with a markdown-formatted "Telemetry Report" diagnosing any mathematical inefficiencies, followed by a specific code patch to tune the "Magic Numbers" (drag, mass, spring tension) based on the empirical data.
