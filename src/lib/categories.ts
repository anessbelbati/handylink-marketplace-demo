import {
  Brush,
  Hammer,
  KeyRound,
  Sparkles,
  Thermometer,
  Truck,
  Wrench,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type CategorySeed = {
  slug: string;
  name: string;
  icon: string;
  sortOrder: number;
  isActive: boolean;
};

export const categorySeeds: CategorySeed[] = [
  { slug: "plumber", name: "Plumber", icon: "wrench", sortOrder: 1, isActive: true },
  { slug: "electrician", name: "Electrician", icon: "zap", sortOrder: 2, isActive: true },
  { slug: "painter", name: "Painter", icon: "paintbrush", sortOrder: 3, isActive: true },
  { slug: "carpenter", name: "Carpenter", icon: "hammer", sortOrder: 4, isActive: true },
  { slug: "cleaner", name: "Cleaning", icon: "sparkles", sortOrder: 5, isActive: true },
  { slug: "mover", name: "Moving", icon: "truck", sortOrder: 6, isActive: true },
  { slug: "locksmith", name: "Locksmith", icon: "key", sortOrder: 7, isActive: true },
  { slug: "hvac", name: "HVAC", icon: "thermometer", sortOrder: 8, isActive: true },
];

export const categoryIconMap: Record<string, LucideIcon> = {
  wrench: Wrench,
  zap: Zap,
  paintbrush: Brush,
  hammer: Hammer,
  sparkles: Sparkles,
  truck: Truck,
  key: KeyRound,
  thermometer: Thermometer,
};

