import { useState, useEffect } from "react";
import { School, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";

const ROLE_LABELS: Record<string, string> = {
  student: "Student",
  teacher: "Teacher",
  school_admin: "School Admin",
  admin: "Administrator",
};

interface SchoolUser {
  id: number;
  username: string;
  role: string;
  email?: string | null;
  schoolId?: number | null;
}

export function SchoolPanelPage() {
  const [users, setUsers] = useState<SchoolUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [removeConfirm, setRemoveConfirm] = useState<number | null>(null);
  const [isRemoving, setIsRemoving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${baseUrl}/api/admin/school-users`, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleRemove = async (userId: number) => {
    setIsRemoving(true);
    setError(null);
    try {
      const res = await fetch(`${baseUrl}/api/admin/school-users/${userId}/remove`, {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        setRemoveConfirm(null);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to remove user");
      }
    } catch {
      setError("Network error");
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-foreground">School Panel</h2>
        <p className="text-sm text-muted-foreground mt-1">Manage teachers and staff in your school</p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <div>
          {error && (
            <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-md mb-4">{error}</p>
          )}
          {users.length === 0 ? (
            <div className="text-center py-12">
              <School className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">No members found in your school.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {users.map((user) => (
                <div key={user.id} className="glass-panel rounded-xl p-4 flex items-center gap-4">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-primary to-purple-500 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm">{user.username}</p>
                    <p className="text-xs text-muted-foreground">
                      {ROLE_LABELS[user.role] ?? user.role}
                      {user.email && ` · ${user.email}`}
                    </p>
                  </div>
                  <button
                    onClick={() => setRemoveConfirm(user.id)}
                    className="p-2 rounded-lg hover:bg-red-50 text-muted-foreground hover:text-destructive transition-colors"
                    title="Remove from school"
                  >
                    <UserX className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <Modal isOpen={removeConfirm !== null} onClose={() => setRemoveConfirm(null)} title="Remove from School?">
        <p className="text-sm text-muted-foreground mb-4">
          This will unassign the user from your school. Their account will not be deleted.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => setRemoveConfirm(null)}>Cancel</Button>
          <Button
            className="bg-destructive hover:bg-destructive/90 text-white"
            isLoading={isRemoving}
            onClick={() => { if (removeConfirm) handleRemove(removeConfirm); }}
          >
            Remove
          </Button>
        </div>
      </Modal>
    </div>
  );
}
