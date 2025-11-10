import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, Code, ExternalLink } from "lucide-react";
import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Email, Alias } from "@shared/schema";
import DOMPurify from "isomorphic-dompurify";

interface EmailViewerProps {
  email: Email;
  onBack: () => void;
  alias: Alias | undefined;
}

export function EmailViewer({ email, onBack, alias }: EmailViewerProps) {
  const { toast } = useToast();
  const [showRaw, setShowRaw] = useState(false);

  // Mark as read when opened
  const markAsReadMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/emails/${email.id}/read`);
    },
    onSuccess: () => {
      // Update the cache after successful API call
      queryClient.setQueryData<Email[]>(
        ["/api/aliases", email.aliasId, "emails"],
        (old = []) => old.map((e) => (e.id === email.id ? { ...e, read: true } : e))
      );
    },
  });

  useEffect(() => {
    if (!email.read) {
      markAsReadMutation.mutate();
    }
  }, [email.id, email.read]);

  const deleteMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("DELETE", `/api/emails/${email.id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/aliases", email.aliasId, "emails"] });
      toast({
        title: "Email deleted",
        description: "The email has been removed.",
      });
      onBack();
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete email.",
        variant: "destructive",
      });
    },
  });

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const sanitizedHtml = email.bodyHtml
    ? DOMPurify.sanitize(email.bodyHtml, { ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li", "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "pre", "code", "img", "div", "span", "table", "tr", "td", "th", "thead", "tbody"] })
    : null;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b p-6 space-y-4 flex-shrink-0">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            onClick={onBack}
            className="gap-2"
            data-testid="button-back-to-list"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Emails
          </Button>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowRaw(!showRaw)}
              className="gap-2"
              data-testid="button-toggle-raw"
            >
              <Code className="w-4 h-4" />
              {showRaw ? "Formatted" : "Raw"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => deleteMutation.mutate()}
              disabled={deleteMutation.isPending}
              className="gap-2 text-destructive hover:text-destructive"
              data-testid="button-delete-email"
            >
              <Trash2 className="w-4 h-4" />
              Delete
            </Button>
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-semibold leading-tight mb-4">
            {email.subject || "(No subject)"}
          </h1>

          <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-sm">
            <div>
              <span className="text-muted-foreground">From:</span>{" "}
              <span className="font-medium">{email.from}</span>
            </div>
            <div>
              <span className="text-muted-foreground">To:</span>{" "}
              <span className="font-medium font-mono">{email.to}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Date:</span>{" "}
              <span>{formatDate(email.receivedAt)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6">
        {showRaw ? (
          <pre className="font-mono text-xs bg-card p-6 rounded-lg border overflow-x-auto whitespace-pre-wrap break-words">
            {email.raw}
          </pre>
        ) : (
          <div className="max-w-3xl">
            {sanitizedHtml ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
                data-testid="email-html-content"
              />
            ) : (
              <pre className="font-sans text-sm whitespace-pre-wrap leading-relaxed" data-testid="email-text-content">
                {email.bodyText || "(No content)"}
              </pre>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
