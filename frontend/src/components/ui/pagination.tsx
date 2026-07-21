import * as React from "react"
import {ChevronLeftIcon, ChevronRightIcon, ChevronsLeftIcon, ChevronsRightIcon, MoreHorizontalIcon,} from "lucide-react"

import {cn} from "@/lib/utils"
import {type Button, buttonVariants} from "@/components/ui/button"

function Pagination({className, ...props}: React.ComponentProps<"nav">) {
    return (
        <nav
            role="navigation"
            aria-label="pagination"
            data-slot="pagination"
            className={cn("mx-auto flex w-full justify-center", className)}
            {...props}
        />
    )
}

function PaginationContent({className, ...props}: React.ComponentProps<"ul">) {
    return (
        <ul
            data-slot="pagination-content"
            className={cn("flex flex-row items-center gap-1", className)}
            {...props}
        />
    )
}

function PaginationItem({className, ...props}: React.ComponentProps<"li">) {
    return (
        <li data-slot="pagination-item" className={cn("", className)} {...props} />
    )
}

type PaginationLinkProps = {
    isActive?: boolean
} & Pick<React.ComponentProps<typeof Button>, "size"> &
    React.ComponentProps<"a">

function PaginationLink({
                            className,
                            isActive,
                            size = "icon",
                            ...props
                        }: PaginationLinkProps) {
    return (
        <a
            aria-current={isActive ? "page" : undefined}
            data-slot="pagination-link"
            data-active={isActive}
            className={cn(
                buttonVariants({
                    variant: isActive ? "outline" : "ghost",
                    size,
                }),
                className,
            )}
            {...props}
        />
    )
}

function PaginationPrevious({
                                className,
                                ...props
                            }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to previous page"
            size="default"
            className={cn("gap-1 px-2.5 sm:pe-4 sm:ps-3", className)}
            {...props}
        >
            <ChevronLeftIcon/>
            <span className="hidden sm:inline">上一页</span>
        </PaginationLink>
    )
}

function PaginationNext({
                            className,
                            ...props
                        }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to next page"
            size="default"
            className={cn("gap-1 px-2.5 sm:pe-3 sm:ps-4", className)}
            {...props}
        >
            <span className="hidden sm:inline">下一页</span>
            <ChevronRightIcon/>
        </PaginationLink>
    )
}

function PaginationFirst({
                             className,
                             ...props
                         }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to first page"
            size="icon"
            className={cn("gap-1", className)}
            {...props}
        >
            <ChevronsLeftIcon/>
        </PaginationLink>
    )
}

function PaginationLast({
                            className,
                            ...props
                        }: React.ComponentProps<typeof PaginationLink>) {
    return (
        <PaginationLink
            aria-label="Go to last page"
            size="icon"
            className={cn("gap-1", className)}
            {...props}
        >
            <ChevronsRightIcon/>
        </PaginationLink>
    )
}

function PaginationEllipsis({
                                className,
                                ...props
                            }: React.ComponentProps<"span">) {
    return (
        <span
            aria-hidden
            data-slot="pagination-ellipsis"
            className={cn("flex size-9 items-center justify-center", className)}
            {...props}
        >
            <MoreHorizontalIcon className="size-4"/>
            <span className="sr-only">更多页码</span>
        </span>
    )
}

export {
    Pagination,
    PaginationContent,
    PaginationLink,
    PaginationItem,
    PaginationPrevious,
    PaginationNext,
    PaginationFirst,
    PaginationLast,
    PaginationEllipsis,
}
