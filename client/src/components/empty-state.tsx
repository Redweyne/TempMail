import type { LucideIcon } from "lucide-react";
import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: LucideIcon;
  image?: string;
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ icon: Icon, image, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-1 items-center justify-center p-8">
      <div className="text-center max-w-md space-y-4">
        {image ? (
          <img src={image} alt="" className="w-48 h-48 mx-auto opacity-50" />
        ) : Icon ? (
          <div className="w-16 h-16 mx-auto rounded-full bg-muted flex items-center justify-center">
            <Icon className="w-8 h-8 text-muted-foreground" />
          </div>
        ) : null}
        
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">{title}</h3>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {description}
          </p>
        </div>

        {action && <div className="pt-2">{action}</div>}
      </div>
    </div>
  );
}
