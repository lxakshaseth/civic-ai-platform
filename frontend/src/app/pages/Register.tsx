import { useState, useRef } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Link, useNavigate } from "react-router";
import { Building2, User, Mail, Phone, MapPin, Home, Lock, PenTool, ArrowLeft, CheckCircle2, Award, Shield, UserPlus, Sparkles } from "lucide-react";
import SignatureCanvas from "react-signature-canvas";
import { registerUser, validatePasswordStrength } from "../utils/auth";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function Register() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    pincode: "",
    password: "",
    confirmPassword: "",
  });
  const signatureRef = useRef<SignatureCanvas>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (signatureRef.current?.isEmpty()) {
      toast.error("Please provide your digital signature");
      return;
    }

    // Validation
    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    const passwordValidationMessage = validatePasswordStrength(formData.password);

    if (passwordValidationMessage) {
      toast.error(passwordValidationMessage);
      return;
    }

    try {
      setIsSubmitting(true);
      await registerUser({
        fullName: formData.fullName,
        email: formData.email,
        password: formData.password,
        phone: formData.phone,
        role: "public",
      });

      toast.success("Registration successful! Redirecting to your dashboard...");
      navigate("/public");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to complete registration right now."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearSignature = () => {
    signatureRef.current?.clear();
    toast.info("Signature cleared");
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Use an abstract background so no duplicate registration UI shows behind the form */}
      <div className="fixed inset-0 bg-slate-950">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 15% 20%, rgba(103, 232, 249, 0.22), transparent 24%),
              radial-gradient(circle at 85% 18%, rgba(96, 165, 250, 0.24), transparent 24%),
              radial-gradient(circle at 50% 82%, rgba(14, 165, 233, 0.2), transparent 30%),
              linear-gradient(135deg, #10234f 0%, #1b4d8b 45%, #3f9cd1 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.18]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.14) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.14) 1px, transparent 1px)
            `,
            backgroundSize: "112px 112px",
            maskImage: "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.2))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(15,23,42,0.1)_50%,rgba(15,23,42,0.55)_100%)]" />
      </div>

      {/* Animated Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] h-72 w-72 rounded-full bg-cyan-300/12 blur-3xl animate-pulse" />
        <div className="absolute right-[8%] top-1/3 h-96 w-96 rounded-full bg-blue-300/12 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-16 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 min-h-screen px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
          {/* Back button */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6"
          >
            <Link to="/login" className="inline-flex items-center gap-2 text-white hover:text-cyan-200 transition-colors bg-white/10 backdrop-blur-md px-4 py-2.5 rounded-xl border border-white/20 hover:bg-white/20 group">
              <ArrowLeft className="size-4 group-hover:-translate-x-1 transition-transform" />
              <span className="font-semibold">Back to login</span>
            </Link>
          </motion.div>

          {/* Header Section */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mx-auto mb-8 max-w-4xl text-center sm:mb-10"
          >
            {/* Logo */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-blue-500 rounded-2xl blur-xl opacity-75 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl p-4 rounded-2xl border-2 border-white/40 shadow-2xl">
                  <Building2 className="size-12 text-blue-600" strokeWidth={2.5} />
                </div>
              </div>
              <div className="text-left">
                <h1 className="text-6xl font-bold bg-gradient-to-r from-white via-cyan-100 to-blue-200 bg-clip-text text-transparent tracking-tight">
                  SAIP
                </h1>
                <p className="text-cyan-100 font-semibold text-sm tracking-wide">Smart AI Civic Intelligence</p>
              </div>
            </div>

            {/* Subtitle with Badge */}
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/90 to-amber-500/90 backdrop-blur-md px-5 py-2.5 rounded-full shadow-xl border-2 border-orange-300/30">
                <Award className="size-5 text-white" />
                <span className="text-white font-bold text-sm">Government of India • Digital India Initiative</span>
              </div>
              
              <div>
                <h2 className="text-4xl font-bold text-white mb-2 flex items-center justify-center gap-3">
                  <UserPlus className="size-8" />
                  Citizen Registration
                </h2>
                <p className="text-cyan-100 text-lg">Join thousands of citizens using SAIP for civic engagement</p>
              </div>
            </div>
          </motion.div>

          {/* Registration Form Card */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative mx-auto max-w-[920px]"
          >
            <div className="absolute inset-x-10 -bottom-8 h-28 rounded-full bg-slate-950/35 blur-3xl" />
            <div className="absolute -inset-2 rounded-[2rem] border border-white/20 bg-white/10 shadow-[0_30px_90px_rgba(8,15,35,0.18)] backdrop-blur-sm" />
            <Card className="relative overflow-hidden rounded-[2rem] border border-white/65 bg-white/94 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.28),0_10px_30px_rgba(14,165,233,0.16)] backdrop-blur-2xl sm:p-8 lg:p-9">
              <div className="pointer-events-none absolute inset-x-12 top-0 h-24 bg-gradient-to-b from-white/75 via-white/30 to-transparent blur-2xl" />
              {/* Benefits Banner */}
              <div className="relative mb-7 grid grid-cols-1 gap-4 border-b-2 border-blue-100 pb-7 md:grid-cols-3">
                <div className="flex items-center gap-3 bg-gradient-to-br from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
                  <div className="bg-blue-500 p-2.5 rounded-lg shadow-lg">
                    <CheckCircle2 className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">Quick Setup</p>
                    <p className="text-xs text-gray-600">Register in 2 minutes</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-200">
                  <div className="bg-green-500 p-2.5 rounded-lg shadow-lg">
                    <Shield className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">100% Secure</p>
                    <p className="text-xs text-gray-600">Government verified</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 bg-gradient-to-br from-purple-50 to-indigo-50 p-4 rounded-xl border border-purple-200">
                  <div className="bg-purple-500 p-2.5 rounded-lg shadow-lg">
                    <Sparkles className="size-5 text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">AI-Powered</p>
                    <p className="text-xs text-gray-600">Smart solutions</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Personal Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-2 rounded-lg">
                      <User className="size-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Personal Information</h3>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName" className="text-sm font-bold text-gray-700">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue-500" />
                        <Input
                          id="fullName"
                          placeholder="John Doe"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-blue-500 transition-all rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-bold text-gray-700">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue-500" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-blue-500 transition-all rounded-xl"
                          required
                        />
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm font-bold text-gray-700">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue-500" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+91 98765 43210"
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-blue-500 transition-all rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="city" className="text-sm font-bold text-gray-700">City *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-blue-500" />
                        <Input
                          id="city"
                          placeholder="Mumbai"
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-blue-500 transition-all rounded-xl"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Address Information */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gradient-to-br from-green-500 to-emerald-600 p-2 rounded-lg">
                      <Home className="size-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Address Details</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="address" className="text-sm font-bold text-gray-700">Street Address *</Label>
                      <div className="relative">
                        <Home className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-green-500" />
                        <Input
                          id="address"
                          placeholder="123 Main Street"
                          value={formData.address}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-green-500 transition-all rounded-xl"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="pincode" className="text-sm font-bold text-gray-700">PIN Code *</Label>
                      <div className="relative">
                        <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-green-500" />
                        <Input
                          id="pincode"
                          placeholder="400001"
                          value={formData.pincode}
                          onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-green-500 transition-all rounded-xl"
                          required
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gradient-to-br from-purple-500 to-indigo-600 p-2 rounded-lg">
                      <Lock className="size-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Security</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-bold text-gray-700">Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-purple-500" />
                        <Input
                          id="password"
                          type="password"
                          placeholder="Create a strong password"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-purple-500 transition-all rounded-xl"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword" className="text-sm font-bold text-gray-700">Confirm Password *</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-purple-500" />
                        <Input
                          id="confirmPassword"
                          type="password"
                          placeholder="Re-enter password"
                          value={formData.confirmPassword}
                          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                          className="pl-11 h-12 border-2 border-gray-200 focus:border-purple-500 transition-all rounded-xl"
                          required
                          minLength={6}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Digital Signature */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 mb-4">
                    <div className="bg-gradient-to-br from-orange-500 to-red-600 p-2 rounded-lg">
                      <PenTool className="size-5 text-white" />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900">Digital Signature</h3>
                  </div>

                  <div className="bg-gradient-to-br from-gray-50 to-blue-50 border-2 border-blue-200 rounded-2xl p-6">
                    <Label className="text-sm font-bold text-gray-700 mb-3 block">
                      Please sign below *
                    </Label>
                    <div className="border-4 border-dashed border-blue-300 rounded-xl overflow-hidden bg-white shadow-inner">
                      <SignatureCanvas
                        ref={signatureRef}
                        canvasProps={{
                          className: "w-full h-40 cursor-crosshair",
                        }}
                        backgroundColor="white"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={clearSignature}
                      className="mt-4 border-2 border-orange-500 text-orange-600 hover:bg-orange-50 font-semibold rounded-xl"
                    >
                      <PenTool className="size-4 mr-2" />
                      Clear Signature
                    </Button>
                  </div>
                </div>

                {/* Submit Button */}
                <div className="pt-4">
                  <Button 
                    type="submit" 
                    disabled={isSubmitting}
                    className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 via-cyan-600 to-blue-700 hover:from-blue-700 hover:via-cyan-700 hover:to-blue-800 shadow-2xl shadow-blue-500/50 hover:shadow-blue-600/60 transition-all hover:scale-[1.02] rounded-xl"
                  >
                    <UserPlus className="size-5 mr-2" />
                    {isSubmitting ? "Creating account..." : "Complete Registration"}
                  </Button>
                </div>
              </form>

              {/* Footer Links */}
              <div className="border-t-2 border-gray-200 pt-6 mt-8">
                <p className="text-center text-gray-600">
                  Already have an account?{" "}
                  <Link to="/login" className="text-blue-600 font-bold hover:text-blue-700 hover:underline">
                    Login here
                  </Link>
                </p>
              </div>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
