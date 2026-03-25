/**
 * Electron 预加载脚本
 * 在渲染进程和主进程之间建立安全的通信桥梁
 */

const {contextBridge, ipcRenderer} = require('electron');

// 暴露安全的 API 给渲染进程
contextBridge.exposeInMainWorld('electronAPI', {
    // 应用版本
    getAppVersion: () => ipcRenderer.invoke('get-app-version'),

    // 窗口控制
    minimizeWindow: () => ipcRenderer.send('minimize-window'),
    maximizeWindow: () => ipcRenderer.send('maximize-window'),
    closeWindow: () => ipcRenderer.send('close-window'),

    // 系统信息
    platform: process.platform,
    isElectron: true,

    // 自定义事件监听
    onAppVersionUpdate: (callback) => ipcRenderer.on('app-version', callback),
});

// 类型声明（TypeScript 支持）
if (typeof window !== 'undefined') {
    window.electronAPI = {
        getAppVersion: () => ipcRenderer.invoke('get-app-version'),
        minimizeWindow: () => ipcRenderer.send('minimize-window'),
        maximizeWindow: () => ipcRenderer.send('maximize-window'),
        closeWindow: () => ipcRenderer.send('close-window'),
        platform: process.platform,
        isElectron: true,
        onAppVersionUpdate: (callback) => ipcRenderer.on('app-version', callback),
    };
}
