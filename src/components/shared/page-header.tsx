import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface BadgeDef {
  label: string;
  variant?: "default" | "secondary" | "outline" | "destructive";
  className?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badges?: BadgeDef[];
  onBack?: () => void;
  loading?: boolean;
  actions?: ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badges,
  onBack,
  loading,
  actions,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="flex items-start gap-3">
        {onBack && (
          <Button
            variant="ghost"
            size="icon"
            className="mt-0.5 shrink-0"
            onClick={onBack}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
        )}
        {loading ? (
          <Skeleton className="h-8 w-56" />
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
              {badges?.map((b) => (
                <Badge key={b.label} variant={b.variant ?? "outline"} className={b.className}>
                  {b.label}
                </Badge>
              ))}
            </div>
            {subtitle && (
              <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>
            )}
          </div>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}
