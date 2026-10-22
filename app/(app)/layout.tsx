import { ProgressProvider } from "@/components/ProgressProvider";
import { requireViewer } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SignedInLayout({ children }: { children: React.ReactNode }) {
  const { user } = await requireViewer();
  // Keyed by user so switching accounts on one device starts a fresh queue for the new user.
  return (
    <ProgressProvider key={user.id} userId={user.id}>
      {children}
    </ProgressProvider>
  );
}
