"use client";

import Link from "next/link";

export function InlineLogo({
  className = "h-8 w-auto",
}: {
  className?: string;
}) {
  return (
    <Link href="/" className="flex items-center">
      <svg
        className={className}
        viewBox="0 0 264.46 64.25"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <style>{`.cls-1 { fill: #0032ff; }`}</style>
        </defs>
        <g>
          <path d="M113.23,52.51v-17.87h-14.71v17.87h-9.79V11.73h9.79v14.99h14.71v-14.99h9.85v40.78h-9.85Z" />
          <path d="M131.29,52.51V11.73h8.84v40.78h-8.84Z" />
          <path d="M146.44,52.51V11.73h8.84v40.78h-8.84Z" />
          <path d="M162.93,52.51V11.73h16.13c11.29,0,19.35,7.55,19.35,19.96s-7.26,20.82-18.05,20.82h-17.43ZM178.44,44.78c7.26,0,10.11-4.24,10.11-13.08s-2.73-12.1-10.86-12.1h-5.46v25.18h6.2Z" />
          <path d="M203.8,52.51V11.73h28.16v7.92h-19.61v7.55h17.96v7.98h-17.96v9.27h20.52v8.05h-29.07Z" />
          <path d="M237.5,52.51V11.73h8.84v32.49h18.13v8.29h-26.96Z" />
          <g>
            <path
              className="cls-1"
              d="M0,0c17.74,0,32.12,14.38,32.12,32.12S17.74,64.25,0,64.25V0Z"
            />
            <path
              className="cls-1"
              d="M64.25,0C46.51,0,32.12,14.38,32.12,32.12c0,17.74,14.38,32.12,32.12,32.12V0Z"
            />
          </g>
        </g>
      </svg>
    </Link>
  );
}
