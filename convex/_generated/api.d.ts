/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as admin from "../admin.js";
import type * as billing from "../billing.js";
import type * as categories from "../categories.js";
import type * as conversations from "../conversations.js";
import type * as dev_seed from "../dev/seed.js";
import type * as dev_seedImages from "../dev/seedImages.js";
import type * as files from "../files.js";
import type * as http from "../http.js";
import type * as lib_auth from "../lib/auth.js";
import type * as messages from "../messages.js";
import type * as notifications from "../notifications.js";
import type * as providers from "../providers.js";
import type * as quotes from "../quotes.js";
import type * as requests from "../requests.js";
import type * as reviews from "../reviews.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  admin: typeof admin;
  billing: typeof billing;
  categories: typeof categories;
  conversations: typeof conversations;
  "dev/seed": typeof dev_seed;
  "dev/seedImages": typeof dev_seedImages;
  files: typeof files;
  http: typeof http;
  "lib/auth": typeof lib_auth;
  messages: typeof messages;
  notifications: typeof notifications;
  providers: typeof providers;
  quotes: typeof quotes;
  requests: typeof requests;
  reviews: typeof reviews;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
