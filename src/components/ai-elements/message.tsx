"use client"

import type { HTMLAttributes } from "react"
import { memo } from "react"
import Markdown from "markdown-to-jsx"

import { cn } from "@/lib/utils"

export type MessageRole = "user" | "assistant" | "system"

export type MessageProps = HTMLAttributes<HTMLDivElement> & {
  from: MessageRole
}

export const Message = ({ className, from, ...props }: MessageProps) => (
  <div
    className={cn(
      "group flex w-full max-w-[95%] flex-col gap-2",
      from === "user" ? "is-user ml-auto items-end" : "is-assistant",
      className
    )}
    {...props}
  />
)

export type MessageContentProps = HTMLAttributes<HTMLDivElement>

export const MessageContent = ({
  children,
  className,
  ...props
}: MessageContentProps) => (
  <div
    className={cn(
      "flex w-fit max-w-full flex-col gap-2 overflow-hidden text-sm",
      "group-[.is-user]:rounded-2xl group-[.is-user]:rounded-br-sm group-[.is-user]:bg-secondary group-[.is-user]:px-3.5 group-[.is-user]:py-2 group-[.is-user]:text-secondary-foreground",
      className
    )}
    {...props}
  >
    {children}
  </div>
)

export type MessageResponseProps = {
  children: string
  className?: string
}

const MD_OPTIONS = {
  overrides: {
    a: {
      props: { target: "_blank", rel: "noreferrer" },
    },
  },
  forceBlock: true,
} as const

/** Renders streamed assistant markdown. Lightweight — no syntax highlighter. */
export const MessageResponse = memo(
  ({ children, className }: MessageResponseProps) => (
    <div className={cn("md-content", className)}>
      <Markdown options={MD_OPTIONS}>{children || ""}</Markdown>
    </div>
  )
)

MessageResponse.displayName = "MessageResponse"
