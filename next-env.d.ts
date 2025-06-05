/// <reference types="next" />
/// <reference types="next/image-types/global" />

// NOTE: This file should not be edited
// see https://nextjs.org/docs/basic-features/typescript for more information.

// Add module declarations for your components
declare module '@/components/*' {
  import { ReactNode } from 'react';
  const component: () => ReactNode;
  export default component;
}

// Add environment variable types
declare namespace NodeJS {
  interface ProcessEnv {
    NEXT_PUBLIC_SUPABASE_URL: string;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
    MARKET_CAP_THRESHOLD_MILLIONS: string;
  }
}
