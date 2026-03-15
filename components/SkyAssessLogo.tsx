"use client"

import Image from "next/image"

export default function SkyAssessLogo({
  className = "h-10 w-10",
  alt = "SkyAssess logo",
  framed = true,
}: {
  className?: string
  alt?: string
  framed?: boolean
}) {
  return (
    <div
      className={`relative overflow-hidden shrink-0 ${
        framed
          ? "rounded-[1.6rem] border border-white/35 bg-[linear-gradient(145deg,rgba(255,255,255,0.20),rgba(255,255,255,0.08))] p-2 shadow-[0_20px_44px_rgba(15,23,42,0.28)] backdrop-blur-md"
          : ""
      } ${className}`}
    >
      {framed ? (
        <>
          <div className="absolute inset-0 rounded-[inherit] bg-[radial-gradient(circle_at_top_left,rgba(255,255,255,0.28),transparent_48%)]" />
          <div className="absolute inset-[5%] rounded-[1.25rem] border border-[#fca5a5]/55 bg-[linear-gradient(180deg,#eff6ff_0%,#dbeafe_46%,#bfdbfe_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.65)]" />
          <div className="absolute inset-x-[18%] top-[7%] h-[8%] rounded-full bg-red-400/35 blur-md" />
        </>
      ) : null}
      <div className={`${framed ? "absolute inset-[13%]" : "absolute inset-0"}`}>
        <Image
          src="/skyassess_logo.png"
          alt={alt}
          fill
          sizes="128px"
          className="object-contain"
          priority
        />
      </div>
    </div>
  )
}
