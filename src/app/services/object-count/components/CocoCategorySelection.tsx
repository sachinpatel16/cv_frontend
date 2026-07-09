'use client';

import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  User,
  Car,
  TrafficCone,
  Dog,
  Briefcase,
  Trophy,
  Utensils,
  Apple,
  Armchair,
  Laptop,
  Cpu,
  BookOpen,
  Wrench,
  Search,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const COCO_CATEGORIES = [
  {
    name: 'Human Analytics',
    icon: User,
    classes: ['person'],
  },
  {
    name: 'Vehicle Analytics',
    icon: Car,
    classes: [
      'bicycle',
      'car',
      'motorcycle',
      'airplane',
      'bus',
      'train',
      'truck',
      'boat',
    ],
  },
  {
    name: 'Traffic & Road Infrastructure',
    icon: TrafficCone,
    classes: ['traffic light', 'fire hydrant', 'stop sign', 'parking meter'],
  },
  {
    name: 'Animal Monitoring',
    icon: Dog,
    classes: [
      'bird',
      'cat',
      'dog',
      'horse',
      'sheep',
      'cow',
      'elephant',
      'bear',
      'zebra',
      'giraffe',
    ],
  },
  {
    name: 'Personal Belongings',
    icon: Briefcase,
    classes: ['backpack', 'umbrella', 'handbag', 'tie', 'suitcase'],
  },
  {
    name: 'Sports & Activity Objects',
    icon: Trophy,
    classes: [
      'frisbee',
      'skis',
      'snowboard',
      'sports ball',
      'kite',
      'baseball bat',
      'baseball glove',
      'skateboard',
      'surfboard',
      'tennis racket',
    ],
  },
  {
    name: 'Kitchen & Dining Objects',
    icon: Utensils,
    classes: ['bottle', 'wine glass', 'cup', 'fork', 'knife', 'spoon', 'bowl'],
  },
  {
    name: 'Food Detection',
    icon: Apple,
    classes: [
      'banana',
      'apple',
      'sandwich',
      'orange',
      'broccoli',
      'carrot',
      'hot dog',
      'pizza',
      'donut',
      'cake',
    ],
  },
  {
    name: 'Indoor Furniture',
    icon: Armchair,
    classes: [
      'bench',
      'chair',
      'couch',
      'potted plant',
      'bed',
      'dining table',
      'toilet',
    ],
  },
  {
    name: 'Electronic Devices',
    icon: Laptop,
    classes: ['tv', 'laptop', 'mouse', 'remote', 'keyboard', 'cell phone'],
  },
  {
    name: 'Home Appliances',
    icon: Cpu,
    classes: ['microwave', 'oven', 'toaster', 'sink', 'refrigerator'],
  },
  {
    name: 'Documents & Decorative Objects',
    icon: BookOpen,
    classes: ['book', 'clock', 'vase', 'teddy bear'],
  },
  {
    name: 'Tools & Personal Care',
    icon: Wrench,
    classes: ['scissors', 'hair drier', 'toothbrush'],
  },
];

interface CocoCategorySelectionProps {
  selectedCustomClasses: string[];
  setSelectedCustomClasses: (classes: string[]) => void;
  toggleCustomClass: (cls: string) => void;
  customSearchQuery: string;
  setCustomSearchQuery: (v: string) => void;
}

export default function CocoCategorySelection({
  selectedCustomClasses,
  setSelectedCustomClasses,
  toggleCustomClass,
  customSearchQuery,
  setCustomSearchQuery,
}: CocoCategorySelectionProps) {
  const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

  const toggleCategory = (catName: string) => {
    if (expandedCategories.includes(catName)) {
      setExpandedCategories(expandedCategories.filter((c) => c !== catName));
    } else {
      setExpandedCategories([...expandedCategories, catName]);
    }
  };

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute top-2.5 left-2.5 h-3.5 w-3.5 text-[#5A7A9A]" />
          <input
            type="text"
            placeholder="Search standard COCO classes (e.g. dog, laptop, apple)..."
            value={customSearchQuery}
            onChange={(e) => setCustomSearchQuery(e.target.value)}
            className="h-8.5 w-full rounded-md border border-[#1E3048] bg-[#0D1628] pr-3 pl-8.5 text-xs text-[#E8EDF5] placeholder-[#5A7A9A] focus:border-[#1565C0] focus:outline-none"
          />
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (expandedCategories.length === COCO_CATEGORIES.length) {
                setExpandedCategories([]);
              } else {
                setExpandedCategories(COCO_CATEGORIES.map((c) => c.name));
              }
            }}
            className="rounded-md border border-[#1E3048] bg-[#0D1628] px-3 py-1.5 text-[10px] font-semibold text-[#5A7A9A] transition-colors hover:bg-[#1E3048] hover:text-[#E8EDF5]"
          >
            {expandedCategories.length === COCO_CATEGORIES.length
              ? 'Collapse All'
              : 'Expand All'}
          </button>
          {selectedCustomClasses.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedCustomClasses([]);
              }}
              className="rounded-md border border-rose-500/20 bg-rose-500/5 px-3 py-1.5 text-[10px] font-semibold text-rose-400 transition-colors hover:bg-rose-500/10"
            >
              Clear Selection
            </button>
          )}
        </div>
      </div>

      <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
        {COCO_CATEGORIES.map((cat) => {
          const catClasses = cat.classes;
          // Filter classes by search query
          const matchingClasses = catClasses.filter((cls) =>
            cls.toLowerCase().includes(customSearchQuery.toLowerCase()),
          );

          // If search is active and this category doesn't have any matches, don't show it
          if (customSearchQuery && matchingClasses.length === 0) {
            return null;
          }

          const selectedInCat = matchingClasses.filter((cls) =>
            selectedCustomClasses.includes(cls),
          );
          const isExpanded =
            !!customSearchQuery || expandedCategories.includes(cat.name);
          const Icon = cat.icon;

          const allSelected = matchingClasses.every((cls) =>
            selectedCustomClasses.includes(cls),
          );

          const handleSelectAll = (e: React.MouseEvent) => {
            e.stopPropagation();
            const newClasses = [...selectedCustomClasses];
            matchingClasses.forEach((cls) => {
              if (!newClasses.includes(cls)) {
                newClasses.push(cls);
              }
            });
            setSelectedCustomClasses(newClasses);
          };

          const handleClearAll = (e: React.MouseEvent) => {
            e.stopPropagation();
            const newClasses = selectedCustomClasses.filter(
              (cls) => !matchingClasses.includes(cls),
            );
            setSelectedCustomClasses(newClasses);
          };

          return (
            <div
              key={cat.name}
              className="overflow-hidden rounded-lg border border-[#1E3048]/50 bg-[#0A0F1E]/30"
            >
              {/* Header */}
              <div
                onClick={() => toggleCategory(cat.name)}
                className="flex cursor-pointer items-center justify-between px-3 py-2 transition-colors select-none hover:bg-[#1E3048]/20"
              >
                <div className="flex min-w-0 items-center gap-2">
                  {isExpanded ? (
                    <ChevronDown className="h-3.5 w-3.5 shrink-0 text-[#5A7A9A]" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 shrink-0 text-[#5A7A9A]" />
                  )}
                  <div className="shrink-0 rounded bg-[#1E3048]/40 p-1 text-[#60A5FA]">
                    <Icon className="h-3.5 w-3.5" />
                  </div>
                  <span className="truncate text-[11px] font-semibold text-[#E8EDF5]">
                    {cat.name}
                  </span>
                  {selectedInCat.length > 0 && (
                    <span className="rounded bg-[#1565C0]/20 px-1.5 py-0.5 text-[9px] font-bold text-[#60A5FA]">
                      {selectedInCat.length} selected
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {allSelected ? (
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="px-2 py-0.5 text-[9px] font-semibold text-rose-400 transition-colors hover:text-rose-300"
                    >
                      Clear All
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="px-2 py-0.5 text-[9px] font-semibold text-[#60A5FA] transition-colors hover:text-[#60A5FA]/80"
                    >
                      Select All
                    </button>
                  )}
                </div>
              </div>

              {/* Content Grid */}
              {isExpanded && (
                <div className="grid grid-cols-2 gap-1.5 border-t border-[#1E3048]/40 bg-[#0D1628]/30 p-2.5 sm:grid-cols-3">
                  {matchingClasses.map((cls) => {
                    const isSelected = selectedCustomClasses.includes(cls);
                    return (
                      <div
                        key={cls}
                        onClick={() => toggleCustomClass(cls)}
                        className={cn(
                          'flex cursor-pointer items-center gap-2 rounded border px-2 py-1.5 text-xs transition-colors select-none',
                          isSelected
                            ? 'border-[#1565C0]/40 bg-[#1565C0]/10 text-[#60A5FA]'
                            : 'border-transparent text-[#5A7A9A] hover:bg-[#1E3048]/30 hover:text-[#E8EDF5]',
                        )}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          readOnly
                          className="h-3 w-3 rounded border-[#1E3048] text-[#1565C0] focus:ring-[#1565C0]"
                        />
                        <span className="truncate">{cls}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
