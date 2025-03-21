import { auth } from '@/app/(auth)/auth';
import { getPreferencesByUserId, savePreferencesByUserId } from '@/lib/db/queries';

export async function GET() {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  // biome-ignore lint: Forbidden non-null assertion.
  const settings = await getPreferencesByUserId({ id: session.user.id! });
  return Response.json(settings);
}

export async function POST(req: Request) {
  const session = await auth();

  if (!session || !session.user) {
    return Response.json('Unauthorized!', { status: 401 });
  }

  try {
    // Extract data from the request body
    const data = await req.json();

    // Data structure from the form submission
    const {
      alwaysRetrieveDrafts,
      greetings,
      closing,
      name,
      role,
      position,
      department,
      telephone,
      links,
      closingMessage,
      confidentialityMessage,
    } = data;

    // Example validation: Ensure required fields are provided
    if (!name || !role) {
      return Response.json('Name and Role are required.', { status: 400 });
    }

    // Save preferences (using a save function you would have in your DB queries)
    await savePreferencesByUserId({
      userId: session.user.id!,
      preferences: {
        alwaysRetrieveDrafts,
        greetings,
        closing,
        name,
        role,
        position,
        department,
        telephone,
        links,
        closingMessage,
        confidentialityMessage,
      },
    });

    // Return success response
    return Response.json('Preferences saved successfully.', { status: 200 });
  } catch (error) {
    console.error('Error saving preferences:', error);
    return Response.json('An error occurred while saving preferences.', { status: 500 });
  }
}
