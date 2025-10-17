from django.contrib import admin

from .models import (
    Category, Product, Specification, SpecificationValue,
    ProductSKU, ProductAttribute, ProductAttributeOption,
    InventoryLog, ProductImage
)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ('name', 'parent', 'sort_order', 'is_active', 'products_count')
    list_filter = ('is_active', 'shop')
    search_fields = ('name',)
    ordering = ('sort_order', 'name')

    def products_count(self, obj):
        return obj.products.count()

    products_count.short_description = '商品数量'


class ProductImageInline(admin.TabularInline):
    model = ProductImage
    extra = 1


class ProductAttributeOptionInline(admin.TabularInline):
    model = ProductAttributeOption
    extra = 1


@admin.register(ProductAttribute)
class ProductAttributeAdmin(admin.ModelAdmin):
    list_display = ('name', 'product', 'attribute_type', 'is_required', 'sort_order')
    list_filter = ('attribute_type', 'is_required')
    inlines = [ProductAttributeOptionInline]


class ProductSKUInline(admin.TabularInline):
    model = ProductSKU
    extra = 1
    readonly_fields = ('is_in_stock', 'is_low_stock')
    fields = ('sku_code', 'price', 'stock_quantity', 'is_active', 'is_in_stock', 'is_low_stock')


@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'base_price', 'status', 'is_featured', 'created_at')
    list_filter = ('status', 'is_featured', 'category', 'shop')
    search_fields = ('name', 'description')
    ordering = ('-created_at',)
    inlines = [ProductSKUInline, ProductImageInline]

    fieldsets = (
        ('基础信息', {
            'fields': ('name', 'description', 'category', 'shop')
        }),
        ('价格和图片', {
            'fields': ('base_price', 'cost_price', 'main_image')
        }),
        ('状态和设置', {
            'fields': ('status', 'is_featured', 'sort_order', 'allow_customization', 'preparation_time')
        }),
    )


@admin.register(ProductSKU)
class ProductSKUAdmin(admin.ModelAdmin):
    list_display = ('sku_code', 'product', 'price', 'stock_quantity', 'is_in_stock', 'is_low_stock')
    list_filter = ('is_active', 'product__shop')
    search_fields = ('sku_code', 'product__name')
    filter_horizontal = ('specifications',)

    def is_in_stock(self, obj):
        return obj.is_in_stock

    is_in_stock.boolean = True
    is_in_stock.short_description = '有库存'

    def is_low_stock(self, obj):
        return obj.is_low_stock

    is_low_stock.boolean = True
    is_low_stock.short_description = '低库存'


@admin.register(Specification)
class SpecificationAdmin(admin.ModelAdmin):
    list_display = ('name', 'display_name', 'shop', 'sort_order')
    list_filter = ('shop',)
    search_fields = ('name', 'display_name')


@admin.register(SpecificationValue)
class SpecificationValueAdmin(admin.ModelAdmin):
    list_display = ('specification', 'value', 'display_value', 'sort_order')
    list_filter = ('specification',)
    search_fields = ('value', 'display_value')


@admin.register(InventoryLog)
class InventoryLogAdmin(admin.ModelAdmin):
    list_display = ('sku', 'action', 'quantity_change', 'current_quantity', 'created_at')
    list_filter = ('action', 'created_at')
    search_fields = ('sku__product__name', 'reference_id')
    readonly_fields = ('created_at',)

    def has_add_permission(self, request):
        return False


admin.site.register(ProductImage)