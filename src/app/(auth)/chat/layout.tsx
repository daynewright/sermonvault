"use client"

import { AvatarDropdown } from "@/components/avatar-dropdown";
import { signOut, useSession } from "next-auth/react"
import { redirect } from "next/navigation"


const ChatLayout = ({ children }: { children: React.ReactNode }) => {
  const { data: session, status } = useSession();

  const { email, image, name } = session?.user || {};

  if (status === "unauthenticated") {
    redirect("/")
  }
  return <div>
    <div className="flex justify-end m-4 ">
      <AvatarDropdown email={email} image={image} name={name} />
    </div>
    {children}
  </div>
}

export default ChatLayout