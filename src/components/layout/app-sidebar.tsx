import {
  ArrowLeftRight,
  Banknote,
  Building2,
  CheckSquare,
  LayoutDashboard,
  LineChart,
  LogOut,
  Package,
  ShoppingBag,
  Tag,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/providers/auth-provider";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";

const navGroups = [
  {
    label: "Overview",
    items: [
      { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard },
    ],
  },
  {
    label: "Finance",
    items: [
      { title: "Accounts", url: "/accounts", icon: Building2 },
      { title: "Transactions", url: "/transactions", icon: LineChart },
      { title: "Categories", url: "/categories", icon: Tag },
      { title: "Retailers", url: "/retailers", icon: ShoppingBag },
      { title: "Income", url: "/income", icon: Banknote },
      { title: "Stocks", url: "/stocks", icon: TrendingUp },
    ],
  },
  {
    label: "Review",
    items: [
      { title: "검토", url: "/review", icon: CheckSquare },
      { title: "Amazon Orders", url: "/amazon", icon: Package },
      { title: "환전", url: "/exchanges", icon: ArrowLeftRight },
    ],
  },
];

export function AppSidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { userName, logout } = useAuth();

  function isActive(url: string): boolean {
    // Exact match for list pages to avoid highlighting when on detail pages
    if (url === "/retailers" || url === "/stocks") {
      return location.pathname === url;
    }
    return location.pathname.startsWith(url);
  }

  return (
    <Sidebar>
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/20 p-1.5">
            <Wallet className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold">Finance</span>
        </div>
      </SidebarHeader>

      <Separator />

      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.label}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={isActive(item.url)}
                      onClick={() => navigate(item.url)}
                    >
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarFooter className="p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground truncate">{userName}</span>
          <button
            type="button"
            onClick={logout}
            className="text-muted-foreground hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
