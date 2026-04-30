import {
  LayoutDashboard,
  ShoppingBag,
  Users,
  Ruler,
  Trello,
  Scissors,
  RefreshCw,
  Receipt,
  CreditCard,
  Palette,
  Package,
  BarChart2,
  Truck,
  Settings,
  BookMarked,
  ArrowDownLeft,
  ArrowUpRight,
  Wallet,
  AlertCircle,
  Briefcase,
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
      { label: "Production Board", href: "/kanban", icon: Trello },
      { label: "Jobs Card", href: "/jobs-card", icon: Briefcase },
      { label: "Delivery", href: "/delivery", icon: Truck },

      /* { label: "Alterations", href: "/alterations", icon: RefreshCw }, */
    ],
  },
  /* {
    section: "Finance",
    items: [
      { label: "Billing & GST", href: "/billing", icon: Receipt },
      { label: "Payments", href: "/payments", icon: CreditCard },
    ],
  }, */
  {
    section: "Accounts",
    items: [
      
      { label: "Receipt Book", href: "/accounts/receipts", icon: ArrowDownLeft },
      { label: "Payment Book", href: "/accounts/payments", icon: ArrowUpRight },
      { label: "Account Ledger", href: "/accounts/ledger", icon: BookMarked },
      { label: "Transaction Book", href: "/accounts/transaction-book", icon: Wallet },
      /* { label: "Outstanding", href: "/accounts/outstanding", icon: AlertCircle }, */
    ],
  },
  {
    section: "Settings",
    items: [
      { label: "Design Catalog", href: "/designs", icon: Palette },
      { label: "Tailors", href: "/tailors", icon: Scissors },
      /* { label: "Fabric Stock", href: "/fabric", icon: Package }, */
      /* { label: "Reports", href: "/reports", icon: BarChart2 }, */
      
      { label: "Settings", href: "/settings", icon: Settings },
    ],
  },
];
