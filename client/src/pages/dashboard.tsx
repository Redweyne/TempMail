import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Search, Mail, Trash2 } from "lucide-react";
import { AliasList } from "@/components/alias-list";
import { EmailList } from "@/components/email-list";
import { EmailViewer } from "@/components/email-viewer";
import { CreateAliasDialog } from "@/components/create-alias-dialog";
import { EmptyState } from "@/components/empty-state";
import { useToast } from "@/hooks/use-toast";
import type { Alias, Email } from "@shared/schema";

export default function Dashboard() {
  const [selectedAliasId, setSelectedAliasId] = useState<string | null>(null);
  const [selectedEmailId, setSelectedEmailId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<"temporary" | "permanent">("temporary");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch all aliases with real-time polling
  const { data: aliases = [], isLoading: aliasesLoading } = useQuery<Alias[]>({
    queryKey: ["/api/aliases"],
    refetchInterval: 5000, // Poll every 5 seconds for new aliases
  });

  // Fetch emails for selected alias with real-time polling
  const { data: emails = [], isLoading: emailsLoading } = useQuery<Email[]>({
    queryKey: ["/api/aliases", selectedAliasId, "emails"],
    enabled: !!selectedAliasId,
    refetchInterval: selectedAliasId ? 3000 : false, // Poll every 3 seconds when alias is selected
  });

  // Filter aliases based on tab and search
  const filteredAliases = aliases.filter((alias) => {
    const matchesSearch = alias.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === "temporary" ? !alias.isPermanent : alias.isPermanent;
    return matchesSearch && matchesTab;
  });

  const selectedAlias = aliases.find((a) => a.id === selectedAliasId);
  const selectedEmail = emails.find((e) => e.id === selectedEmailId);

  // Cleanup expired aliases mutation
  const cleanupMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/cleanup", {
        credentials: "include",
      });
      if (!response.ok) {
        throw new Error("Failed to cleanup expired items");
      }
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aliases"] });
      toast({
        title: "Cleanup completed",
        description: `Deleted ${data.deletedAliases} expired aliases and ${data.deletedEmails} emails`,
      });
    },
    onError: () => {
      toast({
        title: "Cleanup failed",
        description: "Could not delete expired items. Please try again.",
        variant: "destructive",
      });
    },
  });

  return (
    <div className="flex h-screen flex-col">
      {/* Top Navigation */}
      <header className="h-16 border-b flex items-center justify-between px-6 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Mail className="w-6 h-6 text-primary" />
          <h1 className="text-xl font-bold">Redweyne</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            onClick={() => cleanupMutation.mutate()}
            variant="outline"
            className="gap-2"
            disabled={cleanupMutation.isPending}
            data-testid="button-cleanup"
          >
            <Trash2 className="w-4 h-4" />
            {cleanupMutation.isPending ? "Cleaning..." : "Clean Expired"}
          </Button>
          <Button 
            onClick={() => setIsCreateDialogOpen(true)} 
            data-testid="button-new-alias"
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            New Alias
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Alias List */}
        <aside className="w-80 border-r flex flex-col bg-card">
          {/* Tabs */}
          <div className="p-4 border-b">
            <Tabs value={activeTab} onValueChange={(value) => {
              setActiveTab(value as "temporary" | "permanent");
              setSelectedAliasId(null);
              setSelectedEmailId(null);
            }}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="temporary">Temporary</TabsTrigger>
                <TabsTrigger value="permanent">Permanent</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Search */}
          <div className="px-4 pb-4 border-b">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search aliases..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10"
                data-testid="input-search-aliases"
              />
            </div>
          </div>

          {/* Alias List */}
          <div className="flex-1 overflow-y-auto">
            <AliasList
              aliases={filteredAliases}
              selectedId={selectedAliasId}
              onSelect={setSelectedAliasId}
              isLoading={aliasesLoading}
            />
          </div>

          {/* Create Alias Button (bottom) */}
          <div className="p-4 border-t">
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => setIsCreateDialogOpen(true)}
              data-testid="button-create-alias-bottom"
            >
              <Plus className="w-4 h-4" />
              Create New Alias
            </Button>
          </div>
        </aside>

        {/* Right Content - Email List or Viewer */}
        <main className="flex-1 flex flex-col overflow-hidden bg-background">
          {!selectedAliasId ? (
            <EmptyState
              icon={Mail}
              title="Select an alias"
              description="Choose an alias from the sidebar to view its emails, or create a new one to get started."
              action={
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-empty-create">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Alias
                </Button>
              }
            />
          ) : selectedEmailId && selectedEmail ? (
            <EmailViewer
              email={selectedEmail}
              onBack={() => setSelectedEmailId(null)}
              alias={selectedAlias}
            />
          ) : (
            <EmailList
              emails={emails}
              isLoading={emailsLoading}
              onSelectEmail={setSelectedEmailId}
              alias={selectedAlias}
            />
          )}
        </main>
      </div>

      {/* Create Alias Dialog */}
      <CreateAliasDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        isPermanent={activeTab === "permanent"}
      />
    </div>
  );
}
