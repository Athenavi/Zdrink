'use client';

/**
 * Electron 窗口控制栏组件
 * 仅在 Electron 环境中显示
 */

import {useIsElectron} from '@/hooks/use-electron';
import {closeWindow, maximizeWindow, minimizeWindow} from '@/lib/platform';
import {Minus, Square, X} from 'lucide-react';
import {Button} from '@/components/ui/button';

export function ElectronTitleBar() {
    const isElectron = useIsElectron();

    // 不在 Electron 环境中，不渲染
    if (!isElectron) {
        return null;
    }

    return (
        <div
            className="h-8 bg-background border-b flex items-center justify-between px-2 select-none"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                WebkitAppRegion: 'drag' as any, // 可拖动区域
            }}
        >
            {/* 左侧：应用标题 */}
            <div className="text-xs font-medium text-muted-foreground pl-2">
                zDrink POS
            </div>

            {/* 右侧：窗口控制按钮 */}
            <div className="flex items-center gap-1" style={{WebkitAppRegion: 'no-drag' as any}}>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={minimizeWindow}
                    title="最小化"
                >
                    <Minus className="h-4 w-4"/>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-muted"
                    onClick={maximizeWindow}
                    title="最大化"
                >
                    <Square className="h-3.5 w-3.5"/>
                </Button>

                <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={closeWindow}
                    title="关闭"
                >
                    <X className="h-4 w-4"/>
                </Button>
            </div>
        </div>
    );
}
