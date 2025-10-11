import { useState } from 'react';

export const RenderErrorButton = () => {
  const [renderError, setRenderError] = useState(false);
  return (
    <>
      <button onClick={() => setRenderError((i) => !i)}>Render Error</button>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      {renderError && <div>{(null as any).toString()}</div>}
    </>
  );
};
