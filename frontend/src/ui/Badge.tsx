import { HTMLAttributes } from "react";

type Color = "blue" | "green" | "yellow" | "red" | "gray";

interface Props extends HTMLAttributes<HTMLSpanElement> {
  color?: Color;
}

const colorCls: Record<Color, string> = {
  blue: "bg-orange-50 text-orange-700 ring-orange-600/20",
  green: "bg-green-50 text-green-700 ring-green-600/20",
  yellow: "bg-yellow-50 text-yellow-700 ring-yellow-600/20",
  red: "bg-red-50 text-red-700 ring-red-600/20",
  gray: "bg-gray-50 text-gray-600 ring-gray-500/20",
};

export default function Badge({ color = "gray", className = "", children, ...rest }: Props) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${colorCls[color]} ${className}`}
      {...rest}
    >
      {children}
    </span>
  );
}
