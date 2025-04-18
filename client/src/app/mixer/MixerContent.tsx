import { Suspense } from 'react';
import MixerContent from './MixerContent';

export default function Page() {
  return (
    <Suspense fallback={<div>Loading mixer...</div>}>
      <MixerContent />
    </Suspense>
  );
}
