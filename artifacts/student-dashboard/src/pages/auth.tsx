import { useState } from "react";
import { useLogin, useRegister, getGetMeQueryKey, useSendVerificationCode, useGetSchools, useRequestSchool } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen, GraduationCap, User, Lock, Mail, ShieldCheck, School, ChevronRight, ChevronLeft, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = "role" | "credentials" | "email" | "verify" | "school" | "done";
type Role = "student" | "teacher";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role>("student");

  // Form fields
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail] = useState("");
  const [emailCode, setEmailCode] = useState("");
  const [schoolId, setSchoolId] = useState<number | null>(null);
  const [newSchoolName, setNewSchoolName] = useState("");
  const [requestingSchool, setRequestingSchool] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  
  const queryClient = useQueryClient();

  const loginMutation = useLogin({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
      onError: (err: any) => setError(err?.error || "Login failed")
    }
  });

  const registerMutation = useRegister({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() }),
      onError: (err: any) => setError(err?.error || "Registration failed")
    }
  });

  const sendCodeMutation = useSendVerificationCode({
    mutation: {
      onSuccess: () => {
        setInfo("A 6-digit code was sent to your email. Check your inbox.");
        setStep("verify");
        setError(null);
      },
      onError: (err: any) => setError(err?.error || "Failed to send code")
    }
  });

  const { data: schools = [] } = useGetSchools({ query: { enabled: step === "school" } });

  const requestSchoolMutation = useRequestSchool({
    mutation: {
      onSuccess: () => {
        setInfo("School request submitted! An admin will review it. You can register without a school for now.");
        setNewSchoolName("");
        setRequestingSchool(false);
      },
      onError: (err: any) => setError(err?.error || "Failed to request school")
    }
  });

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    loginMutation.mutate({ data: { username, password } });
  };

  const handleNextFromCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (username.length < 4 || username.length > 20) {
      setError("Username must be between 4 and 20 characters");
      return;
    }
    if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      setError("Password must be at least 8 chars with 1 letter and 1 number");
      return;
    }
    if (role === "student") {
      registerMutation.mutate({ data: { username, password, role: "student" } });
    } else {
      setStep("email");
    }
  };

  const handleSendCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.includes("@")) {
      setError("Enter a valid email address");
      return;
    }
    sendCodeMutation.mutate({ data: { email } });
  };

  const handleVerifyCode = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (emailCode.length !== 6) {
      setError("Enter the 6-digit code from your email");
      return;
    }
    setInfo(null);
    setStep("school");
  };

  const handleRequestSchool = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!newSchoolName.trim()) return;
    requestSchoolMutation.mutate({ data: { name: newSchoolName.trim(), requestedByEmail: email } });
  };

  const handleFinishRegistration = () => {
    setError(null);
    registerMutation.mutate({
      data: {
        username,
        password,
        role: "teacher",
        email,
        emailCode,
        ...(schoolId != null && { schoolId }),
      },
    });
  };

  const switchToLogin = () => {
    setIsLogin(true);
    setStep("role");
    setError(null);
    setInfo(null);
  };

  const switchToRegister = () => {
    setIsLogin(false);
    setStep("role");
    setError(null);
    setInfo(null);
  };

  const stepNumber = { role: 1, credentials: 2, email: 3, verify: 4, school: 5 }[step] ?? 1;
  const totalSteps = role === "teacher" ? 5 : 2;

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#F2F2F7]">
      <img 
        src={`${import.meta.env.BASE_URL}images/mac-bg.png`}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay"
      />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-panel mac-shadow-lg w-full max-w-md p-8 rounded-2xl relative z-10 m-4"
      >
        {/* Header */}
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Student Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Welcome back to your workspace" : "Create an account to get started"}
          </p>
        </div>

        {/* Login Form */}
        {isLogin && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground/80 px-1">Username</label>
              <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. alexstudent" className="h-11 bg-white/70" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground/80 px-1">Password</label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" className="h-11 bg-white/70" />
            </div>
            {error && <ErrorMsg msg={error} />}
            <Button type="submit" className="w-full h-11 text-base font-medium shadow-md shadow-primary/20 mt-6" isLoading={loginMutation.isPending}>
              Sign In
            </Button>
          </form>
        )}

        {/* Registration Flow */}
        {!isLogin && (
          <div>
            {/* Step indicator for multi-step */}
            {role === "teacher" && (
              <div className="flex items-center gap-1 mb-6">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className={cn(
                      "h-1 flex-1 rounded-full transition-colors",
                      i < stepNumber ? "bg-primary" : "bg-black/10"
                    )}
                  />
                ))}
              </div>
            )}

            <AnimatePresence mode="wait">
              {/* Step 1: Role Selection */}
              {step === "role" && (
                <motion.div key="role" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <p className="text-sm font-medium text-foreground/80 mb-3">I am a...</p>
                  <div className="grid grid-cols-2 gap-3 mb-6">
                    {[
                      { value: "student" as Role, label: "Student", icon: User, desc: "Track assignments & notes" },
                      { value: "teacher" as Role, label: "Teacher", icon: GraduationCap, desc: "Manage classes & students" },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setRole(opt.value)}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all",
                          role === opt.value
                            ? "border-primary bg-primary/5 text-primary"
                            : "border-black/10 bg-white/50 hover:bg-white/80"
                        )}
                      >
                        <opt.icon className="w-6 h-6" />
                        <span className="font-semibold text-sm">{opt.label}</span>
                        <span className="text-xs text-muted-foreground text-center">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                  <Button className="w-full h-11" onClick={() => { setStep("credentials"); setError(null); }}>
                    Continue <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </motion.div>
              )}

              {/* Step 2: Credentials */}
              {step === "credentials" && (
                <motion.div key="credentials" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <form onSubmit={handleNextFromCredentials} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground/80 px-1">Username</label>
                      <Input type="text" value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. alexteacher" className="h-11 bg-white/70" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground/80 px-1">Password</label>
                      <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Min 8 chars, 1 letter + 1 number" className="h-11 bg-white/70" />
                    </div>
                    {error && <ErrorMsg msg={error} />}
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => { setStep("role"); setError(null); }} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" className="flex-1" isLoading={registerMutation.isPending}>
                        {role === "student" ? "Create Account" : "Continue"} {role === "teacher" && <ChevronRight className="w-4 h-4 ml-1" />}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 3: Email (teachers only) */}
              {step === "email" && (
                <motion.div key="email" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <Mail className="w-5 h-5 text-primary" />
                    <p className="text-sm font-medium">Verify your email</p>
                  </div>
                  <p className="text-xs text-muted-foreground mb-4">Teachers must verify their email address before registering.</p>
                  <form onSubmit={handleSendCode} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground/80 px-1">Email Address</label>
                      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@school.edu" className="h-11 bg-white/70" />
                    </div>
                    {error && <ErrorMsg msg={error} />}
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => { setStep("credentials"); setError(null); }} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" className="flex-1" isLoading={sendCodeMutation.isPending}>
                        Send Code <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 4: Verify Code */}
              {step === "verify" && (
                <motion.div key="verify" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck className="w-5 h-5 text-primary" />
                    <p className="text-sm font-medium">Enter verification code</p>
                  </div>
                  {info && <InfoMsg msg={info} />}
                  <form onSubmit={handleVerifyCode} className="space-y-4 mt-3">
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-foreground/80 px-1">6-Digit Code</label>
                      <Input
                        type="text"
                        value={emailCode}
                        onChange={(e) => setEmailCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="000000"
                        className="h-11 bg-white/70 text-center text-xl tracking-widest font-mono"
                        maxLength={6}
                      />
                    </div>
                    {error && <ErrorMsg msg={error} />}
                    <div className="flex gap-2 pt-2">
                      <Button type="button" variant="ghost" onClick={() => { setStep("email"); setError(null); setInfo(null); }} className="flex-1">
                        <ChevronLeft className="w-4 h-4 mr-1" /> Back
                      </Button>
                      <Button type="submit" className="flex-1">
                        Verify <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}

              {/* Step 5: School Selection */}
              {step === "school" && (
                <motion.div key="school" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <div className="flex items-center gap-2 mb-4">
                    <School className="w-5 h-5 text-primary" />
                    <p className="text-sm font-medium">Select your school</p>
                  </div>
                  {info && <InfoMsg msg={info} />}
                  {error && <ErrorMsg msg={error} />}

                  {!requestingSchool ? (
                    <div className="space-y-2 mb-4 max-h-40 overflow-y-auto">
                      <button
                        type="button"
                        onClick={() => setSchoolId(null)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                          schoolId === null ? "bg-primary/10 text-primary font-medium" : "hover:bg-black/5"
                        )}
                      >
                        No school / Skip for now
                      </button>
                      {schools.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => setSchoolId(s.id)}
                          className={cn(
                            "w-full text-left px-3 py-2 rounded-lg text-sm transition-colors",
                            schoolId === s.id ? "bg-primary/10 text-primary font-medium" : "hover:bg-black/5"
                          )}
                        >
                          {s.name}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <form onSubmit={handleRequestSchool} className="space-y-3 mb-4">
                      <p className="text-xs text-muted-foreground">
                        Enter your school name. An admin will review and approve it.
                      </p>
                      <Input
                        type="text"
                        value={newSchoolName}
                        onChange={(e) => setNewSchoolName(e.target.value)}
                        placeholder="e.g. Lincoln High School"
                        className="h-10 bg-white/70"
                      />
                      <div className="flex gap-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => { setRequestingSchool(false); setError(null); }}>Cancel</Button>
                        <Button type="submit" size="sm" isLoading={requestSchoolMutation.isPending}>Request School</Button>
                      </div>
                    </form>
                  )}

                  {!requestingSchool && (
                    <button
                      type="button"
                      onClick={() => { setRequestingSchool(true); setError(null); setInfo(null); }}
                      className="flex items-center gap-1 text-xs text-primary hover:underline mb-4"
                    >
                      <Plus className="w-3 h-3" /> My school isn't listed — request it
                    </button>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Button type="button" variant="ghost" onClick={() => { setStep("verify"); setError(null); setInfo(null); }} className="flex-1">
                      <ChevronLeft className="w-4 h-4 mr-1" /> Back
                    </Button>
                    <Button type="button" className="flex-1" onClick={handleFinishRegistration} isLoading={registerMutation.isPending}>
                      Create Account
                    </Button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* Toggle login/register */}
        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={isLogin ? switchToRegister : switchToLogin}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <motion.p
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20"
    >
      {msg}
    </motion.p>
  );
}

function InfoMsg({ msg }: { msg: string }) {
  return (
    <motion.p
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="text-sm text-primary bg-primary/10 px-3 py-2 rounded-md border border-primary/20"
    >
      {msg}
    </motion.p>
  );
}
