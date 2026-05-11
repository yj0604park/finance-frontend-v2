import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatsCardProps {
  icon: LucideIcon;
  label: string;
  value: string | number;
  iconBg?: string;
  iconColor?: string;
  valueColor?: string;
  loading?: boolean;
}

export function StatsCard({
  icon: Icon,
  label,
  value,
  iconBg = "bg-muted",
  iconColor = "text-muted-foreground",
  valueColor,
  loading,
}: StatsCardProps) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <div className={`shrink-0 rounded-lg p-2 ${iconBg}`}>
            <Icon className={`h-5 w-5 ${iconColor}`} />
          </div>
          <div className="min-w-0">
            <p className="text-sm text-muted-foreground">{label}</p>
            {loading ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <p className={`truncate text-2xl font-bold ${valueColor ?? ""}`}>{value}</p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
