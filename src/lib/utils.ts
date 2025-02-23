import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function generateInviteCode(length: number) {
  const characters = "q558o2AQy2vSBLAwE0gv4DPVwI9P5NmU7mPrrZpj0du57i0rALOWCnb67qmMRAonUJO88QFOSMG2uGK06snXyyY0ykESdEHLTlF4tNjER27eW0FiPe2XpgbkoRTcAQlQSsdNI1Oy3c0nGYzj400Aml"
  let result = ""
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length))
  }
  console.log("🚀 ~ generateInviteCode ~ result:", result)
  return result
}
