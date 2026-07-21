'use client'

import {useCallback, useEffect, useState} from 'react'
import {Card, CardContent, CardHeader, CardTitle} from '@/components/ui/card'
import {Badge} from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Switch} from '@/components/ui/switch'
import {Label} from '@/components/ui/label'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {ChevronLeftIcon, ChevronRightIcon, Loader2, PencilIcon, PlusIcon, SearchIcon,} from 'lucide-react'

// ---------- 类型定义 ----------

interface MembershipLevel {
    id: number
    name: string
    min_points: number
    discount_rate: number
    points_earn_rate: number
    is_active: boolean
    description?: string
    benefits?: Record<string, unknown>
    created_at?: string
    updated_at?: string
}

interface Customer {
    id: number
    username: string
    email?: string
    phone?: string
    user_type?: string
    membership_level?: string
    points: number
    total_consumption: number
    date_joined: string
}

interface PaginatedResponse<T> {
    count: number
    next: string | null
    previous: string | null
    results: T[]
}

// ---------- API 辅助 ----------

async function apiGet<T>(url: string): Promise<T> {
    const api = (await import('@/lib/api')).default
    const res = await api.get<T>(url)
    return res.data
}

async function apiPost<T>(url: string, data: unknown): Promise<T> {
    const api = (await import('@/lib/api')).default
    const res = await api.post<T>(url, data)
    return res.data
}

async function apiPut<T>(url: string, data: unknown): Promise<T> {
    const api = (await import('@/lib/api')).default
    const res = await api.put<T>(url, data)
    return res.data
}

// ---------- 工具函数 ----------

function formatDateTime(iso: string | undefined): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return d.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ---------- 会员等级配置编辑弹窗 ----------

interface LevelDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    level: MembershipLevel | null           // null = 新建
    onSave: (data: Partial<MembershipLevel>) => Promise<void>
}

function LevelEditDialog({open, onOpenChange, level, onSave}: LevelDialogProps) {
    const [name, setName] = useState('')
    const [requiredPoints, setRequiredPoints] = useState('')
    const [discountRate, setDiscountRate] = useState('')
    const [pointsRate, setPointsRate] = useState('')
    const [isActive, setIsActive] = useState(true)
    const [saving, setSaving] = useState(false)

    // 打开时填充数据
    useEffect(() => {
        if (open) {
            setName(level?.name ?? '')
            setRequiredPoints(String(level?.min_points ?? ''))
            setDiscountRate(level?.discount_rate != null ? String(level.discount_rate) : '')
            setPointsRate(level?.points_earn_rate != null ? String(level.points_earn_rate) : '')
            setIsActive(level?.is_active ?? true)
            setSaving(false)
        }
    }, [open, level])

    const handleSave = async () => {
        const data: Partial<MembershipLevel> = {
            name: name.trim(),
            min_points: Number(requiredPoints),
            discount_rate: Number(discountRate),
            points_earn_rate: Number(pointsRate),
            is_active: isActive,
        }
        if (!data.name) return
        setSaving(true)
        try {
            await onSave(data)
            onOpenChange(false)
        } catch {
            // 错误由调用方处理
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{level ? '编辑会员等级' : '新增会员等级'}</DialogTitle>
                    <DialogDescription>
                        {level ? '修改该等级的配置参数' : '创建一个新的会员等级'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-2">
                    {/* 等级名称 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="level-name">等级名称</Label>
                        <Input
                            id="level-name"
                            placeholder="如：黄金会员"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* 所需积分 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="required-points">所需积分</Label>
                        <Input
                            id="required-points"
                            type="number"
                            min={0}
                            placeholder="0"
                            value={requiredPoints}
                            onChange={(e) => setRequiredPoints(e.target.value)}
                        />
                    </div>

                    {/* 折扣率 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="discount-rate">折扣率</Label>
                        <Input
                            id="discount-rate"
                            type="number"
                            step="0.01"
                            min={0}
                            max={1}
                            placeholder="0.90"
                            value={discountRate}
                            onChange={(e) => setDiscountRate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            0.90 表示 9 折，1.00 表示无折扣
                        </p>
                    </div>

                    {/* 积分获取比例 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="points-rate">积分获取比例</Label>
                        <Input
                            id="points-rate"
                            type="number"
                            step="0.1"
                            min={0}
                            placeholder="1.0"
                            value={pointsRate}
                            onChange={(e) => setPointsRate(e.target.value)}
                        />
                        <p className="text-xs text-muted-foreground">
                            每消费 1 元获得的积分数量
                        </p>
                    </div>

                    {/* 状态 */}
                    <div className="flex items-center gap-3">
                        <Switch id="level-active" checked={isActive} onCheckedChange={setIsActive}/>
                        <Label htmlFor="level-active">启用该等级</Label>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()}>
                        {saving && <Loader2 className="size-4 animate-spin"/>}
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ---------- 分页组件 ----------

interface PaginationBarProps {
    current: number
    total: number
    pageSize: number
    onChange: (page: number) => void
}

function PaginationBar({current, total, pageSize, onChange}: PaginationBarProps) {
    const totalPages = Math.max(1, Math.ceil(total / pageSize))
    if (totalPages <= 1) return null

    return (
        <div className="flex items-center justify-between pt-2">
            <p className="text-sm text-muted-foreground">
                共 {total} 条，第 {current}/{totalPages} 页
            </p>
            <div className="flex items-center gap-1">
                <Button
                    variant="outline"
                    size="xs"
                    disabled={current <= 1}
                    onClick={() => onChange(current - 1)}
                >
                    <ChevronLeftIcon className="size-4"/>
                    上一页
                </Button>
                <Button
                    variant="outline"
                    size="xs"
                    disabled={current >= totalPages}
                    onClick={() => onChange(current + 1)}
                >
                    下一页
                    <ChevronRightIcon className="size-4"/>
                </Button>
            </div>
        </div>
    )
}

// ---------- 主页面 ----------

export default function CustomersPage() {
    const [activeTab, setActiveTab] = useState('customers')

    // ---- 客户列表状态 ----
    const [customers, setCustomers] = useState<Customer[]>([])
    const [customerLoading, setCustomerLoading] = useState(true)
    const [customerTotal, setCustomerTotal] = useState(0)
    const [customerPage, setCustomerPage] = useState(1)
    const [customerSearch, setCustomerSearch] = useState('')
    const customerPageSize = 15

    // ---- 会员等级配置状态 ----
    const [levels, setLevels] = useState<MembershipLevel[]>([])
    const [levelsLoading, setLevelsLoading] = useState(true)
    const [levelEditOpen, setLevelEditOpen] = useState(false)
    const [editingLevel, setEditingLevel] = useState<MembershipLevel | null>(null)

    // ---------- 加载客户列表 ----------

    const loadCustomers = useCallback(async () => {
        setCustomerLoading(true)
        try {
            const params = new URLSearchParams({
                page: String(customerPage),
                page_size: String(customerPageSize),
            })
            if (customerSearch.trim()) {
                params.set('search', customerSearch.trim())
            }
            const data = await apiGet<PaginatedResponse<Customer>>(`/api/users/customers/?${params}`)
            setCustomers(data.results)
            setCustomerTotal(data.count)
        } catch {
            // 接口暂不可用时显示空列表
            setCustomers([])
            setCustomerTotal(0)
        } finally {
            setCustomerLoading(false)
        }
    }, [customerPage, customerSearch])

    useEffect(() => {
        loadCustomers()
    }, [loadCustomers])

    // ---------- 加载会员等级 ----------

    const loadLevels = useCallback(async () => {
        setLevelsLoading(true)
        try {
            const data = await apiGet<PaginatedResponse<MembershipLevel>>('/api/users/membership-levels/')
            setLevels(data.results)
        } catch {
            setLevels([])
        } finally {
            setLevelsLoading(false)
        }
    }, [])

    useEffect(() => {
        loadLevels()
    }, [loadLevels])

    // ---------- 会员等级 CRUD ----------

    const handleLevelSave = async (data: Partial<MembershipLevel>) => {
        if (editingLevel) {
            // 更新
            await apiPut(`/api/users/membership-levels/${editingLevel.id}/`, data)
        } else {
            // 新建
            await apiPost('/api/users/membership-levels/', data)
        }
        await loadLevels()
    }

    const handleLevelToggleActive = async (level: MembershipLevel) => {
        await apiPut(`/api/users/membership-levels/${level.id}/`, {
            is_active: !level.is_active,
        })
        await loadLevels()
    }

    const openCreateLevel = () => {
        setEditingLevel(null)
        setLevelEditOpen(true)
    }

    const openEditLevel = (level: MembershipLevel) => {
        setEditingLevel(level)
        setLevelEditOpen(true)
    }

    // ---------- 搜索 debounce ----------

    const [searchInput, setSearchInput] = useState('')

    useEffect(() => {
        const timer = setTimeout(() => {
            setCustomerSearch(searchInput)
            setCustomerPage(1)
        }, 400)
        return () => clearTimeout(timer)
    }, [searchInput])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">客户管理</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    管理客户信息与会员等级配置
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="customers">客户列表</TabsTrigger>
                    <TabsTrigger value="levels">会员等级配置</TabsTrigger>
                </TabsList>

                {/* ========== 客户列表 Tab ========== */}
                <TabsContent value="customers">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>客户列表</CardTitle>
                                <div className="relative w-full sm:w-64">
                                    <SearchIcon
                                        className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground"/>
                                    <Input
                                        className="pl-8"
                                        placeholder="搜索用户名或电话..."
                                        value={searchInput}
                                        onChange={(e) => setSearchInput(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {customerLoading ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="size-5 animate-spin mr-2"/>
                                    加载中...
                                </div>
                            ) : customers.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    {customerSearch ? '未找到匹配的客户' : '暂无客户数据'}
                                </div>
                            ) : (
                                <>
                                    <div className="overflow-x-auto">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>用户名</TableHead>
                                                    <TableHead>电话</TableHead>
                                                    <TableHead>会员等级</TableHead>
                                                    <TableHead>积分</TableHead>
                                                    <TableHead>消费金额</TableHead>
                                                    <TableHead>注册时间</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {customers.map((c) => (
                                                    <TableRow key={c.id}>
                                                        <TableCell className="font-medium">{c.username}</TableCell>
                                                        <TableCell>{c.phone || '—'}</TableCell>
                                                        <TableCell>
                                                            {c.membership_level ? (
                                                                <Badge variant="secondary">{c.membership_level}</Badge>
                                                            ) : (
                                                                <span className="text-muted-foreground">—</span>
                                                            )}
                                                        </TableCell>
                                                        <TableCell>{c.points.toLocaleString()}</TableCell>
                                                        <TableCell>¥{Number(c.total_consumption || 0).toFixed(2)}</TableCell>
                                                        <TableCell className="text-muted-foreground text-xs">
                                                            {formatDateTime(c.date_joined)}
                                                        </TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>

                                    <PaginationBar
                                        current={customerPage}
                                        total={customerTotal}
                                        pageSize={customerPageSize}
                                        onChange={setCustomerPage}
                                    />
                                </>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ========== 会员等级配置 Tab ========== */}
                <TabsContent value="levels">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>会员等级配置</CardTitle>
                                <Button onClick={openCreateLevel}>
                                    <PlusIcon className="size-4 mr-1"/>
                                    新增等级
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {levelsLoading ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="size-5 animate-spin mr-2"/>
                                    加载中...
                                </div>
                            ) : levels.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    暂无会员等级配置，点击"新增等级"创建
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>等级名称</TableHead>
                                                <TableHead>所需积分</TableHead>
                                                <TableHead>折扣率</TableHead>
                                                <TableHead>积分获取比例</TableHead>
                                                <TableHead>状态</TableHead>
                                                <TableHead className="text-right">操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {levels.map((level) => (
                                                <TableRow key={level.id}>
                                                    <TableCell className="font-medium">{level.name}</TableCell>
                                                    <TableCell>{level.min_points.toLocaleString()}</TableCell>
                                                    <TableCell>
                                                        {level.discount_rate < 1
                                                            ? `${(level.discount_rate * 100).toFixed(0)} 折`
                                                            : '无折扣'}
                                                    </TableCell>
                                                    <TableCell>{level.points_earn_rate}x</TableCell>
                                                    <TableCell>
                                                        <Switch
                                                            checked={level.is_active}
                                                            onCheckedChange={() => handleLevelToggleActive(level)}
                                                        />
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="xs"
                                                            onClick={() => openEditLevel(level)}
                                                        >
                                                            <PencilIcon className="size-3.5 mr-1"/>
                                                            编辑
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* 会员等级编辑弹窗 */}
            <LevelEditDialog
                open={levelEditOpen}
                onOpenChange={setLevelEditOpen}
                level={editingLevel}
                onSave={handleLevelSave}
            />
        </div>
    )
}
