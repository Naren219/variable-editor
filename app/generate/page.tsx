// export const dynamic = 'force-dynamic';

import GenerateClient from "./GenerateClient";
import { Suspense } from "react";

const GeneratePage: React.FC = () => {
  return (
    <Suspense fallback={<p>Loading...</p>}>
      <GenerateClient />
    </Suspense>
  );
};

export default GeneratePage;
