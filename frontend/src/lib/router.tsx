"use client";

import LinkComponent from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, useCallback, useContext } from "react";
import type { ComponentProps, ReactNode } from "react";

type RouteParams = Record<string, string | string[] | undefined>;

type RouterContextValue = {
  outlet: ReactNode;
  params: RouteParams;
};

const RouterContext = createContext<RouterContextValue>({
  outlet: null,
  params: {},
});

type CompatRouterProviderProps = {
  children: ReactNode;
  outlet?: ReactNode;
  params?: RouteParams;
};

export function CompatRouterProvider({
  children,
  outlet = null,
  params = {},
}: CompatRouterProviderProps) {
  return (
    <RouterContext.Provider value={{ outlet, params }}>
      {children}
    </RouterContext.Provider>
  );
}

type CompatLinkProps = Omit<ComponentProps<typeof LinkComponent>, "href"> & {
  to: string;
};

export function Link({ to, ...props }: CompatLinkProps) {
  return <LinkComponent href={to} {...props} />;
}

export function Outlet() {
  const { outlet } = useContext(RouterContext);
  return <>{outlet}</>;
}

export function useLocation() {
  const pathname = usePathname() ?? "/";

  return {
    pathname,
    search: "",
    hash: "",
    state: null,
    key: pathname,
  };
}

type NavigateOptions = {
  replace?: boolean;
};

export function useNavigate() {
  const router = useRouter();

  return useCallback(
    (to: number | string, options?: NavigateOptions) => {
      if (typeof to === "number") {
        if (to < 0) {
          router.back();
        }

        if (to > 0) {
          router.forward();
        }

        return;
      }

      if (options?.replace) {
        router.replace(to);
        return;
      }

      router.push(to);
    },
    [router]
  );
}

export function useParams<T extends RouteParams = RouteParams>() {
  const { params } = useContext(RouterContext);
  return params as T;
}

type RouterProviderProps = {
  router?: unknown;
  fallbackElement?: ReactNode;
};

export function RouterProvider(_props: RouterProviderProps) {
  return null;
}

export function createBrowserRouter<T>(routes: T) {
  return routes;
}
