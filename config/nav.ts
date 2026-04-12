import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Ruler,
  Trello,
  Scissors,
  ClipboardList,
  RefreshCw,
  Receipt,
  CreditCard,
  BookOpen,
  Palette,
  Package,
  BarChart2,
  Truck,
  Settings,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string | number;
};

export type NavSection = {
  section: string;
  items: NavItem[];
};

export const navSections: NavSection[] = [
  {
    section: "Core",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
      { label: "Orders", href: "/orders", icon: ShoppingBag },
      { label: "Customers", href: "/customers", icon: Users },
      { label: "Measurements", href: "/measurements", icon: Ruler },
    ],
  },
  {
    section: "Production",
    items: [
      { label: "Kanban Board", href: "/kanban", icon: Trello },
      { label: "Tailors", href: "/tailors", icon: Scissors },
      { label: "Job Cards", href: "/jobs", icon: ClipboardList },
      { label: "Alterations", href: "/alterations", icon: RefreshCw },
    ],
  },
  {
    section: "Finance",
    items: [
      { label: "Billing & GST", href: "/billing", icon: Receipt },
      { label: "Payments", href: "/payments", icon: CreditCard },
      { label: "Udhar Khata", href: "/udhar", icon: BookOpen },
    ],
  },
  {
    section: "Settings",
    items: [
      { label: "Design Catalog", href: "/designs", icon: Palette },
      { label: "Fabric Stock", href: "/fabric", icon: Package },
      { label: "Reports", href: "/reports", icon: BarChart2 },
      { label: "Delivery", href: "/delivery", icon: Truck },
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
