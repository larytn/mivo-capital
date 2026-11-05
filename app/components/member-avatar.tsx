import Image from "next/image";

export function MemberAvatar({
  name,
  imageUrl,
  size = 36,
  className = "",
}: {
  name: string;
  imageUrl: string | null;
  size?: number;
  className?: string;
}) {
  const initials = name.trim().slice(0, 1).toUpperCase() || "T";

  return (
    <span
      className={`member-avatar ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {imageUrl ? (
        <Image src={imageUrl} alt="" fill sizes={`${size}px`} unoptimized className="object-cover" />
      ) : (
        initials
      )}
    </span>
  );
}
