# upiconnect

Pequeña guía rápida para configurar y usar el cliente de Supabase en este proyecto Next.js.

## Resumen

Este proyecto usa Next.js (App Router, TypeScript) y Supabase para la capa de datos y autenticación. Un cliente Supabase ya fue creado en `src/lib/supabaseClient.ts` y está listo para importarse y usarse en la aplicación.

## Variables de entorno

Debes crear un archivo `.env.local` en la raíz del proyecto (no lo subas al repositorio). Las variables necesarias son:

- `NEXT_PUBLIC_SUPABASE_URL` — la URL del proyecto Supabase (ej: `https://<tu-referencia>.supabase.co`)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — la clave anónima pública (string largo)

Ejemplo (.env.local):

```
NEXT_PUBLIC_SUPABASE_URL=https://<tu-referencia>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu_anon_key_aqui>
```

Nota: este repositorio incluye `.env.local` en `.gitignore` para evitar subir credenciales.

## Uso del cliente Supabase

El cliente ya está inicializado en `src/lib/supabaseClient.ts` y exporta `supabase`:

```ts
import { supabase } from '@/lib/supabaseClient'; // si tienes alias @ configurado
// o
import { supabase } from '../lib/supabaseClient'; // ruta relativa desde componentes

// ejemplo simple:
async function ejemplo() {
  const { data, error } = await supabase.from('users').select('*');
  if (error) {
    console.error('Supabase error', error);
    return;
  }
  console.log('Datos', data);
}
```

No hay lógica adicional en el cliente; solamente importa y usa `supabase` como se muestra.

## Scripts útiles

Ejecuta los siguientes comandos desde la carpeta `upiconnect`:

```
npm run dev        # correr la app en desarrollo (Next.js)
npm run build      # construir para producción
npm start          # iniciar servidor de producción
npm run lint       # correr ESLint
npm test           # ejecutar pruebas con Vitest
```

## Tests (Vitest)

Vitest ya está instalado y configurado con `jsdom`. Hay un archivo de setup en `src/setupTests.ts` que carga `@testing-library/jest-dom`.

Para ejecutar pruebas en modo watch:

```
npm run test:watch
```

## Seguridad y buenas prácticas

- No subas claves ni archivos `.env.local` al repositorio. Usa secrets del servicio de CI o el panel de Supabase para variables de producción.
- Trata la `ANON_KEY` como pública en el cliente (así la provee Supabase), pero no añadas claves de servicio/admín en el frontend.

---

Si quieres, puedo añadir ejemplos adicionales (autenticación con `supabase.auth`, hooks personalizados, o tests unitarios que mockeen `supabase`)—dime cuál prefieres.
This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
