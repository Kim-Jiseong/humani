'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Menu, MessageSquare, Plus } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { createNewChatAction } from '@/app/actions/chats'
import type { ChatRow, ChatUser } from '@/lib/db/chats'
import { SignOutButton } from './sign-out-button'

function formatRelative(iso: string): string {
  const diffSec = Math.max(
    0,
    Math.floor((Date.now() - new Date(iso).getTime()) / 1000),
  )
  if (diffSec < 60) return '방금'
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}분`
  if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}시간`
  return `${Math.floor(diffSec / 86400)}일`
}

export function ChatSidebar({
  chats,
  currentChatId,
  user,
}: {
  chats: ChatRow[]
  currentChatId: string
  user: ChatUser
}) {
  const [open, setOpen] = useState(false)

  const displayName = user.name || user.email
  const initial = (user.name?.[0] || user.email[0] || '?').toUpperCase()

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger
        render={
          <Button variant="ghost" size="icon-sm" aria-label="메뉴 열기">
            <Menu className="size-4" />
          </Button>
        }
      />
      <SheetContent side="left" className="flex w-72 flex-col p-0 sm:max-w-xs">
        <SheetHeader className="border-b px-4 py-3">
          <SheetTitle className="text-base">Humani</SheetTitle>
        </SheetHeader>

        <div className="p-3">
          <form action={createNewChatAction}>
            <Button
              type="submit"
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2"
              onClick={() => setOpen(false)}
            >
              <Plus className="size-4" />새 채팅
            </Button>
          </form>
        </div>

        <ScrollArea className="flex-1">
          {chats.length === 0 ? (
            <p className="px-4 py-8 text-center text-xs text-muted-foreground">
              아직 채팅이 없습니다.
            </p>
          ) : (
            <ul className="flex flex-col gap-0.5 px-2 pb-3">
              {chats.map(chat => (
                <li key={chat.id}>
                  <Link
                    href={`/chats/${chat.id}`}
                    onClick={() => setOpen(false)}
                    className={cn(
                      'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors hover:bg-muted',
                      chat.id === currentChatId && 'bg-muted font-medium',
                    )}
                  >
                    <MessageSquare className="size-3.5 shrink-0 text-muted-foreground" />
                    <span className="flex-1 truncate">{chat.title}</span>
                    <time className="shrink-0 text-[10px] text-muted-foreground">
                      {formatRelative(chat.updated_at)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>

        <div className="shrink-0 border-t p-3">
          <div className="mb-2 flex items-center gap-3 px-1 py-1">
            <Avatar className="size-9">
              {user.avatarUrl && (
                <AvatarImage src={user.avatarUrl} alt={displayName} />
              )}
              <AvatarFallback className="text-xs">{initial}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{displayName}</p>
              {user.name && (
                <p className="truncate text-xs text-muted-foreground">
                  {user.email}
                </p>
              )}
            </div>
          </div>
          <SignOutButton />
        </div>
      </SheetContent>
    </Sheet>
  )
}
