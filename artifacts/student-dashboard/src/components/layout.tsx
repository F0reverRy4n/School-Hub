import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckSquare, FolderOpen, LogOut, Plus, ShieldAlert, School } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useGetClasses, useCreateClass, getGetClassesQueryKey } from "@workspace/api-client-react";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useQueryClient } from "@tanstack/react-query";

const COLORS = [
  { name: "Blue", value: "#007AFF" },
  { name: "Green", value: "#34C759" },
  { name: "Orange", value: "#FF9500" },
  { name: "Purple", value: "#AF52DE" },
  { name: "Pink", value: "#FF2D55" },
  { name: "Red", value: "#FF3B30" },
];

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  school_admin: "School Admin",
  admin: "Administrator",
};

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: classes } = useGetClasses();
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState(COLORS[0].value);
  
  const queryClient = useQueryClient();
  const createClassMutation = useCreateClass({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetClassesQueryKey() });
        setNewClassName("");
        setIsClassModalOpen(false);
      }
    }
  });

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    createClassMutation.mutate({ data: { name: newClassName, color: newClassColor } });
  };

  const role = user?.role ?? "student";

  const navItems = [
    { href: "/", label: "Assignments", icon: CheckSquare },
    { href: "/notes", label: "Resources", icon: FolderOpen },
    ...(role === "admin" ? [{ href: "/admin", label: "Admin Panel", icon: ShieldAlert }] : []),
    ...(role === "school_admin" ? [{ href: "/school-panel", label: "School Panel", icon: School }] : []),
  ];

  const pageLabels: Record<string, string> = {
    "/": "Assignments",
    "/notes": "Resources",
    "/admin": "Admin Panel",
    "/school-panel": "School Panel",
  };

  const currentLabel = pageLabels[location] ?? "Dashboard";

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-black/5 bg-white/40 backdrop-blur-2xl">
        <div className="h-12 flex items-center px-4 space-x-2 border-b border-transparent">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm"></div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-6 overflow-y-auto">
          {/* User Profile */}
          <div className="flex items-center gap-3 px-2">
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center text-white font-semibold shadow-sm",
              role === "admin" ? "bg-gradient-to-tr from-red-500 to-orange-400" :
              role === "school_admin" ? "bg-gradient-to-tr from-amber-500 to-yellow-400" :
              role === "teacher" ? "bg-gradient-to-tr from-green-500 to-emerald-400" :
              "bg-gradient-to-tr from-primary to-purple-500"
            )}>
              {user?.username?.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground leading-none">{user?.username}</p>
              <p className="text-xs text-muted-foreground mt-1">{ROLE_LABELS[role] ?? "User"}</p>
            </div>
          </div>

          {/* Main Navigation */}
          <div className="space-y-1">
            <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Menu</p>
            {navItems.map((item) => {
              const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive 
                      ? "bg-primary/10 text-primary" 
                      : "text-foreground/80 hover:bg-black/5"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* Classes Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Classes</p>
              <button 
                onClick={() => setIsClassModalOpen(true)}
                className="text-muted-foreground hover:text-primary transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            
            {classes?.map((c) => (
              <div key={c.id} className="flex items-center gap-3 px-3 py-1.5 text-sm text-foreground/80 group">
                <div className="w-2.5 h-2.5 rounded-full shadow-sm" style={{ backgroundColor: c.color }} />
                <span className="truncate flex-1">{c.name}</span>
              </div>
            ))}
            
            {classes?.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">No classes added</p>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-black/5 space-y-1">
          <button
            onClick={logout}
            className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-foreground/80 hover:bg-black/5 hover:text-destructive w-full transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      <main className="flex-1 flex flex-col relative z-0">
        <header className="h-12 border-b border-black/5 bg-white/40 backdrop-blur-xl flex items-center px-6 sticky top-0 z-10">
          <h1 className="text-sm font-semibold text-foreground/80">{currentLabel}</h1>
        </header>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-5xl mx-auto">
            {children}
          </div>
        </div>
      </main>

      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title="Add New Class">
        <form onSubmit={handleCreateClass} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Class Name</label>
            <Input 
              placeholder="e.g. AP History" 
              value={newClassName}
              onChange={(e) => setNewClassName(e.target.value)}
              required
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Color Label</label>
            <div className="flex gap-3">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  onClick={() => setNewClassColor(color.value)}
                  className={cn(
                    "w-8 h-8 rounded-full shadow-sm transition-transform",
                    newClassColor === color.value ? "scale-125 ring-2 ring-offset-2 ring-primary/50" : "hover:scale-110"
                  )}
                  style={{ backgroundColor: color.value }}
                />
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createClassMutation.isPending}>Add Class</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
