import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Link, useNavigate } from "react-router";
import { Building2, Users, Briefcase, Shield, ArrowLeft, Lock, Mail, Award, CheckCircle2, LogIn, UserCircle, HelpCircle, Phone, FileText, Globe, Eye, EyeOff, Info, Download, BookOpen, MessageCircle, Bell } from "lucide-react";
import { loginUser } from "../utils/auth";
import { toast } from "sonner";
import { motion } from "motion/react";
import { GovHeader } from "../components/GovHeader";
import backgroundImg from "../../imports/image-7.png";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"public" | "employee" | "admin">("public");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleRoleChange = (nextRole: "public" | "employee" | "admin") => {
    if (nextRole === role) {
      return;
    }

    setRole(nextRole);
    setEmail("");
    setPassword("");
    setRememberMe(false);
    setShowPassword(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setIsSubmitting(true);
      const user = await loginUser({
        email,
        password,
        role,
      });

      toast.success("Login successful!");
      navigate(
        user.portalRole === "admin"
          ? "/admin"
          : user.portalRole === "employee"
            ? "/employee"
            : "/public"
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Invalid credentials. Please check your email and password.";
      const isSeededAdminCredentialError =
        role === "admin" && /invalid email or password/i.test(errorMessage);

      toast.error(
        isSeededAdminCredentialError
          ? "For seeded admin accounts, use password admin123. The database hash will not work as a login password."
          : errorMessage
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const roleConfig = {
    public: {
      icon: Users,
      gradient: "from-blue-500 to-blue-600",
      bgColor: "bg-blue-50",
      label: "Citizen",
      placeholder: "citizen@example.com",
    },
    employee: {
      icon: Briefcase,
      gradient: "from-emerald-500 to-emerald-600",
      bgColor: "bg-emerald-50",
      label: "Employee",
      placeholder: "employee@gov.in or EMP12345",
    },
    admin: {
      icon: Shield,
      gradient: "from-primary to-blue-600",
      bgColor: "bg-blue-50",
      label: "Administrator",
      placeholder: "admin@gov.in or ADMIN001",
    },
  };

  const currentRole = roleConfig[role as keyof typeof roleConfig];
  const RoleIcon = currentRole.icon;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background Image with Overlay */}
      <div 
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: `url(${backgroundImg.src})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-950/70 via-indigo-950/75 to-purple-950/80" />
        <div className="absolute inset-0 backdrop-blur-[2px]" />
      </div>

      {/* Animated Gradient Overlays */}
      <div className="fixed inset-0 -z-10">
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      {/* Government Header */}
      <GovHeader />

      <div className="flex-1 flex items-center justify-center p-4 py-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-2 gap-8 items-start">
          {/* Left Side - Info Section */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
            className="hidden lg:block"
          >
            <div className="text-white space-y-8">
              <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-orange-400 to-orange-600 p-3.5 rounded-2xl shadow-2xl shadow-orange-500/30 border-2 border-orange-300/30">
                  <Award className="size-9 text-white" />
                </div>
                <div>
                  <p className="text-base font-bold text-orange-100">Government of India</p>
                  <p className="text-sm text-blue-300 font-semibold">Digital India Initiative</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-xl rounded-3xl p-8 border-2 border-white/20 shadow-2xl">
                <div className="mb-6">
                  <h3 className="text-5xl font-bold mb-3 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
                    Welcome to SAIP
                  </h3>
                  <div className="h-1.5 w-24 bg-gradient-to-r from-orange-400 via-blue-400 to-green-400 rounded-full mb-6" />
                  <p className="text-blue-100 leading-relaxed text-lg">
                    Smart AI Civic Intelligence Platform - Transforming civic governance through transparency, efficiency, and citizen empowerment.
                  </p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="bg-green-500/20 p-2 rounded-lg">
                      <CheckCircle2 className="size-5 text-green-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">AI-Powered Management</p>
                      <p className="text-sm text-blue-200">Intelligent complaint categorization and routing</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <CheckCircle2 className="size-5 text-blue-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">Real-time Tracking</p>
                      <p className="text-sm text-blue-200">Complete transparency from filing to resolution</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <CheckCircle2 className="size-5 text-purple-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">Secure & Verified</p>
                      <p className="text-sm text-blue-200">Digital signatures and advanced security</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="bg-orange-500/20 p-2 rounded-lg">
                      <CheckCircle2 className="size-5 text-orange-300" />
                    </div>
                    <div>
                      <p className="font-semibold text-white mb-1">24/7 Support</p>
                      <p className="text-sm text-blue-200">AI Assistant guidance anytime, anywhere</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm text-blue-200">
                <div className="flex items-center gap-2">
                  <div className="size-2 bg-green-400 rounded-full animate-pulse" />
                  <span>System Online</span>
                </div>
                <div className="h-4 w-px bg-white/20" />
                <div>Serving 50,000+ citizens</div>
              </div>
            </div>
          </motion.div>

          {/* Right Side - Login Form */}
          <div className="w-full relative">
            {/* Top Navigation Bar */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="space-y-3 mb-6"
            >
              {/* Main Navigation Row */}
              <div className="flex flex-wrap items-center justify-between gap-3">
                {/* Back button */}
                <Link to="/" className="inline-flex items-center gap-2 text-white hover:text-white mb-0 transition-all bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-xl px-5 py-2.5 rounded-xl border-2 border-white/40 shadow-lg hover:shadow-xl hover:scale-105 font-bold">
                  <ArrowLeft className="size-4" />
                  <span>Home</span>
                </Link>

                {/* Quick Links */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toast.info("Help: Contact support at 1800-123-4567")}
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-all bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/30 hover:bg-white/20 text-xs font-semibold hover:scale-105"
                  >
                    <HelpCircle className="size-3.5" />
                    <span className="hidden sm:inline">Help</span>
                  </button>
                  <button
                    onClick={() => toast.info("Support: 1800-123-4567 (24/7)")}
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-all bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/30 hover:bg-white/20 text-xs font-semibold hover:scale-105"
                  >
                    <Phone className="size-3.5" />
                    <span className="hidden sm:inline">Support</span>
                  </button>
                  <button
                    onClick={() => toast.info("Available languages: English, Hindi, Bengali, Telugu")}
                    className="inline-flex items-center gap-1.5 text-white/90 hover:text-white transition-all bg-white/10 backdrop-blur-md px-3 py-2 rounded-lg border border-white/30 hover:bg-white/20 text-xs font-semibold hover:scale-105"
                  >
                    <Globe className="size-3.5" />
                    <span className="hidden sm:inline">EN</span>
                  </button>
                </div>
              </div>

              {/* Additional Features Row */}
              <div className="flex items-center justify-between gap-2 bg-white/5 backdrop-blur-md rounded-xl p-2 border border-white/20">
                <div className="flex items-center gap-2 flex-wrap flex-1">
                  <button
                    onClick={() => toast.success("Download SAIP Mobile App from Play Store")}
                    className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-all hover:bg-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    <Download className="size-3.5" />
                    <span className="hidden md:inline">Download App</span>
                  </button>
                  <div className="h-4 w-px bg-white/20 hidden md:block" />
                  <button
                    onClick={() => toast.info("Access user guides and documentation")}
                    className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-all hover:bg-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    <BookOpen className="size-3.5" />
                    <span className="hidden md:inline">User Guide</span>
                  </button>
                  <div className="h-4 w-px bg-white/20 hidden md:block" />
                  <button
                    onClick={() => toast.success("Live Chat: Our support team is ready to help!")}
                    className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-all hover:bg-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    <MessageCircle className="size-3.5" />
                    <span className="hidden md:inline">Live Chat</span>
                  </button>
                  <div className="h-4 w-px bg-white/20 hidden md:block" />
                  <button
                    onClick={() => toast.success("System Status: All services operational")}
                    className="inline-flex items-center gap-1.5 text-white/80 hover:text-white transition-all hover:bg-white/10 px-2.5 py-1.5 rounded-lg text-xs font-semibold"
                  >
                    <Bell className="size-3.5" />
                    <span className="hidden md:inline">Updates</span>
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Logo */}
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="flex items-center justify-center gap-3 mb-8"
            >
              <div className="relative">
                <div className="absolute inset-0 bg-blue-400/60 blur-2xl rounded-full" />
                <div className="bg-gradient-to-br from-blue-500 to-indigo-600 p-4 rounded-2xl border-2 border-blue-300/30 shadow-2xl relative">
                  <Building2 className="size-10 text-white" strokeWidth={2.5} />
                </div>
              </div>
              <div>
                <h1 className="text-4xl font-bold text-white tracking-tight sm:text-5xl">SAIP</h1>
                <p className="text-sm text-blue-200 font-semibold">Smart AI Civic Intelligence</p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <Card className="p-6 lg:p-7 shadow-2xl border-2 border-white/30 bg-white/10 backdrop-blur-xl rounded-3xl">
                {/* Header with dynamic role icon */}
                <div className="text-center mb-5">
                  {/* Role Badge */}
                  <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/90 to-amber-500/90 backdrop-blur-md px-4 py-2 rounded-full shadow-xl border-2 border-orange-300/30 mb-4">
                    <Award className="size-4 text-white" />
                    <span className="text-white font-bold text-xs">Government of India | Digital India</span>
                  </div>

                  {/* Title with Icon */}
                  <div className="flex items-center justify-center gap-3 mb-2">
                    <div className="relative group">
                      <div className={`absolute inset-0 bg-gradient-to-r ${currentRole.gradient} rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity`} />
                      <div className={`relative bg-gradient-to-br ${currentRole.gradient} p-2.5 rounded-xl border-2 border-white/40 shadow-2xl`}>
                        <RoleIcon className="size-7 text-white" strokeWidth={2.5} />
                      </div>
                    </div>
                    <div className="text-left">
                      <h2 className="text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent sm:text-3xl">Portal Login</h2>
                      <p className="text-xs text-blue-200 font-semibold">Secure government access</p>
                    </div>
                  </div>
                  <p className="text-blue-100 text-sm">Access your {currentRole.label.toLowerCase()} dashboard</p>
                </div>

                {/* Role Selection Tabs */}
                <Tabs
                  value={role}
                  onValueChange={(value) => handleRoleChange(value as "public" | "employee" | "admin")}
                  className="mb-5"
                >
                  <TabsList className="grid w-full grid-cols-3 p-1 bg-white/10 backdrop-blur-md rounded-xl shadow-inner border border-white/20">
                    <TabsTrigger 
                      value="public" 
                      className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-500 data-[state=active]:to-blue-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-bold transition-all text-xs text-white/70 data-[state=active]:border data-[state=active]:border-white/30"
                    >
                      <Users className="size-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Citizen</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="employee" 
                      className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-bold transition-all text-xs text-white/70 data-[state=active]:border data-[state=active]:border-white/30"
                    >
                      <Briefcase className="size-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Employee</span>
                    </TabsTrigger>
                    <TabsTrigger 
                      value="admin" 
                      className="data-[state=active]:bg-gradient-to-br data-[state=active]:from-blue-600 data-[state=active]:to-indigo-600 data-[state=active]:text-white data-[state=active]:shadow-lg rounded-lg font-bold transition-all text-xs text-white/70 data-[state=active]:border data-[state=active]:border-white/30"
                    >
                      <Shield className="size-3.5 mr-1.5" />
                      <span className="hidden sm:inline">Admin</span>
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value={role} className="mt-5">
                    <form onSubmit={handleLogin} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor={`email-${role}`} className="text-xs font-bold text-white flex items-center gap-1.5">
                          <UserCircle className="size-3.5" />
                          Email / Employee ID
                        </Label>
                        <div className="relative">
                          <Mail className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${role === 'public' ? 'text-blue-400' : role === 'employee' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                          <Input
                            id={`email-${role}`}
                            type="text"
                            placeholder={currentRole.placeholder}
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`pl-10 h-11 border-2 bg-white/10 backdrop-blur-md text-white placeholder:text-white/50 ${role === 'public' ? 'border-blue-400/50 focus:border-blue-400' : role === 'employee' ? 'border-emerald-400/50 focus:border-emerald-400' : 'border-indigo-400/50 focus:border-indigo-400'} transition-all rounded-xl text-sm`}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`password-${role}`} className="text-xs font-bold text-white flex items-center gap-1.5">
                          <Lock className="size-3.5" />
                          Password
                        </Label>
                        <div className="relative">
                          <Lock className={`absolute left-3 top-1/2 -translate-y-1/2 size-4 ${role === 'public' ? 'text-blue-400' : role === 'employee' ? 'text-emerald-400' : 'text-indigo-400'}`} />
                          <Input
                            id={`password-${role}`}
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your secure password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className={`pl-10 pr-10 h-11 border-2 bg-white/10 backdrop-blur-md text-white placeholder:text-white/50 ${role === 'public' ? 'border-blue-400/50 focus:border-blue-400' : role === 'employee' ? 'border-emerald-400/50 focus:border-emerald-400' : 'border-indigo-400/50 focus:border-indigo-400'} transition-all rounded-xl text-sm`}
                            required
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/50 hover:text-white transition-colors"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                          </button>
                        </div>
                        {role === "admin" ? (
                          <p className="text-[11px] text-amber-200">
                            Seeded admin emails like <span className="font-semibold text-white">admin18@saip.com</span> use password <span className="font-semibold text-white">admin123</span>.
                          </p>
                        ) : null}
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <Input
                            id={`remember-${role}`}
                            type="checkbox"
                            checked={rememberMe}
                            onChange={(e) => setRememberMe(e.target.checked)}
                            className="h-4 w-4 bg-white/10 backdrop-blur-md border-2 border-white/40 rounded-lg text-blue-500 focus:ring-blue-500 focus:ring-2"
                          />
                          <Label htmlFor={`remember-${role}`} className="text-xs text-white/70 ml-2">
                            Remember me
                          </Label>
                        </div>
                        <Link to="/forgot-password" className="text-xs text-blue-300 font-bold hover:text-blue-200 hover:underline">
                          Forgot password?
                        </Link>
                      </div>

                      <Button 
                        type="submit" 
                        disabled={isSubmitting}
                        className={`w-full h-12 text-base font-bold bg-gradient-to-r ${currentRole.gradient} hover:opacity-90 shadow-2xl ${role === 'public' ? 'shadow-blue-500/50' : role === 'employee' ? 'shadow-emerald-500/50' : 'shadow-indigo-500/50'} hover:shadow-xl transition-all hover:scale-[1.02] rounded-xl border-2 border-white/30`}
                      >
                        <LogIn className="size-4 mr-2" />
                        {isSubmitting ? "Signing in..." : `Login as ${currentRole.label}`}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                <div className="mb-4 rounded-xl border border-white/20 bg-white/5 p-3 text-xs text-blue-100">
                  Login now uses the configured API base URL from <span className="font-semibold text-white">VITE_API_BASE_URL</span> or <span className="font-semibold text-white">NEXT_PUBLIC_API_BASE_URL</span>. For seeded admin accounts, use password <span className="font-semibold text-white">admin123</span>.
                </div>

                {/* Footer Links */}
                <div className="border-t-2 border-white/20 pt-4 space-y-3">
                  <div className="text-center text-xs">
                    <p className="text-white font-semibold">
                      {role === "public" && (
                        <>
                          New citizen?{" "}
                          <Link to="/register" className="text-blue-300 font-bold hover:text-blue-200 hover:underline">
                            Create account
                          </Link>
                        </>
                      )}
                      {role === "employee" && (
                        <>
                          New employee?{" "}
                          <Link to="/employee-register" className="text-emerald-300 font-bold hover:text-emerald-200 hover:underline">
                            Register here
                          </Link>
                        </>
                      )}
                      {role === "admin" && (
                        <>
                          New administrator?{" "}
                          <Link to="/admin-register" className="text-blue-300 font-bold hover:text-blue-200 hover:underline">
                            Register here
                          </Link>
                        </>
                      )}
                    </p>
                  </div>

                  {/* Additional Footer Navigation */}
                  <div className="flex items-center justify-center gap-3 flex-wrap">
                    <button
                      onClick={() => toast.info("Privacy Policy: Your data is protected")}
                      className="text-xs text-white/70 hover:text-white/90 hover:underline transition-colors"
                    >
                      <FileText className="size-3 inline mr-1" />
                      Privacy Policy
                    </button>
                    <span className="text-white/40">•</span>
                    <button
                      onClick={() => toast.info("Terms of Service information")}
                      className="text-xs text-white/70 hover:text-white/90 hover:underline transition-colors"
                    >
                      <FileText className="size-3 inline mr-1" />
                      Terms of Service
                    </button>
                    <span className="text-white/40">•</span>
                    <button
                      onClick={() => toast.info("FAQs: Find answers to common questions")}
                      className="text-xs text-white/70 hover:text-white/90 hover:underline transition-colors"
                    >
                      <Info className="size-3 inline mr-1" />
                      FAQs
                    </button>
                  </div>

                  {/* Security Info */}
                  <div className="bg-white/5 backdrop-blur-md border border-white/20 rounded-lg p-2 flex items-center justify-center gap-2">
                    <Shield className="size-3.5 text-green-400" />
                    <span className="text-xs text-white/80">
                      <span className="font-bold text-green-400">Secure Connection</span> • 256-bit Encryption
                    </span>
                  </div>
                </div>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
