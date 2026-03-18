import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Users, School, Settings, Trash2, Edit2, Check, X, Plus, Lock, Unlock, Shield, ShieldAlert, GraduationCap, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import {
  useListAdminUsers,
  useDeleteAdminUser,
  useUpdateAdminUser,
  useListAdminSchools,
  useCreateAdminSchool,
  useUpdateAdminSchool,
  useDeleteAdminSchool,
  useUpdateAdminSettings,
  useGetSettings,
  getListAdminUsersQueryKey,
  getListAdminSchoolsQueryKey,
  getGetSettingsQueryKey,
} from "@workspace/api-client-react";
import type { AdminUser, School as SchoolType } from "@workspace/api-client-react";

type Tab = "users" | "schools" | "settings";

const ROLE_COLORS: Record<string, string> = {
  admin: "bg-red-100 text-red-700",
  school_admin: "bg-amber-100 text-amber-700",
  teacher: "bg-green-100 text-green-700",
  student: "bg-blue-100 text-blue-700",
};

const ROLE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  admin: ShieldAlert,
  school_admin: Shield,
  teacher: GraduationCap,
  student: User,
};

const ROLES = ["student", "teacher", "school_admin", "admin"] as const;
const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  school_admin: "School Admin",
  admin: "Administrator",
};

export function AdminPage() {
  const [tab, setTab] = useState<Tab>("users");
  const queryClient = useQueryClient();

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">Admin Panel</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage users, schools, and application settings</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 p-1 bg-black/5 rounded-xl w-fit mb-6">
        {[
          { id: "users" as Tab, label: "Users", icon: Users },
          { id: "schools" as Tab, label: "Schools", icon: School },
          { id: "settings" as Tab, label: "Settings", icon: Settings },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all",
              tab === t.id ? "bg-white shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </button>
        ))}
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
        {tab === "users" && <UsersTab queryClient={queryClient} />}
        {tab === "schools" && <SchoolsTab queryClient={queryClient} />}
        {tab === "settings" && <SettingsTab queryClient={queryClient} />}
      </motion.div>
    </div>
  );
}

// ---- USERS TAB ----

function UsersTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const { data: users = [], isLoading } = useListAdminUsers();
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editRole, setEditRole] = useState("");
  const [editSchoolId, setEditSchoolId] = useState<number | "">("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const updateMutation = useUpdateAdminUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        setEditingUser(null);
      },
    },
  });

  const deleteMutation = useDeleteAdminUser({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminUsersQueryKey() });
        setDeleteConfirm(null);
      },
    },
  });

  const openEdit = (user: AdminUser) => {
    setEditingUser(user);
    setEditRole(user.role);
    setEditSchoolId(user.schoolId ?? "");
  };

  if (isLoading) return <LoadingSpinner />;

  return (
    <div>
      <p className="text-sm text-muted-foreground mb-4">{users.length} account{users.length !== 1 ? "s" : ""} registered</p>
      <div className="space-y-2">
        {users.map((user) => {
          const RoleIcon = ROLE_ICONS[user.role] ?? User;
          return (
            <div key={user.id} className="glass-panel rounded-xl p-4 flex items-center gap-4">
              <div className={cn(
                "w-9 h-9 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0",
                user.role === "admin" ? "bg-gradient-to-tr from-red-500 to-orange-400" :
                user.role === "school_admin" ? "bg-gradient-to-tr from-amber-500 to-yellow-400" :
                user.role === "teacher" ? "bg-gradient-to-tr from-green-500 to-emerald-400" :
                "bg-gradient-to-tr from-blue-500 to-primary"
              )}>
                {user.username.charAt(0).toUpperCase()}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm">{user.username}</span>
                  <span className={cn("inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium", ROLE_COLORS[user.role] ?? "bg-gray-100")}>
                    <RoleIcon className="w-3 h-3" />
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {user.email ? (
                    <span>{user.email}{user.emailVerified ? " ✓" : " (unverified)"}</span>
                  ) : (
                    <span>No email</span>
                  )}
                  {user.schoolName && <span className="ml-2 text-primary">· {user.schoolName}</span>}
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                <button
                  onClick={() => openEdit(user)}
                  className="p-2 rounded-lg hover:bg-black/5 text-muted-foreground hover:text-primary transition-colors"
                  title="Edit user"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm(user.id)}
                  className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                  title="Delete user"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit User Modal */}
      <Modal isOpen={!!editingUser} onClose={() => setEditingUser(null)} title={`Edit: ${editingUser?.username}`}>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Role</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setEditRole(r)}
                  className={cn(
                    "px-3 py-2 rounded-lg text-sm font-medium border-2 transition-colors text-left",
                    editRole === r ? "border-primary bg-primary/5 text-primary" : "border-black/10 hover:bg-black/5"
                  )}
                >
                  {ROLE_LABELS[r]}
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">School ID (optional)</label>
            <Input
              type="number"
              value={editSchoolId}
              onChange={(e) => setEditSchoolId(e.target.value ? Number(e.target.value) : "")}
              placeholder="Leave blank to unassign"
              min={1}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setEditingUser(null)}>Cancel</Button>
            <Button
              isLoading={updateMutation.isPending}
              onClick={() => {
                if (!editingUser) return;
                updateMutation.mutate({
                  id: editingUser.id,
                  data: {
                    role: editRole as any,
                    schoolId: editSchoolId === "" ? null : Number(editSchoolId),
                  },
                });
              }}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title="Delete User?">
        <p className="text-sm text-muted-foreground mb-4">This action cannot be undone. All data for this user will be permanently deleted.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-white"
            isLoading={deleteMutation.isPending}
            onClick={() => { if (deleteConfirm) deleteMutation.mutate({ id: deleteConfirm }); }}
          >
            Delete Account
          </Button>
        </div>
      </Modal>
    </div>
  );
}

// ---- SCHOOLS TAB ----

function SchoolsTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const { data: schools = [], isLoading } = useListAdminSchools();
  const [newSchoolName, setNewSchoolName] = useState("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const createMutation = useCreateAdminSchool({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminSchoolsQueryKey() });
        setNewSchoolName("");
      },
    },
  });

  const updateMutation = useUpdateAdminSchool({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getListAdminSchoolsQueryKey() }),
    },
  });

  const deleteMutation = useDeleteAdminSchool({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListAdminSchoolsQueryKey() });
        setDeleteConfirm(null);
      },
    },
  });

  if (isLoading) return <LoadingSpinner />;

  const pending = schools.filter((s) => s.status === "pending");
  const approved = schools.filter((s) => s.status === "approved");
  const denied = schools.filter((s) => s.status === "denied");

  return (
    <div className="space-y-6">
      {/* Add School */}
      <div className="glass-panel rounded-xl p-4">
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Plus className="w-4 h-4" /> Add School Directly</p>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!newSchoolName.trim()) return;
            createMutation.mutate({ data: { name: newSchoolName.trim() } });
          }}
          className="flex gap-2"
        >
          <Input
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            placeholder="School name"
            className="flex-1 h-10"
          />
          <Button type="submit" isLoading={createMutation.isPending}>Add</Button>
        </form>
      </div>

      {/* Pending Requests */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider mb-2">Pending Review ({pending.length})</p>
          <div className="space-y-2">
            {pending.map((school) => (
              <SchoolRow
                key={school.id}
                school={school}
                onApprove={() => updateMutation.mutate({ id: school.id, data: { status: "approved" } })}
                onDeny={() => updateMutation.mutate({ id: school.id, data: { status: "denied" } })}
                onDelete={() => setDeleteConfirm(school.id)}
                isUpdating={updateMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {/* Approved Schools */}
      {approved.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-green-600 uppercase tracking-wider mb-2">Approved ({approved.length})</p>
          <div className="space-y-2">
            {approved.map((school) => (
              <SchoolRow key={school.id} school={school} onDelete={() => setDeleteConfirm(school.id)} isUpdating={false} />
            ))}
          </div>
        </div>
      )}

      {/* Denied Schools */}
      {denied.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Denied ({denied.length})</p>
          <div className="space-y-2">
            {denied.map((school) => (
              <SchoolRow
                key={school.id}
                school={school}
                onApprove={() => updateMutation.mutate({ id: school.id, data: { status: "approved" } })}
                onDelete={() => setDeleteConfirm(school.id)}
                isUpdating={updateMutation.isPending}
              />
            ))}
          </div>
        </div>
      )}

      {schools.length === 0 && (
        <p className="text-sm text-muted-foreground italic">No schools added yet.</p>
      )}

      <Modal isOpen={deleteConfirm !== null} onClose={() => setDeleteConfirm(null)} title="Delete School?">
        <p className="text-sm text-muted-foreground mb-4">This will remove all users from this school. The users won't be deleted, just unassigned.</p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-white"
            isLoading={deleteMutation.isPending}
            onClick={() => { if (deleteConfirm) deleteMutation.mutate({ id: deleteConfirm }); }}
          >
            Delete School
          </Button>
        </div>
      </Modal>
    </div>
  );
}

function SchoolRow({
  school,
  onApprove,
  onDeny,
  onDelete,
  isUpdating,
}: {
  school: SchoolType;
  onApprove?: () => void;
  onDeny?: () => void;
  onDelete: () => void;
  isUpdating: boolean;
}) {
  const STATUS_COLORS: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    pending: "bg-amber-100 text-amber-700",
    denied: "bg-red-100 text-red-700",
  };

  return (
    <div className="glass-panel rounded-xl p-4 flex items-center gap-4">
      <School className="w-5 h-5 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-sm">{school.name}</p>
        <p className="text-xs text-muted-foreground">ID: {school.id}</p>
      </div>
      <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium", STATUS_COLORS[school.status] ?? "bg-gray-100")}>
        {school.status}
      </span>
      <div className="flex items-center gap-1">
        {onApprove && (
          <button onClick={onApprove} disabled={isUpdating} className="p-1.5 rounded-lg hover:bg-green-50 text-muted-foreground hover:text-green-600 transition-colors" title="Approve">
            <Check className="w-4 h-4" />
          </button>
        )}
        {onDeny && (
          <button onClick={onDeny} disabled={isUpdating} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors" title="Deny">
            <X className="w-4 h-4" />
          </button>
        )}
        <button onClick={onDelete} className="p-1.5 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors" title="Delete">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ---- SETTINGS TAB ----

function SettingsTab({ queryClient }: { queryClient: ReturnType<typeof useQueryClient> }) {
  const { data: settings } = useGetSettings();
  const isLocked = settings?.lockdown ?? false;

  const updateSettings = useUpdateAdminSettings({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetSettingsQueryKey() }),
    },
  });

  return (
    <div className="space-y-4">
      <div className="glass-panel rounded-xl p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {isLocked ? (
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Lock className="w-5 h-5 text-red-600" />
              </div>
            ) : (
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                <Unlock className="w-5 h-5 text-green-600" />
              </div>
            )}
            <div>
              <p className="font-semibold text-sm">App Lockdown</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {isLocked
                  ? "App is locked. Non-admin users see a lockdown screen."
                  : "App is accessible to all users."}
              </p>
            </div>
          </div>

          <Button
            className={cn(isLocked ? "bg-green-600 hover:bg-green-700 text-white" : "bg-destructive hover:bg-destructive/90 text-white")}
            isLoading={updateSettings.isPending}
            onClick={() => updateSettings.mutate({ data: { lockdown: !isLocked } })}
          >
            {isLocked ? "Unlock App" : "Lock App"}
          </Button>
        </div>

        {isLocked && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg"
          >
            <p className="text-xs text-red-700">
              <strong>Lockdown active.</strong> All non-admin users currently see: "App locked for security reasons. Contact: f0reverry4n@gmail.com"
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
}

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
    </div>
  );
}
