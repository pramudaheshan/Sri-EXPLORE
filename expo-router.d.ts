declare module 'expo-router' {
  import { LinkingOptions } from '@react-navigation/native';

  export function useRouter(): {
    push: (href: string) => void;
    back: () => void;
    replace: (href: string) => void;
    dismissAll: () => void;
  };

  export function useLocalSearchParams(): Record<string, string | string[]>;
  export function useGlobalSearchParams(): Record<string, string | string[]>;
  export function usePathname(): string;

  export const Stack: any;
  export const Tabs: any;
  export const Slot: any;

  export function Link(props: any): JSX.Element;
  export function Redirect(props: any): JSX.Element;

  export function withLayoutContext(Component: any): any;
}
