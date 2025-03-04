"use server"

import { DATABASE_ID, MEMBERS_ID, WORKSPACES_ID } from "@/config"
import { GetMember } from "@/features/members/utils"
import { Workspace } from "@/features/workspaces/types"
import { createSessionClient } from "@/lib/appwrite"
import { Query } from "node-appwrite"

export const getWorkspaces = async () => {
  try {
    const { databases, account } = await createSessionClient()
    const user = await account.get()
    const members = await databases.listDocuments(DATABASE_ID, MEMBERS_ID, [
      Query.equal("userId", user.$id),
    ])
    if (members.total === 0) {
      return { documents: [], total: 0 }
    }
    const workspaceIds = members.documents.map((member) => member.workspaceId)
    const workspaces = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACES_ID,
      [Query.orderDesc("$createdAt"), Query.contains("$id", workspaceIds)]
    )
    return workspaces
  } catch (error) {
    return { documents: [], total: 0 }
  }
}
interface GetWorkspaceProps {
  workspaceId: string
}
export const getWorkspace = async ({ workspaceId }: GetWorkspaceProps) => {
  try {
    const { databases, account } = await createSessionClient()
    const user = await account.get()

    const member = await GetMember({ databases, workspaceId, userId: user.$id })

    if (!member) return null

    const workspace = await databases.getDocument<Workspace>(
      DATABASE_ID,
      WORKSPACES_ID,
      workspaceId
    )
    return workspace
  } catch {
    return null
  }
}
