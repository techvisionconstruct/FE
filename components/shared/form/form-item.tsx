"use client"

import * as React from "react"

import { cn } from "@/lib/utils"
import { FormItemContext } from "@/components/contexts/form-contexts"

export function FormItem({ className, ...props }: React.ComponentProps<"div">) {
  const id = React.useId()

  return (
    <FormItemContext.Provider value={{ id }}>
      <div data-slot="form-item" className={cn("grid gap-2", className)} {...props} />
    </FormItemContext.Provider>
  )
}
