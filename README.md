# SAIP Citizen Grievance Management System

SAIP is a full-stack citizen grievance management system built for public service workflows. It connects citizens, field employees, and administrators through a shared complaint lifecycle that supports filing, assignment, work updates, verification, and public transparency.

## Frontend Overview

The frontend lives in `frontend` and is built with Next.js, React, and TypeScript. It provides three role-based experiences:

- Citizen portal for filing complaints, checking status, viewing progress, accessing emergency and service guidance, and interacting with the AI assistant.
- Employee portal for managing assigned complaints, viewing routes, uploading work proof, adding invoice details, and updating citizens.
- Admin portal for operations monitoring, complaint approvals, audits, fraud review, broadcast drafting, reporting, and city-wide dashboards.

Key frontend responsibilities include:

- Complaint filing with photo evidence, structured address capture, pincode support, and GPS location.
- Complaint detail views with timelines, work proof, invoice documents, ticketing, feedback, and reopen flows.
- Shared citizen-employee chat with voice notes and translation support.
- AI assistant screens for citizen help, employee field support, and admin planning support.
- Transparency and analytics views for public and internal monitoring.

## Backend Overview

The backend is centered around `apps/api`, a TypeScript and Express API designed around modular service layers. It manages the core operational workflows and integrations used by the frontend.

Main backend responsibilities include:

- Authentication and role-based access control.
- Complaint intake, assignment, lifecycle updates, and reopen handling.
- Evidence upload, work proof storage, invoice metadata capture, and audit records.
- Citizen-employee chat, notifications, tickets, and complaint activity history.
- Fraud review, analytics, emergency support data, and administrative reporting.
- External integrations for maps, translation, AI support, and realtime messaging.

The repository also includes `apps/ai-service`, a FastAPI-based companion service used for AI-related tasks such as complaint classification, priority support, OCR, and chatbot responses.

## Features Explanation

### Citizen Features

- File complaints with title, description, address, pincode, GPS, and photo evidence.
- View complaint status, assignment progress, work updates, and closure details.
- Chat with the assigned employee when a complaint is active.
- Review work proof and invoice documents shared during resolution.
- Raise quality or fraud tickets, submit feedback, and reopen unresolved complaints.
- Use the AI assistant for complaint guidance, nearby issue discovery, service help, and emergency support.

### Employee Features

- View assigned complaints and manage task status from a live queue.
- Use map-based views and AI assistance for route and task planning.
- Upload after-work photos, work notes, invoice documents, labour details, materials used, and closure GPS.
- Communicate with citizens through the complaint conversation workspace.
- Track personal performance, notifications, and task completion progress.

### Admin Features

- Monitor complaint operations, departments, employees, and city-wide service trends.
- Review complaint evidence, work proof, invoice documents, and ticket escalations.
- Approve or reject closure submissions and maintain audit-ready records.
- Use AI support for planning, staffing, compliance summaries, and citizen advisories.
- Publish public notices through the broadcast workflow and generate executive-facing reports.

### Shared Platform Capabilities

- Role-based portals for citizens, employees, and administrators.
- Structured complaint workflow from submission to resolution.
- Multilingual support across chat and AI guidance.
- Audit-oriented data capture for work completion and verification.
- Dashboards for transparency, analytics, and service monitoring.

## Workspace Structure

```text
.
|-- frontend          # Next.js role-based user interface
|-- apps
|   |-- api           # Express + TypeScript API
|   `-- ai-service    # FastAPI AI companion service
|-- docs              # Supporting architecture and implementation docs
|-- package.json      # Workspace scripts
`-- turbo.json        # Monorepo task orchestration
```
