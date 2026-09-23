import type { AnchorHTMLAttributes } from "react";

export default function MockLink(props: AnchorHTMLAttributes<HTMLAnchorElement>) {
  return <a {...props} />;
}
