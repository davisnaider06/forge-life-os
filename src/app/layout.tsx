import type {Metadata,Viewport} from 'next';
import {ForgeProvider} from '@/components/store';
import './globals.css';
export const metadata:Metadata={title:'FORGE — Cada dia conta.',description:'Metas, rotina e finanças. Seu progresso ganha forma.',applicationName:'FORGE',appleWebApp:{capable:true,statusBarStyle:'black-translucent',title:'FORGE'},icons:{icon:'/icon.svg',apple:'/icons/apple-touch-icon.png'},manifest:'/manifest.webmanifest'};
export const viewport:Viewport={width:'device-width',initialScale:1,maximumScale:1,userScalable:false,viewportFit:'cover',themeColor:'#080c0d'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="pt-BR"><body><ForgeProvider>{children}</ForgeProvider></body></html>;}
