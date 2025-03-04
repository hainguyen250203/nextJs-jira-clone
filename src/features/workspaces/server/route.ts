import { DATABASE_ID, MEMBERS_ID, WORKSPACES_ID } from "@/config"
import {
  createWorkspacesSchema,
  updateWorkspaceSchema,
} from "@/features/workspaces/schemas"
import { sessionMiddleware } from "@/lib/session-middleware"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { ID, Query } from "node-appwrite"
import cloudinary from "@/lib/cloudinary"
import { MemberRole } from "@/features/members/types"
import { generateInviteCode } from "@/lib/utils"
import { GetMember } from "@/features/members/utils"

const app = new Hono()
  .get("/", sessionMiddleware, async (c) => {
    const databases = c.get("databases")
    const user = c.get("user")
    const members = await databases.listDocuments(DATABASE_ID, MEMBERS_ID, [
      Query.equal("userId", user.$id),
    ])
    if (members.total === 0) {
      return c.json({ data: { documents: [], total: 0 } })
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
          inviteCode: generateInviteCode(6),
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

  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const databases = c.get("databases")
      const user = c.get("user")
      const { workspaceId } = c.req.param()
      const { name, image } = c.req.valid("form")
      const member = await GetMember({
        databases,
        workspaceId,
        userId: user.$id,
      })
      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      // Lấy workspace hiện tại để lấy URL ảnh cũ
      const workspaceData = await databases.getDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      )
      const oldImageUrl = workspaceData?.imageUrl
      let updateImageUrl: string | undefined

      if (image instanceof File) {
        // Xóa ảnh cũ trên Cloudinary (nếu có)
        if (oldImageUrl) {
          const publicId = oldImageUrl.split("/").pop()?.split(".")[0] // Lấy public_id từ URL ảnh
          if (publicId) {
            await cloudinary.uploader.destroy(`workspaces/${publicId}`)
          }
        }
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
        updateImageUrl = (uploadResult as any).secure_url
      }
      if (image === "undefined") {
        if (oldImageUrl) {
          const publicId = oldImageUrl.split("/").pop()?.split(".")[0] // Lấy public_id từ URL ảnh
          if (publicId) {
            await cloudinary.uploader.destroy(`workspaces/${publicId}`)
          }
        }
        updateImageUrl = ""
      }
      // Cập nhật thông tin workspace
      const workspace = await databases.updateDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
        {
          name,
          imageUrl: updateImageUrl,
        }
      )

      return c.json({ data: workspace })
    }
  )

export default app
