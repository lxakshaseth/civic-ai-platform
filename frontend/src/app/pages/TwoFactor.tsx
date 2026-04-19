import { useState, useEffect } from "react";
import { Button } from "../components/ui/button";
import { Card } from "../components/ui/card";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "../components/ui/input-otp";
import { useNavigate } from "react-router";
import { Building2, Shield, Mail, Smartphone, CheckCircle2, ArrowLeft } from "lucide-react";
import { getPendingRole, clearPendingRole } from "../utils/auth";
import { toast } from "sonner";
import { motion } from "motion/react";
import { Link } from "react-router";

export default function TwoFactor() {
  const [otp, setOtp] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if there's a pending role, if not redirect to login
    const pendingRole = getPendingRole();
    if (!pendingRole) {
      toast.error("Please login first");
      navigate("/login");
    } else {
      // Simulate OTP sent notification
      toast.success("OTP sent to your registered email and phone!");
    }
  }, [navigate]);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length === 6) {
      setIsVerifying(true);

      // Simulate verification delay
      await new Promise(resolve => setTimeout(resolve, 1500));

      // In a real app, we would verify the OTP server-side
      // For demo purposes, any 6-digit code works
      const role = getPendingRole();
      clearPendingRole();

      if (role === "admin") {
        toast.success("Verification successful! Welcome to Admin Portal.");
        navigate("/admin");
      } else {
        toast.success("Verification successful! Welcome to Employee Portal.");
        navigate("/employee");
      }
    }
  };

  const resendOTP = () => {
    setOtp("");
    toast.success("New OTP sent to your registered email and phone");
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background */}
      <div className="fixed inset-0 -z-10 bg-gradient-to-br from-blue-50 via-white to-indigo-50" />
      <div
        className="fixed inset-0 -z-10 opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 30% 40%, rgba(37, 99, 235, 0.2) 0%, transparent 50%),
                           radial-gradient(circle at 70% 80%, rgba(99, 102, 241, 0.15) 0%, transparent 50%)`,
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Back button */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Link to="/login" className="inline-flex items-center gap-2 text-gray-600 hover:text-primary mb-6 transition-colors">
            <ArrowLeft className="size-4" />
            <span className="font-medium">Back to login</span>
          </Link>
        </motion.div>

        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="flex items-center justify-center gap-3 mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
            <Building2 className="size-12 text-primary relative" strokeWidth={2.5} />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-primary tracking-tight">SAIP</h1>
            <p className="text-sm text-gray-600 font-medium">Two-Factor Authentication</p>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card className="p-8 lg:p-10 shadow-2xl border-2 border-gray-100">
            {/* Security Icon */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full" />
                <div className="relative bg-gradient-to-br from-primary to-blue-600 size-20 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/30">
                  <Shield className="size-10 text-white" strokeWidth={2.5} />
                </div>
              </div>
            </div>

            <h2 className="text-3xl font-bold text-center mb-2 text-gray-900">Verify Your Identity</h2>
            <p className="text-center text-gray-600 mb-8 leading-relaxed">
              We've sent a 6-digit verification code to your registered contact methods
            </p>

            {/* OTP Sent Info */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                <Mail className="size-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">Email</p>
                <p className="text-xs text-gray-600 mt-1">Code sent</p>
              </div>
              <div className="bg-blue-50 border-2 border-blue-200 rounded-xl p-4 text-center">
                <Smartphone className="size-6 text-primary mx-auto mb-2" />
                <p className="text-xs font-semibold text-gray-700">SMS</p>
                <p className="text-xs text-gray-600 mt-1">Code sent</p>
              </div>
            </div>

            <form onSubmit={handleVerify} className="space-y-6">
              <div className="flex flex-col items-center">
                <Label className="text-sm font-semibold text-gray-700 mb-3">Enter 6-Digit Code</Label>
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup className="gap-2">
                    <InputOTPSlot index={0} className="w-12 h-14 text-xl font-bold border-2 focus:border-primary" />
                    <InputOTPSlot index={1} className="w-12 h-14 text-xl font-bold border-2 focus:border-primary" />
                    <InputOTPSlot index={2} className="w-12 h-14 text-xl font-bold border-2 focus:border-primary" />
                    <InputOTPSlot index={3} className="w-12 h-14 text-xl font-bold border-2 focus:border-primary" />
                    <InputOTPSlot index={4} className="w-12 h-14 text-xl font-bold border-2 focus:border-primary" />
                    <InputOTPSlot index={5} className="w-12 h-14 text-xl font-bold border-2 focus:border-primary" />
                  </InputOTPGroup>
                </InputOTP>
              </div>

              {otp.length === 6 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="flex items-center justify-center gap-2 text-emerald-600"
                >
                  <CheckCircle2 className="size-5" />
                  <span className="text-sm font-semibold">Code complete!</span>
                </motion.div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-primary shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 transition-all hover:scale-[1.02] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={otp.length !== 6 || isVerifying}
              >
                {isVerifying ? (
                  <span className="flex items-center gap-2">
                    <div className="size-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Verifying...
                  </span>
                ) : (
                  "Verify & Continue"
                )}
              </Button>
            </form>

            <div className="border-t border-gray-200 pt-6 mt-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Didn't receive the code?{" "}
                  <button
                    onClick={resendOTP}
                    className="text-primary font-semibold hover:underline transition-colors"
                  >
                    Resend OTP
                  </button>
                </p>
                <p className="text-xs text-gray-500 mt-3">
                  Demo: Enter any 6-digit code to continue
                </p>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}

function Label({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <label className={className}>{children}</label>;
}