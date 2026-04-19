import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/ui/select";
import { Link, useNavigate } from "react-router";
import { Shield, ArrowLeft, User, Mail, Phone, IdCard, Lock, Key, CheckCircle2, AlertTriangle, Award } from "lucide-react";
import { registerUser, validatePasswordStrength } from "../utils/auth";
import { toast } from "sonner";
import { motion } from "motion/react";

export default function AdminRegister() {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    adminId: "",
    department: "",
    password: "",
    confirmPassword: "",
    adminCode: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Admin registration code (in real app, this would be validated server-side)
  const ADMIN_REGISTRATION_CODE = "SAIP-ADMIN-2026";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate admin code
    if (formData.adminCode !== ADMIN_REGISTRATION_CODE) {
      toast.error("Invalid admin registration code");
      return;
    }

    // Validation
    if (!formData.department) {
      toast.error("Please select a department");
      return;
    }

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
        role: "admin",
      });

      toast.success("Admin registration successful! Redirecting to admin workspace...");
      navigate("/admin");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Unable to complete admin registration."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Use an abstract background so no duplicate registration UI shows behind the form */}
      <div className="fixed inset-0 bg-slate-950">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(circle at 16% 20%, rgba(96, 165, 250, 0.22), transparent 24%),
              radial-gradient(circle at 84% 18%, rgba(168, 85, 247, 0.22), transparent 24%),
              radial-gradient(circle at 52% 82%, rgba(99, 102, 241, 0.18), transparent 30%),
              linear-gradient(135deg, #111d52 0%, #1e3f8c 48%, #5d77d7 100%)
            `,
          }}
        />
        <div
          className="absolute inset-0 opacity-[0.16]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.12) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.12) 1px, transparent 1px)
            `,
            backgroundSize: "112px 112px",
            maskImage: "linear-gradient(to bottom, rgba(255,255,255,0.9), rgba(255,255,255,0.2))",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/10 via-transparent to-slate-950/45" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0,rgba(15,23,42,0.1)_52%,rgba(15,23,42,0.54)_100%)]" />
      </div>

      {/* Animated Gradient Overlays */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-[10%] h-72 w-72 rounded-full bg-blue-300/14 blur-3xl animate-pulse" />
        <div className="absolute right-[8%] top-1/3 h-96 w-96 rounded-full bg-violet-300/14 blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-14 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/9 blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
      </div>

      <div className="relative z-10 min-h-screen px-4 py-6 sm:py-8">
        <div className="mx-auto max-w-5xl">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/login" className="group mb-6 inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-white transition-colors backdrop-blur-md hover:bg-white/20 hover:text-blue-100">
            <ArrowLeft className="size-4 transition-transform group-hover:-translate-x-1" />
            <span className="font-semibold">Back to login</span>
          </Link>
        </motion.div>

        {/* Logo & Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mx-auto mb-8 max-w-4xl text-center sm:mb-10"
        >
          <div className="mb-6 flex items-center justify-center gap-4">
            <div className="group relative">
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-r from-blue-400 to-violet-500 blur-xl opacity-75 transition-opacity group-hover:opacity-100" />
              <div className="relative rounded-2xl border-2 border-white/35 bg-gradient-to-br from-white/90 to-white/72 p-4 shadow-2xl backdrop-blur-xl">
                <Shield className="size-12 text-blue-600" strokeWidth={2.5} />
              </div>
            </div>
            <div className="text-left">
              <h1 className="bg-gradient-to-r from-white via-blue-100 to-indigo-200 bg-clip-text text-6xl font-bold tracking-tight text-transparent">
                SAIP
              </h1>
              <p className="text-sm font-semibold tracking-wide text-blue-100">Administrative Access Portal</p>
            </div>
          </div>
          
          {/* Government Badge */}
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border-2 border-orange-300/30 bg-gradient-to-r from-orange-500/90 to-amber-500/90 px-5 py-2.5 shadow-xl backdrop-blur-md">
              <Award className="size-5 text-white" />
              <span className="text-sm font-bold text-white">Super Admin Access</span>
            </div>
            <div>
              <h2 className="mb-2 flex items-center justify-center gap-3 text-4xl font-bold text-white">
                <Shield className="size-8" />
                Admin Registration
              </h2>
              <p className="text-lg text-blue-100">Secure administrative onboarding with privileged access controls</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="relative mx-auto max-w-[900px]"
        >
          <div className="absolute inset-x-10 -bottom-8 h-28 rounded-full bg-slate-950/35 blur-3xl" />
          <div className="absolute -inset-2 rounded-[2rem] border border-white/20 bg-white/10 shadow-[0_30px_90px_rgba(17,29,82,0.24)] backdrop-blur-sm" />
          <Card className="relative overflow-hidden rounded-[2rem] border border-white/65 bg-white/94 p-6 shadow-[0_24px_80px_rgba(30,64,175,0.24),0_10px_30px_rgba(99,102,241,0.14)] backdrop-blur-2xl sm:p-8 lg:p-9">
            <div className="pointer-events-none absolute inset-x-12 top-0 h-24 bg-gradient-to-b from-white/75 via-white/30 to-transparent blur-2xl" />
            {/* Header */}
            <div className="relative mb-8 flex items-center gap-4 border-b border-gray-200 pb-6">
              <div className="bg-gradient-to-br from-primary to-blue-600 size-16 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                <Shield className="size-8 text-white" strokeWidth={2.5} />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-gray-900">Admin Registration</h2>
                <p className="text-sm text-gray-600 mt-1">Secure administrative access</p>
              </div>
            </div>

            {/* Access Code Notice */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-amber-200 rounded-xl p-5 mb-8">
              <div className="flex items-start gap-3">
                <div className="bg-amber-500 size-10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="size-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-sm text-amber-900 mb-2">Administrative Access Required</h3>
                  <p className="text-xs text-amber-800 mb-3">
                    You need a valid admin registration code to create an administrator account. Contact your system administrator to obtain the code.
                  </p>
                  <div className="bg-white/80 backdrop-blur-sm border border-amber-300 rounded-lg p-3">
                    <p className="text-xs font-semibold text-amber-900 mb-1">Demo Access Code:</p>
                    <p className="text-sm text-amber-900 font-mono font-bold">SAIP-ADMIN-2026</p>
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Access Code */}
              <div className="space-y-2">
                <Label htmlFor="adminCode" className="text-sm font-semibold text-gray-700">Admin Registration Code *</Label>
                <div className="relative">
                  <Key className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                  <Input
                    id="adminCode"
                    type="password"
                    placeholder="Enter admin registration code"
                    value={formData.adminCode}
                    onChange={(e) => setFormData({ ...formData, adminCode: e.target.value })}
                    className="pl-11 h-12 border-2 focus:border-primary transition-colors"
                    required
                  />
                </div>
              </div>

              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <User className="size-5 text-primary" />
                  Personal Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName" className="text-sm font-semibold text-gray-700">Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="fullName"
                        placeholder="Jane Smith"
                        value={formData.fullName}
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        className="pl-11 h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-sm font-semibold text-gray-700">Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="email"
                        type="email"
                        placeholder="jane.smith@gov.in"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="pl-11 h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-sm font-semibold text-gray-700">Phone Number *</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="pl-11 h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="adminId" className="text-sm font-semibold text-gray-700">Admin ID *</Label>
                    <div className="relative">
                      <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="adminId"
                        placeholder="ADMIN001"
                        value={formData.adminId}
                        onChange={(e) => setFormData({ ...formData, adminId: e.target.value })}
                        className="pl-11 h-12 border-2 focus:border-primary transition-colors"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="department" className="text-sm font-semibold text-gray-700">Department *</Label>
                  <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })} required>
                    <SelectTrigger id="department" className="h-12 border-2 focus:border-primary">
                      <SelectValue placeholder="Select your department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">General Administration</SelectItem>
                      <SelectItem value="sanitation">Sanitation</SelectItem>
                      <SelectItem value="water">Water Supply</SelectItem>
                      <SelectItem value="roads">Roads & Infrastructure</SelectItem>
                      <SelectItem value="electricity">Electricity</SelectItem>
                      <SelectItem value="parks">Parks & Recreation</SelectItem>
                      <SelectItem value="health">Health & Safety</SelectItem>
                      <SelectItem value="waste">Waste Management</SelectItem>
                      <SelectItem value="it">IT & Technology</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Security */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Lock className="size-5 text-primary" />
                  Security
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="password" className="text-sm font-semibold text-gray-700">Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="password"
                        type="password"
                        placeholder="Create a strong password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="pl-11 h-12 border-2 focus:border-primary transition-colors"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">Confirm Password *</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-5 text-gray-400" />
                      <Input
                        id="confirmPassword"
                        type="password"
                        placeholder="Re-enter password"
                        value={formData.confirmPassword}
                        onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        className="pl-11 h-12 border-2 focus:border-primary transition-colors"
                        required
                        minLength={6}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Security Notice */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="bg-primary size-10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Shield className="size-5 text-white" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 mb-2">Administrator Security Features</h3>
                    <ul className="text-xs text-gray-700 space-y-1.5">
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary flex-shrink-0" />
                        Two-factor authentication (2FA) mandatory
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary flex-shrink-0" />
                        Full system access and monitoring capabilities
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary flex-shrink-0" />
                        All administrative activities are logged and audited
                      </li>
                      <li className="flex items-center gap-2">
                        <CheckCircle2 className="size-4 text-primary flex-shrink-0" />
                        Advanced fraud detection and analytics access
                      </li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button type="submit" disabled={isSubmitting} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:scale-[1.02]">
                {isSubmitting ? "Creating admin account..." : "Complete Registration"}
              </Button>
            </form>

            <div className="border-t border-gray-200 pt-6 mt-8">
              <div className="text-center text-sm space-y-2">
                <p className="text-gray-600">
                  Already have an account?{" "}
                  <Link to="/login" className="text-primary font-semibold hover:underline">
                    Login here
                  </Link>
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
      </div>
    </div>
  );
}
