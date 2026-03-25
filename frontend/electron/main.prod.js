/**
 * Electron 生产环境构建配置
 */

const {app, BrowserWindow, Menu, ipcMain, dialog} = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

// 获取应用版本
function getAppVersion() {
    return app.getVersion();
}

// 创建主窗口
function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1400,
        height: 900,
        minWidth: 1024,
        minHeight: 768,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
        icon: path.join(__dirname, '../public/icons/icon.png'),
        show: false,
        backgroundColor: '#FFFFFF',
    });

    // 加载应用
    if (isDev) {
        mainWindow.loadURL('http://localhost:3000');
        mainWindow.webContents.openDevTools();
    } else {
        // 生产环境：使用 standalone 模式
        const serverPath = path.join(__dirname, '../.next/standalone/server.js');
        // 设置环境变量
        process.env.PORT = '3000';
        process.env.NODE_ENV = 'production';

        // 启动 Next.js 服务器
        mainWindow.loadFile(serverPath);
    }

    // 窗口准备好后显示
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // 窗口关闭事件
    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // 创建菜单
    createMenu();

    // 处理未捕获的异常
    process.on('uncaughtException', (error) => {
        console.error('未捕获的异常:', error);
        dialog.showErrorBox('错误', '应用程序发生错误：' + error.message);
    });
}

// 创建应用菜单
function createMenu() {
    const template = [
        {
            label: '应用',
            submenu: [
                {
                    label: '关于 zDrink POS',
                    click: () => {
                        showAboutDialog();
                    },
                },
                {type: 'separator'},
                {
                    label: '刷新',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.reload();
                        }
                    },
                },
                {
                    label: '开发者工具',
                    accelerator: 'F12',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.toggleDevTools();
                        }
                    },
                },
                {type: 'separator'},
                {
                    label: '退出',
                    accelerator: 'CmdOrCtrl+Q',
                    click: () => {
                        app.quit();
                    },
                },
            ],
        },
        {
            label: '编辑',
            submenu: [
                {role: 'undo'},
                {role: 'redo'},
                {type: 'separator'},
                {role: 'cut'},
                {role: 'copy'},
                {role: 'paste'},
                {role: 'selectAll'},
            ],
        },
        {
            label: '视图',
            submenu: [
                {
                    label: '全屏',
                    accelerator: 'F11',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.setFullScreen(!mainWindow.isFullScreen());
                        }
                    },
                },
                {
                    label: '实际大小',
                    accelerator: 'CmdOrCtrl+0',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.zoomLevel = 0;
                        }
                    },
                },
                {
                    label: '放大',
                    accelerator: 'CmdOrCtrl+Plus',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.zoomLevel += 1;
                        }
                    },
                },
                {
                    label: '缩小',
                    accelerator: 'CmdOrCtrl+-',
                    click: () => {
                        if (mainWindow) {
                            mainWindow.webContents.zoomLevel -= 1;
                        }
                    },
                },
            ],
        },
        {
            label: '帮助',
            submenu: [
                {
                    label: '使用文档',
                    click: async () => {
                        const {shell} = require('electron');
                        await shell.openExternal('https://yourdomain.com/docs');
                    },
                },
                {
                    label: '检查更新',
                    click: () => {
                        checkForUpdates();
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

// 显示关于对话框
function showAboutDialog() {
    const version = getAppVersion();
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '关于 zDrink POS',
        message: `zDrink POS`,
        detail: `版本：${version}

智能餐饮管理系统

© 2026 zDrink`,
        buttons: ['确定'],
    });
}

// 检查更新
function checkForUpdates() {
    // 这里可以集成 electron-updater 实现自动更新
    dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: '检查更新',
        message: '当前已是最新版本',
        detail: `当前版本：${getAppVersion()}`,
        buttons: ['确定'],
    });
}

// Electron 初始化
app.whenReady().then(() => {
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

// 所有窗口关闭时退出应用（macOS 除外）
app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// 安全限制：禁止导航到外部 URL
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, navigationContext) => {
        const {url} = navigationContext;
        const parsedUrl = new URL(url);

        // 只允许应用内部的导航
        if (isDev && parsedUrl.origin === 'http://localhost:3000') {
            return;
        }

        // 阻止其他所有导航
        event.preventDefault();
    });

    // 阻止新窗口打开
    contents.setWindowOpenHandler(() => {
        return {action: 'deny'};
    });
});

// IPC 通信处理
ipcMain.on('get-app-version', (event) => {
    event.reply('app-version', getAppVersion());
});

ipcMain.on('minimize-window', () => {
    if (mainWindow) {
        mainWindow.minimize();
    }
});

ipcMain.on('maximize-window', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});

ipcMain.on('close-window', () => {
    if (mainWindow) {
        mainWindow.close();
    }
});

// 导出函数供其他模块使用
module.exports = {getAppVersion};
