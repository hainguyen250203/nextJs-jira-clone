"use server"

import { AUTH_COOKIE } from "@/features/auth/constants"
import { cookies } from "next/headers"
import { Account, Client } from "node-appwrite"

export const getCurrent = async () => {
  try {
    const client = new Client()
      .setEndpoint(process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT!)
      .setProject(process.env.NEXT_PUBLIC_APPWRITE_PROJECT!)
    // Lấy session từ cookie
    const session = cookies().get(AUTH_COOKIE)
    if (!session?.value) return null
    client.setSession(session.value)
    const account = new Account(client)
    return await account.get()
  } catch (error) {
    return null
  }
}
