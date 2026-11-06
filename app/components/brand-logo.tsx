import Image from "next/image";

type BrandLogoProps = {
  className?: string;
  priority?: boolean;
  tone?: "auto" | "dark";
};

export function BrandLogo({ className = "", priority = false, tone = "auto" }: BrandLogoProps) {
  return (
    <Image
      src="/brand/mivo-capital-logo-transparent.png"
      alt="Mivo Capital"
      width={2104}
      height={747}
      priority={priority}
      className={`brand-logo${tone === "dark" ? " brand-logo-on-dark" : ""} ${className}`}
    />
  );
}
