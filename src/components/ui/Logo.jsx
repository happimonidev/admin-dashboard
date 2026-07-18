// Placeholder brand mark — an "AC" monogram built from the brand palette.
// Swap this file's SVG for a real logo asset later; every consumer
// (Sidebar, AppLayout, Login, VerifyOtp) renders through this one component,
// so replacing the mark or wordmark only needs to happen in one place.

import logo from "../../assets/logo.png";

const SIZES = {
  sm: { box: 28, text: 'text-[11px]' },
  md: { box: 36, text: 'text-sm' },
  lg: { box: 48, text: 'text-base' },
};

export default function Logo({
  size = 'md',
  withWordmark = true,
  wordmarkPlacement = 'right', // 'right' | 'bottom'
  className = '',
}) {
  const { box, text } = SIZES[size];

  const mark = (
  <img
    src={logo}
    alt="AppCredit logo"
    width={box}
    height={box}
    className="shrink-0 object-contain"
  />
);

  if (!withWordmark) {
    return <div className={className}>{mark}</div>;
  }

  return (
    <div
      className={`flex items-center gap-2.5 ${
        wordmarkPlacement === 'bottom' ? 'flex-col gap-1.5' : ''
      } ${className}`}
    >
      {mark}
      <span className="text-[10px] font-normal text-ink-900">AppCredit</span>
    </div>
  );
}
