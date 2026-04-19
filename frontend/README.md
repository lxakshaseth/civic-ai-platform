# SAIP - Smart AI Civic Intelligence Platform

A comprehensive GovTech SaaS platform with three role-based portals for managing civic complaints and city operations efficiently.

## 🌟 Overview

SAIP (Smart AI Civic Intelligence Platform) is a modern, enterprise-grade platform that connects citizens, field officers, and government authorities for efficient complaint resolution and transparent governance.

### Key Features

- **Three Role-Based Portals**: Citizen, Employee (Field Officer), and Administrator
- **AI-Powered Features**: Complaint categorization, fraud detection, task optimization
- **Digital Signature Capture**: Secure complaint filing and resolution confirmation
- **OCR Invoice Processing**: Automated invoice data extraction
- **Interactive Maps**: Geo-distributed task visualization
- **Real-Time Analytics**: Comprehensive dashboards with performance metrics
- **Before/After Image Comparison**: Visual proof of complaint resolution
- **Transparency Features**: Public dashboards showing city performance metrics

## 🚀 Tech Stack

- **Framework**: React 18.3.1 with TypeScript
- **Routing**: React Router 7.13.0 (Data Mode)
- **Styling**: Tailwind CSS v4
- **UI Components**: Radix UI primitives with custom components
- **Charts**: Recharts for data visualization
- **Icons**: Lucide React
- **Forms**: React Hook Form
- **Notifications**: Sonner
- **Digital Signatures**: React Signature Canvas
- **Build Tool**: Vite

## 📂 Project Structure

```
/src
├── app
│   ├── components
│   │   ├── ui/              # Reusable UI components
│   │   ├── ImageComparison.tsx
│   │   ├── NetworkGraph.tsx
│   │   ├── InteractiveMap.tsx
│   │   └── LoadingSpinner.tsx
│   ├── layouts
│   │   ├── PublicLayout.tsx
│   │   ├── EmployeeLayout.tsx
│   │   └── AdminLayout.tsx
│   ├── pages
│   │   ├── Landing.tsx
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── TwoFactor.tsx
│   │   ├── NotFound.tsx
│   │   ├── public/          # Citizen portal pages
│   │   ├── employee/        # Employee portal pages
│   │   └── admin/           # Admin portal pages
│   ├── App.tsx
│   └── routes.ts
└── styles
    ├── fonts.css
    ├── index.css
    ├── tailwind.css
    └── theme.css
```

## 🎨 Design System

### Colors

- **Primary**: Government Blue (#2563EB)
- **Accent**: Green (#16A34A)
- **Danger**: Red (#DC2626)

### Typography

- **Font Family**: Inter

### Style Guidelines

- Clean dashboard layouts
- Soft shadows with rounded corners (12px)
- Subtle gradients
- Responsive 12-column grid

## 🔐 Authentication Flow

1. **Landing Page**: Introduction to the platform with quick links
2. **Login**: Role-based authentication (Public/Employee/Admin)
3. **Registration**: Public users can register with digital signature
4. **2FA**: Two-factor authentication for Employee/Admin users

## 👥 Portal Features

### Public (Citizen) Portal

**Pages:**

- **Dashboard**: Complaint summary, heatmap, recent complaints, satisfaction score
- **File Complaint**: Multi-step form with AI categorization, location picker, digital signature
- **My Complaints**: List of filed complaints with status tracking
- **Complaint Detail**: Timeline, before/after images, OCR invoice, rating system
- **Transparency Dashboard**: City-wide performance metrics
- **AI Chatbot**: Civic assistant for queries
- **Notifications**: Multi-channel notification management
- **Profile**: User settings and information

### Employee (Field Officer) Portal

**Pages:**

- **Dashboard**: Assigned tasks, completion rate, efficiency score, AI task suggestions
- **Assigned Complaints**: Task list with filtering and sorting
- **Map View**: Interactive geo-distributed task map with route optimization
- **Upload Evidence**: Before/after images, invoice upload with OCR, fraud detection alerts
- **Performance**: Personal metrics and analytics
- **Notifications**: Task updates and assignments

### Admin (Government Authority) Portal

**Pages:**

- **Overview**: KPI cards, trend charts, budget analysis, department leaderboard
- **Department Performance**: Comparative analytics across departments
- **Fraud Detection**: Anomaly detection table, network graph visualization
- **City Health Index**: Overall city performance score with breakdowns
- **Sustainability Index**: Environmental metrics and radar charts
- **User Management**: Employee and citizen account administration
- **Reports**: Comprehensive report generation and export

## 🛠️ Development

### Prerequisites

- Node.js 18+
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Build for production
pnpm build
```

### Key Scripts

- `pnpm dev`: Start development server
- `pnpm build`: Build for production

## 📱 Mobile Responsiveness

The platform is fully responsive with:

- Mobile-friendly navigation with hamburger menu
- Touch-optimized interactive elements
- Responsive grid layouts
- Mobile-first design approach
- PWA-ready architecture

## 🎯 AI Features

### Complaint Categorization

Automatically detects complaint category from description and images using simulated AI.

### Fraud Detection

- Analyzes complaint resolution patterns
- Detects unusual contractor-officer relationships
- Flags suspicious invoice amounts
- Network graph visualization of connections

### Task Optimization

- Route optimization for field officers
- AI-suggested task prioritization
- Predictive resolution time estimates

### OCR Invoice Processing

- Automatic extraction of invoice data
- Verification of amounts and contractor details
- Integration with fraud detection

## 🔄 Workflow

1. **Citizen** files complaint with images and digital signature
2. **AI** categorizes and assigns urgency score
3. **Admin** reviews and assigns to appropriate **Employee**
4. **Employee** receives task on map view with optimized route
5. **Employee** completes work and uploads evidence with invoice
6. **OCR** extracts invoice data, **Fraud Detection** analyzes
7. **Citizen** reviews resolution and provides rating
8. **Admin** monitors performance and generates reports

## 🌐 Deployment

The application is built with Vite and can be deployed to any static hosting service:

- Vercel
- Netlify
- AWS S3 + CloudFront
- GitHub Pages
- Any CDN or web server

## 📊 Mock Data

The application currently uses mock data for demonstration purposes. In production, this would be replaced with:

- Backend API integration
- Database connections
- Real-time WebSocket updates
- External service integrations (maps, OCR, AI)

## 🔒 Security Considerations

- Digital signatures for complaint verification
- Role-based access control (RBAC)
- 2FA for privileged users
- Fraud detection and anomaly monitoring
- Audit trails for all actions

## 🎨 Customization

### Theme Colors

Update colors in `/src/styles/theme.css`:

```css
@theme {
  --color-primary: #2563eb;
  --color-accent: #16a34a;
  --color-danger: #dc2626;
}
```

### Components

All UI components are in `/src/app/components/ui/` and can be customized individually.

## 📄 License

This project is proprietary software for government use.

## 🤝 Support

For support and questions, please contact the development team.

---

**Built with ❤️ for Better Governance**