import { DATABASE_ID, MEMBERS_ID, WORKSPACES_ID } from "@/config"
import { createWorkspacesSchema } from "@/features/workspaces/schemas"
import { sessionMiddleware } from "@/lib/session-middleware"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { ID, Query } from "node-appwrite"
import cloudinary from "@/lib/cloudinary"
import { MemberRole } from "@/features/members/types"
import { generateInviteCode } from "@/lib/utils"

const app = new Hono()
  .get("/", sessionMiddleware, async (c) => {
    const databases = c.get("databases")
    const user = c.get("user")

    const members = await databases.listDocuments(DATABASE_ID, MEMBERS_ID, [
      Query.equal("userId", user.$id),
    ])
    if (members.total === 0) {
      return c.json({ data: { document: [], total: 0 } })
    }
    const workspaceIds = members.documents.map((member) => member.workspaceId)
    const workspaces = await databases.listDocuments(
      DATABASE_ID,
      WORKSPACES_ID,
      [Query.orderDesc("$createdAt"), Query.contains("$id", workspaceIds)]
    )
    return c.json({ data: workspaces })
  })

  .post(
    "/",
    zValidator("form", createWorkspacesSchema),
    sessionMiddleware,
    async (c) => {
      const databases = c.get("databases")
      const user = c.get("user")

      const { name, image } = c.req.valid("form")

      let imageUrl: string | undefined
      if (image instanceof File) {
        const arrayBuffer = await image.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)

        const uploadResult = await new Promise((resolve, reject) => {
          cloudinary.uploader
            .upload_stream(
              { folder: "workspaces" },
              (error: any, result: unknown) => {
                if (error) return reject(error)
                resolve(result)
              }
            )
            .end(buffer)
        })

        imageUrl = (uploadResult as any).secure_url
      }

      const workspace = await databases.createDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        ID.unique(),
        {
          name,
          userId: user.$id,
          imageUrl,
          inviteCode : generateInviteCode(6)
        }
      )

      await databases.createDocument(DATABASE_ID, MEMBERS_ID, ID.unique(), {
        userId: user.$id,
        workspaceId: workspace.$id,
        role: MemberRole.ADMIN,
      })

      return c.json({ data: workspace })
    }
  )

export default app
