import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Copy, Check, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import type { Alias } from "@shared/schema";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import type { Email } from "@shared/schema";

interface AliasListProps {
  aliases: Alias[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
}

function AliasCard({ alias, isSelected, onClick }: { alias: Alias; isSelected: boolean; onClick: () => void }) {
  const [copied, setCopied] = useState(false);
  const [timeLeft, setTimeLeft] = useState("");

  // Fetch email count for this alias with polling
  const { data: emails = [] } = useQuery<Email[]>({
    queryKey: ["/api/aliases", alias.id, "emails"],
    refetchInterval: 5000, // Poll every 5 seconds to update unread counts
  });

  const unreadCount = emails.filter((e) => !e.read).length;

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const expires = new Date(alias.expiresAt);
      const diff = expires.getTime() - now.getTime();

      if (diff <= 0) {
        setTimeLeft("Expired");
        return;
      }

      const minutes = Math.floor(diff / 60000);
      const seconds = Math.floor((diff % 60000) / 1000);

      if (minutes > 60) {
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        setTimeLeft(`${hours}h ${mins}m`);
      } else if (minutes > 0) {
        setTimeLeft(`${minutes}m ${seconds}s`);
      } else {
        setTimeLeft(`${seconds}s`);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [alias.expiresAt]);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(alias.email);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isExpiringSoon = () => {
    const now = new Date();
    const expires = new Date(alias.expiresAt);
    const diff = expires.getTime() - now.getTime();
    return diff > 0 && diff < 5 * 60 * 1000; // less than 5 minutes
  };

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 cursor-pointer border-b hover-elevate transition-colors",
        isSelected && "bg-accent"
      )}
      data-testid={`alias-card-${alias.id}`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className="font-mono text-sm font-medium truncate flex-1">
          {alias.email}
        </span>
        {unreadCount > 0 && (
          <Badge variant="default" className="px-2 py-0.5 text-xs" data-testid={`badge-unread-${alias.id}`}>
            {unreadCount}
          </Badge>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          <span className={cn(isExpiringSoon() && "text-amber-500 font-medium")}>
            {timeLeft}
          </span>
        </div>

        <Button
          size="sm"
          variant="ghost"
          onClick={handleCopy}
          className="h-7 px-2"
          data-testid={`button-copy-${alias.id}`}
        >
          {copied ? (
            <Check className="w-3 h-3 text-green-500" />
          ) : (
            <Copy className="w-3 h-3" />
          )}
        </Button>
      </div>
    </div>
  );
}

export function AliasList({ aliases, selectedId, onSelect, isLoading }: AliasListProps) {
  if (isLoading) {
    return (
      <div className="p-4 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-5 w-full" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (aliases.length === 0) {
    return (
      <div className="p-8 text-center">
        <p className="text-sm text-muted-foreground">
          No aliases yet. Create one to get started!
        </p>
      </div>
    );
  }

  return (
    <div>
      {aliases.map((alias) => (
        <AliasCard
          key={alias.id}
          alias={alias}
          isSelected={selectedId === alias.id}
          onClick={() => onSelect(alias.id)}
        />
      ))}
    </div>
  );
}
