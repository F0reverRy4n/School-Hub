import { useState } from "react";
import { 
  useGetAssignments, 
  useCreateAssignment, 
  useUpdateAssignment, 
  useDeleteAssignment,
  useGetClasses,
  getGetAssignmentsQueryKey,
  AssignmentPriority,
  Assignment
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Plus, Check, Trash2, Calendar, Clock, Flag, Circle, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { cn, formatDate, getPriorityColor } from "@/lib/utils";

export function AssignmentsPage() {
  const queryClient = useQueryClient();
  const { data: assignments, isLoading } = useGetAssignments();
  const { data: classes } = useGetClasses();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [classId, setClassId] = useState<string>("");
  const [priority, setPriority] = useState<AssignmentPriority>("medium");

  const createMutation = useCreateAssignment({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAssignmentsQueryKey() });
        setIsModalOpen(false);
        resetForm();
      }
    }
  });

  const updateMutation = useUpdateAssignment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAssignmentsQueryKey() })
    }
  });

  const deleteMutation = useDeleteAssignment({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetAssignmentsQueryKey() })
    }
  });

  const resetForm = () => {
    setTitle("");
    setNotes("");
    setDueDate("");
    setClassId("");
    setPriority("medium");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        title,
        notes: notes || undefined,
        dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
        classId: classId ? parseInt(classId) : undefined,
        priority
      }
    });
  };

  const toggleComplete = (assignment: Assignment) => {
    updateMutation.mutate({
      id: assignment.id,
      data: { completed: !assignment.completed }
    });
  };

  // Sort: Incomplete first, then by priority (high > medium > low), then due date
  const sortedAssignments = [...(assignments || [])].sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    
    const priorityWeight = { high: 3, medium: 2, low: 1 };
    if (priorityWeight[a.priority] !== priorityWeight[b.priority]) {
      return priorityWeight[b.priority] - priorityWeight[a.priority];
    }
    
    if (a.dueDate && b.dueDate) {
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    return 0;
  });

  if (isLoading) {
    return <div className="animate-pulse space-y-4">
      <div className="h-12 bg-black/5 rounded-xl w-full"></div>
      <div className="h-24 bg-black/5 rounded-xl w-full"></div>
      <div className="h-24 bg-black/5 rounded-xl w-full"></div>
    </div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Tasks</h1>
          <p className="text-muted-foreground mt-1">Stay on top of your assignments</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
          <Plus className="w-4 h-4" />
          Add Task
        </Button>
      </div>

      <div className="grid gap-3">
        <AnimatePresence>
          {sortedAssignments.length === 0 && (
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-center py-16 px-4 glass-panel rounded-2xl border-dashed"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
                <Check className="w-6 h-6 text-primary" />
              </div>
              <h3 className="text-lg font-medium text-foreground">All caught up!</h3>
              <p className="text-muted-foreground text-sm mt-1">You have no pending assignments.</p>
            </motion.div>
          )}

          {sortedAssignments.map((assignment) => (
            <motion.div
              key={assignment.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className={cn(
                "glass-panel p-4 rounded-xl flex items-start gap-4 group transition-all",
                assignment.completed && "opacity-60 bg-white/40"
              )}
            >
              <button 
                onClick={() => toggleComplete(assignment)}
                className="mt-1 flex-shrink-0 text-muted-foreground hover:text-primary transition-colors"
              >
                {assignment.completed ? (
                  <CheckCircle2 className="w-6 h-6 text-green-500" />
                ) : (
                  <Circle className="w-6 h-6" />
                )}
              </button>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-4">
                  <h3 className={cn(
                    "text-base font-medium truncate text-foreground transition-all",
                    assignment.completed && "line-through text-muted-foreground"
                  )}>
                    {assignment.title}
                  </h3>
                  
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={cn(
                      "text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                      getPriorityColor(assignment.priority)
                    )}>
                      {assignment.priority}
                    </span>
                    <button 
                      onClick={() => deleteMutation.mutate({ id: assignment.id })}
                      className="opacity-0 group-hover:opacity-100 p-1 text-muted-foreground hover:text-destructive transition-all rounded-md hover:bg-destructive/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {assignment.notes && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {assignment.notes}
                  </p>
                )}
                
                <div className="flex flex-wrap items-center gap-4 mt-3 text-xs font-medium text-muted-foreground">
                  {assignment.className && (
                    <div className="flex items-center gap-1.5 bg-black/5 px-2 py-1 rounded-md">
                      <FolderOpen className="w-3.5 h-3.5" />
                      {assignment.className}
                    </div>
                  )}
                  {assignment.dueDate && (
                    <div className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-md",
                      !assignment.completed && new Date(assignment.dueDate) < new Date() 
                        ? "bg-red-500/10 text-red-600" 
                        : "bg-black/5"
                    )}>
                      <Calendar className="w-3.5 h-3.5" />
                      {formatDate(assignment.dueDate)}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="New Task">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input 
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="Read Chapter 4" required autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class (Optional)</label>
              <select 
                value={classId} onChange={(e) => setClassId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-white/50 bg-white/50 backdrop-blur-sm px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <option value="">None</option>
                {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Priority</label>
              <select 
                value={priority} onChange={(e) => setPriority(e.target.value as AssignmentPriority)}
                className="flex h-9 w-full rounded-md border border-white/50 bg-white/50 backdrop-blur-sm px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Due Date (Optional)</label>
            <Input 
              type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Notes</label>
            <textarea 
              value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Any extra details..."
              className="flex min-h-[80px] w-full rounded-md border border-white/50 bg-white/50 backdrop-blur-sm px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Save Task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
