// app/page.tsx
import { cookies } from 'next/headers';
import { DEFAULT_MODEL_NAME, models } from '@/lib/ai/models';
import { Landing } from '@/components/landing';

export default async function Page() {
  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('model-id')?.value;

  const selectedModelId =
    models.find((model) => model.id === modelIdFromCookie)?.id ||
    DEFAULT_MODEL_NAME;

  return <Landing selectedModelId={selectedModelId} />;
}