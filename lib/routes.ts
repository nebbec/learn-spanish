/** The app's top-level routes. The menu is the home page. */
export const ROUTES = {
  menu: "/",
  learn: "/learn",
  practice: "/practice",
  settings: "/settings",
  tips: "/tips",
} as const;

export type RouteName = keyof typeof ROUTES;
