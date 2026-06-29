# Frontend Development & Architecture Guide

This guide describes how to build a new service page/module, how to integrate with the backend API, and how to structure components and state management following the project's frontend architecture.

---

## 1. Directory Structure

We use a modular architecture based on the Next.js **App Router**. Here is where your code should live:

```text
src/
├── app/
│   └── services/
│       └── [service-name]/          # Your new service route
│           ├── page.tsx             # The main page orchestrator (Client Component)
│           └── components/          # Page-specific (colocated) components
├── components/
│   ├── ui/                          # Generic low-level UI elements (buttons, inputs)
│   └── services/
│       └── shared/                  # Reusable components shared across services (e.g., StatusBadge)
├── lib/
│   ├── api/
│   │   ├── client.ts                # Axios instance with 401 refresh interceptors
│   │   ├── endpoints.ts             # Registry of all API routes
│   │   └── [service-name].ts        # API request functions for your service
│   └── services.ts                  # Global service registry for sidebar navigation
└── stores/
    └── [serviceName]Store.ts        # Zustand store for the service
```

---

## 2. Component Placement Strategy

- **Global Components (`src/components/`):** If a component is used (or has a high probability of being used) by multiple services, place it here.
- **Local Components (`src/app/services/[service-name]/components/`):** If a component is only relevant to your service (e.g., a specific canvas drawer or custom dashboard widget), keep it colocated within your route's folder.

---

## 3. Step-by-Step Guide to Adding a New Service

### Step 1: Register the API Endpoints

Add your backend endpoints to [endpoints.ts](file:///c:/Users/ABCD/Downloads/Drive/Computer%20Vision/cv-frontend/src/lib/api/endpoints.ts):

```typescript
export const API_ENDPOINTS = {
  // ... existing endpoints
  MY_NEW_SERVICE: {
    MEDIA: '/new-service/media',
    PROCESS: '/new-service/process',
    SESSIONS: '/new-service/sessions',
  },
} as const;
```

### Step 2: Create the API Wrapper

Create a new file `src/lib/api/[service-name].ts` to define your backend requests. Always use the pre-configured `apiClient` which automatically handles credentials and token refreshes:

```typescript
import { apiClient } from './client';
import { API_ENDPOINTS } from './endpoints';
import type { ApiResponse } from '@/types/api';

export async function fetchServiceData(): Promise<ApiResponse<any>> {
  const response = await apiClient.get<ApiResponse<any>>(
    API_ENDPOINTS.MY_NEW_SERVICE.SESSIONS,
  );
  return response.data;
}
```

### Step 3: Define the Zustand Store

Create a new Zustand store in `src/stores/[serviceName]Store.ts` to manage the state of your page. Keep business logic and API calls inside store actions, leaving your React components clean and presentational.

```typescript
import { create } from 'zustand';
import { fetchServiceData } from '@/lib/api/[service-name]';

interface MyServiceState {
  data: any[];
  loading: boolean;
  fetchData: () => Promise<void>;
}

export const useMyServiceStore = create<MyServiceState>((set) => ({
  data: [],
  loading: false,
  fetchData: async () => {
    set({ loading: true });
    try {
      const res = await fetchServiceData();
      set({ data: res.data });
    } catch (err) {
      console.error(err);
    } finally {
      set({ loading: false });
    }
  },
}));
```

### Step 4: Register the Service in the Navigation Sidebar

Add your service metadata to [services.ts](file:///c:/Users/ABCD/Downloads/Drive/Computer%20Vision/cv-frontend/src/lib/services.ts) so it appears automatically in the sidebar registry:

```typescript
import { Sparkles } from 'lucide-react'; // Your icon choice

export const SERVICES_REGISTRY: Service[] = [
  // ... existing services
  {
    id: 'my-new-service',
    label: 'My New Service',
    icon: Sparkles,
    href: '/services/my-new-service',
    description: 'A description of what your new computer vision service does.',
    milestone: 1,
    comingSoon: false,
  },
];
```

### Step 5: Create the Page Component

Create `src/app/services/[service-name]/page.tsx`. Use `'use client'` since it will consume the Zustand store and handle user interactions.

```tsx
'use client';

import { useEffect } from 'react';
import { useMyServiceStore } from '@/stores/myServiceStore';
import { Loader2 } from 'lucide-react';

export default function MyNewServicePage() {
  const { data, loading, fetchData } = useMyServiceStore();

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="max-w-6xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#E8EDF5]">My New Service</h1>
        <p className="text-sm text-[#5A7A9A]">Overview of the service.</p>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-[#5A7A9A]" />
        </div>
      ) : (
        <div className="rounded-xl border border-[#1E3048] bg-[#0D1628] p-5">
          {/* Render your data/components here */}
        </div>
      )}
    </div>
  );
}
```

---

## 4. Architectural Rules & Best Practices

1. **Keep Page Files Clean:** The `page.tsx` file should act as an orchestrator. Break it down into sub-components (either in a local `components/` folder or at the bottom of the file) rather than writing a single 1000-line render function.
2. **Never Use Local State for Shared Data:** If multiple components on a page need access to the same fetched data, put it in the Zustand store. Use local `useState` only for transient UI states (e.g., whether a modal is open, or a temporary search query).
3. **Graceful Error Handling:** Always wrap API calls in `try/catch` blocks inside your stores. The `apiClient` automatically redirects the user to `/login` if their session expires (returns `401`).
4. **Follow Theme Styling:** Use the design token colors instead of raw hex codes where possible:
   - Text Primary: `text-[#E8EDF5]`
   - Text Secondary: `text-[#5A7A9A]`
   - Borders: `border-[#1E3048]`
   - Dark Backgrounds: `bg-[#0D1628]` (Cards/Panels), `bg-[#0A0F1E]` (Page backgrounds)
   - Brand Blue: `bg-[#1565C0]` / `hover:bg-[#1976D2]`
