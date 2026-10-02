import { Suspense } from "react";
import { PracticeScreen } from "./PracticeScreen";

export default function PracticePage() {
  // The options are read from the URL in the browser, so the page itself stays static.
  return (
    <Suspense fallback={null}>
      <PracticeScreen />
    </Suspense>
  );
}
