import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Link } from "react-router";
import { Building2, Users, Shield, TrendingUp, MapPin, Clock, Sparkles, BarChart3, Globe2, CheckCircle2, Award, Lock, Zap } from "lucide-react";
import { motion } from "motion/react";
import { GovFooter } from "../components/GovFooter";
import { MarketingHeader } from "../components/MarketingHeader";

export default function Landing() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <MarketingHeader />

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-blue-50 via-white to-blue-50 border-b border-gray-200">
        <div className="container mx-auto px-4 py-16 md:py-24">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8 }}
              className="text-center mb-12"
            >
              {/* Official Badge */}
              <div className="inline-flex items-center gap-2 bg-white border-2 border-[#FF6600] rounded-full px-4 py-2 mb-6 shadow-sm">
                <Award className="size-4 text-[#FF6600]" />
                <span className="text-sm font-bold text-[#1e3a8a]">Government of India Initiative</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-bold mb-6 text-gray-900 leading-tight">
                Smart AI Civic Intelligence Platform
              </h1>

              <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-3xl mx-auto leading-relaxed">
                Empowering citizens with transparent, efficient, and AI-powered civic services. 
                Connect with government departments seamlessly for complaint resolution and civic engagement.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <Link to="/register">
                  <Button size="lg" className="w-full px-8 py-6 text-base bg-[#1e3a8a] hover:bg-[#1e40af] shadow-lg sm:w-auto">
                    Register as Citizen
                  </Button>
                </Link>
                <Link to="/login">
                  <Button size="lg" variant="outline" className="w-full px-8 py-6 text-base border-2 border-[#1e3a8a] text-[#1e3a8a] hover:bg-blue-50 sm:w-auto">
                    Employee/Admin Login
                  </Button>
                </Link>
              </div>
            </motion.div>

            {/* Trust Indicators */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-12"
            >
              {[
                { icon: Lock, label: "Secure & Encrypted", color: "text-green-600" },
                { icon: CheckCircle2, label: "Government Verified", color: "text-blue-600" },
                { icon: Zap, label: "AI-Powered", color: "text-orange-600" },
                { icon: Award, label: "ISO Certified", color: "text-indigo-600" },
              ].map((item, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2 bg-white rounded-lg p-4 border border-gray-200 shadow-sm">
                  <item.icon className={`size-6 ${item.color}`} />
                  <span className="text-xs font-medium text-gray-700 text-center">{item.label}</span>
                </div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="bg-white py-12 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-6"
          >
            {[
              { value: "12,450+", label: "Complaints Resolved", icon: CheckCircle2, color: "bg-green-50 border-green-200 text-green-700" },
              { value: "94.2%", label: "Citizen Satisfaction", icon: TrendingUp, color: "bg-blue-50 border-blue-200 text-blue-700" },
              { value: "3.2 Days", label: "Avg. Resolution Time", icon: Clock, color: "bg-orange-50 border-orange-200 text-orange-700" },
              { value: "850+", label: "Active Field Officers", icon: Users, color: "bg-indigo-50 border-indigo-200 text-indigo-700" },
            ].map((stat, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className={`p-6 text-center border-2 ${stat.color} hover:shadow-lg transition-all`}>
                  <stat.icon className="size-8 mx-auto mb-3" />
                  <div className="text-3xl font-bold mb-2">{stat.value}</div>
                  <div className="text-sm font-medium">{stat.label}</div>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Three Portals Section */}
      <section className="bg-gray-50 py-16 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Three Dedicated Portals</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Role-based access for citizens, field employees, and government administrators
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {[
              {
                icon: Users,
                title: "Citizen Portal",
                description: "File and track complaints, access transparency dashboard, interact with the AI Assistant, and receive real-time updates on civic issues.",
                link: "/register",
                gradient: "from-blue-600 to-blue-700",
                bgColor: "bg-blue-50",
                borderColor: "border-blue-200",
                delay: 0,
              },
              {
                icon: MapPin,
                title: "Employee Portal",
                description: "Manage assigned tasks, upload evidence and proof of work, view map-based assignments, and track individual performance metrics.",
                link: "/employee",
                gradient: "from-green-600 to-green-700",
                bgColor: "bg-green-50",
                borderColor: "border-green-200",
                delay: 0.2,
              },
              {
                icon: Shield,
                title: "Admin Portal",
                description: "Monitor city health index, detect fraud patterns, analyze department performance, generate comprehensive reports, and manage users.",
                link: "/admin",
                gradient: "from-indigo-600 to-indigo-700",
                bgColor: "bg-indigo-50",
                borderColor: "border-indigo-200",
                delay: 0.4,
              },
            ].map((portal, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: portal.delay }}
              >
                <Card className={`p-8 h-full border-2 ${portal.borderColor} bg-white hover:shadow-xl transition-all`}>
                  <div className={`${portal.bgColor} size-16 rounded-xl flex items-center justify-center mb-6 border ${portal.borderColor}`}>
                    <portal.icon className="size-8 text-gray-700" strokeWidth={2.5} />
                  </div>
                  <h3 className="text-xl font-bold mb-4 text-gray-900">{portal.title}</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed text-sm">
                    {portal.description}
                  </p>
                  <Link to={portal.link}>
                    <Button variant="outline" className={`w-full border-2 ${portal.borderColor} hover:bg-gray-50`}>
                      Access Portal
                    </Button>
                  </Link>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-white py-16 border-b border-gray-200">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-4 text-gray-900">Key Features & Capabilities</h2>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              Advanced technology powering transparent and efficient governance
            </p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {[
              {
                icon: Sparkles,
                title: "AI-Powered Categorization",
                description: "Automatic complaint classification using machine learning algorithms",
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
              {
                icon: Shield,
                title: "Fraud Detection",
                description: "Advanced pattern recognition to identify suspicious activities",
                color: "text-red-600",
                bg: "bg-red-50",
              },
              {
                icon: MapPin,
                title: "Interactive Maps",
                description: "Real-time geolocation tracking and map-based task assignment",
                color: "text-green-600",
                bg: "bg-green-50",
              },
              {
                icon: BarChart3,
                title: "Analytics Dashboard",
                description: "Comprehensive insights with charts, graphs, and performance metrics",
                color: "text-blue-600",
                bg: "bg-blue-50",
              },
              {
                icon: Globe2,
                title: "Transparency Portal",
                description: "Public dashboard with department performance and resolution rates",
                color: "text-orange-600",
                bg: "bg-orange-50",
              },
              {
                icon: Lock,
                title: "Digital Signatures",
                description: "Secure signature capture for work completion verification",
                color: "text-indigo-600",
                bg: "bg-indigo-50",
              },
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6, delay: idx * 0.1 }}
              >
                <Card className="p-6 border border-gray-200 hover:border-gray-300 hover:shadow-lg transition-all h-full">
                  <div className={`${feature.bg} size-12 rounded-lg flex items-center justify-center mb-4`}>
                    <feature.icon className={`size-6 ${feature.color}`} />
                  </div>
                  <h3 className="text-lg font-bold mb-2 text-gray-900">{feature.title}</h3>
                  <p className="text-sm text-gray-600 leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="bg-gradient-to-br from-[#1e3a8a] to-[#1e40af] py-16 border-b-4 border-[#FF6600]">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.8 }}
            className="text-center max-w-4xl mx-auto"
          >
            <h2 className="text-3xl md:text-4xl font-bold mb-6 text-white">
              Join the Digital India Movement
            </h2>
            <p className="text-lg md:text-xl text-blue-100 mb-8">
              Be part of India's digital transformation. Register today and experience efficient, transparent civic governance.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/register">
                <Button size="lg" className="w-full px-8 py-6 text-base bg-white text-[#1e3a8a] hover:bg-gray-100 shadow-lg sm:w-auto">
                  Register Now
                </Button>
              </Link>
              <Link to="/login">
                <Button size="lg" variant="outline" className="w-full px-8 py-6 text-base border-2 border-white text-white hover:bg-white/10 sm:w-auto">
                  Login to Portal
                </Button>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Government Footer */}
      <GovFooter />
    </div>
  );
}
