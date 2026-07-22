'use client'

import {toast} from 'sonner'
import {useCallback, useEffect, useState} from 'react'
import {Card, CardContent} from '@/components/ui/card'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table'
import {Badge} from '@/components/ui/badge'
import {Switch} from '@/components/ui/switch'
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {formatPrice} from '@/lib/utils'
import apiClient from '@/lib/api'
import {Edit, Plus, Search, Trash2} from 'lucide-react'
import {Label} from '@/components/ui/label'

// ── 类型 ──

interface Coupon {
    id: number
    name: string
    code: string
    coupon_type: 'percentage' | 'fixed' | 'shipping'
    value: number | string
    min_amount: number | string
    max_count: number
    used_count: number
    valid_from: string
    valid_until: string
    is_active: boolean
}

interface Promotion {
    id: number
    name: string
    promo_type: 'amount_discount' | 'percentage_discount' | 'buy_x_get_y' | 'flash_sale'
    condition: string
    discount_value: number | string
    start_date: string
    end_date: string
    is_active: boolean
}

interface PaginatedResponse<T> {
    count: number
    next?: string | null
    previous?: string | null
    results: T[]
    data?: T[]
}

// ── 常量 ──

const COUPON_TYPE_LABEL: Record<string, string> = {
    percentage: '百分比折扣',
    fixed: '固定金额',
    shipping: '免运费',
}

const PROMO_TYPE_LABEL: Record<string, string> = {
    amount_discount: '满减',
    percentage_discount: '百分比折扣',
    buy_x_get_y: '买赠',
    flash_sale: '限时抢购',
}

// ── 辅助函数 ──

function formatDate(iso?: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function formatDateTime(iso?: string): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function toNumber(val: number | string | undefined | null): number {
    if (val == null) return 0
    return typeof val === 'string' ? parseFloat(val) : val
}

// ── 优惠券 Tab ──

function CouponsTab() {
    const [coupons, setCoupons] = useState<Coupon[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Dialog
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Coupon | null>(null)
    const [saving, setSaving] = useState(false)

    // Form
    const [formName, setFormName] = useState('')
    const [formCode, setFormCode] = useState('')
    const [formType, setFormType] = useState<string>('percentage')
    const [formValue, setFormValue] = useState('')
    const [formMinAmount, setFormMinAmount] = useState('')
    const [formMaxCount, setFormMaxCount] = useState('')
    const [formValidFrom, setFormValidFrom] = useState('')
    const [formValidUntil, setFormValidUntil] = useState('')
    const [formActive, setFormActive] = useState(true)

    const [deletingId, setDeletingId] = useState<number | null>(null)

    const fetchCoupons = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string | number> = {}
            if (search.trim()) params.search = search.trim()
            const res = await apiClient.get('/promotions/coupons/', {params})
            const data = res.data
            const list = data?.results ?? data?.data ?? (Array.isArray(data) ? data : [])
            setCoupons(Array.isArray(list) ? list : [])
        } catch {
            setCoupons([])
            toast.error('操作失败')
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => {
        fetchCoupons()
    }, [fetchCoupons])

    const resetForm = () => {
        setFormName('')
        setFormCode('')
        setFormType('percentage')
        setFormValue('')
        setFormMinAmount('')
        setFormMaxCount('')
        setFormValidFrom('')
        setFormValidUntil('')
        setFormActive(true)
    }

    const openAdd = () => {
        setEditTarget(null)
        resetForm()
        setDialogOpen(true)
    }

    const openEdit = (coupon: Coupon) => {
        setEditTarget(coupon)
        setFormName(coupon.name)
        setFormCode(coupon.code)
        setFormType(coupon.coupon_type)
        setFormValue(String(toNumber(coupon.value)))
        setFormMinAmount(String(toNumber(coupon.min_amount)))
        setFormMaxCount(String(coupon.max_count))
        setFormValidFrom(coupon.valid_from ? coupon.valid_from.slice(0, 16) : '')
        setFormValidUntil(coupon.valid_until ? coupon.valid_until.slice(0, 16) : '')
        setFormActive(coupon.is_active)
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formName.trim() || !formCode.trim() || !formValue) return
        setSaving(true)
        try {
            const payload = {
                name: formName.trim(),
                code: formCode.trim(),
                coupon_type: formType,
                value: parseFloat(formValue),
                min_amount: formMinAmount ? parseFloat(formMinAmount) : 0,
                max_count: formMaxCount ? parseInt(formMaxCount, 10) : 0,
                valid_from: formValidFrom ? new Date(formValidFrom).toISOString() : null,
                valid_until: formValidUntil ? new Date(formValidUntil).toISOString() : null,
                is_active: formActive,
            }
            if (editTarget) {
                await apiClient.patch(`/promotions/coupons/${editTarget.id}/`, payload)
            } else {
                await apiClient.post('/promotions/coupons/', payload)
            }
            setDialogOpen(false)
            await fetchCoupons()
        } catch {
            // 错误已在拦截器中处理
            toast.error('操作失败')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除该优惠券吗？')) return
        setDeletingId(id)
        try {
            await apiClient.delete(`/promotions/coupons/${id}/`)
            await fetchCoupons()
        } catch {
            // 错误已在拦截器中处理
            toast.error('操作失败')
        } finally {
            setDeletingId(null)
        }
    }

    const handleToggleActive = async (coupon: Coupon) => {
        try {
            await apiClient.patch(`/promotions/coupons/${coupon.id}/`, {
                is_active: !coupon.is_active,
            })
            await fetchCoupons()
        } catch {
            // 错误已在拦截器中处理
            toast.error('操作失败')
        }
    }

    const typeBadge = (type: string) => {
        const map: Record<string, 'default' | 'secondary' | 'outline' | 'success'> = {
            percentage: 'default',
            fixed: 'success',
            shipping: 'secondary',
        }
        return <Badge variant={map[type] || 'outline'}>{COUPON_TYPE_LABEL[type] || type}</Badge>
    }

    return (
        <div className="space-y-4">
            {/* 操作栏 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-48">
                    <Search
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={16}
                    />
                    <Input
                        placeholder="搜索优惠券名称或编码..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={openAdd} className="w-full sm:w-auto">
                    <Plus size={16} className="mr-1"/>
                    新增优惠券
                </Button>
            </div>

            {/* 表格 */}
            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>名称</TableHead>
                                <TableHead>编码</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>面值</TableHead>
                                <TableHead>最低消费</TableHead>
                                <TableHead className="text-center">总量</TableHead>
                                <TableHead className="text-center">已用</TableHead>
                                <TableHead>有效期</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                                        加载中...
                                    </TableCell>
                                </TableRow>
                            ) : coupons.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={10} className="text-center text-muted-foreground py-8">
                                        暂无优惠券
                                    </TableCell>
                                </TableRow>
                            ) : (
                                coupons.map((coupon) => (
                                    <TableRow key={coupon.id}>
                                        <TableCell className="font-medium">{coupon.name}</TableCell>
                                        <TableCell>
                                            <code className="rounded bg-muted px-1.5 py-0.5 text-xs font-mono">
                                                {coupon.code}
                                            </code>
                                        </TableCell>
                                        <TableCell>{typeBadge(coupon.coupon_type)}</TableCell>
                                        <TableCell>
                                            {coupon.coupon_type === 'percentage'
                                                ? `${toNumber(coupon.value)}%`
                                                : formatPrice(coupon.value)}
                                        </TableCell>
                                        <TableCell>{formatPrice(coupon.min_amount)}</TableCell>
                                        <TableCell className="text-center">{coupon.max_count}</TableCell>
                                        <TableCell className="text-center">{coupon.used_count}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {coupon.valid_from || coupon.valid_until
                                                ? `${formatDate(coupon.valid_from)} ~ ${formatDate(coupon.valid_until)}`
                                                : '永久有效'}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={coupon.is_active}
                                                onCheckedChange={() => handleToggleActive(coupon)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(coupon)}
                                                    title="编辑"
                                                >
                                                    <Edit size={14}/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(coupon.id)}
                                                    disabled={deletingId === coupon.id}
                                                    title="删除"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 size={14}/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── 新增/编辑 Dialog ── */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) {
                    setEditTarget(null)
                    resetForm()
                }
            }}>
                <DialogContent className="w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? '编辑优惠券' : '新增优惠券'}</DialogTitle>
                        <DialogDescription>
                            {editTarget ? '修改优惠券信息' : '创建一张新的优惠券'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                        <div className="space-y-1.5">
                            <Label>优惠券名称</Label>
                            <Input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="例如：新客立减"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>优惠券编码</Label>
                            <Input
                                value={formCode}
                                onChange={(e) => setFormCode(e.target.value)}
                                placeholder="例如：NEW50"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>优惠类型</Label>
                            <Select value={formType} onValueChange={setFormType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择类型"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(COUPON_TYPE_LABEL).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                {formType === 'percentage' ? '折扣比例 (%)' : formType === 'shipping' ? '（免运费）' : '减免金额'}
                            </Label>
                            <Input
                                type="number"
                                value={formValue}
                                onChange={(e) => setFormValue(e.target.value)}
                                placeholder={formType === 'percentage' ? '例如：20' : '例如：10'}
                                disabled={formType === 'shipping'}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>最低消费</Label>
                            <Input
                                type="number"
                                value={formMinAmount}
                                onChange={(e) => setFormMinAmount(e.target.value)}
                                placeholder="0 表示无限制"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>发放总量</Label>
                            <Input
                                type="number"
                                value={formMaxCount}
                                onChange={(e) => setFormMaxCount(e.target.value)}
                                placeholder="0 表示不限制"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>开始时间</Label>
                            <Input
                                type="datetime-local"
                                value={formValidFrom}
                                onChange={(e) => setFormValidFrom(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>结束时间</Label>
                            <Input
                                type="datetime-local"
                                value={formValidUntil}
                                onChange={(e) => setFormValidUntil(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                            <Switch
                                checked={formActive}
                                onCheckedChange={setFormActive}
                                id="coupon-active"
                            />
                            <Label htmlFor="coupon-active">启用</Label>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full sm:w-auto">取消</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSave}
                            disabled={!formName.trim() || !formCode.trim() || !formValue || saving}
                            className="w-full sm:w-auto"
                        >
                            {saving ? '保存中...' : editTarget ? '保存修改' : '添加'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ── 促销活动 Tab ──

function PromotionsTab() {
    const [promotions, setPromotions] = useState<Promotion[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')

    // Dialog
    const [dialogOpen, setDialogOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Promotion | null>(null)
    const [saving, setSaving] = useState(false)

    // Form
    const [formName, setFormName] = useState('')
    const [formType, setFormType] = useState<string>('amount_discount')
    const [formCondition, setFormCondition] = useState('')
    const [formDiscountValue, setFormDiscountValue] = useState('')
    const [formStartDate, setFormStartDate] = useState('')
    const [formEndDate, setFormEndDate] = useState('')
    const [formActive, setFormActive] = useState(true)

    const [deletingId, setDeletingId] = useState<number | null>(null)

    const fetchPromotions = useCallback(async () => {
        setLoading(true)
        try {
            const params: Record<string, string | number> = {}
            if (search.trim()) params.search = search.trim()
            const res = await apiClient.get('/promotions/promotions/', {params})
            const data = res.data
            const list = data?.results ?? data?.data ?? (Array.isArray(data) ? data : [])
            setPromotions(Array.isArray(list) ? list : [])
        } catch {
            setPromotions([])
            toast.error('操作失败')
        } finally {
            setLoading(false)
        }
    }, [search])

    useEffect(() => {
        fetchPromotions()
    }, [fetchPromotions])

    const resetForm = () => {
        setFormName('')
        setFormType('amount_discount')
        setFormCondition('')
        setFormDiscountValue('')
        setFormStartDate('')
        setFormEndDate('')
        setFormActive(true)
    }

    const openAdd = () => {
        setEditTarget(null)
        resetForm()
        setDialogOpen(true)
    }

    const openEdit = (promo: Promotion) => {
        setEditTarget(promo)
        setFormName(promo.name)
        setFormType(promo.promo_type)
        setFormCondition(promo.condition)
        setFormDiscountValue(String(toNumber(promo.discount_value)))
        setFormStartDate(promo.start_date ? promo.start_date.slice(0, 16) : '')
        setFormEndDate(promo.end_date ? promo.end_date.slice(0, 16) : '')
        setFormActive(promo.is_active)
        setDialogOpen(true)
    }

    const handleSave = async () => {
        if (!formName.trim() || !formDiscountValue) return
        setSaving(true)
        try {
            const payload = {
                name: formName.trim(),
                promo_type: formType,
                condition: formCondition.trim(),
                discount_value: parseFloat(formDiscountValue),
                start_date: formStartDate ? new Date(formStartDate).toISOString() : null,
                end_date: formEndDate ? new Date(formEndDate).toISOString() : null,
                is_active: formActive,
            }
            if (editTarget) {
                await apiClient.patch(`/promotions/promotions/${editTarget.id}/`, payload)
            } else {
                await apiClient.post('/promotions/promotions/', payload)
            }
            setDialogOpen(false)
            await fetchPromotions()
        } catch {
            // 错误已在拦截器中处理
            toast.error('操作失败')
        } finally {
            setSaving(false)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('确定要删除该促销活动吗？')) return
        setDeletingId(id)
        try {
            await apiClient.delete(`/promotions/promotions/${id}/`)
            await fetchPromotions()
        } catch {
            // 错误已在拦截器中处理
            toast.error('操作失败')
        } finally {
            setDeletingId(null)
        }
    }

    const handleToggleActive = async (promo: Promotion) => {
        try {
            await apiClient.patch(`/promotions/promotions/${promo.id}/`, {
                is_active: !promo.is_active,
            })
            await fetchPromotions()
        } catch {
            // 错误已在拦截器中处理
            toast.error('操作失败')
        }
    }

    const typeBadge = (type: string) => {
        const map: Record<string, 'default' | 'secondary' | 'outline' | 'success' | 'warning'> = {
            amount_discount: 'success',
            percentage_discount: 'default',
            buy_x_get_y: 'warning',
            flash_sale: 'warning',
        }
        return <Badge variant={map[type] || 'outline'}>{PROMO_TYPE_LABEL[type] || type}</Badge>
    }

    const renderDiscount = (promo: Promotion) => {
        if (promo.promo_type === 'percentage_discount') {
            return `${toNumber(promo.discount_value)}%`
        }
        if (promo.promo_type === 'amount_discount') {
            return formatPrice(promo.discount_value)
        }
        return formatPrice(promo.discount_value)
    }

    return (
        <div className="space-y-4">
            {/* 操作栏 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="relative w-full sm:w-48">
                    <Search
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
                        size={16}
                    />
                    <Input
                        placeholder="搜索促销活动..."
                        className="pl-8"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <Button onClick={openAdd} className="w-full sm:w-auto">
                    <Plus size={16} className="mr-1"/>
                    新增促销活动
                </Button>
            </div>

            {/* 表格 */}
            <Card>
                <CardContent className="p-0 overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>名称</TableHead>
                                <TableHead>类型</TableHead>
                                <TableHead>活动条件</TableHead>
                                <TableHead>折扣</TableHead>
                                <TableHead>有效期</TableHead>
                                <TableHead>状态</TableHead>
                                <TableHead className="text-right">操作</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        加载中...
                                    </TableCell>
                                </TableRow>
                            ) : promotions.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                        暂无促销活动
                                    </TableCell>
                                </TableRow>
                            ) : (
                                promotions.map((promo) => (
                                    <TableRow key={promo.id}>
                                        <TableCell className="font-medium">{promo.name}</TableCell>
                                        <TableCell>{typeBadge(promo.promo_type)}</TableCell>
                                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate">
                                            {promo.condition || '—'}
                                        </TableCell>
                                        <TableCell className="font-medium">{renderDiscount(promo)}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                                            {promo.start_date || promo.end_date
                                                ? `${formatDate(promo.start_date)} ~ ${formatDate(promo.end_date)}`
                                                : '长期有效'}
                                        </TableCell>
                                        <TableCell>
                                            <Switch
                                                checked={promo.is_active}
                                                onCheckedChange={() => handleToggleActive(promo)}
                                            />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => openEdit(promo)}
                                                    title="编辑"
                                                >
                                                    <Edit size={14}/>
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleDelete(promo.id)}
                                                    disabled={deletingId === promo.id}
                                                    title="删除"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 size={14}/>
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            {/* ── 新增/编辑 Dialog ── */}
            <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open)
                if (!open) {
                    setEditTarget(null)
                    resetForm()
                }
            }}>
                <DialogContent className="w-[95vw] sm:max-w-lg">
                    <DialogHeader>
                        <DialogTitle>{editTarget ? '编辑促销活动' : '新增促销活动'}</DialogTitle>
                        <DialogDescription>
                            {editTarget ? '修改促销活动信息' : '创建一个新的促销活动'}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                        <div className="space-y-1.5 col-span-2">
                            <Label>活动名称</Label>
                            <Input
                                value={formName}
                                onChange={(e) => setFormName(e.target.value)}
                                placeholder="例如：夏季大促"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>活动类型</Label>
                            <Select value={formType} onValueChange={setFormType}>
                                <SelectTrigger>
                                    <SelectValue placeholder="选择类型"/>
                                </SelectTrigger>
                                <SelectContent>
                                    {Object.entries(PROMO_TYPE_LABEL).map(([value, label]) => (
                                        <SelectItem key={value} value={value}>{label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-1.5">
                            <Label>
                                {formType === 'percentage_discount' ? '折扣比例 (%)' : '折扣金额'}
                            </Label>
                            <Input
                                type="number"
                                value={formDiscountValue}
                                onChange={(e) => setFormDiscountValue(e.target.value)}
                                placeholder={formType === 'percentage_discount' ? '例如：20' : '例如：10'}
                            />
                        </div>
                        <div className="space-y-1.5 col-span-2">
                            <Label>活动条件</Label>
                            <Input
                                value={formCondition}
                                onChange={(e) => setFormCondition(e.target.value)}
                                placeholder="例如：满100元减20元"
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>开始时间</Label>
                            <Input
                                type="datetime-local"
                                value={formStartDate}
                                onChange={(e) => setFormStartDate(e.target.value)}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label>结束时间</Label>
                            <Input
                                type="datetime-local"
                                value={formEndDate}
                                onChange={(e) => setFormEndDate(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2 col-span-2">
                            <Switch
                                checked={formActive}
                                onCheckedChange={setFormActive}
                                id="promo-active"
                            />
                            <Label htmlFor="promo-active">启用</Label>
                        </div>
                    </div>

                    <DialogFooter className="flex-col sm:flex-row gap-2">
                        <DialogClose asChild>
                            <Button variant="outline" className="w-full sm:w-auto">取消</Button>
                        </DialogClose>
                        <Button
                            onClick={handleSave}
                            disabled={!formName.trim() || !formDiscountValue || saving}
                            className="w-full sm:w-auto"
                        >
                            {saving ? '保存中...' : editTarget ? '保存修改' : '添加'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    )
}

// ── 主页面组件 ──

export default function CouponsPage() {
    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">优惠促销</h1>
                <p className="text-sm text-muted-foreground mt-1">管理优惠券和促销活动</p>
            </div>

            <Tabs defaultValue="coupons">
                <TabsList>
                    <TabsTrigger value="coupons">优惠券</TabsTrigger>
                    <TabsTrigger value="promotions">促销活动</TabsTrigger>
                </TabsList>

                <TabsContent value="coupons">
                    <CouponsTab/>
                </TabsContent>

                <TabsContent value="promotions">
                    <PromotionsTab/>
                </TabsContent>
            </Tabs>
        </div>
    )
}
