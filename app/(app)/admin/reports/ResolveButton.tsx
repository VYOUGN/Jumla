"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { setReportStatus } from "../actions";

export function ResolveButton({ id, resolved }: { id: string; resolved: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="btn btn-ghost btn-sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setReportStatus(id, !resolved);
          router.refresh();
        })
      }
    >
      {resolved ? "إعادة فتح" : "تم الحل ✓"}
    </button>
  );
}
