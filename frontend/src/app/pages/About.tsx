import { Link } from "react-router";
import { Building2, Target, Eye, Users, Award, Shield, TrendingUp, Zap } from "lucide-react";
import { Card } from "../components/ui/card";
import { GovFooter } from "../components/GovFooter";
import { MarketingHeader } from "../components/MarketingHeader";

export default function About() {
  const stats = [
    { label: "Active Users", value: "50,000+", icon: Users },
    { label: "Complaints Resolved", value: "1.2M+", icon: Award },
    { label: "Avg. Resolution Time", value: "48 hrs", icon: Zap },
    { label: "Satisfaction Rate", value: "94%", icon: TrendingUp },
  ];

  const features = [
    {
      icon: Shield,
      title: "AI-Powered Intelligence",
      description: "Advanced AI categorizes complaints, detects fraud, and provides intelligent insights for faster resolution.",
    },
    {
      icon: Users,
      title: "Multi-Role Platform",
      description: "Dedicated portals for citizens, employees, and administrators ensure role-specific workflows.",
    },
    {
      icon: TrendingUp,
      title: "Transparency Dashboard",
      description: "Real-time tracking with before/after comparisons, status timelines, and performance metrics.",
    },
    {
      icon: Zap,
      title: "Digital India Ready",
      description: "Built on Digital India principles with accessibility features and government-grade security.",
    },
  ];

  const timeline = [
    { year: "2024", title: "Platform Launch", desc: "SAIP officially launched under Digital India Initiative" },
    { year: "2024 Q2", title: "Multi-City Rollout", desc: "Expanded to 50+ cities across India" },
    { year: "2024 Q4", title: "AI Integration", desc: "Implemented advanced AI for fraud detection and categorization" },
    { year: "2025", title: "1M+ Complaints", desc: "Successfully resolved over 1 million civic complaints" },
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
              <span className="text-sm font-medium">Government of India Initiative</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              About SAIP
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Revolutionizing civic governance through artificial intelligence, transparency, and citizen empowerment across India.
            </p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <Card key={stat.label} className="p-6 text-center border-2 hover:border-[#1e3a8a] transition-all">
                  <Icon className="size-10 text-[#1e3a8a] mx-auto mb-3" />
                  <div className="text-3xl font-bold text-[#1e3a8a] mb-1">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Vision & Mission */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-8">
            <Card className="p-8 bg-gradient-to-br from-blue-50 to-white border-2 border-blue-100">
              <div className="bg-[#1e3a8a] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Eye className="size-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-[#1e3a8a]">Our Vision</h2>
              <p className="text-gray-700 leading-relaxed">
                To create a transparent, efficient, and citizen-centric civic governance ecosystem powered by artificial intelligence, 
                where every citizen's voice is heard, every complaint is resolved efficiently, and government accountability is guaranteed 
                through technology-driven transparency.
              </p>
            </Card>

            <Card className="p-8 bg-gradient-to-br from-green-50 to-white border-2 border-green-100">
              <div className="bg-[#15803d] w-16 h-16 rounded-2xl flex items-center justify-center mb-6">
                <Target className="size-8 text-white" />
              </div>
              <h2 className="text-2xl font-bold mb-4 text-[#15803d]">Our Mission</h2>
              <p className="text-gray-700 leading-relaxed">
                To leverage cutting-edge AI technology to streamline civic complaint management, enhance government accountability, 
                reduce corruption through fraud detection, and empower citizens with real-time transparency into complaint resolution 
                processes across all Indian cities.
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Key Features */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-[#1e3a8a]">What Makes SAIP Special</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Advanced features designed to transform civic governance and citizen engagement
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="p-6 hover:shadow-lg transition-all border-2 hover:border-[#1e3a8a]">
                  <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] w-12 h-12 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="size-6 text-white" />
                  </div>
                  <h3 className="font-bold mb-2 text-[#1e3a8a]">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-[#1e3a8a]">Our Journey</h2>
            <p className="text-gray-600">Milestones in transforming civic governance</p>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="space-y-8">
              {timeline.map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-4 text-center sm:flex-row sm:items-start sm:gap-6 sm:text-left">
                  <div className="flex flex-col items-center">
                    <div className="bg-[#1e3a8a] text-white w-20 h-20 rounded-full flex items-center justify-center font-bold text-sm">
                      {item.year}
                    </div>
                    {idx < timeline.length - 1 && (
                      <div className="w-1 h-12 bg-gradient-to-b from-[#1e3a8a] to-[#2563eb] mt-2 sm:h-16"></div>
                    )}
                  </div>
                  <Card className="flex-1 p-6 bg-white border-2 hover:border-[#1e3a8a] transition-all">
                    <h3 className="font-bold text-lg mb-2 text-[#1e3a8a]">{item.title}</h3>
                    <p className="text-muted-foreground">{item.desc}</p>
                  </Card>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Digital India Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <Card className="p-8 md:p-12 bg-gradient-to-r from-[#1e3a8a] to-[#2563eb] text-white">
            <div className="max-w-3xl mx-auto text-center">
              <div className="bg-white/10 backdrop-blur-sm w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <Building2 className="size-10" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Part of Digital India Initiative</h2>
              <p className="text-blue-100 mb-8 leading-relaxed">
                SAIP is proudly developed under the Digital India Initiative by the Government of India, 
                committed to transforming India into a digitally empowered society and knowledge economy 
                with accessible, transparent, and efficient governance.
              </p>
              <div className="flex flex-wrap gap-4 justify-center">
                <Link to="/login">
                  <button className="bg-white text-[#1e3a8a] px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-all shadow-lg">
                    Citizen Login
                  </button>
                </Link>
                <Link to="/services">
                  <button className="bg-white/10 backdrop-blur-sm border-2 border-white text-white px-8 py-3 rounded-lg font-semibold hover:bg-white/20 transition-all">
                    View Services
                  </button>
                </Link>
              </div>
            </div>
          </Card>
        </div>
      </section>

      <GovFooter />
    </div>
  );
}
