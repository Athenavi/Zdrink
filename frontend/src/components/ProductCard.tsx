'use client';

import Image from 'next/image';
import {Card, CardContent} from '@/components/ui/card';
import {Button} from '@/components/ui/button';
import {formatPrice, getImageUrl} from '@/utils';
import {ShoppingCart} from 'lucide-react';

interface ProductCardProps {
    id: number;
    name: string;
    description?: string;
    price: number | string;  // 支持 number 和 string
    originalPrice?: number | string;
    image?: string;
    isAvailable: boolean;
    onClick?: () => void;
    onAddToCart?: (productId: number) => void;
}

export default function ProductCard({
                                        id,
                                        name,
                                        description,
                                        price,
                                        originalPrice,
                                        image,
                                        isAvailable,
                                        onClick,
                                        onAddToCart
                                    }: ProductCardProps) {
    return (
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300" onClick={onClick}>
            <CardContent className="p-0">
                {/* 商品图片 */}
                <div className="relative w-full h-48 bg-gray-100">
                    {image ? (
                        <Image
                            src={getImageUrl(image)}
                            alt={name}
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400">
                            暂无图片
                        </div>
                    )}

                    {/* 售罄标签 */}
                    {!isAvailable && (
                        <div
                            className="absolute top-2 right-2 bg-red-500 text-white px-2 py-1 rounded text-xs font-medium">
                            售罄
                        </div>
                    )}
                </div>

                {/* 商品信息 */}
                <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1 line-clamp-1">{name}</h3>

                    {description && (
                        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{description}</p>
                    )}

                    {/* 价格 */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
              <span className="text-xl font-bold text-red-600">
                {formatPrice(price)}
              </span>
                            {originalPrice && originalPrice > price && (
                                <span className="text-sm text-gray-400 line-through">
                  {formatPrice(originalPrice)}
                </span>
                            )}
                        </div>
                    </div>

                    {/* 加入购物车按钮 */}
                    <Button
                        onClick={() => onAddToCart?.(id)}
                        disabled={!isAvailable}
                        className="w-full"
                        variant={isAvailable ? 'default' : 'secondary'}
                    >
                        <ShoppingCart className="w-4 h-4 mr-2"/>
                        {isAvailable ? '加入购物车' : '已售罄'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    );
}
