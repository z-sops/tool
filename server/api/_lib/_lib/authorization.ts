import { getDb } from '../../../../src/server/db/client';
import { workspaces, workspaceMembers, projects, type Workspace, type WorkspaceMember, type Project } from '../../../../src/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { VercelRequest } from '@vercel/node';
import { extractSessionToken } from './auth';

// Re-export so existing imports from './authorization' keep working.
export { extractSessionToken };

export type UserRole = 'owner' | 'admin' | 'member';

export interface AuthContext {
  userId: string;
  workspaceId?: string;
  role?: UserRole;
}

export async function getUserWorkspaceRole(userId: string, workspaceId: string): Promise<UserRole | null> {
  const db = getDb();
  const [member] = await db
    .select({ role: workspaceMembers.role })
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId)
    ))
    .limit(1);
  return member?.role ?? null;
}

export async function isWorkspaceOwner(userId: string, workspaceId: string): Promise<boolean> {
  const db = getDb();
  const [workspace] = await db
    .select({ ownerId: workspaces.ownerId })
    .from(workspaces)
    .where(eq(workspaces.id, workspaceId))
    .limit(1);
  return workspace?.ownerId === userId;
}

export async function isWorkspaceMember(userId: string, workspaceId: string): Promise<boolean> {
  const role = await getUserWorkspaceRole(userId, workspaceId);
  return role !== null;
}

export async function requireWorkspaceAccess(
  userId: string,
  workspaceId: string,
  requiredRoles: UserRole[] = ['owner', 'admin', 'member']
): Promise<WorkspaceMember> {
  const db = getDb();
  const [member] = await db
    .select()
    .from(workspaceMembers)
    .where(and(
      eq(workspaceMembers.userId, userId),
      eq(workspaceMembers.workspaceId, workspaceId)
    ))
    .limit(1);
  
  if (!member || !requiredRoles.includes(member.role)) {
    throw new Error('Insufficient workspace permissions');
  }
  return member;
}

export async function requireWorkspaceOwnership(userId: string, workspaceId: string): Promise<Workspace> {
  const db = getDb();
  const [workspace] = await db
    .select()
    .from(workspaces)
    .where(and(
      eq(workspaces.id, workspaceId),
      eq(workspaces.ownerId, userId)
    ))
    .limit(1);
  
  if (!workspace) {
    throw new Error('Workspace not found or access denied');
  }
  return workspace;
}

export async function requireProjectAccess(userId: string, projectId: string): Promise<Project> {
  const db = getDb();
  const [project] = await db
    .select()
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1);
  
  if (!project) {
    throw new Error('Project not found');
  }
  
  const hasAccess = await isWorkspaceMember(userId, project.workspaceId);
  if (!hasAccess) {
    throw new Error('Project access denied');
  }
  
  return project;
}

export async function requireProjectWorkspaceAccess(
  userId: string,
  projectId: string,
  requiredRoles: UserRole[] = ['owner', 'admin', 'member']
): Promise<{ project: Project; member: WorkspaceMember }> {
  const project = await requireProjectAccess(userId, projectId);
  const member = await requireWorkspaceAccess(userId, project.workspaceId, requiredRoles);
  return { project, member };
}

export async function getAuthContext(req: VercelRequest): Promise<AuthContext | null> {
  const token = extractSessionToken(req);
  if (!token) return null;
  
  const { validateSession } = await import('./auth');
  const sessionData = await validateSession(token);
  if (!sessionData) return null;
  
  return {
    userId: sessionData.user.id,
  };
}

export async function getAuthContextWithWorkspace(req: VercelRequest, workspaceId: string): Promise<AuthContext | null> {
  const token = extractSessionToken(req);
  if (!token) return null;
  
  const { validateSession } = await import('./auth');
  const sessionData = await validateSession(token);
  if (!sessionData) return null;
  
  const role = await getUserWorkspaceRole(sessionData.user.id, workspaceId);
  if (!role) return null;
  
  return {
    userId: sessionData.user.id,
    workspaceId,
    role,
  };
}