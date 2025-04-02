"use client"

import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.Root>) {
  return (
    <ScrollAreaPrimitive.Root
      data-slot="scroll-area"
      className={cn("relative", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        data-slot="scroll-area-viewport"
        className="focus-visible:ring-ring/50 size-full rounded-[inherit] transition-[color,box-shadow] outline-none focus-visible:ring-[3px] focus-visible:outline-1"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
}

function ScrollBar({
  className,
  orientation = "vertical",
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      data-slot="scroll-area-scrollbar"
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors duration-200",
        orientation === "vertical" &&
          "h-full w-1.5 border-l border-l-transparent px-[1px]",
        orientation === "horizontal" &&
          "h-1.5 flex-col border-t border-t-transparent py-[1px]",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb
        data-slot="scroll-area-thumb"
        className={cn(
          "relative flex-1 rounded-full bg-muted-foreground/20",
          "hover:bg-muted-foreground/40 active:bg-muted-foreground/50",
          "transition-colors duration-150 ease-out"
        )}
      />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

// Horizontal scrollbar component for convenience
function ScrollBarHorizontal(props: React.ComponentProps<typeof ScrollBar>) {
  return <ScrollBar orientation="horizontal" {...props} />
}

export { ScrollArea, ScrollBar, ScrollBarHorizontal }