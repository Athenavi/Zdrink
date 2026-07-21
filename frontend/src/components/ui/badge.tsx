import {cva, type VariantProps} from "class-variance-authority"

import {cn} from "@/lib/utils"

const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap transition-colors select-none focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
    {
        variants: {
            variant: {
                default:
                    "border-transparent bg-primary text-primary-foreground shadow-xs",
                secondary:
                    "border-transparent bg-secondary text-secondary-foreground",
                destructive:
                    "border-transparent bg-destructive text-destructive-foreground shadow-xs",
                outline:
                    "border-border text-foreground dark:border-input",
                success:
                    "border-transparent bg-emerald-50 text-emerald-700 shadow-xs dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
                warning:
                    "border-transparent bg-amber-50 text-amber-700 shadow-xs dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
            },
        },
        defaultVariants: {
            variant: "default",
        },
    }
)

function Badge({
                   className,
                   variant = "default",
                   ...props
               }: React.ComponentProps<"span"> &
    VariantProps<typeof badgeVariants>) {
    return (
        <span
            data-slot="badge"
            data-variant={variant}
            className={cn(badgeVariants({variant, className}))}
            {...props}
        />
    )
}

export {Badge, badgeVariants}
