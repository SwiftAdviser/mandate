import '../css/app.css';
import { createInertiaApp } from '@inertiajs/react';
import { PrivyProvider } from '@privy-io/react-auth';
import { createRoot } from 'react-dom/client';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';

const appName = (window as any).__APP_NAME__ ?? 'Mandate';
const PRIVY_APP_ID = (window as any).__PRIVY_APP_ID__ ?? 'cmmjadjn101kp0cjylc0ce4hj';

createInertiaApp({
    title: (title) => (title ? `${title} — ${appName}` : appName),
    resolve: (name) =>
        resolvePageComponent(
            `./pages/${name}.tsx`,
            (import.meta as any).glob('./pages/**/*.tsx'),
        ),
    setup({ el, App, props }) {
        createRoot(el).render(
            <PrivyProvider
                appId={PRIVY_APP_ID}
                config={{
                    appearance: {
                        theme: 'dark',
                        accentColor: '#f59e0b',
                        logo: '',
                    },
                    loginMethods: ['email', 'wallet', 'google'],
                }}
            >
                <App {...props} />
            </PrivyProvider>,
        );
    },
    progress: { color: '#f59e0b' },
});
