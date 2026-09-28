import type { AnchorHTMLAttributes } from "react";

export default function MockLink(
  props: AnchorHTMLAttributes<HTMLAnchorElement> & { prefetch?: boolean },
) {
  const { prefetch, ...anchorProps } = props;
  void prefetch;
  return <a {...anchorProps} />;
}
