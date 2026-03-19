import React, { useState } from "react";
import { Link, useLocation } from "wouter";
import { CheckSquare, FolderOpen, LogOut, Plus, ShieldAlert, School, Key, Users, Copy, Check } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { useGetClasses, useCreateClass, useDeleteClass, getGetClassesQueryKey, useJoinClass } from "@workspace/api-client-react";
import { Modal } from "./ui/modal";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { useQueryClient } from "@tanstack/react-query";
import type { Class } from "@workspace/api-client-react";

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

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };
  return (
    <button onClick={handleCopy} className="ml-1 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary" title="Copy join code">
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function ClassItem({ cls, isTeacher, onDelete }: { cls: Class & { enrolled?: boolean; ownerUsername?: string | null; enrolledCount?: number | null }; isTeacher: boolean; onDelete?: (id: number) => void }) {
  const [showCode, setShowCode] = useState(false);

  return (
    <div className="group">
      <div
        className="flex items-center gap-2.5 px-3 py-1.5 text-sm text-foreground/80 rounded-md hover:bg-black/5 cursor-pointer transition-colors"
        onClick={() => isTeacher && cls.joinCode && setShowCode(!showCode)}
      >
        <div className="w-2.5 h-2.5 rounded-full shadow-sm flex-shrink-0" style={{ backgroundColor: cls.color }} />
        <span className="truncate flex-1 text-xs font-medium">{cls.name}</span>
        {(cls as any).enrolled && (
          <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-full font-medium">Joined</span>
        )}
        {isTeacher && cls.joinCode && (
          <Key className="w-3 h-3 text-muted-foreground opacity-60 flex-shrink-0" />
        )}
        {isTeacher && typeof cls.enrolledCount === "number" && (
          <span className="text-[10px] text-muted-foreground">{cls.enrolledCount}</span>
        )}
      </div>
      {isTeacher && showCode && cls.joinCode && (
        <div className="mx-3 mb-1 px-2 py-1.5 bg-black/5 rounded-lg text-xs">
          <p className="text-muted-foreground text-[10px] mb-0.5">Join Code</p>
          <div className="flex items-center gap-1 group">
            <span className="font-mono font-bold tracking-widest text-primary">{cls.joinCode}</span>
            <CopyButton text={cls.joinCode} />
          </div>
          {typeof cls.enrolledCount === "number" && (
            <p className="text-[10px] text-muted-foreground mt-1">{cls.enrolledCount} student{cls.enrolledCount !== 1 ? "s" : ""} enrolled</p>
          )}
        </div>
      )}
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const { data: classes = [] } = useGetClasses();
  const [isClassModalOpen, setIsClassModalOpen] = useState(false);
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassColor, setNewClassColor] = useState(COLORS[0].value);
  const [joinCode, setJoinCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

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

  const joinClassMutation = useJoinClass({
    mutation: {
      onSuccess: (data) => {
        queryClient.invalidateQueries({ queryKey: getGetClassesQueryKey() });
        setJoinSuccess(data.message);
        setJoinCode("");
        setTimeout(() => {
          setIsJoinModalOpen(false);
          setJoinSuccess(null);
        }, 1500);
      },
      onError: (err: any) => setJoinError(err?.error || "Invalid join code"),
    }
  });

  const handleCreateClass = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClassName.trim()) return;
    createClassMutation.mutate({ data: { name: newClassName, color: newClassColor } });
  };

  const handleJoinClass = (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError(null);
    if (!joinCode.trim()) return;
    joinClassMutation.mutate({ data: { joinCode: joinCode.toUpperCase().trim() } });
  };

  const role = user?.role ?? "student";
  const isTeacher = role === "teacher";

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

  const ownClasses = classes.filter((c) => !(c as any).enrolled);
  const enrolledClasses = classes.filter((c) => (c as any).enrolled);

  return (
    <div className="flex h-screen w-full overflow-hidden bg-background">
      <aside className="w-64 flex-shrink-0 flex flex-col border-r border-black/5 bg-white/40 backdrop-blur-2xl">
        <div className="h-12 flex items-center px-4 space-x-2 border-b border-transparent">
          <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm"></div>
          <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm"></div>
        </div>

        <div className="p-4 flex-1 flex flex-col gap-5 overflow-y-auto">
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
                <Link key={item.href} href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                    isActive ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-black/5"
                  )}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* My Classes */}
          <div className="space-y-1">
            <div className="flex items-center justify-between px-2 mb-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {isTeacher ? "My Classes" : "Classes"}
              </p>
              <div className="flex items-center gap-1">
                {!isTeacher && (
                  <button onClick={() => { setIsJoinModalOpen(true); setJoinError(null); setJoinSuccess(null); }}
                    className="text-muted-foreground hover:text-primary transition-colors" title="Join a teacher's class">
                    <Key className="w-3.5 h-3.5" />
                  </button>
                )}
                <button onClick={() => setIsClassModalOpen(true)}
                  className="text-muted-foreground hover:text-primary transition-colors" title="Add class">
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {ownClasses.map((c) => (
              <ClassItem key={c.id} cls={c as any} isTeacher={isTeacher} />
            ))}

            {ownClasses.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground italic">
                {isTeacher ? "Create a class to get a join code" : "No classes yet"}
              </p>
            )}
          </div>

          {/* Joined Teacher Classes */}
          {enrolledClasses.length > 0 && (
            <div className="space-y-1">
              <p className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
                Joined Classes
              </p>
              {enrolledClasses.map((c) => (
                <ClassItem key={c.id} cls={c as any} isTeacher={false} />
              ))}
            </div>
          )}
        </div>

        {/* Bottom Actions */}
        <div className="p-4 border-t border-black/5 space-y-1">
          <button onClick={logout}
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
          <div className="max-w-5xl mx-auto">{children}</div>
        </div>
      </main>

      {/* Add Class Modal */}
      <Modal isOpen={isClassModalOpen} onClose={() => setIsClassModalOpen(false)} title={isTeacher ? "Create Teacher Class" : "Add New Class"}>
        <form onSubmit={handleCreateClass} className="space-y-4">
          {isTeacher && (
            <p className="text-xs text-muted-foreground bg-primary/5 border border-primary/10 rounded-lg px-3 py-2">
              A unique <strong>join code</strong> will be generated automatically. Share it with your students so they can join.
            </p>
          )}
          <div className="space-y-2">
            <label className="text-sm font-medium">Class Name</label>
            <Input placeholder={isTeacher ? "e.g. AP Biology Period 3" : "e.g. AP History"}
              value={newClassName} onChange={(e) => setNewClassName(e.target.value)} required maxLength={100} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Color Label</label>
            <div className="flex gap-3">
              {COLORS.map((color) => (
                <button key={color.value} type="button" onClick={() => setNewClassColor(color.value)}
                  className={cn("w-8 h-8 rounded-full shadow-sm transition-transform",
                    newClassColor === color.value ? "scale-125 ring-2 ring-offset-2 ring-primary/50" : "hover:scale-110")}
                  style={{ backgroundColor: color.value }} />
              ))}
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsClassModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createClassMutation.isPending}>
              {isTeacher ? "Create Class" : "Add Class"}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Join Class Modal */}
      <Modal isOpen={isJoinModalOpen} onClose={() => { setIsJoinModalOpen(false); setJoinCode(""); setJoinError(null); setJoinSuccess(null); }} title="Join a Class">
        <form onSubmit={handleJoinClass} className="space-y-4">
          <p className="text-sm text-muted-foreground">Enter the 6-character join code your teacher gave you.</p>
          <div className="space-y-2">
            <label className="text-sm font-medium">Join Code</label>
            <Input
              value={joinCode}
              onChange={(e) => { setJoinCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 6)); setJoinError(null); }}
              placeholder="AB1C23"
              className="font-mono text-center text-xl tracking-widest h-12"
              maxLength={6}
            />
          </div>
          {joinError && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md">{joinError}</p>
          )}
          {joinSuccess && (
            <p className="text-sm text-green-700 bg-green-50 px-3 py-2 rounded-md">{joinSuccess}</p>
          )}
          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsJoinModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={joinClassMutation.isPending} disabled={joinCode.length < 6}>
              Join Class
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
