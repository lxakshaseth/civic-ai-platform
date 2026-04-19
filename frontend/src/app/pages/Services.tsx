import { Link } from "react-router";
import { 
  FileText, 
  Shield, 
  TrendingUp, 
  MessageSquare, 
  MapPin, 
  Clock, 
  CheckCircle,
  Users,
  BarChart3,
  Heart,
  Phone,
  Leaf,
  Eye,
  Camera,
  Zap,
  Award
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { GovFooter } from "../components/GovFooter";
import { MarketingHeader } from "../components/MarketingHeader";

export default function Services() {
  const citizenServices = [
    {
      icon: FileText,
      title: "Complaint Filing",
      description: "Submit civic complaints with photos, location, and detailed descriptions. AI automatically categorizes your complaint.",
      features: ["Photo Upload", "GPS Location", "AI Categorization", "Priority Assignment"],
    },
    {
      icon: Eye,
      title: "Complaint Tracking",
      description: "Real-time tracking with transparent status updates, timeline visualization, and officer assignment details.",
      features: ["Live Status", "Timeline View", "Officer Details", "Before/After Photos"],
    },
    {
      icon: MessageSquare,
      title: "AI Assistant",
      description: "24/7 intelligent assistant for complaint filing, smart categorization, status updates, emergency guidance, and guided civic support.",
      features: ["24/7 Availability", "Multilingual", "Smart Suggestions", "Navigation Shortcuts"],
    },
    {
      icon: TrendingUp,
      title: "Transparency Dashboard",
      description: "City-wide performance metrics, resolution statistics, and comparative analysis across departments.",
      features: ["City Statistics", "Department Comparison", "Resolution Trends", "Performance Charts"],
    },
    {
      icon: Heart,
      title: "Sanitary Pad Reimbursement",
      description: "Locate nearby partner stores by pincode, buy pads urgently, upload the GST bill, and receive reimbursement from the platform.",
      features: ["Nearest Store Mapping", "GST Bill Upload", "Buyer Transfer", "Pincode Coverage"],
    },
    {
      icon: Phone,
      title: "Emergency Contact Finder",
      description: "Quickly surface women helplines, ambulance links, and district response contacts based on the citizen's pincode.",
      features: ["Nearest Contacts", "24x7 Helplines", "Pincode Lookup", "Rapid Escalation"],
    },
  ];

  const employeeServices = [
    {
      icon: MapPin,
      title: "Interactive Map View",
      description: "Visualize assigned complaints on an interactive map with clustering, routing, and geolocation features.",
      features: ["Location Clustering", "Route Planning", "GPS Navigation", "Area Filtering"],
    },
    {
      icon: Camera,
      title: "Evidence Upload",
      description: "Upload before/after photos, work evidence, and invoices with OCR-powered invoice processing.",
      features: ["Photo Comparison", "OCR Invoice Scan", "Digital Signature", "Work Timeline"],
    },
    {
      icon: CheckCircle,
      title: "Complaint Management",
      description: "Accept, update, and resolve complaints with status updates and citizen communication tools.",
      features: ["Status Updates", "Bulk Actions", "Priority Sorting", "Deadline Tracking"],
    },
    {
      icon: BarChart3,
      title: "Performance Dashboard",
      description: "Track personal performance metrics, resolution rates, and efficiency scores with AI insights.",
      features: ["Resolution Stats", "Efficiency Score", "Time Analysis", "AI Recommendations"],
    },
  ];

  const adminServices = [
    {
      icon: Shield,
      title: "AI Fraud Detection",
      description: "Advanced fraud detection with network analysis, suspicious pattern identification, and risk scoring.",
      features: ["Risk Scoring", "Network Analysis", "Pattern Detection", "Alert System"],
    },
    {
      icon: TrendingUp,
      title: "Department Analytics",
      description: "Comprehensive department performance analysis with workload distribution and efficiency metrics.",
      features: ["Department Comparison", "Workload Analysis", "Trend Forecasting", "Custom Reports"],
    },
    {
      icon: Heart,
      title: "City Health Index",
      description: "Monitor city health across infrastructure, environment, safety, and services with AI-driven scores.",
      features: ["Multi-Category Tracking", "Ward Analysis", "Trend Monitoring", "Priority Identification"],
    },
    {
      icon: Leaf,
      title: "Sustainability Index",
      description: "Track environmental sustainability metrics including waste, energy, water, and green initiatives.",
      features: ["Carbon Tracking", "Waste Analysis", "Energy Monitoring", "Green Score"],
    },
    {
      icon: Users,
      title: "User Management",
      description: "Comprehensive user and role management with activity monitoring and permission controls.",
      features: ["Role Assignment", "Activity Logs", "Bulk Operations", "Security Controls"],
    },
  ];

  const aiFeatures = [
    {
      icon: Zap,
      title: "Auto-Categorization",
      description: "AI analyzes complaint text and images to automatically assign categories and departments.",
    },
    {
      icon: Shield,
      title: "Fraud Detection",
      description: "Machine learning identifies suspicious patterns, duplicate complaints, and contractor fraud.",
    },
    {
      icon: TrendingUp,
      title: "Predictive Analytics",
      description: "AI forecasts complaint trends, resource needs, and maintenance requirements.",
    },
    {
      icon: MessageSquare,
      title: "Smart Chatbot",
      description: "Natural language processing for intelligent citizen support and query resolution.",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <MarketingHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-[#1e3a8a] via-[#2563eb] to-[#1e3a8a] text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full px-6 py-2 mb-6">
              <Award className="size-5 text-[#ff9933]" />
              <span className="text-sm font-medium">Comprehensive Civic Services</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Platform Services
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Discover the complete suite of AI-powered services designed for citizens, employees, and administrators
            </p>
          </div>
        </div>
      </section>

      {/* Citizen Services */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="bg-[#1e3a8a] text-white px-4 py-2 mb-4">For Citizens</Badge>
            <h2 className="text-3xl font-bold mb-4 text-[#1e3a8a]">Citizen Portal Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Empower yourself with transparent, efficient civic complaint management
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {citizenServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.title} className="p-6 border-2 hover:border-[#1e3a8a] transition-all hover:shadow-lg">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="size-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 text-[#1e3a8a]">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs border-[#1e3a8a] text-[#1e3a8a]">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Employee Services */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="bg-[#15803d] text-white px-4 py-2 mb-4">For Employees</Badge>
            <h2 className="text-3xl font-bold mb-4 text-[#15803d]">Employee Portal Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Efficient tools for field officers to manage and resolve complaints
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {employeeServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.title} className="p-6 border-2 hover:border-[#15803d] transition-all hover:shadow-lg">
                  <div className="flex items-start gap-4 mb-4">
                    <div className="bg-gradient-to-br from-[#15803d] to-[#16a34a] w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Icon className="size-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-bold text-lg mb-2 text-[#15803d]">{service.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs border-[#15803d] text-[#15803d]">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Admin Services */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="bg-[#1e3a8a] text-white px-4 py-2 mb-4">For Administrators</Badge>
            <h2 className="text-3xl font-bold mb-4 text-[#1e3a8a]">Admin Portal Services</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Comprehensive oversight with AI-powered analytics and fraud detection
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {adminServices.map((service) => {
              const Icon = service.icon;
              return (
                <Card key={service.title} className="p-6 bg-white border-2 hover:border-[#1e3a8a] transition-all hover:shadow-lg">
                  <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="size-6 text-white" />
                  </div>
                  <h3 className="font-bold text-lg mb-2 text-[#1e3a8a]">{service.title}</h3>
                  <p className="text-sm text-muted-foreground mb-4">{service.description}</p>
                  <div className="flex flex-wrap gap-2">
                    {service.features.map((feature) => (
                      <Badge key={feature} variant="outline" className="text-xs border-[#1e3a8a] text-[#1e3a8a]">
                        {feature}
                      </Badge>
                    ))}
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge className="bg-purple-600 text-white px-4 py-2 mb-4">AI-Powered</Badge>
            <h2 className="text-3xl font-bold mb-4 text-[#1e3a8a]">Artificial Intelligence Features</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Cutting-edge AI technology driving efficiency and transparency
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {aiFeatures.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-6 text-center border-2 hover:border-purple-600 transition-all hover:shadow-lg">
                  <div className="bg-gradient-to-br from-purple-600 to-purple-800 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="size-8 text-white" />
                  </div>
                  <h3 className="font-bold mb-2">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl font-bold mb-4">Ready to Get Started?</h2>
            <p className="text-blue-100 mb-8 leading-relaxed">
              Choose your portal and experience transparent, efficient civic governance
            </p>
            <div className="flex flex-wrap gap-4 justify-center">
              <Link to="/register">
                <button className="bg-white text-[#1e3a8a] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg">
                  Register as Citizen
                </button>
              </Link>
              <Link to="/employee-register">
                <button className="bg-[#15803d] text-white px-8 py-3 rounded-lg font-semibold hover:bg-[#166534] transition-all shadow-lg">
                  Employee Portal
                </button>
              </Link>
              <Link to="/admin-register">
                <button className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all">
                  Admin Access
                </button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <GovFooter />
    </div>
  );
}

