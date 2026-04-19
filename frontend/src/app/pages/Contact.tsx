import { Link } from "react-router";
import { 
  Mail, 
  Phone, 
  MapPin, 
  Clock, 
  Send,
  MessageSquare,
  Globe,
  Shield,
  HelpCircle
} from "lucide-react";
import { Card } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import { useState } from "react";
import { GovFooter } from "../components/GovFooter";
import { MarketingHeader } from "../components/MarketingHeader";

export default function Contact() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    subject: "",
    message: "",
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Mock submission
    alert("Thank you for contacting us! We will respond within 24-48 hours.");
    setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
  };

  const contactInfo = [
    {
      icon: Mail,
      title: "Email Support",
      primary: "support@saip.gov.in",
      secondary: "info@saip.gov.in",
      description: "24-48 hour response time",
    },
    {
      icon: Phone,
      title: "Helpline Number",
      primary: "1800-XXX-SAIP (7247)",
      secondary: "+91-11-XXXX-XXXX",
      description: "Mon-Sat, 9:00 AM - 6:00 PM",
    },
    {
      icon: MapPin,
      title: "Head Office",
      primary: "Ministry of Urban Development",
      secondary: "Nirman Bhavan, New Delhi - 110011",
      description: "Government of India",
    },
    {
      icon: Clock,
      title: "Office Hours",
      primary: "Monday - Friday",
      secondary: "9:00 AM - 6:00 PM IST",
      description: "Closed on public holidays",
    },
  ];

  const departments = [
    {
      name: "Technical Support",
      email: "tech@saip.gov.in",
      description: "Login issues, bugs, technical errors",
    },
    {
      name: "Complaint Support",
      email: "complaints@saip.gov.in",
      description: "Complaint filing, tracking, resolution",
    },
    {
      name: "Employee Support",
      email: "employee@saip.gov.in",
      description: "Field officer queries, app issues",
    },
    {
      name: "Admin Support",
      email: "admin@saip.gov.in",
      description: "System administration, user management",
    },
  ];

  const faqs = [
    {
      question: "How do I file a complaint?",
      answer: "Register/login to the Citizen Portal, click 'File Complaint', fill the form with details and photos, and submit.",
    },
    {
      question: "How long does resolution take?",
      answer: "Average resolution time is 48-72 hours depending on complaint category and severity. Track real-time status in your dashboard.",
    },
    {
      question: "Can I track my complaint?",
      answer: "Yes! Login to your account and view the 'My Complaints' section for real-time tracking with timeline and officer details.",
    },
    {
      question: "Is my data secure?",
      answer: "Absolutely. SAIP uses government-grade security with encrypted data storage and complies with Digital India security standards.",
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
              <MessageSquare className="size-5 text-[#ff9933]" />
              <span className="text-sm font-medium">We're Here to Help</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Contact Us
            </h1>
            <p className="text-xl text-blue-100 leading-relaxed">
              Get in touch with our support team for assistance, queries, or feedback
            </p>
          </div>
        </div>
      </section>

      {/* Contact Info Cards */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contactInfo.map((info) => {
              const Icon = info.icon;
              return (
                <Card key={info.title} className="p-6 text-center border-2 hover:border-[#1e3a8a] transition-all hover:shadow-lg">
                  <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Icon className="size-8 text-white" />
                  </div>
                  <h3 className="font-bold mb-3 text-[#1e3a8a]">{info.title}</h3>
                  <p className="text-sm font-semibold text-gray-900 mb-1">{info.primary}</p>
                  <p className="text-sm text-gray-600 mb-2">{info.secondary}</p>
                  <Badge variant="outline" className="text-xs">{info.description}</Badge>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Contact Form & Departments */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Contact Form */}
            <div className="lg:col-span-2">
              <Card className="p-8 border-2">
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-[#1e3a8a] p-3 rounded-xl">
                    <Send className="size-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-[#1e3a8a]">Send us a Message</h2>
                    <p className="text-sm text-muted-foreground">We'll respond within 24-48 hours</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name *</label>
                      <Input
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter your full name"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address *</label>
                      <Input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="your.email@example.com"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">Phone Number</label>
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+91 XXXXX XXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Subject *</label>
                      <Input
                        required
                        value={formData.subject}
                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                        placeholder="What is this regarding?"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Message *</label>
                    <Textarea
                      required
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      placeholder="Please provide details about your query or concern..."
                    />
                  </div>

                  <Button type="submit" className="w-full bg-[#1e3a8a] hover:bg-[#1e40af]">
                    <Send className="size-4 mr-2" />
                    Send Message
                  </Button>
                </form>
              </Card>
            </div>

            {/* Departments */}
            <div>
              <h3 className="text-xl font-bold mb-4 text-[#1e3a8a]">Department Contacts</h3>
              <div className="space-y-4">
                {departments.map((dept) => (
                  <Card key={dept.name} className="p-4 border-2 hover:border-[#1e3a8a] transition-all">
                    <h4 className="font-bold text-sm mb-1 text-[#1e3a8a]">{dept.name}</h4>
                    <a href={`mailto:${dept.email}`} className="text-sm text-blue-600 hover:underline mb-2 block">
                      {dept.email}
                    </a>
                    <p className="text-xs text-muted-foreground">{dept.description}</p>
                  </Card>
                ))}
              </div>

              {/* Quick Links */}
              <Card className="p-6 mt-6 bg-gradient-to-br from-blue-50 to-white border-2">
                <h3 className="font-bold mb-4 text-[#1e3a8a]">Quick Access</h3>
                <div className="space-y-3">
                  <Link to="/login">
                    <Button variant="outline" className="w-full justify-start">
                      <Globe className="size-4 mr-2" />
                      Citizen Portal Login
                    </Button>
                  </Link>
                  <Link to="/employee-register">
                    <Button variant="outline" className="w-full justify-start">
                      <Shield className="size-4 mr-2" />
                      Employee Portal
                    </Button>
                  </Link>
                  <Button variant="outline" className="w-full justify-start">
                    <HelpCircle className="size-4 mr-2" />
                    Help & FAQs
                  </Button>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-gradient-to-br from-gray-50 to-blue-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4 text-[#1e3a8a]">Frequently Asked Questions</h2>
            <p className="text-gray-600">Quick answers to common questions</p>
          </div>

          <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
            {faqs.map((faq, idx) => (
              <Card key={idx} className="p-6 bg-white border-2 hover:border-[#1e3a8a] transition-all">
                <div className="flex gap-3 mb-3">
                  <div className="bg-[#1e3a8a] text-white w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                    Q
                  </div>
                  <h3 className="font-bold text-[#1e3a8a]">{faq.question}</h3>
                </div>
                <p className="text-sm text-muted-foreground pl-11">{faq.answer}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Map Section (Placeholder) */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <Card className="overflow-hidden border-2">
            <div className="bg-gradient-to-br from-[#1e3a8a] to-[#2563eb] p-12 text-center text-white">
              <MapPin className="size-16 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Visit Our Office</h3>
              <p className="text-blue-100 mb-4">Ministry of Urban Development</p>
              <p className="text-sm text-blue-200">Nirman Bhavan, Maulana Azad Road, New Delhi - 110011, India</p>
            </div>
          </Card>
        </div>
      </section>

      {/* Emergency Contact */}
      <section className="py-12 bg-red-600 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <h3 className="text-2xl font-bold mb-4">Emergency Complaints?</h3>
            <p className="mb-6">For urgent civic issues requiring immediate attention, please contact:</p>
            <div className="flex flex-wrap gap-4 justify-center">
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white rounded-lg px-8 py-4">
                <Phone className="size-6 mx-auto mb-2" />
                <p className="font-bold text-xl">1800-XXX-EMERGENCY</p>
              </div>
              <div className="bg-white/10 backdrop-blur-sm border-2 border-white rounded-lg px-8 py-4">
                <Mail className="size-6 mx-auto mb-2" />
                <p className="font-bold text-xl">emergency@saip.gov.in</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <GovFooter />
    </div>
  );
}

