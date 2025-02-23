import { DATABASE_ID, WORKSPACES_ID } from "@/config"
import { createWorkspacesSchema } from "@/features/workspaces/schemas"
import { sessionMiddleware } from "@/lib/session-middleware"
import { zValidator } from "@hono/zod-validator"
import { Hono } from "hono"
import { ID } from "node-appwrite"
import cloudinary from "@/lib/cloudinary"

const app = new Hono()
  .get("/", sessionMiddleware, async (c) => {
    const databases = c.get("databases")
    const user = c.get("user")
    const workspaces = await databases.listDocuments(DATABASE_ID, WORKSPACES_ID)
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
        }
      )

      return c.json({ data: workspace })
    }
  )

export default app
