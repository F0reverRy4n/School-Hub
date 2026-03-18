import { useState } from "react";
import { useLogin, useRegister, getGetMeQueryKey } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BookOpen } from "lucide-react";

export function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    // Basic validation matching backend
    if (username.length < 4 || username.length > 20) {
      setError("Username must be between 4 and 20 characters");
      return;
    }
    if (password.length < 8 || !/(?=.*[a-zA-Z])(?=.*[0-9])/.test(password)) {
      setError("Password must be at least 8 chars with 1 letter and 1 number");
      return;
    }

    if (isLogin) {
      loginMutation.mutate({ data: { username, password } });
    } else {
      registerMutation.mutate({ data: { username, password } });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  return (
    <div className="min-h-screen w-full flex items-center justify-center relative overflow-hidden bg-[#F2F2F7]">
      {/* Decorative Background Image - requested in requirements */}
      <img 
        src={`${import.meta.env.BASE_URL}images/mac-bg.png`}
        alt="Background"
        className="absolute inset-0 w-full h-full object-cover opacity-80 mix-blend-overlay"
      />
      
      {/* Glassmorphic Auth Card */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="glass-panel mac-shadow-lg w-full max-w-md p-8 rounded-2xl relative z-10 m-4"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-gradient-to-br from-primary to-purple-500 rounded-xl flex items-center justify-center shadow-lg shadow-primary/20 mb-4">
            <BookOpen className="text-white w-6 h-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Student Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLogin ? "Welcome back to your workspace" : "Create an account to get started"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/80 px-1">Username</label>
            <Input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. alexstudent"
              className="h-11 bg-white/70"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-foreground/80 px-1">Password</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="h-11 bg-white/70"
            />
          </div>

          {error && (
            <motion.p 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md border border-destructive/20"
            >
              {error}
            </motion.p>
          )}

          <Button 
            type="submit" 
            className="w-full h-11 text-base font-medium shadow-md shadow-primary/20 mt-6"
            isLoading={isPending}
          >
            {isLogin ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
