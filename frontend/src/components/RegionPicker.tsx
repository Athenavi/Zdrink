'use client';

import {useEffect, useState} from 'react';
import {loadCities, loadDistricts, loadProvinces} from '@/lib/regionData';

interface RegionPickerProps {
    visible: boolean;
    value?: {
        province: string;
        city: string;
        district: string;
    };
    onChange: (value: { province: string; city: string; district: string }) => void;
    onClose: () => void;
}

export default function RegionPicker({visible, value, onChange, onClose}: RegionPickerProps) {
    const [selectedProvince, setSelectedProvince] = useState('');
    const [selectedCity, setSelectedCity] = useState('');
    const [selectedDistrict, setSelectedDistrict] = useState('');
    const [step, setStep] = useState<1 | 2 | 3>(1); // 1:省份 2:城市 3:区县

    // 数据状态
    const [provinces, setProvinces] = useState<Array<{ code: string; name: string }>>([]);
    const [cities, setCities] = useState<Array<{ code: string; name: string }>>([]);
    const [districts, setDistricts] = useState<Array<{ code: string; name: string }>>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible) {
            loadProvincesData();
            if (value) {
                setSelectedProvince(value.province || '');
                setSelectedCity(value.city || '');
                setSelectedDistrict(value.district || '');
                if (value.province && value.city && value.district) {
                    setStep(3);
                } else if (value.province && value.city) {
                    setStep(2);
                } else if (value.province) {
                    setStep(1);
                } else {
                    setStep(1);
                }
            }
        }
    }, [visible, value]);

    // 加载省份数据
    const loadProvincesData = async () => {
        setLoading(true);
        try {
            const data = await loadProvinces();
            setProvinces(data);
        } catch (error) {
            console.error('加载省份失败:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleProvinceSelect = async (provinceName: string, provinceCode: string) => {
        setSelectedProvince(provinceName);
        setSelectedCity('');
        setSelectedDistrict('');
        setStep(2);

        // 异步加载城市数据
        setLoading(true);
        try {
            const cityData = await loadCities(provinceCode);
            setCities(cityData);
        } catch (error) {
            console.error('加载城市失败:', error);
            setCities([]);
        } finally {
            setLoading(false);
        }
    };

    const handleCitySelect = async (cityName: string, cityCode: string) => {
        setSelectedCity(cityName);
        setSelectedDistrict('');
        setStep(3);

        // 异步加载区县数据
        setLoading(true);
        try {
            const districtData = await loadDistricts(cityCode);
            setDistricts(districtData);
        } catch (error) {
            console.error('加载区县失败:', error);
            setDistricts([]);
        } finally {
            setLoading(false);
        }
    };

    const handleDistrictSelect = (districtName: string) => {
        setSelectedDistrict(districtName);
    };

    const handleConfirm = () => {
        if (selectedProvince && selectedCity && selectedDistrict) {
            onChange({
                province: selectedProvince,
                city: selectedCity,
                district: selectedDistrict
            });
            onClose();
        }
    };

    const handleBack = () => {
        if (step === 3) {
            setStep(2);
        } else if (step === 2) {
            setStep(1);
        }
    };

    if (!visible) return null;

    const getTitle = () => {
        if (step === 1) return '选择省份';
        if (step === 2) return '选择城市';
        return '选择区县';
    };

    const getList = () => {
        if (step === 1) return provinces.map(p => ({name: p.name, code: p.code}));
        if (step === 2) return cities.map(c => ({name: c.name, code: c.code}));
        return districts.map(d => ({name: d.name, code: d.code}));
    };

    const handleItemClick = (item: { name: string; code: string }) => {
        if (step === 1) handleProvinceSelect(item.name, item.code);
        else if (step === 2) handleCitySelect(item.name, item.code);
        else handleDistrictSelect(item.name);
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end" onClick={onClose}>
            <div className="bg-white w-full rounded-t-2xl max-h-[70vh] overflow-hidden"
                 onClick={e => e.stopPropagation()}>
                {/* 头部 */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <button
                        onClick={step === 1 ? onClose : handleBack}
                        className="px-4 py-2 text-gray-600 hover:text-gray-900"
                    >
                        {step === 1 ? '取消' : '返回'}
                    </button>
                    <span className="font-medium">{getTitle()}</span>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedProvince || !selectedCity || !selectedDistrict}
                        className="px-4 py-2 text-blue-500 hover:text-blue-600 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        确定
                    </button>
                </div>

                {/* 已选路径 */}
                {(selectedProvince || selectedCity || selectedDistrict) && (
                    <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
                        <div className="text-sm text-gray-600">
                            <span className="text-blue-500">{selectedProvince || '请选择'}</span>
                            {selectedCity && <span> / <span className="text-blue-500">{selectedCity}</span></span>}
                            {selectedDistrict &&
                                <span> / <span className="text-blue-500">{selectedDistrict}</span></span>}
                        </div>
                    </div>
                )}

                {/* 列表 */}
                <div className="overflow-y-auto max-h-[calc(70vh-120px)]">
                    {loading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="text-gray-500">加载中...</div>
                        </div>
                    ) : (
                        getList().map((item, index) => (
                            <button
                                key={index}
                                onClick={() => handleItemClick(item)}
                                className={`w-full px-4 py-3.5 text-left hover:bg-gray-50 transition-colors border-b border-gray-100 ${
                                    (step === 1 && item.name === selectedProvince) ||
                                    (step === 2 && item.name === selectedCity) ||
                                    (step === 3 && item.name === selectedDistrict)
                                        ? 'text-blue-500 bg-blue-50'
                                        : 'text-gray-700'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span>{item.name}</span>
                                    {((step === 1 && item.name === selectedProvince) ||
                                        (step === 2 && item.name === selectedCity) ||
                                        (step === 3 && item.name === selectedDistrict)) && (
                                        <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none"
                                             stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7"/>
                                        </svg>
                                    )}
                                </div>
                            </button>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
}
