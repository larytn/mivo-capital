import Image from "next/image";

export function MivoMark({
  className = "",
  size,
}: {
  className?: string;
  size?: number;
}) {
  return (
    <span
      className={`mivo-mark ${className}`}
      style={size ? { width: size, height: size } : undefined}
      aria-hidden="true"
    >
      <Image
        src="/brand/mivo-mark.png"
        alt=""
        width={132}
        height={132}
        sizes={size ? `${size}px` : "44px"}
        className="mivo-mark-image"
      />
    </span>
  );
}
