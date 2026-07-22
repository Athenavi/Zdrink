'use client'

import {useCallback, useEffect, useRef, useState} from 'react'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table'
import {Badge} from '@/components/ui/badge'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    Pagination,
    PaginationContent,
    PaginationEllipsis,
    PaginationItem,
    PaginationLink,
    PaginationNext,
    PaginationPrevious,
} from '@/components/ui/pagination'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {formatPrice} from '@/lib/utils'
import apiClient from '@/lib/api'
import {Copy, Edit, ImageIcon, Layers, Package, Plus, Search, Trash2,} from 'lucide-react'
import {toast} from 'sonner'

// ── 类型 ──

interface Category {
    id: number
    name: string
    description?: string
    product_count?: number
}

interface SKU {
    id: number
    sku_name?: string
    name?: string
    price: number | string
    stock?: number
    stock_quantity?: number
    specifications?: Record<string, unknown>
    is_active?: boolean
}

interface ProductItem {
    id: number
    name: string
    description?: string
    image?: string
    main_image?: string
    base_price?: number | string
    price?: number | string
    category?: number
    category_name?: string
    stock?: number
    is_available: boolean
    skus?: SKU[]
    sales_count?: number
}

interface PaginatedResponse<T> {
    count: number
    next?: string | null
    previous?: string | null
    results: T[]
    data?: T[]
}

// ── 辅助函数 ──

const getStockCount = (product: ProductItem): number => {
    if (product.stock !== undefined) return product.stock
    if (product.skus && product.skus.length > 0) {
        return product.skus.reduce((sum, sku) => sum + (sku.stock ?? sku.stock_quantity ?? 0), 0)
    }
    return 0
}

const getSkuCount = (product: ProductItem): number => {
    return product.skus?.length ?? 0
}

// ── 主页面组件 ──

export default function ProductsPage() {
    // 商品列表状态
    const [products, setProducts] = useState<ProductItem[]>([])
    const [totalCount, setTotalCount] = useState(0)
    const [loading, setLoading] = useState(true)

    // 筛选状态
    const [search, setSearch] = useState('')
    const [selectedCategory, setSelectedCategory] = useState('')
    const [statusFilter, setStatusFilter] = useState('')
    const [page, setPage] = useState(1)
    const pageSize = 15

    // 分类列表
    const [categories, setCategories] = useState<Category[]>([])

    // 分类管理 Dialog
    const [catDialogOpen, setCatDialogOpen] = useState(false)
    const [catEditTarget, setCatEditTarget] = useState<Category | null>(null)
    const [catFormName, setCatFormName] = useState('')
    const [catFormDesc, setCatFormDesc] = useState('')
    const [catSaving, setCatSaving] = useState(false)

    // 编辑商品 Dialog
    const [editDialogOpen, setEditDialogOpen] = useState(false)
    const [editProduct, setEditProduct] = useState<ProductItem | null>(null)

    // 调整库存 Dialog
    const [stockDialogOpen, setStockDialogOpen] = useState(false)
    const [stockProduct, setStockProduct] = useState<ProductItem | null>(null)
    const [stockSkuId, setStockSkuId] = useState<number | null>(null)
    const [stockQuantity, setStockQuantity] = useState(0)
    const [stockReason, setStockReason] = useState('')

    // 删除分类确认
    const [deletingCatId, setDeletingCatId] = useState<number | null>(null)

    const searchTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

    // ── 数据获取 ──

    const fetchCategories = useCallback(async () => {
        try {
            const res = await apiClient.get('/products/categories/')
            const data = res.data
            // 兼容多种返回格式
            const list = data?.results ?? data?.data ?? (Array.isArray(data) ? data : [data])
            setCategories(Array.isArray(list) ? list : [])
        } catch {
            toast.error('获取分类列表失败')
        }
    }, [])

    const fetchProducts = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string | number> = {
                page,
                page_size: pageSize,
            }
            if (search.trim()) params.search = search.trim()
            if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory
            if (statusFilter && statusFilter !== 'all') params.status = statusFilter

            const res = await apiClient.get('/products/products/', {params})
            const data = res.data
            const list = data?.results ?? data?.data ?? (Array.isArray(data) ? data : [])
            setProducts(Array.isArray(list) ? list : [])
            setTotalCount(data?.count ?? list?.length ?? 0)
        } catch {
            toast.error('获取商品列表失败')
            setProducts([])
            setTotalCount(0)
        } finally {
            setLoading(false)
        }
    }, [page, search, selectedCategory, statusFilter])

    // 初始加载
    useEffect(() => {
        fetchCategories()
    }, [fetchCategories])

    useEffect(() => {
        fetchProducts()
    }, [fetchProducts])

    // 搜索防抖
    const handleSearchChange = (value: string) => {
        setSearch(value)
        if (searchTimer.current) clearTimeout(searchTimer.current)
        searchTimer.current = setTimeout(() => {
            setPage(1)
        }, 400)
    }

    // ── 分页 ──

    const totalPages = Math.ceil(totalCount / pageSize)

    const paginationItems = () => {
        const items: React.ReactNode[] = []
        const maxVisible = 5
        let start = Math.max(1, page - Math.floor(maxVisible / 2))
        const end = Math.min(totalPages, start + maxVisible - 1)
        if (end - start + 1 < maxVisible) {
            start = Math.max(1, end - maxVisible + 1)
        }

        if (page > 1) {
            items.push(
                <PaginationItem key="prev">
                    <PaginationPrevious href="#" onClick={(e) => {
                        e.preventDefault()
                        setPage(page - 1)
                    }}/>
                </PaginationItem>,
            )
        }

        if (start > 1) {
            items.push(
                <PaginationItem key="first">
                    <PaginationLink href="#" onClick={(e) => {
                        e.preventDefault()
                        setPage(1)
                    }}>1</PaginationLink>
                </PaginationItem>,
            )
            if (start > 2) items.push(<PaginationItem key="ellipsis-start"><PaginationEllipsis/></PaginationItem>)
        }

        for (let i = start; i <= end; i++) {
            items.push(
                <PaginationItem key={i}>
                    <PaginationLink
                        href="#"
                        isActive={i === page}
                        onClick={(e) => {
                            e.preventDefault()
                            setPage(i)
                        }}
                    >
                        {i}
                    </PaginationLink>
                </PaginationItem>,
            )
        }

        if (end < totalPages) {
            if (end < totalPages - 1) items.push(<PaginationItem
                key="ellipsis-end"><PaginationEllipsis/></PaginationItem>)
            items.push(
                <PaginationItem key="last">
                    <PaginationLink href="#" onClick={(e) => {
                        e.preventDefault()
                        setPage(totalPages)
                    }}>{totalPages}</PaginationLink>
                </PaginationItem>,
            )
        }

        if (page < totalPages) {
            items.push(
                <PaginationItem key="next">
                    <PaginationNext href="#" onClick={(e) => {
                        e.preventDefault()
                        setPage(page + 1)
                    }}/>
                </PaginationItem>,
            )
        }

        return items
    }

    // ── 分类管理 ──

    const openAddCategory = () => {
        setCatEditTarget(null)
        setCatFormName('')
        setCatFormDesc('')
    }

    const openEditCategory = (cat: Category) => {
        setCatEditTarget(cat)
        setCatFormName(cat.name)
        setCatFormDesc(cat.description ?? '')
    }

    const saveCategory = async () => {
        if (!catFormName.trim()) return
        setCatSaving(true)
        try {
            if (catEditTarget) {
                await apiClient.patch(`/products/categories/${catEditTarget.id}/`, {
                    name: catFormName.trim(),
                    description: catFormDesc.trim(),
                })
            } else {
                await apiClient.post('/products/categories/', {
                    name: catFormName.trim(),
                    description: catFormDesc.trim(),
                })
            }
            setCatEditTarget(null)
            setCatFormName('')
            setCatFormDesc('')
            await fetchCategories()
        } catch {
            toast.error('保存分类失败')
        } finally {
            setCatSaving(false)
        }
    }

    const deleteCategory = async (id: number) => {
        setDeletingCatId(id)
        try {
            await apiClient.delete(`/products/categories/${id}/`)
            await fetchCategories()
        } catch {
            toast.error('删除分类失败')
        } finally {
            setDeletingCatId(null)
        }
    }

    // ── 商品操作 ──

    const handleEdit = (product: ProductItem) => {
        setEditProduct(product)
        setEditDialogOpen(true)
    }

    const handleCopy = async (product: ProductItem) => {
        try {
            await apiClient.post('/products/products/', {
                name: `${product.name} (复制)`,
                base_price: product.base_price ?? product.price,
                category: product.category,
                is_available: false,
            })
            await fetchProducts()
        } catch {
            toast.error('复制商品失败')
        }
    }

    const openStockDialog = (product: ProductItem) => {
        setStockProduct(product)
        setStockSkuId(product.skus?.[0]?.id ?? null)
        setStockQuantity(0)
        setStockReason('')
        setStockDialogOpen(true)
    }

    const submitStockAdjust = async () => {
        if (!stockSkuId || stockQuantity === 0) return
        try {
            await apiClient.post(`/products/skus/${stockSkuId}/adjust_stock/`, {
                quantity: stockQuantity,
                reason: stockReason.trim() || undefined,
            })
            setStockDialogOpen(false)
            await fetchProducts()
        } catch {
            toast.error('调整库存失败')
        }
    }

    // ── 状态 Badge ──

    const statusBadge = (isAvailable: boolean) => {
        return isAvailable
            ? <Badge variant="success">上架</Badge>
            : <Badge variant="secondary">下架</Badge>
    }

    // ── 渲染 ──

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-2xl font-semibold">商品管理</h1>
                <p className="text-sm text-muted-foreground mt-1">管理店铺所有商品信息、库存和上架状态</p>
            </div>

            {/* 操作栏 */}
            <Card>
                <CardContent className="pt-4">
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                        {/* 搜索框 */}
                        <div className="relative w-full sm:w-48">
                            <Search
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                                size={16}
                            />
                            <Input
                                placeholder="搜索商品名称..."
                                className="pl-8"
                                defaultValue={search}
                                onChange={(e) => handleSearchChange(e.target.value)}
                            />
                        </div>

                        {/* 分类筛选 */}
                        <Select value={selectedCategory} onValueChange={(v) => {
                            setSelectedCategory(v)
                            setPage(1)
                        }}>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="全部分类"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部分类</SelectItem>
                                {categories.map((cat) => (
                                    <SelectItem key={cat.id} value={String(cat.id)}>
                                        {cat.name}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>

                        {/* 状态筛选 */}
                        <Select value={statusFilter} onValueChange={(v) => {
                            setStatusFilter(v)
                            setPage(1)
                        }}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="全部状态"/>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">全部状态</SelectItem>
                                <SelectItem value="available">上架</SelectItem>
                                <SelectItem value="unavailable">下架</SelectItem>
                            </SelectContent>
                        </Select>

                        <div className="flex-1"/>

                        {/* 分类管理按钮 */}
                        <Button
                            variant="outline"
                            className="sm:text-sm text-xs"
                            onClick={() => {
                                openAddCategory()
                                setCatDialogOpen(true)
                            }}
                        >
                            <Layers size={16}/>
                            分类管理
                        </Button>

                        {/* 新增商品按钮 */}
                        <Button
                            className="sm:text-sm text-xs"
                            onClick={() => {/* 后续实现新增商品页面/弹窗 */
                            }}>
                            <Plus size={16}/>
                            新增商品
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* 商品列表 */}
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                        <span>商品列表</span>
                        <span className="text-sm font-normal text-muted-foreground">
                            共 {totalCount} 件商品
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[60px]">图片</TableHead>
                                    <TableHead>商品名称</TableHead>
                                    <TableHead className="w-[100px]">分类</TableHead>
                                    <TableHead className="w-[100px] text-right">基础价格</TableHead>
                                    <TableHead className="w-[70px] text-center">SKU 数</TableHead>
                                    <TableHead className="w-[80px] text-center">库存</TableHead>
                                    <TableHead className="w-[80px] text-center">状态</TableHead>
                                    <TableHead className="w-[180px] text-right">操作</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            加载中...
                                        </TableCell>
                                    </TableRow>
                                ) : products.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="h-32 text-center text-muted-foreground">
                                            暂无商品数据
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    products.map((product) => (
                                        <TableRow key={product.id}>
                                            {/* 缩略图 */}
                                            <TableCell>
                                                <div
                                                    className="flex size-10 items-center justify-center rounded-md border bg-muted overflow-hidden">
                                                    {product.main_image || product.image ? (
                                                        <img
                                                            src={product.main_image || product.image}
                                                            alt={product.name}
                                                            className="size-full object-cover"
                                                        />
                                                    ) : (
                                                        <ImageIcon size={18} className="text-muted-foreground"/>
                                                    )}
                                                </div>
                                            </TableCell>

                                            {/* 商品名称 */}
                                            <TableCell className="font-medium max-w-[200px] truncate">
                                                {product.name}
                                            </TableCell>

                                            {/* 分类 */}
                                            <TableCell className="text-muted-foreground">
                                                {product.category_name ?? (() => {
                                                    const cat = categories.find(c => c.id === product.category)
                                                    return cat?.name ?? '—'
                                                })()}
                                            </TableCell>

                                            {/* 基础价格 */}
                                            <TableCell className="text-right">
                                                {formatPrice(product.base_price ?? product.price ?? 0)}
                                            </TableCell>

                                            {/* SKU 数 */}
                                            <TableCell className="text-center">
                                                {getSkuCount(product)}
                                            </TableCell>

                                            {/* 库存 */}
                                            <TableCell className="text-center">
                                            <span
                                                className={getStockCount(product) <= 0 ? 'text-destructive font-medium' : ''}>
                                                {getStockCount(product)}
                                            </span>
                                            </TableCell>

                                            {/* 状态 */}
                                            <TableCell className="text-center">
                                                {statusBadge(product.is_available)}
                                            </TableCell>

                                            {/* 操作按钮 */}
                                            <TableCell>
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="编辑"
                                                        onClick={() => handleEdit(product)}
                                                    >
                                                        <Edit size={15}/>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="复制"
                                                        onClick={() => handleCopy(product)}
                                                    >
                                                        <Copy size={15}/>
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        title="调整库存"
                                                        onClick={() => openStockDialog(product)}
                                                    >
                                                        <Package size={15}/>
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

                {/* 分页 */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-center border-t px-4 py-3">
                        <Pagination>
                            <PaginationContent>
                                {paginationItems()}
                            </PaginationContent>
                        </Pagination>
                        <span className="ml-4 text-sm text-muted-foreground whitespace-nowrap">
                            {totalCount} 条 / 第 {page} 页
                        </span>
                    </div>
                )}
            </Card>

            {/* ── 编辑商品 Dialog ── */}
            <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
                <DialogContent className="w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>编辑商品</DialogTitle>
                        <DialogDescription>
                            修改商品基本信息
                        </DialogDescription>
                    </DialogHeader>

                    {editProduct && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center gap-4">
                                <div
                                    className="flex size-16 items-center justify-center rounded-md border bg-muted overflow-hidden shrink-0">
                                    {editProduct.main_image || editProduct.image ? (
                                        <img
                                            src={editProduct.main_image || editProduct.image}
                                            alt={editProduct.name}
                                            className="size-full object-cover"
                                        />
                                    ) : (
                                        <ImageIcon size={24} className="text-muted-foreground"/>
                                    )}
                                </div>
                                <div>
                                    <p className="font-medium">{editProduct.name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        ID: {editProduct.id}
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-sm font-medium mb-1 block">基础价格</label>
                                    <p className="text-lg font-semibold">
                                        {formatPrice(editProduct.base_price ?? editProduct.price ?? 0)}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">状态</label>
                                    <div>{statusBadge(editProduct.is_available)}</div>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">分类</label>
                                    <p className="text-sm text-muted-foreground">
                                        {editProduct.category_name ?? '—'}
                                    </p>
                                </div>
                                <div>
                                    <label className="text-sm font-medium mb-1 block">库存</label>
                                    <p className="text-sm text-muted-foreground">{getStockCount(editProduct)}</p>
                                </div>
                            </div>

                            {editProduct.skus && editProduct.skus.length > 0 && (
                                <div>
                                    <label className="text-sm font-medium mb-2 block">SKU 列表</label>
                                    <div className="rounded-md border divide-y text-sm">
                                        {editProduct.skus.map((sku) => (
                                            <div key={sku.id}
                                                 className="flex items-center justify-between px-3 py-2">
                                                <span>{sku.sku_name ?? sku.name ?? `SKU #${sku.id}`}</span>
                                                <span className="text-muted-foreground">
                                                    {formatPrice(sku.price)} / 库存: {sku.stock ?? sku.stock_quantity ?? 0}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">关闭</Button>
                        </DialogClose>
                        <Button onClick={() => {
                            // 后续可跳转到完整编辑页面
                            setEditDialogOpen(false)
                        }}>
                            保存修改
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── 调整库存 Dialog ── */}
            <Dialog open={stockDialogOpen} onOpenChange={setStockDialogOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle>调整库存</DialogTitle>
                        <DialogDescription>
                            {stockProduct ? `商品：${stockProduct.name}` : ''}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        {/* SKU 选择 */}
                        {stockProduct && (stockProduct.skus?.length ?? 0) > 1 && (
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">选择 SKU</label>
                                <Select
                                    value={String(stockSkuId ?? '')}
                                    onValueChange={(v) => setStockSkuId(Number(v))}
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="请选择 SKU"/>
                                    </SelectTrigger>
                                    <SelectContent>
                                        {stockProduct.skus?.map((sku) => (
                                            <SelectItem key={sku.id} value={String(sku.id)}>
                                                {sku.sku_name ?? sku.name ?? `SKU #${sku.id}`}
                                                {' '}(库存: {sku.stock ?? sku.stock_quantity ?? 0})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        {/* 调整数量 */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">
                                调整数量
                                <span className="text-xs text-muted-foreground ml-1">（正数增加，负数减少）</span>
                            </label>
                            <Input
                                type="number"
                                value={stockQuantity}
                                onChange={(e) => setStockQuantity(Number(e.target.value))}
                                placeholder="例如：10 或 -5"
                            />
                        </div>

                        {/* 调整原因 */}
                        <div className="space-y-1.5">
                            <label className="text-sm font-medium">调整原因</label>
                            <Input
                                value={stockReason}
                                onChange={(e) => setStockReason(e.target.value)}
                                placeholder="如：进货、退货、盘点等"
                            />
                        </div>
                    </div>

                    <DialogFooter>
                        <DialogClose asChild>
                            <Button variant="outline">取消</Button>
                        </DialogClose>
                        <Button
                            onClick={submitStockAdjust}
                            disabled={!stockSkuId || stockQuantity === 0}
                        >
                            确认调整
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── 分类管理 Dialog ── */}
            <Dialog open={catDialogOpen} onOpenChange={(open) => {
                setCatDialogOpen(open)
                if (!open) {
                    setCatEditTarget(null)
                    setCatFormName('')
                    setCatFormDesc('')
                }
            }}>
                <DialogContent className="w-[95vw] sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>分类管理</DialogTitle>
                        <DialogDescription>
                            添加、编辑或删除商品分类
                        </DialogDescription>
                    </DialogHeader>

                    <Tabs defaultValue="list">
                        <TabsList className="grid w-full grid-cols-1 sm:grid-cols-2">
                            <TabsTrigger value="list">分类列表</TabsTrigger>
                            <TabsTrigger value="form">
                                {catEditTarget ? '编辑分类' : '新增分类'}
                            </TabsTrigger>
                        </TabsList>

                        {/* 分类列表 */}
                        <TabsContent value="list" className="space-y-2">
                            {categories.length === 0 ? (
                                <p className="text-sm text-muted-foreground py-4 text-center">
                                    暂无分类，请先添加
                                </p>
                            ) : (
                                categories.map((cat) => (
                                    <div
                                        key={cat.id}
                                        className="flex items-center justify-between rounded-lg border px-3 py-2.5 text-sm"
                                    >
                                        <div className="flex items-center gap-2 min-w-0">
                                            <span className="font-medium truncate">{cat.name}</span>
                                            {cat.product_count !== undefined && (
                                                <span className="text-xs text-muted-foreground shrink-0">
                                                    ({cat.product_count} 件商品)
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                onClick={() => openEditCategory(cat)}
                                                title="编辑"
                                            >
                                                <Edit size={13}/>
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon-xs"
                                                onClick={() => deleteCategory(cat.id)}
                                                disabled={deletingCatId === cat.id}
                                                title="删除"
                                                className="text-destructive hover:text-destructive"
                                            >
                                                <Trash2 size={13}/>
                                            </Button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </TabsContent>

                        {/* 新增/编辑分类表单 */}
                        <TabsContent value="form" className="space-y-4">
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">分类名称</label>
                                <Input
                                    value={catFormName}
                                    onChange={(e) => setCatFormName(e.target.value)}
                                    placeholder="请输入分类名称"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-sm font-medium">描述（选填）</label>
                                <Input
                                    value={catFormDesc}
                                    onChange={(e) => setCatFormDesc(e.target.value)}
                                    placeholder="分类描述"
                                />
                            </div>
                            <div className="flex gap-2 justify-end">
                                <Button
                                    variant="outline"
                                    onClick={() => {
                                        setCatEditTarget(null)
                                        setCatFormName('')
                                        setCatFormDesc('')
                                    }}
                                >
                                    重置
                                </Button>
                                <Button
                                    onClick={saveCategory}
                                    disabled={!catFormName.trim() || catSaving}
                                >
                                    {catSaving ? '保存中...' : catEditTarget ? '保存修改' : '添加分类'}
                                </Button>
                            </div>
                        </TabsContent>
                    </Tabs>

                    <DialogFooter className="border-t pt-4">
                        <DialogClose asChild>
                            <Button variant="outline">关闭</Button>
                        </DialogClose>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}
