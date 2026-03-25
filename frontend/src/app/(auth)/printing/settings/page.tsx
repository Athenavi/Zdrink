'use client';

import {useEffect, useState} from 'react';
import {useRouter} from 'next/navigation';
import {Check, Plus, Printer, Settings, X} from 'lucide-react';
import {printingApi} from '@/lib/api/printing';

interface Printer {
    id: number;
    name: string;
    description: string;
    printer_type: string;
    connection_type: string;
    ip_address?: string;
    port?: number;
    is_online: boolean;
    is_default: boolean;
}

interface Template {
    id: number;
    name: string;
    template_type: string;
    content_preview: string;
    is_default: boolean;
}

interface PrinterFormData {
    name: string;
    description: string;
    printer_type: string;
    connection_type: string;
    ip_address?: string;
    port: string;
}

export default function PrinterSettingsPage() {
    const router = useRouter();
    const [printers, setPrinters] = useState<Printer[]>([]);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [showAddPrinter, setShowAddPrinter] = useState(false);
    const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
    const [showTestPrintDialog, setShowTestPrintDialog] = useState(false);
    const [testPrintContent, setTestPrintContent] = useState('');
    const [selectedPrinter, setSelectedPrinter] = useState<Printer | null>(null);

    const [printerForm, setPrinterForm] = useState<PrinterFormData>({
        name: '',
        description: '',
        printer_type: '',
        connection_type: '',
        ip_address: '',
        port: ''
    });

    useEffect(() => {
        loadPrinters();
        loadTemplates();
    }, []);

    const loadPrinters = async () => {
        try {
            const response = await printingApi.getPrinters();
            setPrinters((response.data as any).results || response.data || []);
        } catch (error) {
            console.error('加载打印机失败:', error);
            alert('加载失败');
        }
    };

    const loadTemplates = async () => {
        try {
            const response = await printingApi.getTemplates();
            setTemplates((response.data as any).results || response.data || []);
        } catch (error) {
            console.error('加载模板失败:', error);
            alert('加载失败');
        }
    };

    const closePrinterForm = () => {
        setShowAddPrinter(false);
        setEditingPrinter(null);
        setPrinterForm({
            name: '',
            description: '',
            printer_type: '',
            connection_type: '',
            ip_address: '',
            port: ''
        });
    };

    const handleEditPrinter = (printer: Printer) => {
        setEditingPrinter(printer);
        setPrinterForm({
            ...printer,
            port: printer.port?.toString() || ''
        });
        setShowAddPrinter(true);
    };

    const handleDeletePrinter = async (printer: Printer) => {
        if (!confirm(`确定要删除打印机"${printer.name}"吗？`)) {
            return;
        }

        try {
            await printingApi.deletePrinter(printer.id);
            alert('删除成功');
            await loadPrinters();
        } catch (error) {
            console.error('删除失败:', error);
            alert('删除失败');
        }
    };

    const handleSubmitPrinter = async (e: React.FormEvent) => {
        e.preventDefault();

        try {
            if (editingPrinter) {
                await printingApi.updatePrinter(editingPrinter.id, printerForm);
                alert('打印机已更新');
            } else {
                await printingApi.createPrinter(printerForm);
                alert('打印机已添加');
            }
            closePrinterForm();
            await loadPrinters();
        } catch (error) {
            console.error('保存打印机失败:', error);
            alert('保存失败');
        }
    };

    const handleTestPrint = (printer: Printer) => {
        setSelectedPrinter(printer);
        setTestPrintContent('测试打印内容\n时间：' + new Date().toLocaleString());
        setShowTestPrintDialog(true);
    };

    const confirmTestPrint = async () => {
        try {
            if (selectedPrinter) {
                await printingApi.testPrint(selectedPrinter.id, {
                    content: testPrintContent
                });
                alert('测试打印已发送');
            }
        } catch (error) {
            console.error('测试打印失败:', error);
            alert('测试打印失败');
        }
    };

    const handleSetDefault = async (template: Template) => {
        try {
            await printingApi.setDefaultTemplate(template.id);
            alert('已设置为默认模板');
            await loadTemplates();
        } catch (error) {
            console.error('设置失败:', error);
            alert('设置失败');
        }
    };

    const getPrinterTypeText = (type: string) => {
        const typeMap: Record<string, string> = {
            thermal: '热敏打印机',
            dot_matrix: '针式打印机',
            laser: '激光打印机'
        };
        return typeMap[type] || type;
    };

    const getTemplateTypeText = (type: string) => {
        const typeMap: Record<string, string> = {
            order_receipt: '订单小票',
            kitchen_order: '厨房单',
            delivery: '外卖单',
            invoice: '发票'
        };
        return typeMap[type] || type;
    };

    return (
        <div className="min-h-screen bg-gray-100 pb-8">
            {/* 头部 */}
            <div className="bg-white shadow-sm sticky top-0 z-10">
                <div className="max-w-3xl mx-auto px-4 py-4">
                    <h1 className="text-xl font-bold text-gray-800">打印机设置</h1>
                </div>
            </div>

            <div className="max-w-3xl mx-auto px-4 mt-4 space-y-4">
                {/* 打印机列表 */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                        <h2 className="text-lg font-semibold">打印机管理</h2>
                        <button
                            onClick={() => setShowAddPrinter(true)}
                            className="flex items-center gap-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
                        >
                            <Plus className="w-5 h-5"/>
                            <span>添加打印机</span>
                        </button>
                    </div>

                    {printers.length === 0 ? (
                        <div className="text-center py-12 text-gray-400">
                            <Printer className="w-16 h-16 mx-auto mb-3 opacity-30"/>
                            <p>暂无打印机</p>
                            <p className="text-sm mt-1">点击右上角添加打印机</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-gray-100">
                            {printers.map((printer) => (
                                <div key={printer.id} className="p-4 hover:bg-gray-50 transition-colors">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <h3 className="font-semibold">{printer.name}</h3>
                                                <span className={`px-2 py-0.5 text-xs rounded ${
                                                    printer.is_online ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                                }`}>
                          {printer.is_online ? '在线' : '离线'}
                        </span>
                                            </div>
                                            <p className="text-sm text-gray-500">{printer.description}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1 text-sm text-gray-600 mb-3">
                                        <div className="flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-gray-400"/>
                                            <span>类型：{getPrinterTypeText(printer.printer_type)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Settings className="w-4 h-4 text-gray-400"/>
                                            <span>连接：{printer.connection_type === 'network' ? `网络 (${printer.ip_address})` : printer.connection_type}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Check className="w-4 h-4 text-gray-400"/>
                                            <span>默认模板：{printer.is_default ? '是' : '否'}</span>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleTestPrint(printer)}
                                            className="px-3 py-1.5 text-sm border border-blue-500 text-blue-500 rounded hover:bg-blue-50 transition-colors"
                                        >
                                            测试打印
                                        </button>
                                        <button
                                            onClick={() => handleEditPrinter(printer)}
                                            className="px-3 py-1.5 text-sm border border-orange-500 text-orange-500 rounded hover:bg-orange-50 transition-colors"
                                        >
                                            编辑
                                        </button>
                                        <button
                                            onClick={() => handleDeletePrinter(printer)}
                                            className="ml-auto px-3 py-1.5 text-sm border border-red-500 text-red-500 rounded hover:bg-red-50 transition-colors"
                                        >
                                            删除
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 打印模板 */}
                <div className="bg-white rounded-xl overflow-hidden shadow-sm">
                    <div className="p-4 border-b border-gray-100">
                        <h2 className="text-lg font-semibold">打印模板管理</h2>
                        <p className="text-sm text-gray-500 mt-1">配置不同场景的打印模板样式</p>
                    </div>

                    <div className="divide-y divide-gray-100">
                        {templates.map((template) => (
                            <div
                                key={template.id}
                                className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <div>
                                        <h3 className="font-semibold">{template.name}</h3>
                                        <span
                                            className="inline-block mt-1 px-2 py-0.5 text-xs border border-blue-500 text-blue-500 rounded">
                      {getTemplateTypeText(template.template_type)}
                    </span>
                                    </div>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={template.is_default}
                                            onChange={() => handleSetDefault(template)}
                                            onClick={(e) => e.stopPropagation()}
                                            className="w-4 h-4 text-blue-500 rounded"
                                        />
                                        <span className="text-sm">默认</span>
                                    </label>
                                </div>
                                <div
                                    className="mt-3 p-3 bg-gray-50 rounded font-mono text-xs text-gray-600 whitespace-pre-wrap">
                                    {template.content_preview}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* 添加/编辑打印机弹窗 */}
            {showAddPrinter && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center">
                    <div
                        className="bg-white w-full max-w-3xl rounded-t-2xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
                        <div
                            className="sticky top-0 bg-white border-b border-gray-200 px-4 py-4 flex items-center justify-between rounded-t-2xl">
                            <h3 className="text-lg font-semibold">
                                {editingPrinter ? '编辑打印机' : '添加打印机'}
                            </h3>
                            <button onClick={closePrinterForm} className="text-gray-400 hover:text-gray-600">
                                <X className="w-6 h-6"/>
                            </button>
                        </div>

                        <form onSubmit={handleSubmitPrinter} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">打印机名称</label>
                                <input
                                    type="text"
                                    value={printerForm.name}
                                    onChange={(e) => setPrinterForm(prev => ({...prev, name: e.target.value}))}
                                    placeholder="请输入打印机名称"
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
                                <textarea
                                    value={printerForm.description}
                                    onChange={(e) => setPrinterForm(prev => ({...prev, description: e.target.value}))}
                                    placeholder="请输入打印机描述"
                                    rows={2}
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">打印机类型</label>
                                <select
                                    value={printerForm.printer_type}
                                    onChange={(e) => setPrinterForm(prev => ({...prev, printer_type: e.target.value}))}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">请选择类型</option>
                                    <option value="thermal">热敏打印机</option>
                                    <option value="dot_matrix">针式打印机</option>
                                    <option value="laser">激光打印机</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">连接方式</label>
                                <select
                                    value={printerForm.connection_type}
                                    onChange={(e) => setPrinterForm(prev => ({
                                        ...prev,
                                        connection_type: e.target.value
                                    }))}
                                    required
                                    className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                >
                                    <option value="">请选择连接方式</option>
                                    <option value="usb">USB</option>
                                    <option value="network">网络</option>
                                    <option value="bluetooth">蓝牙</option>
                                </select>
                            </div>

                            {printerForm.connection_type === 'network' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">IP 地址</label>
                                        <input
                                            type="text"
                                            value={printerForm.ip_address}
                                            onChange={(e) => setPrinterForm(prev => ({
                                                ...prev,
                                                ip_address: e.target.value
                                            }))}
                                            placeholder="例如：192.168.1.100"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">端口</label>
                                        <input
                                            type="number"
                                            value={printerForm.port}
                                            onChange={(e) => setPrinterForm(prev => ({...prev, port: e.target.value}))}
                                            placeholder="例如：9100"
                                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500"
                                        />
                                    </div>
                                </>
                            )}

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={closePrinterForm}
                                    className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                    取消
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                                >
                                    保存
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* 测试打印弹窗 */}
            {showTestPrintDialog && (
                <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md">
                        <div className="px-4 py-3 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">测试打印</h3>
                        </div>

                        <div className="p-4">
              <textarea
                  value={testPrintContent}
                  onChange={(e) => setTestPrintContent(e.target.value)}
                  placeholder="输入测试打印内容"
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:border-blue-500 resize-none"
              />
                        </div>

                        <div className="px-4 py-3 border-t border-gray-200 flex gap-3">
                            <button
                                type="button"
                                onClick={() => setShowTestPrintDialog(false)}
                                className="flex-1 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                取消
                            </button>
                            <button
                                type="button"
                                onClick={confirmTestPrint}
                                className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
                            >
                                确定
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
