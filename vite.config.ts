import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

function astroHogarSafetyTransform() {
  return {
    name: 'astrohogar-safety-transform',
    transform(code: string, id: string) {
      if (!id.endsWith('/src/App.tsx')) return null;

      let next = code;

      next = next.replace(
        'const code = home?.code || localStorage.getItem("astro_home_code") || "HOGARPELUDO";',
        'const code = home?.code || localStorage.getItem("astro_home_code") || "";'
      );

      next = next.replace(
        '  const forceFullDataRefresh = async () => {\n    setIsLoading(true);',
        '  const forceFullDataRefresh = async () => {\n    const activeHomeCode = localStorage.getItem("astro_home_code") || "";\n    if (!activeHomeCode) {\n      setHome(null);\n      setUsers([]);\n      setIsLoading(false);\n      return;\n    }\n    setIsLoading(true);'
      );

      next = next.replace(
        'const code = localStorage.getItem("astro_home_code") || home?.code || "HOGARPELUDO";',
        'const code = localStorage.getItem("astro_home_code") || home?.code || "";'
      );

      return next === code ? null : { code: next, map: null };
    },
  };
}

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss(), astroHogarSafetyTransform()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    build: {
      minify: false,
      sourcemap: true,
    },
    server: {
      hmr: false,
      watch: null,
    },
  };
});
