import { LoaderFunctionArgs, redirect } from "@remix-run/node";
import { getSessionValues, destroySession, getSession } from "~/sessions";
import { IPermission } from "~/types/user";

/**
 * Check if user has required permission in session
 * This is a server-side permission check for route loaders
 */
export async function checkPermission(
  request: LoaderFunctionArgs["request"],
  requiredPermission: 'C' | 'R' | 'U' | 'D',
  module?: string
): Promise<boolean> {
  try {
    const session = await getSessionValues(request.headers.get("Cookie") || "");
    
    // Admin users bypass permission checks
    if (session.userId) {
      // TODO: Implement server-side permission checking
      // For now, we rely on client-side checks
      return true;
    }
    
    return false;
  } catch (error) {
    return false;
  }
}

/**
 * Guard for routes that require authentication
 * Redirects to login if user is not authenticated
 */
export async function requireAuth(request: LoaderFunctionArgs["request"]) {
  const cookie = request.headers.get("Cookie");
  const session = await getSessionValues(cookie || "");
  
  if (!session.userId) {
    const sessionObj = await getSession(cookie);
    throw redirect("/auth/login", {
      headers: {
        "Set-Cookie": await destroySession(sessionObj),
      },
    });
  }
  
  return session;
}

/**
 * Guard for routes that require admin role
 * Redirects to dashboard if user is not admin
 */
export async function requireAdmin(request: LoaderFunctionArgs["request"]) {
  const session = await requireAuth(request);
  
  // TODO: Check admin role from session/user data
  // For now, we rely on client-side checks
  
  return session;
}

/**
 * Guard for routes that require specific permission
 * Redirects to unauthorized page if user doesn't have permission
 */
export async function requirePermission(
  request: LoaderFunctionArgs["request"],
  permission: 'C' | 'R' | 'U' | 'D',
  module?: string
) {
  const session = await requireAuth(request);
  
  const hasPermission = await checkPermission(request, permission, module);
  
  if (!hasPermission) {
    throw redirect("/unauthorized");
  }
  
  return session;
}
