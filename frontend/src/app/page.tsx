import {redirect} from 'next/navigation';

export default function Home() {
    // 重定向到 /home 页面
    redirect('/home');
}
