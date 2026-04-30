import { Suspense } from "react";
import JobsCardClient from "./JobsCardClient";

export default function JobsCardPage() {
  return (
    <Suspense
      fallback={
        <div className="px-5 py-8 text-[12px]" style={{ color: "var(--text3)" }}>
          Loading…
        </div>
      }
    >
      <JobsCardClient />
    </Suspense>
  );
}

