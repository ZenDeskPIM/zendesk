/**
 * Ponto de entrada do frontend.
 *
 * Responsabilidades
 * - Montar a aplicação dentro de <StrictMode> com I18nProvider.
 * - Registrar Service Worker (sw.js) após load para PWA/offline básico.
 * - Configurar StatusBar no Android via Capacitor (cor, overlay e estilo).
 */
import { createRoot } from 'react-dom/client'
import { Capacitor } from '@capacitor/core'
import { StatusBar, Style as StatusBarStyle } from '@capacitor/status-bar'
import App from './App.tsx'
import './index.css'
import React from 'react'
import { I18nProvider } from './i18n/provider'

const container = document.getElementById('root')
if (container) {
    createRoot(container).render(
        <React.StrictMode>
            <I18nProvider>
                <App />
            </I18nProvider>
        </React.StrictMode>
    );
}
if ('serviceWorker' in navigator && window.location.protocol !== 'file:') {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').catch(console.error);
    });
}

// Configure StatusBar for Android so content doesn't go under the system bar
if (Capacitor.getPlatform() === 'android') {
    const applyStatusBarFallback = () => {
        const viewportOffsets = [
            window.visualViewport?.offsetTop ?? 0,
            window.visualViewport?.pageTop ?? 0,
            (window.screen as Screen & { availTop?: number }).availTop ?? 0,
        ];
        const measuredInset = Math.max(...viewportOffsets, 0);
        const isPortrait = window.matchMedia?.('(orientation: portrait)').matches ?? window.innerHeight >= window.innerWidth;
        const baseFallback = isPortrait ? 48 : 24;
        const fallbackPx = Math.max(measuredInset, baseFallback);
        document.documentElement.style.setProperty('--status-bar-fallback', `${fallbackPx}px`);
    };
    const LISTENER_FLAG = '__appStatusBarListenersAttached';

    (async () => {
        try {
            await StatusBar.setOverlaysWebView({ overlay: false });
            await StatusBar.setBackgroundColor({ color: '#0f1115' });
            // Use light icons on a dark background for better contrast
            await StatusBar.setStyle({ style: StatusBarStyle.Light });
        } catch (e) {
            // ignore if not available
        }

        // Garantir que o topo respeite a barra de status mesmo se o overlay continuar ativo.
        applyStatusBarFallback();
        if (!(window as Record<string, unknown>)[LISTENER_FLAG]) {
            window.visualViewport?.addEventListener('resize', applyStatusBarFallback);
            window.addEventListener('orientationchange', applyStatusBarFallback);
            (window as Record<string, unknown>)[LISTENER_FLAG] = true;
        }
    })();
}