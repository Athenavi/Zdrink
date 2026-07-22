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
import {Label} from '@/components/ui/label'
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs'
import {Switch} from '@/components/ui/switch'
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select'
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow} from '@/components/ui/table'
import {Loader2, PencilIcon, PlusIcon, Trash2Icon} from 'lucide-react'
import {toast} from 'sonner'

// ---------- 类型定义 ----------

interface Printer {
    id: number
    name: string
    printer_type: string
    brand: string
    ip_address: string
    port: number
    is_online: boolean
    options: string
    status: boolean
    created_at?: string
    updated_at?: string
}

interface Template {
    id: number
    name: string
    template_type: string
    is_default: boolean
    font_size: number
    line_spacing: number
    status: boolean
    header: string
    content: string
    footer: string
    created_at?: string
    updated_at?: string
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

async function apiPatch<T>(url: string, data: unknown): Promise<T> {
    const api = (await import('@/lib/api')).default
    const res = await api.patch<T>(url, data)
    return res.data
}

async function apiDelete(url: string): Promise<void> {
    const api = (await import('@/lib/api')).default
    await api.delete(url)
}

// ---------- 常量 ----------

const PRINTER_TYPES = [
    {value: 'thermal', label: '热敏打印机'},
    {value: 'dot_matrix', label: '针式打印机'},
    {value: 'laser', label: '激光打印机'},
    {value: 'inkjet', label: '喷墨打印机'},
]

const TEMPLATE_TYPES = [
    {value: 'order_receipt', label: '订单小票'},
    {value: 'kitchen_order', label: '厨房单'},
    {value: 'delivery', label: '外卖单'},
    {value: 'invoice', label: '发票'},
]

const PRINTER_OPTIONS = [
    {value: 'auto_cut', label: '自动切纸'},
    {value: 'cash_drawer', label: '开钱箱'},
    {value: 'barcode', label: '条码打印'},
    {value: 'qr_code', label: '二维码打印'},
    {value: 'double_width', label: '倍宽打印'},
]

// ---------- 打印机编辑弹窗 ----------

interface PrinterDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    printer: Printer | null
    onSave: (data: Partial<Printer>) => Promise<void>
}

function PrinterEditDialog({open, onOpenChange, printer, onSave}: PrinterDialogProps) {
    const [name, setName] = useState('')
    const [printerType, setPrinterType] = useState('')
    const [brand, setBrand] = useState('')
    const [ipAddress, setIpAddress] = useState('')
    const [port, setPort] = useState('')
    const [isOnline, setIsOnline] = useState(false)
    const [options, setOptions] = useState<string[]>([])
    const [status, setStatus] = useState(true)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setName(printer?.name ?? '')
            setPrinterType(printer?.printer_type ?? '')
            setBrand(printer?.brand ?? '')
            setIpAddress(printer?.ip_address ?? '')
            setPort(printer?.port != null ? String(printer.port) : '')
            setIsOnline(printer?.is_online ?? false)
            setOptions(
                printer?.options
                    ? printer.options.split(',').map((s) => s.trim()).filter(Boolean)
                    : [],
            )
            setStatus(printer?.status ?? true)
            setSaving(false)
        }
    }, [open, printer])

    const toggleOption = (value: string) => {
        setOptions((prev) =>
            prev.includes(value) ? prev.filter((o) => o !== value) : [...prev, value],
        )
    }

    const handleSave = async () => {
        if (!name.trim()) return
        const data: Partial<Printer> = {
            name: name.trim(),
            printer_type: printerType,
            brand: brand.trim(),
            ip_address: ipAddress.trim(),
            port: Number(port),
            is_online: isOnline,
            options: options.join(','),
            status,
        }
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
            <DialogContent className="w-[95vw] sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>{printer ? '编辑打印机' : '新增打印机'}</DialogTitle>
                    <DialogDescription>
                        {printer ? '修改该打印机的配置参数' : '添加一台新的打印机'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2 grid-cols-1 sm:grid-cols-2">
                    {/* 名称 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="printer-name">名称</Label>
                        <Input
                            id="printer-name"
                            placeholder="如：前台小票打印机"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* 类型 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="printer-type">类型</Label>
                        <Select value={printerType} onValueChange={setPrinterType}>
                            <SelectTrigger id="printer-type">
                                <SelectValue placeholder="请选择打印机类型"/>
                            </SelectTrigger>
                            <SelectContent>
                                {PRINTER_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 品牌 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="printer-brand">品牌</Label>
                        <Input
                            id="printer-brand"
                            placeholder="如：Epson、Start"
                            value={brand}
                            onChange={(e) => setBrand(e.target.value)}
                        />
                    </div>

                    {/* IP 地址 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="printer-ip">IP 地址</Label>
                        <Input
                            id="printer-ip"
                            placeholder="192.168.1.100"
                            value={ipAddress}
                            onChange={(e) => setIpAddress(e.target.value)}
                        />
                    </div>

                    {/* 端口 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="printer-port">端口</Label>
                        <Input
                            id="printer-port"
                            type="number"
                            min={1}
                            max={65535}
                            placeholder="9100"
                            value={port}
                            onChange={(e) => setPort(e.target.value)}
                        />
                    </div>

                    {/* 在线状态 */}
                    <div className="flex items-center gap-3">
                        <Switch id="printer-online" checked={isOnline} onCheckedChange={setIsOnline}/>
                        <Label htmlFor="printer-online">在线状态</Label>
                    </div>

                    {/* 启用状态 */}
                    <div className="flex items-center gap-3">
                        <Switch id="printer-status" checked={status} onCheckedChange={setStatus}/>
                        <Label htmlFor="printer-status">启用</Label>
                    </div>

                    {/* 打印选项 */}
                    <div className="grid gap-2">
                        <Label>启用的打印选项</Label>
                        <div className="flex flex-wrap gap-3">
                            {PRINTER_OPTIONS.map((opt) => (
                                <label
                                    key={opt.value}
                                    className="flex items-center gap-1.5 text-sm cursor-pointer"
                                >
                                    <input
                                        type="checkbox"
                                        checked={options.includes(opt.value)}
                                        onChange={() => toggleOption(opt.value)}
                                        className="size-4 accent-primary"
                                    />
                                    {opt.label}
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs sm:text-sm">
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()} className="text-xs sm:text-sm">
                        {saving && <Loader2 className="size-4 animate-spin"/>}
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ---------- 模板编辑弹窗 ----------

interface TemplateDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    template: Template | null
    onSave: (data: Partial<Template>) => Promise<void>
}

function TemplateEditDialog({open, onOpenChange, template, onSave}: TemplateDialogProps) {
    const [name, setName] = useState('')
    const [templateType, setTemplateType] = useState('')
    const [fontSize, setFontSize] = useState('')
    const [lineSpacing, setLineSpacing] = useState('')
    const [status, setStatus] = useState(true)
    const [header, setHeader] = useState('')
    const [content, setContent] = useState('')
    const [footer, setFooter] = useState('')
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open) {
            setName(template?.name ?? '')
            setTemplateType(template?.template_type ?? '')
            setFontSize(template?.font_size != null ? String(template.font_size) : '')
            setLineSpacing(template?.line_spacing != null ? String(template.line_spacing) : '')
            setStatus(template?.status ?? true)
            setHeader(template?.header ?? '')
            setContent(template?.content ?? '')
            setFooter(template?.footer ?? '')
            setSaving(false)
        }
    }, [open, template])

    const handleSave = async () => {
        if (!name.trim()) return
        const data: Partial<Template> = {
            name: name.trim(),
            template_type: templateType,
            font_size: Number(fontSize),
            line_spacing: Number(lineSpacing),
            status,
            header,
            content,
            footer,
        }
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
            <DialogContent className="w-[95vw] sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle>{template ? '编辑打印模板' : '新增打印模板'}</DialogTitle>
                    <DialogDescription>
                        {template ? '修改该模板的内容与参数' : '创建一个新的打印模板'}
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-2 max-h-[60vh] overflow-y-auto pr-1 grid-cols-1 sm:grid-cols-2">
                    {/* 名称 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="template-name">名称</Label>
                        <Input
                            id="template-name"
                            placeholder="如：标准小票模板"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                        />
                    </div>

                    {/* 类型 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="template-type">类型</Label>
                        <Select value={templateType} onValueChange={setTemplateType}>
                            <SelectTrigger id="template-type">
                                <SelectValue placeholder="请选择模板类型"/>
                            </SelectTrigger>
                            <SelectContent>
                                {TEMPLATE_TYPES.map((t) => (
                                    <SelectItem key={t.value} value={t.value}>
                                        {t.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* 字体大小 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="template-font-size">字体大小 (px)</Label>
                        <Input
                            id="template-font-size"
                            type="number"
                            min={8}
                            max={72}
                            placeholder="16"
                            value={fontSize}
                            onChange={(e) => setFontSize(e.target.value)}
                        />
                    </div>

                    {/* 行间距 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="template-line-spacing">行间距</Label>
                        <Input
                            id="template-line-spacing"
                            type="number"
                            step="0.1"
                            min={0.5}
                            max={5}
                            placeholder="1.2"
                            value={lineSpacing}
                            onChange={(e) => setLineSpacing(e.target.value)}
                        />
                    </div>

                    {/* 状态 */}
                    <div className="flex items-center gap-3">
                        <Switch id="template-status" checked={status} onCheckedChange={setStatus}/>
                        <Label htmlFor="template-status">启用</Label>
                    </div>

                    {/* 模板文本域 */}
                    <div className="grid gap-1.5">
                        <Label htmlFor="template-header">Header（页眉）</Label>
                        <textarea
                            id="template-header"
                            className="border-input flex min-h-[72px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y font-mono"
                            placeholder={`如：店铺名称、电话、地址等`}
                            value={header}
                            onChange={(e) => setHeader(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="template-content">Content（正文模板）</Label>
                        <textarea
                            id="template-content"
                            className="border-input flex min-h-[120px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y font-mono"
                            placeholder={`支持 {{order_no}}、{{items}}、{{total}} 等变量`}
                            value={content}
                            onChange={(e) => setContent(e.target.value)}
                        />
                    </div>

                    <div className="grid gap-1.5">
                        <Label htmlFor="template-footer">Footer（页脚）</Label>
                        <textarea
                            id="template-footer"
                            className="border-input flex min-h-[72px] w-full rounded-md border bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 placeholder:text-muted-foreground resize-y font-mono"
                            placeholder={`如：感谢光临、二维码等`}
                            value={footer}
                            onChange={(e) => setFooter(e.target.value)}
                        />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="text-xs sm:text-sm">
                        取消
                    </Button>
                    <Button onClick={handleSave} disabled={saving || !name.trim()} className="text-xs sm:text-sm">
                        {saving && <Loader2 className="size-4 animate-spin"/>}
                        {saving ? '保存中...' : '保存'}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

// ---------- 主页面 ----------

export default function PrintingPage() {
    const [activeTab, setActiveTab] = useState('printers')

    // ---- 打印机状态 ----
    const [printers, setPrinters] = useState<Printer[]>([])
    const [printersLoading, setPrintersLoading] = useState(true)
    const [printerDialogOpen, setPrinterDialogOpen] = useState(false)
    const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null)

    // ---- 模板状态 ----
    const [templates, setTemplates] = useState<Template[]>([])
    const [templatesLoading, setTemplatesLoading] = useState(true)
    const [templateDialogOpen, setTemplateDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)

    // ---------- 加载打印机 ----------

    const loadPrinters = useCallback(async () => {
        setPrintersLoading(true)
        try {
            const data = await apiGet<PaginatedResponse<Printer>>('/api/printing/printers/')
            setPrinters(data.results)
        } catch {
            setPrinters([])
        } finally {
            setPrintersLoading(false)
        }
    }, [])

    useEffect(() => {
        loadPrinters()
    }, [loadPrinters])

    // ---------- 加载模板 ----------

    const loadTemplates = useCallback(async () => {
        setTemplatesLoading(true)
        try {
            const data = await apiGet<PaginatedResponse<Template>>('/api/printing/templates/')
            setTemplates(data.results)
        } catch {
            setTemplates([])
        } finally {
            setTemplatesLoading(false)
        }
    }, [])

    useEffect(() => {
        loadTemplates()
    }, [loadTemplates])

    // ---------- 打印机 CRUD ----------

    const handlePrinterSave = async (data: Partial<Printer>) => {
        if (editingPrinter) {
            await apiPatch(`/api/printing/printers/${editingPrinter.id}/`, data)
        } else {
            await apiPost('/api/printing/printers/', data)
        }
        await loadPrinters()
    }

    const handleDeletePrinter = async (printer: Printer) => {
        if (!confirm(`确定要删除打印机"${printer.name}"吗？`)) return
        try {
            await apiDelete(`/api/printing/printers/${printer.id}/`)
            await loadPrinters()
        } catch {
            toast.error('操作失败')
        }
    }

    const openCreatePrinter = () => {
        setEditingPrinter(null)
        setPrinterDialogOpen(true)
    }

    const openEditPrinter = (printer: Printer) => {
        setEditingPrinter(printer)
        setPrinterDialogOpen(true)
    }

    // ---------- 模板 CRUD ----------

    const handleTemplateSave = async (data: Partial<Template>) => {
        if (editingTemplate) {
            await apiPatch(`/api/printing/templates/${editingTemplate.id}/`, data)
        } else {
            await apiPost('/api/printing/templates/', data)
        }
        await loadTemplates()
    }

    const handleDeleteTemplate = async (template: Template) => {
        if (!confirm(`确定要删除模板"${template.name}"吗？`)) return
        try {
            await apiDelete(`/api/printing/templates/${template.id}/`)
            await loadTemplates()
        } catch {
            toast.error('操作失败')
        }
    }

    const handleSetDefault = async (template: Template) => {
        try {
            await apiPost(`/api/printing/templates/${template.id}/set_default/`, {})
            await loadTemplates()
        } catch {
            toast.error('操作失败')
        }
    }

    const openCreateTemplate = () => {
        setEditingTemplate(null)
        setTemplateDialogOpen(true)
    }

    const openEditTemplate = (template: Template) => {
        setEditingTemplate(template)
        setTemplateDialogOpen(true)
    }

    // ---------- 辅助函数 ----------

    const getPrinterTypeLabel = (type: string) => {
        const found = PRINTER_TYPES.find((t) => t.value === type)
        return found?.label ?? type
    }

    const getTemplateTypeLabel = (type: string) => {
        const found = TEMPLATE_TYPES.find((t) => t.value === type)
        return found?.label ?? type
    }

    const getOptionLabels = (optionsStr: string) => {
        const keys = optionsStr.split(',').map((s) => s.trim()).filter(Boolean)
        return keys.map((k) => {
            const found = PRINTER_OPTIONS.find((o) => o.value === k)
            return found?.label ?? k
        })
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-semibold">打印管理</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    管理打印机配置与打印模板
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="printers">打印机</TabsTrigger>
                    <TabsTrigger value="templates">打印模板</TabsTrigger>
                </TabsList>

                {/* ========== 打印机 Tab ========== */}
                <TabsContent value="printers">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>打印机</CardTitle>
                                <Button onClick={openCreatePrinter} className="text-xs sm:text-sm">
                                    <PlusIcon className="size-4 mr-1"/>
                                    新增打印机
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {printersLoading ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="size-5 animate-spin mr-2"/>
                                    加载中...
                                </div>
                            ) : printers.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    暂无打印机，点击"新增打印机"添加
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>名称</TableHead>
                                                <TableHead>类型</TableHead>
                                                <TableHead>品牌</TableHead>
                                                <TableHead>IP 地址</TableHead>
                                                <TableHead>端口</TableHead>
                                                <TableHead>在线状态</TableHead>
                                                <TableHead>打印选项</TableHead>
                                                <TableHead>状态</TableHead>
                                                <TableHead className="text-right">操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {printers.map((p) => (
                                                <TableRow key={p.id}>
                                                    <TableCell className="font-medium">{p.name}</TableCell>
                                                    <TableCell>{getPrinterTypeLabel(p.printer_type)}</TableCell>
                                                    <TableCell>{p.brand || '—'}</TableCell>
                                                    <TableCell
                                                        className="font-mono text-xs">{p.ip_address || '—'}</TableCell>
                                                    <TableCell>{p.port || '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={p.is_online ? 'default' : 'secondary'}>
                                                            {p.is_online ? '在线' : '离线'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {p.options ? getOptionLabels(p.options).map((label) => (
                                                                <Badge key={label} variant="outline"
                                                                       className="text-xs">
                                                                    {label}
                                                                </Badge>
                                                            )) : <span className="text-muted-foreground">—</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={p.status ? 'default' : 'secondary'}>
                                                            {p.status ? '启用' : '停用'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                className="text-xs sm:text-sm"
                                                                onClick={() => openEditPrinter(p)}
                                                            >
                                                                <PencilIcon className="size-3.5 mr-1"/>
                                                                编辑
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                className="text-destructive hover:text-destructive text-xs sm:text-sm"
                                                                onClick={() => handleDeletePrinter(p)}
                                                            >
                                                                <Trash2Icon className="size-3.5 mr-1"/>
                                                                删除
                                                            </Button>
                                                        </div>
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

                {/* ========== 打印模板 Tab ========== */}
                <TabsContent value="templates">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>打印模板</CardTitle>
                                <Button onClick={openCreateTemplate} className="text-xs sm:text-sm">
                                    <PlusIcon className="size-4 mr-1"/>
                                    新增模板
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {templatesLoading ? (
                                <div className="flex items-center justify-center py-12 text-muted-foreground">
                                    <Loader2 className="size-5 animate-spin mr-2"/>
                                    加载中...
                                </div>
                            ) : templates.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground">
                                    暂无打印模板，点击"新增模板"创建
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>名称</TableHead>
                                                <TableHead>类型</TableHead>
                                                <TableHead>是否默认</TableHead>
                                                <TableHead>字体大小</TableHead>
                                                <TableHead>行间距</TableHead>
                                                <TableHead>状态</TableHead>
                                                <TableHead className="text-right">操作</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {templates.map((t) => (
                                                <TableRow key={t.id}>
                                                    <TableCell className="font-medium">{t.name}</TableCell>
                                                    <TableCell>{getTemplateTypeLabel(t.template_type)}</TableCell>
                                                    <TableCell>
                                                        {t.is_default ? (
                                                            <Badge variant="default">默认</Badge>
                                                        ) : (
                                                            <span className="text-muted-foreground">—</span>
                                                        )}
                                                    </TableCell>
                                                    <TableCell>{t.font_size ? `${t.font_size}px` : '—'}</TableCell>
                                                    <TableCell>{t.line_spacing ?? '—'}</TableCell>
                                                    <TableCell>
                                                        <Badge variant={t.status ? 'default' : 'secondary'}>
                                                            {t.status ? '启用' : '停用'}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right">
                                                        <div className="flex items-center justify-end gap-1">
                                                            {!t.is_default && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="xs"
                                                                    className="text-xs sm:text-sm"
                                                                    onClick={() => handleSetDefault(t)}
                                                                >
                                                                    设为默认
                                                                </Button>
                                                            )}
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                className="text-xs sm:text-sm"
                                                                onClick={() => openEditTemplate(t)}
                                                            >
                                                                <PencilIcon className="size-3.5 mr-1"/>
                                                                编辑
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="xs"
                                                                className="text-destructive hover:text-destructive text-xs sm:text-sm"
                                                                onClick={() => handleDeleteTemplate(t)}
                                                            >
                                                                <Trash2Icon className="size-3.5 mr-1"/>
                                                                删除
                                                            </Button>
                                                        </div>
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

            {/* 打印机编辑弹窗 */}
            <PrinterEditDialog
                open={printerDialogOpen}
                onOpenChange={setPrinterDialogOpen}
                printer={editingPrinter}
                onSave={handlePrinterSave}
            />

            {/* 模板编辑弹窗 */}
            <TemplateEditDialog
                open={templateDialogOpen}
                onOpenChange={setTemplateDialogOpen}
                template={editingTemplate}
                onSave={handleTemplateSave}
            />
        </div>
    )
}
