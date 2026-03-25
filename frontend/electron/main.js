/**
 * Electron 主进程
 */

const {app, BrowserWindow, Menu, ipcMain} = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

let mainWindow;

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
        show: false, // 先隐藏，加载完成后再显示
    });

    // 加载应用
    if (isDev) {
        // 开发环境：加载 Next.js 开发服务器
        mainWindow.loadURL('http://localhost:3000');
        // 打开开发者工具
        mainWindow.webContents.openDevTools();
    } else {
        // 生产环境：加载构建后的应用
        mainWindow.loadFile(path.join(__dirname, '../.next/standalone/server.js'));
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
                        ipcMain.emit('show-about');
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
                        // 检查更新逻辑
                        console.log('检查更新...');
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
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
    event.reply('app-version', app.getVersion());
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
