import { createContext, useContext, ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
  useGetMe, 
  useLogin, 
  useRegister, 
  useLogout,
  getGetMeQueryKey
} from "@workspace/api-client-react";

interface User {
  id: number;
  username: string;
  role: string;
  schoolId?: number | null;
  email?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  
  const { data: user, isLoading } = useGetMe({
    query: {
      retry: false,
      staleTime: Infinity,
    }
  });

  const logoutMutation = useLogout({
    mutation: {
      onSuccess: () => {
        queryClient.setQueryData(getGetMeQueryKey(), null);
        queryClient.clear();
      }
    }
  });

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  return (
    <AuthContext.Provider value={{ 
      user: user ?? null, 
      isLoading,
      logout: handleLogout
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
