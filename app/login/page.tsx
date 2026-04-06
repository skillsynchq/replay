import { Nav } from "@/app/components/nav";
import { LoginForm } from "./login-form";

export default function LoginPage() {
  return (
    <div className="relative flex min-h-dvh flex-col">
      <Nav minimal />
      <div className="flex flex-1 items-center justify-center px-6 pb-[15vh]">
        {/* Blueprint guide lines */}
        <div className="pointer-events-none absolute inset-0 hidden min-[900px]:block" aria-hidden="true">
          <div className="absolute top-0 bottom-0 left-[max(0.25rem,calc((100vw-84rem)/2))] w-px border-l border-dashed border-fg/[0.06]" />
          <div className="absolute top-0 bottom-0 right-[max(0.25rem,calc((100vw-84rem)/2))] w-px border-r border-dashed border-fg/[0.06]" />
          <div className="absolute left-0 right-0 top-[56px] h-px border-t border-dashed border-fg/[0.06]" />
          <div className="absolute left-0 right-0 bottom-[120px] h-px border-b border-dashed border-fg/[0.06]" />
          <div className="absolute z-10 left-[max(0.25rem,calc((100vw-84rem)/2))] top-[56px] size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1918]" />
          <div className="absolute z-10 right-[max(0.25rem,calc((100vw-84rem)/2))] top-[56px] size-1.5 translate-x-1/2 -translate-y-1/2 rounded-full bg-[#1a1918]" />
          <div className="absolute z-10 left-[max(0.25rem,calc((100vw-84rem)/2))] bottom-[120px] size-1.5 -translate-x-1/2 translate-y-1/2 rounded-full bg-[#1a1918]" />
          <div className="absolute z-10 right-[max(0.25rem,calc((100vw-84rem)/2))] bottom-[120px] size-1.5 translate-x-1/2 translate-y-1/2 rounded-full bg-[#1a1918]" />
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
