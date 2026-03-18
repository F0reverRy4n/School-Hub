import { useState } from "react";
import { 
  useGetResources, 
  useCreateResource, 
  useDeleteResource,
  useGetClasses,
  getGetResourcesQueryKey,
  ResourceType,
  Resource
} from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { Link2, Image as ImageIcon, FileText, Plus, Trash2, ExternalLink, FolderOpen } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function NotesPage() {
  const queryClient = useQueryClient();
  const { data: resources, isLoading } = useGetResources();
  const { data: classes } = useGetClasses();
  
  const [selectedClassId, setSelectedClassId] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Form state
  const [title, setTitle] = useState("");
  const [type, setType] = useState<ResourceType>("note");
  const [content, setContent] = useState("");
  const [formClassId, setFormClassId] = useState<string>("");

  const createMutation = useCreateResource({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetResourcesQueryKey() });
        setIsModalOpen(false);
        resetForm();
      }
    }
  });

  const deleteMutation = useDeleteResource({
    mutation: {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: getGetResourcesQueryKey() })
    }
  });

  const resetForm = () => {
    setTitle("");
    setContent("");
    setType("note");
    // Keep formClassId as what was previously selected in the view filter
    setFormClassId(selectedClassId ? selectedClassId.toString() : "");
  };

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      data: {
        title,
        content,
        type,
        classId: formClassId ? parseInt(formClassId) : undefined,
      }
    });
  };

  const filteredResources = resources?.filter(r => 
    selectedClassId ? r.classId === selectedClassId : true
  ) || [];

  const getIcon = (t: string) => {
    switch(t) {
      case 'link': return <Link2 className="w-5 h-5 text-blue-500" />;
      case 'image': return <ImageIcon className="w-5 h-5 text-purple-500" />;
      default: return <FileText className="w-5 h-5 text-orange-500" />;
    }
  };

  if (isLoading) {
    return <div className="p-8">Loading resources...</div>;
  }

  return (
    <div className="flex flex-col h-full min-h-[80vh]">
      <div className="flex justify-between items-end mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Resources</h1>
          <p className="text-muted-foreground mt-1">Study materials, links, and notes</p>
        </div>
        <Button 
          onClick={() => {
            setFormClassId(selectedClassId ? selectedClassId.toString() : "");
            setIsModalOpen(true);
          }} 
          className="gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Add Resource
        </Button>
      </div>

      {/* Class Filter Pills */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          onClick={() => setSelectedClassId(null)}
          className={cn(
            "px-4 py-1.5 rounded-full text-sm font-medium transition-all",
            selectedClassId === null 
              ? "bg-foreground text-background shadow-md" 
              : "bg-black/5 text-foreground hover:bg-black/10"
          )}
        >
          All
        </button>
        {classes?.map(c => (
          <button
            key={c.id}
            onClick={() => setSelectedClassId(c.id)}
            className={cn(
              "px-4 py-1.5 rounded-full text-sm font-medium transition-all flex items-center gap-2 border border-transparent",
              selectedClassId === c.id 
                ? "bg-white shadow-md border-black/5" 
                : "bg-black/5 text-foreground hover:bg-black/10"
            )}
          >
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
            {c.name}
          </button>
        ))}
      </div>

      {/* Resources Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence>
          {filteredResources.length === 0 && (
             <motion.div 
             initial={{ opacity: 0 }} animate={{ opacity: 1 }}
             className="col-span-full text-center py-16 px-4 glass-panel rounded-2xl border-dashed"
           >
             <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-3">
               <FolderOpen className="w-6 h-6 text-primary" />
             </div>
             <h3 className="text-lg font-medium text-foreground">No resources found</h3>
             <p className="text-muted-foreground text-sm mt-1">Add some study materials for this class.</p>
           </motion.div>
          )}

          {filteredResources.map((resource) => (
            <motion.div
              key={resource.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="glass-panel p-5 rounded-2xl flex flex-col group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-black/5 flex items-center justify-center">
                  {getIcon(resource.type)}
                </div>
                <button 
                  onClick={() => deleteMutation.mutate({ id: resource.id })}
                  className="opacity-0 group-hover:opacity-100 p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <h3 className="font-semibold text-foreground mb-1 line-clamp-1">{resource.title}</h3>
              
              {resource.className && (
                <span className="text-xs font-medium text-muted-foreground mb-3">{resource.className}</span>
              )}

              <div className="mt-auto pt-4 border-t border-black/5">
                {resource.type === 'link' ? (
                  <a href={resource.content} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-sm text-primary hover:underline font-medium">
                    Open Link <ExternalLink className="w-3 h-3" />
                  </a>
                ) : resource.type === 'image' ? (
                  <div className="relative aspect-video rounded-lg overflow-hidden bg-black/5">
                    {/* fallback image for user generated urls, using stock image as placeholder if it fails */}
                    <img 
                      src={resource.content} 
                      alt={resource.title}
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop";
                      }}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-foreground/80 line-clamp-3 bg-black/5 p-3 rounded-lg font-mono text-xs">
                    {resource.content}
                  </p>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add Resource">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Title</label>
            <Input 
              value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Chapter 4 Summary" required autoFocus
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Class</label>
              <select 
                value={formClassId} onChange={(e) => setFormClassId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-white/50 bg-white/50 backdrop-blur-sm px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <option value="">None</option>
                {classes?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Type</label>
              <select 
                value={type} onChange={(e) => setType(e.target.value as ResourceType)}
                className="flex h-9 w-full rounded-md border border-white/50 bg-white/50 backdrop-blur-sm px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
              >
                <option value="note">Text Note</option>
                <option value="link">URL Link</option>
                <option value="image">Image URL</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">
              {type === 'link' ? 'URL' : type === 'image' ? 'Image URL' : 'Content'}
            </label>
            {type === 'note' ? (
              <textarea 
                value={content} onChange={(e) => setContent(e.target.value)}
                required
                placeholder="Write your notes here..."
                className="flex min-h-[120px] w-full rounded-md border border-white/50 bg-white/50 backdrop-blur-sm px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-y"
              />
            ) : (
              <Input 
                type="url"
                value={content} onChange={(e) => setContent(e.target.value)}
                required
                placeholder="https://..."
              />
            )}
          </div>

          <div className="pt-4 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={createMutation.isPending}>Add Resource</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
