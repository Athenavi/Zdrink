'use client';

import {useCallback, useEffect, useState} from 'react';
import {Card, CardContent, CardFooter, CardHeader, CardTitle} from '@/components/ui/card';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Switch} from '@/components/ui/switch';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue,} from '@/components/ui/select';
import {
    Dialog,
    DialogClose,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {Table, TableBody, TableCell, TableHead, TableHeader, TableRow,} from '@/components/ui/table';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import apiClient from '@/lib/api';
import {Building2, Eye, EyeOff, Loader2, Plus, Save, UserPlus,} from 'lucide-react';

// ── 类型定义 ──

interface BusinessHours {
    weekday_start?: string;
    weekday_end?: string;
    weekend_start?: string;
    weekend_end?: string;
}

interface ShopInfo {
    id: number;
    name: string;
    description?: string;
    address?: string;
    phone?: string;
    logo?: string;
    business_hours?: BusinessHours;
    delivery_fee?: number;
    delivery_radius?: number;
    minimum_order_amount?: number;
    allow_delivery?: boolean;
    allow_pickup?: boolean;
    allow_dine_in?: boolean;
    is_active?: boolean;
}

interface StaffMember {
    id: number;
    username: string;
    display_name?: string;
    role: string;
    permissions?: string[];
    is_active: boolean;
}

interface WechatPayConfig {
    app_id: string;
    mch_id: string;
    api_key?: string;
    api_secret?: string;
    cert_pem?: string;
    key_pem?: string;
    notify_url?: string;
    refund_url?: string;
}

interface AlipayConfig {
    app_id: string;
    alipay_public_key?: string;
    app_private_key?: string;
    app_public_cert?: string;
    alipay_root_cert?: string;
    notify_url?: string;
    return_url?: string;
}

// ── 常量 ──

const ROLE_OPTIONS = [
    {value: 'admin', label: '管理员'},
    {value: 'manager', label: '店长'},
    {value: 'staff', label: '店员'},
    {value: 'cashier', label: '收银员'},
];

const PERMISSION_OPTIONS = [
    {value: 'manage_orders', label: '订单管理'},
    {value: 'manage_products', label: '商品管理'},
    {value: 'manage_staff', label: '员工管理'},
    {value: 'manage_settings', label: '设置管理'},
    {value: 'view_reports', label: '查看报表'},
];

// ── 主组件 ──

export default function SettingsPage() {
    // 主 Tab
    const [activeTab, setActiveTab] = useState('shop');

    // ── 店铺信息 ──
    const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
    const [shopForm, setShopForm] = useState<Partial<ShopInfo>>({});
    const [shopLoading, setShopLoading] = useState(true);
    const [shopSaving, setShopSaving] = useState(false);
    const [shopSaveSuccess, setShopSaveSuccess] = useState(false);

    // ── 员工管理 ──
    const [staffList, setStaffList] = useState<StaffMember[]>([]);
    const [staffLoading, setStaffLoading] = useState(true);
    const [staffDialogOpen, setStaffDialogOpen] = useState(false);
    const [staffForm, setStaffForm] = useState({
        user_id: '',
        username: '',
        role: 'staff',
        permissions: [] as string[],
    });
    const [staffSaving, setStaffSaving] = useState(false);

    // ── 支付配置 ──
    const [payTab, setPayTab] = useState('wechat');
    const [wechatConfig, setWechatConfig] = useState<WechatPayConfig | null>(null);
    const [wechatForm, setWechatForm] = useState<Partial<WechatPayConfig>>({});
    const [wechatLoading, setWechatLoading] = useState(true);
    const [wechatSaving, setWechatSaving] = useState(false);
    const [wechatShowSecrets, setWechatShowSecrets] = useState(false);
    const [wechatSaveSuccess, setWechatSaveSuccess] = useState(false);

    const [alipayConfig, setAlipayConfig] = useState<AlipayConfig | null>(null);
    const [alipayForm, setAlipayForm] = useState<Partial<AlipayConfig>>({});
    const [alipayLoading, setAlipayLoading] = useState(true);
    const [alipaySaving, setAlipaySaving] = useState(false);
    const [alipayShowSecrets, setAlipayShowSecrets] = useState(false);
    const [alipaySaveSuccess, setAlipaySaveSuccess] = useState(false);

    // 通用 Toast 提示状态（简单内联，不引入 toast 库）
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error' = 'success') => {
        setToast({message, type});
        setTimeout(() => setToast(null), 3000);
    };

    // ── 数据加载 ──

    const fetchShopInfo = useCallback(async () => {
        setShopLoading(true);
        try {
            const res = await apiClient.get('/shops/current/');
            const data = res.data;
            setShopInfo(data);
            setShopForm({
                name: data.name || '',
                description: data.description || '',
                address: data.address || '',
                phone: data.phone || '',
                business_hours: data.business_hours || {},
                delivery_fee: data.delivery_fee ?? 0,
                delivery_radius: data.delivery_radius ?? 0,
                minimum_order_amount: data.minimum_order_amount ?? 0,
                allow_delivery: data.allow_delivery ?? false,
                allow_pickup: data.allow_pickup ?? false,
                allow_dine_in: data.allow_dine_in ?? false,
            });
        } catch {
            showToast('加载店铺信息失败', 'error');
        } finally {
            setShopLoading(false);
        }
    }, []);

    const fetchStaff = useCallback(async () => {
        setStaffLoading(true);
        try {
            const res = await apiClient.get('/shops/current/staff/');
            const data = res.data;
            const list = data?.results ?? data?.data ?? (Array.isArray(data) ? data : []);
            setStaffList(Array.isArray(list) ? list : []);
        } catch {
            showToast('加载员工列表失败', 'error');
            setStaffList([]);
        } finally {
            setStaffLoading(false);
        }
    }, []);

    const fetchWechatConfig = useCallback(async () => {
        setWechatLoading(true);
        try {
            const res = await apiClient.get('/payments/config/wechat/');
            const data = res.data;
            setWechatConfig(data);
            setWechatForm({
                app_id: data.app_id || '',
                mch_id: data.mch_id || '',
                notify_url: data.notify_url || '',
                refund_url: data.refund_url || '',
            });
        } catch {
            // 可能未配置
        } finally {
            setWechatLoading(false);
        }
    }, []);

    const fetchAlipayConfig = useCallback(async () => {
        setAlipayLoading(true);
        try {
            const res = await apiClient.get('/payments/config/alipay/');
            const data = res.data;
            setAlipayConfig(data);
            setAlipayForm({
                app_id: data.app_id || '',
                alipay_public_key: data.alipay_public_key || '',
                notify_url: data.notify_url || '',
                return_url: data.return_url || '',
            });
        } catch {
            // 可能未配置
        } finally {
            setAlipayLoading(false);
        }
    }, []);

    // 首次加载
    useEffect(() => {
        fetchShopInfo();
        fetchStaff();
        fetchWechatConfig();
        fetchAlipayConfig();
    }, [fetchShopInfo, fetchStaff, fetchWechatConfig, fetchAlipayConfig]);

    // ── 店铺信息保存 ──

    const handleShopSave = async () => {
        setShopSaving(true);
        setShopSaveSuccess(false);
        try {
            await apiClient.put('/shops/current/', shopForm);
            setShopSaveSuccess(true);
            showToast('店铺信息已保存');
            fetchShopInfo();
        } catch {
            showToast('保存店铺信息失败', 'error');
        } finally {
            setShopSaving(false);
        }
    };

    // ── 员工管理 ──

    const handleAddStaff = async () => {
        if (!staffForm.user_id && !staffForm.username) {
            showToast('请选择或输入用户', 'error');
            return;
        }
        setStaffSaving(true);
        try {
            await apiClient.post('/shops/current/staff/', staffForm);
            showToast('员工已添加');
            setStaffDialogOpen(false);
            setStaffForm({user_id: '', username: '', role: 'staff', permissions: []});
            fetchStaff();
        } catch {
            showToast('添加员工失败', 'error');
        } finally {
            setStaffSaving(false);
        }
    };

    const togglePermission = (perm: string) => {
        setStaffForm(prev => ({
            ...prev,
            permissions: prev.permissions.includes(perm)
                ? prev.permissions.filter(p => p !== perm)
                : [...prev.permissions, perm],
        }));
    };

    // ── 支付配置保存 ──

    const handleWechatSave = async () => {
        setWechatSaving(true);
        setWechatSaveSuccess(false);
        try {
            await apiClient.put('/payments/config/wechat/', wechatForm);
            setWechatSaveSuccess(true);
            showToast('微信支付配置已保存');
            fetchWechatConfig();
        } catch {
            showToast('保存微信支付配置失败', 'error');
        } finally {
            setWechatSaving(false);
        }
    };

    const handleAlipaySave = async () => {
        setAlipaySaving(true);
        setAlipaySaveSuccess(false);
        try {
            await apiClient.put('/payments/config/alipay/', alipayForm);
            setAlipaySaveSuccess(true);
            showToast('支付宝配置已保存');
            fetchAlipayConfig();
        } catch {
            showToast('保存支付宝配置失败', 'error');
        } finally {
            setAlipaySaving(false);
        }
    };

    // ── 渲染 ──

    return (
        <div className="space-y-6">
            {/* 页面标题 */}
            <div>
                <h1 className="text-2xl font-semibold">店铺设置</h1>
                <p className="text-sm text-muted-foreground mt-1">管理店铺信息、员工和支付配置</p>
            </div>

            {/* Toast 提示 */}
            {toast && (
                <div
                    className={`fixed top-4 right-4 z-50 rounded-lg px-4 py-2 text-sm font-medium shadow-lg transition-all ${
                        toast.type === 'success'
                            ? 'bg-green-600 text-white'
                            : 'bg-destructive text-destructive-foreground'
                    }`}
                >
                    {toast.message}
                </div>
            )}

            {/* 主 Tabs */}
            <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="w-full sm:w-auto">
                    <TabsTrigger value="shop">店铺信息</TabsTrigger>
                    <TabsTrigger value="staff">员工管理</TabsTrigger>
                    <TabsTrigger value="payment">支付配置</TabsTrigger>
                </TabsList>

                {/* ═══════════════════ 店铺信息 Tab ═══════════════════ */}
                <TabsContent value="shop">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Building2 size={18}/>
                                基本信息
                            </CardTitle>
                        </CardHeader>
                        <CardContent>
                            {shopLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="size-5 animate-spin text-muted-foreground"/>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                                    {/* 店铺名称 */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="shop-name">店铺名称</Label>
                                        <Input
                                            id="shop-name"
                                            value={shopForm.name || ''}
                                            onChange={e => setShopForm(p => ({...p, name: e.target.value}))}
                                            placeholder="输入店铺名称"
                                        />
                                    </div>

                                    {/* 联系电话 */}
                                    <div className="space-y-1.5">
                                        <Label htmlFor="shop-phone">联系电话</Label>
                                        <Input
                                            id="shop-phone"
                                            value={shopForm.phone || ''}
                                            onChange={e => setShopForm(p => ({...p, phone: e.target.value}))}
                                            placeholder="输入联系电话"
                                        />
                                    </div>

                                    {/* 店铺地址 */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="shop-address">店铺地址</Label>
                                        <Input
                                            id="shop-address"
                                            value={shopForm.address || ''}
                                            onChange={e => setShopForm(p => ({...p, address: e.target.value}))}
                                            placeholder="输入店铺地址"
                                        />
                                    </div>

                                    {/* 店铺描述 */}
                                    <div className="space-y-1.5 md:col-span-2">
                                        <Label htmlFor="shop-desc">店铺描述</Label>
                                        <Input
                                            id="shop-desc"
                                            value={shopForm.description || ''}
                                            onChange={e => setShopForm(p => ({...p, description: e.target.value}))}
                                            placeholder="输入店铺描述"
                                        />
                                    </div>

                                    {/* 营业时间 */}
                                    <div className="space-y-1.5">
                                        <Label>工作日营业时间</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={shopForm.business_hours?.weekday_start || ''}
                                                onChange={e => setShopForm(p => ({
                                                    ...p,
                                                    business_hours: {
                                                        ...p.business_hours,
                                                        weekday_start: e.target.value
                                                    },
                                                }))}
                                                placeholder="09:00"
                                                className="w-full sm:w-32"
                                            />
                                            <span className="text-muted-foreground">至</span>
                                            <Input
                                                value={shopForm.business_hours?.weekday_end || ''}
                                                onChange={e => setShopForm(p => ({
                                                    ...p,
                                                    business_hours: {...p.business_hours, weekday_end: e.target.value},
                                                }))}
                                                placeholder="21:00"
                                                className="w-full sm:w-32"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label>周末营业时间</Label>
                                        <div className="flex items-center gap-2">
                                            <Input
                                                value={shopForm.business_hours?.weekend_start || ''}
                                                onChange={e => setShopForm(p => ({
                                                    ...p,
                                                    business_hours: {
                                                        ...p.business_hours,
                                                        weekend_start: e.target.value
                                                    },
                                                }))}
                                                placeholder="10:00"
                                                className="w-full sm:w-32"
                                            />
                                            <span className="text-muted-foreground">至</span>
                                            <Input
                                                value={shopForm.business_hours?.weekend_end || ''}
                                                onChange={e => setShopForm(p => ({
                                                    ...p,
                                                    business_hours: {...p.business_hours, weekend_end: e.target.value},
                                                }))}
                                                placeholder="22:00"
                                                className="w-full sm:w-32"
                                            />
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 配送设置 */}
                    <Card className="mt-6">
                        <CardHeader>
                            <CardTitle>配送设置</CardTitle>
                        </CardHeader>
                        <CardContent>
                            {!shopLoading && (
                                <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
                                    <div className="space-y-1.5">
                                        <Label htmlFor="delivery-fee">配送费（元）</Label>
                                        <Input
                                            id="delivery-fee"
                                            type="number"
                                            min={0}
                                            step={0.1}
                                            value={shopForm.delivery_fee ?? 0}
                                            onChange={e => setShopForm(p => ({
                                                ...p,
                                                delivery_fee: parseFloat(e.target.value) || 0
                                            }))}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="delivery-radius">配送半径（km）</Label>
                                        <Input
                                            id="delivery-radius"
                                            type="number"
                                            min={0}
                                            step={0.5}
                                            value={shopForm.delivery_radius ?? 0}
                                            onChange={e => setShopForm(p => ({
                                                ...p,
                                                delivery_radius: parseFloat(e.target.value) || 0
                                            }))}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <Label htmlFor="min-order">最低起送价（元）</Label>
                                        <Input
                                            id="min-order"
                                            type="number"
                                            min={0}
                                            step={1}
                                            value={shopForm.minimum_order_amount ?? 0}
                                            onChange={e => setShopForm(p => ({
                                                ...p,
                                                minimum_order_amount: parseFloat(e.target.value) || 0
                                            }))}
                                        />
                                    </div>

                                    <div className="flex items-center gap-4 pt-4">
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="allow-delivery"
                                                checked={shopForm.allow_delivery ?? false}
                                                onCheckedChange={v => setShopForm(p => ({...p, allow_delivery: v}))}
                                            />
                                            <Label htmlFor="allow-delivery">支持外卖配送</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="allow-pickup"
                                                checked={shopForm.allow_pickup ?? false}
                                                onCheckedChange={v => setShopForm(p => ({...p, allow_pickup: v}))}
                                            />
                                            <Label htmlFor="allow-pickup">支持到店自取</Label>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Switch
                                                id="allow-dine-in"
                                                checked={shopForm.allow_dine_in ?? false}
                                                onCheckedChange={v => setShopForm(p => ({...p, allow_dine_in: v}))}
                                            />
                                            <Label htmlFor="allow-dine-in">支持堂食</Label>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="justify-end gap-2">
                            {shopSaveSuccess && (
                                <span className="text-sm text-green-600">已保存 ✓</span>
                            )}
                            <Button onClick={handleShopSave} disabled={shopLoading || shopSaving}
                                    className="w-full sm:w-auto">
                                {shopSaving ? (
                                    <><Loader2 className="size-4 animate-spin"/> 保存中...</>
                                ) : (
                                    <><Save size={16}/> 保存设置</>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* ═══════════════════ 员工管理 Tab ═══════════════════ */}
                <TabsContent value="staff">
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>员工列表</CardTitle>
                                <Button onClick={() => setStaffDialogOpen(true)} className="w-full sm:w-auto">
                                    <Plus size={16}/>
                                    新增员工
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {staffLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="size-5 animate-spin text-muted-foreground"/>
                                </div>
                            ) : staffList.length === 0 ? (
                                <div
                                    className="flex flex-col items-center justify-center py-8 text-sm text-muted-foreground">
                                    <UserPlus size={36} className="mb-2 opacity-40"/>
                                    暂无员工，点击上方按钮添加
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <Table>
                                        <TableHeader>
                                            <TableRow>
                                                <TableHead>用户名</TableHead>
                                                <TableHead>角色</TableHead>
                                                <TableHead>权限</TableHead>
                                                <TableHead>状态</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {staffList.map(staff => (
                                                <TableRow key={staff.id}>
                                                    <TableCell className="font-medium">
                                                        {staff.display_name || staff.username}
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant="secondary">
                                                            {ROLE_OPTIONS.find(r => r.value === staff.role)?.label || staff.role}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex flex-wrap gap-1">
                                                            {staff.permissions?.length ? (
                                                                staff.permissions.map(perm => (
                                                                    <Badge key={perm} variant="outline"
                                                                           className="text-xs">
                                                                        {PERMISSION_OPTIONS.find(p => p.value === perm)?.label || perm}
                                                                    </Badge>
                                                                ))
                                                            ) : (
                                                                <span className="text-xs text-muted-foreground">—</span>
                                                            )}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Badge variant={staff.is_active ? 'success' : 'warning'}>
                                                            {staff.is_active ? '在职' : '离职'}
                                                        </Badge>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* 新增员工 Dialog */}
                    <Dialog open={staffDialogOpen} onOpenChange={setStaffDialogOpen}>
                        <DialogContent className="w-[95vw] sm:max-w-lg">
                            <DialogHeader>
                                <DialogTitle>新增员工</DialogTitle>
                                <DialogDescription>
                                    添加新的员工账号并设置角色与权限
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 py-2">
                                {/* 用户名 */}
                                <div className="space-y-1.5">
                                    <Label htmlFor="staff-username">用户名</Label>
                                    <Input
                                        id="staff-username"
                                        value={staffForm.username}
                                        onChange={e => setStaffForm(p => ({
                                            ...p,
                                            username: e.target.value,
                                            user_id: ''
                                        }))}
                                        placeholder="输入用户名"
                                    />
                                </div>

                                {/* 角色 */}
                                <div className="space-y-1.5">
                                    <Label>角色</Label>
                                    <Select
                                        value={staffForm.role}
                                        onValueChange={v => setStaffForm(p => ({...p, role: v}))}
                                    >
                                        <SelectTrigger>
                                            <SelectValue placeholder="选择角色"/>
                                        </SelectTrigger>
                                        <SelectContent>
                                            {ROLE_OPTIONS.map(opt => (
                                                <SelectItem key={opt.value} value={opt.value}>
                                                    {opt.label}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>

                                {/* 权限 */}
                                <div className="space-y-1.5">
                                    <Label>权限</Label>
                                    <div className="grid grid-cols-2 gap-2 rounded-lg border p-3">
                                        {PERMISSION_OPTIONS.map(perm => (
                                            <label
                                                key={perm.value}
                                                className="flex items-center gap-2 cursor-pointer text-sm"
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={staffForm.permissions.includes(perm.value)}
                                                    onChange={() => togglePermission(perm.value)}
                                                    className="rounded border-gray-300"
                                                />
                                                {perm.label}
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <DialogFooter>
                                <DialogClose asChild>
                                    <Button variant="outline" className="w-full sm:w-auto">取消</Button>
                                </DialogClose>
                                <Button onClick={handleAddStaff} disabled={staffSaving} className="w-full sm:w-auto">
                                    {staffSaving ? (
                                        <><Loader2 className="size-4 animate-spin"/> 添加中...</>
                                    ) : (
                                        <><UserPlus size={16}/> 添加</>
                                    )}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </TabsContent>

                {/* ═══════════════════ 支付配置 Tab ═══════════════════ */}
                <TabsContent value="payment">
                    <Card>
                        <CardHeader>
                            <CardTitle>支付配置</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <Tabs value={payTab} onValueChange={setPayTab}>
                                <TabsList>
                                    <TabsTrigger value="wechat">微信支付</TabsTrigger>
                                    <TabsTrigger value="alipay">支付宝</TabsTrigger>
                                </TabsList>

                                {/* ── 微信支付 ── */}
                                <TabsContent value="wechat">
                                    {wechatLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="size-5 animate-spin text-muted-foreground"/>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="wx-app-id">App ID</Label>
                                                <Input
                                                    id="wx-app-id"
                                                    value={wechatForm.app_id || ''}
                                                    onChange={e => setWechatForm(p => ({...p, app_id: e.target.value}))}
                                                    placeholder="微信开放平台 AppID"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="wx-mch-id">商户号 (MCH ID)</Label>
                                                <Input
                                                    id="wx-mch-id"
                                                    value={wechatForm.mch_id || ''}
                                                    onChange={e => setWechatForm(p => ({...p, mch_id: e.target.value}))}
                                                    placeholder="微信支付商户号"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="wx-api-key">API 密钥</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="wx-api-key"
                                                        type={wechatShowSecrets ? 'text' : 'password'}
                                                        value={wechatForm.api_key || ''}
                                                        onChange={e => setWechatForm(p => ({
                                                            ...p,
                                                            api_key: e.target.value
                                                        }))}
                                                        placeholder="API v3 密钥"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setWechatShowSecrets(!wechatShowSecrets)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {wechatShowSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="wx-api-secret">API Secret</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="wx-api-secret"
                                                        type={wechatShowSecrets ? 'text' : 'password'}
                                                        value={wechatForm.api_secret || ''}
                                                        onChange={e => setWechatForm(p => ({
                                                            ...p,
                                                            api_secret: e.target.value
                                                        }))}
                                                        placeholder="API 密钥"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setWechatShowSecrets(!wechatShowSecrets)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {wechatShowSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="wx-notify-url">支付通知 URL</Label>
                                                <Input
                                                    id="wx-notify-url"
                                                    value={wechatForm.notify_url || ''}
                                                    onChange={e => setWechatForm(p => ({
                                                        ...p,
                                                        notify_url: e.target.value
                                                    }))}
                                                    placeholder="https://example.com/api/payments/wechat/notify/"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="wx-refund-url">退款通知 URL</Label>
                                                <Input
                                                    id="wx-refund-url"
                                                    value={wechatForm.refund_url || ''}
                                                    onChange={e => setWechatForm(p => ({
                                                        ...p,
                                                        refund_url: e.target.value
                                                    }))}
                                                    placeholder="https://example.com/api/payments/wechat/refund/"
                                                />
                                            </div>

                                            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                                                {wechatSaveSuccess && (
                                                    <span className="text-sm text-green-600">已保存 ✓</span>
                                                )}
                                                <Button onClick={handleWechatSave} disabled={wechatSaving}
                                                        className="w-full sm:w-auto">
                                                    {wechatSaving ? (
                                                        <><Loader2 className="size-4 animate-spin"/> 保存中...</>
                                                    ) : (
                                                        <><Save size={16}/> 保存微信支付配置</>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>

                                {/* ── 支付宝 ── */}
                                <TabsContent value="alipay">
                                    {alipayLoading ? (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="size-5 animate-spin text-muted-foreground"/>
                                        </div>
                                    ) : (
                                        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 pt-4">
                                            <div className="space-y-1.5">
                                                <Label htmlFor="ali-app-id">App ID</Label>
                                                <Input
                                                    id="ali-app-id"
                                                    value={alipayForm.app_id || ''}
                                                    onChange={e => setAlipayForm(p => ({...p, app_id: e.target.value}))}
                                                    placeholder="支付宝开放平台 AppID"
                                                />
                                            </div>

                                            <div className="space-y-1.5 md:col-span-2">
                                                <Label htmlFor="ali-public-key">支付宝公钥</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="ali-public-key"
                                                        type={alipayShowSecrets ? 'text' : 'password'}
                                                        value={alipayForm.alipay_public_key || ''}
                                                        onChange={e => setAlipayForm(p => ({
                                                            ...p,
                                                            alipay_public_key: e.target.value
                                                        }))}
                                                        placeholder="支付宝公钥内容"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setAlipayShowSecrets(!alipayShowSecrets)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {alipayShowSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5 md:col-span-2">
                                                <Label htmlFor="ali-private-key">应用私钥</Label>
                                                <div className="relative">
                                                    <Input
                                                        id="ali-private-key"
                                                        type={alipayShowSecrets ? 'text' : 'password'}
                                                        value={alipayForm.app_private_key || ''}
                                                        onChange={e => setAlipayForm(p => ({
                                                            ...p,
                                                            app_private_key: e.target.value
                                                        }))}
                                                        placeholder="应用私钥内容"
                                                    />
                                                    <button
                                                        type="button"
                                                        onClick={() => setAlipayShowSecrets(!alipayShowSecrets)}
                                                        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    >
                                                        {alipayShowSecrets ? <EyeOff size={16}/> : <Eye size={16}/>}
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="ali-notify-url">异步通知 URL</Label>
                                                <Input
                                                    id="ali-notify-url"
                                                    value={alipayForm.notify_url || ''}
                                                    onChange={e => setAlipayForm(p => ({
                                                        ...p,
                                                        notify_url: e.target.value
                                                    }))}
                                                    placeholder="https://example.com/api/payments/alipay/notify/"
                                                />
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label htmlFor="ali-return-url">同步跳转 URL</Label>
                                                <Input
                                                    id="ali-return-url"
                                                    value={alipayForm.return_url || ''}
                                                    onChange={e => setAlipayForm(p => ({
                                                        ...p,
                                                        return_url: e.target.value
                                                    }))}
                                                    placeholder="https://example.com/order/result/"
                                                />
                                            </div>

                                            <div className="md:col-span-2 flex items-center justify-end gap-2 pt-2">
                                                {alipaySaveSuccess && (
                                                    <span className="text-sm text-green-600">已保存 ✓</span>
                                                )}
                                                <Button onClick={handleAlipaySave} disabled={alipaySaving}
                                                        className="w-full sm:w-auto">
                                                    {alipaySaving ? (
                                                        <><Loader2 className="size-4 animate-spin"/> 保存中...</>
                                                    ) : (
                                                        <><Save size={16}/> 保存支付宝配置</>
                                                    )}
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
