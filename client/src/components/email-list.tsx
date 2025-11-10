import { cn } from "@/lib/utils";
import type { Email, Alias } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/empty-state";
import { Mail } from "lucide-react";
import emptyMailbox from "@assets/generated_images/Empty_mailbox_line_drawing_cab1f58a.png";

interface EmailListProps {
  emails: Email[];
  isLoading: boolean;
  onSelectEmail: (id: string) => void;
  alias: Alias | undefined;
}

function EmailRow({ email, onClick }: { email: Email; onClick: () => void }) {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    // Less than 1 minute
    if (diff < 60000) return "Just now";

    // Less than 1 hour
    if (diff < 3600000) {
      const mins = Math.floor(diff / 60000);
      return `${mins}m ago`;
    }

    // Less than 24 hours
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours}h ago`;
    }

    // More than 24 hours
    return date.toLocaleDateString();
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "h-14 px-6 flex items-center gap-4 border-b cursor-pointer hover-elevate transition-colors",
        !email.read && "bg-accent/30"
      )}
      data-testid={`email-row-${email.id}`}
    >
      <div className="w-[30%] truncate">
        <span className={cn("text-sm", !email.read && "font-semibold")}>
          {email.from}
        </span>
      </div>
      <div className="w-[50%] truncate">
        <span className={cn("text-sm", !email.read && "font-medium")}>
          {email.subject || "(No subject)"}
        </span>
      </div>
      <div className="w-[20%] text-right">
        <span className="text-xs text-muted-foreground">
          {formatTime(email.receivedAt)}
        </span>
      </div>
    </div>
  );
}

export function EmailList({ emails, isLoading, onSelectEmail, alias }: EmailListProps) {
  if (isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex gap-4">
              <Skeleton className="h-5 w-[30%]" />
              <Skeleton className="h-5 w-[50%]" />
              <Skeleton className="h-5 w-[20%]" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (emails.length === 0) {
    return (
      <EmptyState
        icon={Mail}
        image={emptyMailbox}
        title="No emails yet"
        description={alias ? `Emails sent to ${alias.email} will appear here.` : "Select an alias to view emails."}
      />
    );
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Header */}
      <div className="h-12 px-6 flex items-center gap-4 border-b bg-card text-xs font-medium text-muted-foreground">
        <div className="w-[30%]">From</div>
        <div className="w-[50%]">Subject</div>
        <div className="w-[20%] text-right">Time</div>
      </div>

      {/* Email rows */}
      <div className="flex-1 overflow-y-auto">
        {emails.map((email) => (
          <EmailRow
            key={email.id}
            email={email}
            onClick={() => onSelectEmail(email.id)}
          />
        ))}
      </div>
    </div>
  );
}
