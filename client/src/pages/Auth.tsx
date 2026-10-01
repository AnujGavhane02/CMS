import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { apiClient } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileText, Eye, EyeOff, CheckCircle, ArrowLeft, Mail, KeyRound, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────

type Step =
  | "tabs"           // default login / signup view
  | "verify-email"   // OTP entry after registration
  | "forgot-email"   // enter email to receive reset OTP
  | "forgot-otp"     // enter reset OTP
  | "reset-password" // enter new password after OTP verified

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getLoginErrorMessage = (raw: string): string => {
  const msg = raw.toLowerCase();
  if (msg.includes("verify your email") || msg.includes("otp"))
    return "Please verify your email first. Check your inbox for the OTP we sent during registration.";
  if (msg.includes("pending admin") || msg.includes("not verified"))
    return "Your account is pending admin approval. You will be notified once approved.";
  if (msg.includes("deactivated"))
    return "Your account has been deactivated. Please contact support.";
  if (msg.includes("invalid credentials"))
    return "Invalid email or password. Please check your credentials and try again.";
  if (msg.includes("email and password are required"))
    return "Please enter both your email and password.";
  return raw.length > 0 && raw.length < 120 ? raw : "Login failed. Please try again.";
};

// ─── Component ────────────────────────────────────────────────────────────────

const Auth = () => {
  const { login, register } = useAuth();
  const navigate = useNavigate();

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showResendVerification, setShowResendVerification] = useState(false);

  // Signup fields
  const [signupData, setSignupData] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState({
    length: false, uppercase: false, lowercase: false, number: false,
  });

  // Multi-step state
  const [step, setStep] = useState<Step>("tabs");
  const [otpEmail, setOtpEmail] = useState(""); // email being operated on (verify or reset)
  const [otpValue, setOtpValue] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [isSending, setIsSending] = useState(false);     // OTP send loading
  const [isVerifying, setIsVerifying] = useState(false); // OTP verify loading
  const [isResetting, setIsResetting] = useState(false); // password reset loading

  // ── Login ─────────────────────────────────────────────────────────────────

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowResendVerification(false);
    try {
      setIsLoggingIn(true);
      await login(email, password);
      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (error: any) {
      const raw: string = error?.message ?? "";
      const lower = raw.toLowerCase();
      if (lower.includes("verify your email") || lower.includes("email not verified")) {
        setShowResendVerification(true);
      }
      toast.error(getLoginErrorMessage(raw));
    } finally {
      setIsLoggingIn(false);
    }
  };

  const handleResendFromLogin = async () => {
    try {
      setIsSending(true);
      await apiClient.sendEmailVerificationOtp(email);
      setOtpEmail(email);
      setOtpValue("");
      setStep("verify-email");
      toast.success("Verification OTP sent. Check your inbox.");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to send verification email.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Signup ────────────────────────────────────────────────────────────────

  const validatePassword = (pwd: string) => {
    const v = {
      length: pwd.length >= 6,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /\d/.test(pwd),
    };
    setPasswordValidation(v);
    return Object.values(v).every(Boolean);
  };

  const handleSignupChange = (field: string, value: string) => {
    setSignupData((prev) => ({ ...prev, [field]: value }));
    if (field === "password") validatePassword(value);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (signupData.password !== signupData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    if (!validatePassword(signupData.password)) {
      toast.error("Password does not meet requirements");
      return;
    }
    if (!signupData.name.trim() || !signupData.email.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(signupData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }
    try {
      setIsSigningUp(true);
      await register(signupData.name, signupData.email, signupData.password);
      // Move to OTP verification step
      setOtpEmail(signupData.email);
      setOtpValue("");
      setStep("verify-email");
      toast.success("Account created! Check your email for the verification OTP.");
    } catch (error: any) {
      toast.error(error?.message ?? "Registration failed. Please try again.");
    } finally {
      setIsSigningUp(false);
    }
  };

  // ── Email OTP verification (post-signup) ──────────────────────────────────

  const handleVerifyEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue.trim()) { toast.error("Please enter the OTP"); return; }
    try {
      setIsVerifying(true);
      await apiClient.verifyEmailOtp(otpEmail, otpValue.trim());
      toast.success("Email verified! Your account is now pending admin approval.");
      setStep("tabs");
      setOtpValue("");
    } catch (error: any) {
      toast.error(error?.message ?? "OTP verification failed. Please try again.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleResendVerifyOtp = async () => {
    try {
      setIsSending(true);
      await apiClient.sendEmailVerificationOtp(otpEmail);
      toast.success("A new OTP has been sent to your email.");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to resend OTP.");
    } finally {
      setIsSending(false);
    }
  };

  // ── Forgot password ───────────────────────────────────────────────────────

  const handleForgotPasswordEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpEmail.trim()) { toast.error("Please enter your email address"); return; }
    try {
      setIsSending(true);
      await apiClient.forgotPassword(otpEmail.trim());
      setOtpValue("");
      setStep("forgot-otp");
      toast.success("If this email is registered, an OTP has been sent.");
    } catch (error: any) {
      toast.error(error?.message ?? "Failed to send OTP.");
    } finally {
      setIsSending(false);
    }
  };

  const handleForgotPasswordOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpValue.trim()) { toast.error("Please enter the OTP"); return; }
    // Just move to the new password step — OTP will be verified together with the password
    setStep("reset-password");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }
    try {
      setIsResetting(true);
      await apiClient.resetPassword(otpEmail, otpValue.trim(), newPassword);
      toast.success("Password reset successfully! You can now log in.");
      setStep("tabs");
      setOtpEmail("");
      setOtpValue("");
      setNewPassword("");
    } catch (error: any) {
      toast.error(error?.message ?? "Password reset failed. Please try again.");
    } finally {
      setIsResetting(false);
    }
  };

  // ── Shared OTP input ───────────────────────────────────────────────────────

  const handleOtpChange = (value: string) => {
    // Allow only digits, max 6
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setOtpValue(digits);
  };

  // ── Render ────────────────────────────────────────────────────────────────

  const renderStep = () => {
    // ── Verify email OTP (after registration) ─────────────────────────────
    if (step === "verify-email") {
      return (
        <>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Mail className="h-6 w-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
            <CardDescription>
              We sent a 6-digit OTP to <span className="font-medium text-foreground">{otpEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-verify">Enter OTP</Label>
                <Input
                  id="otp-verify"
                  type="text"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  value={otpValue}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.6em] font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">OTP is valid for 10 minutes</p>
              </div>
              <Button type="submit" className="w-full" disabled={isVerifying || otpValue.length !== 6}>
                {isVerifying ? "Verifying…" : "Verify Email"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={handleResendVerifyOtp}
                disabled={isSending}
              >
                {isSending ? "Sending…" : "Resend OTP"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { setStep("tabs"); setOtpValue(""); }}
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Back to login
              </Button>
            </form>
          </CardContent>
        </>
      );
    }

    // ── Forgot password — enter email ──────────────────────────────────────
    if (step === "forgot-email") {
      return (
        <>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
            <CardDescription>Enter your registered email to receive an OTP</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPasswordEmail} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">Email address</Label>
                <Input
                  id="forgot-email"
                  type="email"
                  placeholder="your.email@institute.edu"
                  value={otpEmail}
                  onChange={(e) => setOtpEmail(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={isSending}>
                {isSending ? "Sending OTP…" : "Send OTP"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { setStep("tabs"); setOtpEmail(""); }}
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Back to login
              </Button>
            </form>
          </CardContent>
        </>
      );
    }

    // ── Forgot password — enter OTP ────────────────────────────────────────
    if (step === "forgot-otp") {
      return (
        <>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center mb-4">
              <KeyRound className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Enter OTP</CardTitle>
            <CardDescription>
              We sent a 6-digit OTP to <span className="font-medium text-foreground">{otpEmail}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleForgotPasswordOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-reset">OTP</Label>
                <Input
                  id="otp-reset"
                  type="text"
                  inputMode="numeric"
                  placeholder="• • • • • •"
                  value={otpValue}
                  onChange={(e) => handleOtpChange(e.target.value)}
                  maxLength={6}
                  className="text-center text-2xl tracking-[0.6em] font-mono"
                  required
                />
                <p className="text-xs text-muted-foreground text-center">OTP is valid for 10 minutes</p>
              </div>
              <Button type="submit" className="w-full" disabled={otpValue.length !== 6}>
                Continue
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-sm"
                onClick={handleForgotPasswordEmail as any}
                disabled={isSending}
              >
                {isSending ? "Sending…" : "Resend OTP"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { setStep("forgot-email"); setOtpValue(""); }}
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Change email
              </Button>
            </form>
          </CardContent>
        </>
      );
    }

    // ── Forgot password — set new password ────────────────────────────────
    if (step === "reset-password") {
      return (
        <>
          <CardHeader className="space-y-1 text-center">
            <div className="mx-auto h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <ShieldCheck className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Set New Password</CardTitle>
            <CardDescription>Choose a strong new password for your account</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleResetPassword} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new-password">New password</Label>
                <div className="relative">
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                  >
                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Minimum 6 characters</p>
              </div>
              <Button type="submit" className="w-full" disabled={isResetting || newPassword.length < 6}>
                {isResetting ? "Resetting…" : "Reset Password"}
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-xs text-muted-foreground"
                onClick={() => { setStep("forgot-otp"); setNewPassword(""); }}
              >
                <ArrowLeft className="h-3 w-3 mr-1" /> Back
              </Button>
            </form>
          </CardContent>
        </>
      );
    }

    // ── Default: login / signup tabs ──────────────────────────────────────
    return (
      <>
        <CardHeader className="space-y-1 text-center">
          <div className="mx-auto h-12 w-12 rounded-full bg-primary flex items-center justify-center mb-4">
            <FileText className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-2xl font-bold">Complaint Management System</CardTitle>
          <CardDescription>Educational Institute Portal</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>

            {/* Login */}
            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your.email@institute.edu"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); setShowResendVerification(false); }}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password">Password</Label>
                    <button
                      type="button"
                      onClick={() => { setOtpEmail(email); setStep("forgot-email"); }}
                      className="text-xs text-primary hover:underline"
                    >
                      Forgot password?
                    </button>
                  </div>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isLoggingIn}>
                  {isLoggingIn ? "Signing in…" : "Sign In"}
                </Button>
                {showResendVerification && (
                  <div className="rounded-md bg-amber-50 border border-amber-200 p-3 space-y-2">
                    <p className="text-xs text-amber-800 font-medium">
                      Your email address hasn't been verified yet.
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full border-amber-400 text-amber-700 hover:bg-amber-100"
                      onClick={handleResendFromLogin}
                      disabled={isSending}
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {isSending ? "Sending…" : "Resend Verification Email"}
                    </Button>
                  </div>
                )}
              </form>
            </TabsContent>

            {/* Sign up */}
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={signupData.name}
                    onChange={(e) => handleSignupChange("name", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="your.email@institute.edu"
                    value={signupData.email}
                    onChange={(e) => handleSignupChange("email", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupData.password}
                      onChange={(e) => handleSignupChange("password", e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {signupData.password && (
                    <div className="space-y-1 text-xs">
                      {[
                        { key: "length", label: "At least 6 characters" },
                        { key: "uppercase", label: "One uppercase letter" },
                        { key: "lowercase", label: "One lowercase letter" },
                        { key: "number", label: "One number" },
                      ].map(({ key, label }) => (
                        <div
                          key={key}
                          className={`flex items-center gap-2 ${passwordValidation[key as keyof typeof passwordValidation] ? "text-green-600" : "text-gray-400"}`}
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>{label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={signupData.confirmPassword}
                      onChange={(e) => handleSignupChange("confirmPassword", e.target.value)}
                      required
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {signupData.confirmPassword && signupData.password !== signupData.confirmPassword && (
                    <p className="text-xs text-red-500">Passwords do not match</p>
                  )}
                </div>
                <Button
                  type="submit"
                  className="w-full"
                  disabled={
                    !Object.values(passwordValidation).every(Boolean) ||
                    signupData.password !== signupData.confirmPassword ||
                    !signupData.name.trim() ||
                    !signupData.email.trim() ||
                    isSigningUp
                  }
                >
                  {isSigningUp ? "Creating Account…" : "Create Account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>

          <div className="mt-6 text-center">
            <Button variant="link" onClick={() => navigate("/track")} className="text-sm">
              Track complaint without login →
            </Button>
          </div>
        </CardContent>
      </>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
      <Card className="w-full max-w-md shadow-xl">{renderStep()}</Card>
    </div>
  );
};

export default Auth;
