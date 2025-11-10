import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Copy, Check } from "lucide-react";
import type { Alias, InsertAlias } from "@shared/schema";

interface CreateAliasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateAliasDialog({ open, onOpenChange }: CreateAliasDialogProps) {
  const { toast } = useToast();
  const [prefix, setPrefix] = useState("");
  const [ttlMinutes, setTtlMinutes] = useState("30");
  const [autoGenerate, setAutoGenerate] = useState(false);
  const [createdAlias, setCreatedAlias] = useState<Alias | null>(null);
  const [copied, setCopied] = useState(false);

  const createMutation = useMutation({
    mutationFn: async (data: InsertAlias) => {
      const res = await apiRequest("POST", "/api/aliases", data);
      return await res.json() as Alias;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/aliases"] });
      setCreatedAlias(data);
      toast({
        title: "Alias created!",
        description: `Your temporary email ${data.email} is ready to use.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to create alias.",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const data: InsertAlias = {
      ttlMinutes: parseInt(ttlMinutes),
    };

    if (!autoGenerate && prefix.trim()) {
      data.prefix = prefix.trim();
    }

    createMutation.mutate(data);
  };

  const handleClose = () => {
    onOpenChange(false);
    // Reset form after close animation
    setTimeout(() => {
      setPrefix("");
      setTtlMinutes("30");
      setAutoGenerate(false);
      setCreatedAlias(null);
      setCopied(false);
    }, 200);
  };

  const handleCopy = () => {
    if (createdAlias) {
      navigator.clipboard.writeText(createdAlias.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" data-testid="dialog-create-alias">
        <DialogHeader>
          <DialogTitle>Create Temporary Alias</DialogTitle>
          <DialogDescription>
            {createdAlias
              ? "Your temporary email address is ready!"
              : "Set up a new temporary email address with auto-expiry."}
          </DialogDescription>
        </DialogHeader>

        {createdAlias ? (
          <div className="space-y-4 py-4">
            <div className="p-4 bg-card rounded-lg border">
              <Label className="text-sm font-medium mb-2 block">Your Email Address</Label>
              <div className="flex items-center gap-2">
                <code className="flex-1 font-mono text-sm bg-background px-3 py-2 rounded border">
                  {createdAlias.email}
                </code>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopy}
                  data-testid="button-copy-created-alias"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              This alias will expire in{" "}
              <span className="font-medium text-foreground">
                {Math.floor(parseInt(ttlMinutes) / 60) > 0
                  ? `${Math.floor(parseInt(ttlMinutes) / 60)} hour${Math.floor(parseInt(ttlMinutes) / 60) > 1 ? "s" : ""}`
                  : `${ttlMinutes} minutes`}
              </span>
              . Use it anywhere and emails will arrive instantly.
            </p>

            <Button onClick={handleClose} className="w-full" data-testid="button-done">
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="prefix" className="text-sm font-medium">
                  Email Prefix (optional)
                </Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="prefix"
                    placeholder="my-alias"
                    value={prefix}
                    onChange={(e) => setPrefix(e.target.value)}
                    disabled={autoGenerate || createMutation.isPending}
                    className="flex-1"
                    data-testid="input-alias-prefix"
                  />
                  <span className="text-sm text-muted-foreground">@redweyne.com</span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="auto-generate"
                  checked={autoGenerate}
                  onCheckedChange={(checked) => setAutoGenerate(checked as boolean)}
                  disabled={createMutation.isPending}
                  data-testid="checkbox-auto-generate"
                />
                <Label
                  htmlFor="auto-generate"
                  className="text-sm font-normal cursor-pointer"
                >
                  Auto-generate random prefix
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="ttl" className="text-sm font-medium">
                  Expires In
                </Label>
                <Select
                  value={ttlMinutes}
                  onValueChange={setTtlMinutes}
                  disabled={createMutation.isPending}
                >
                  <SelectTrigger id="ttl" data-testid="select-ttl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 minutes</SelectItem>
                    <SelectItem value="30">30 minutes</SelectItem>
                    <SelectItem value="60">1 hour</SelectItem>
                    <SelectItem value="120">2 hours</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={createMutation.isPending}
                data-testid="button-cancel-create"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={createMutation.isPending || (!autoGenerate && !prefix.trim())}
                data-testid="button-submit-create"
              >
                {createMutation.isPending ? "Creating..." : "Create Alias"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
