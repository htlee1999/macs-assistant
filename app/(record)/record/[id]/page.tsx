import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { auth } from '@/app/(auth)/auth';
import { EmailDraftingPage } from '@/components/editor/email-drafting';
import { DEFAULT_MODEL_NAME, models } from '@/lib/ai/models';
import { getRecordById } from '@/lib/db/queries';

export default async function Page(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { id } = params;
  
  const session = await auth();
  if (!session?.user?.id) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Get all records and find the specific one
  const record = await getRecordById({ id: id });

  if (!record) {
    notFound();
  }

  const cookieStore = await cookies();
  const modelIdFromCookie = cookieStore.get('model-id')?.value;
  const selectedModelId =
    models.find((model) => model.id === modelIdFromCookie)?.id ||
    DEFAULT_MODEL_NAME;

  const details = {
    id: record.id,
    title: record.caseType + ' at ' + record.location,
    content: record.message,
    summary: record.summary
  }

  return (
    <EmailDraftingPage
      id={record.id}
      details={details}
      selectedModelId={selectedModelId}

    />
  );
}