"use client";
import { useEffect, useState, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function NavigationEvents() {
    const pathname = usePathname();
    const searchParams = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [progress, setProgress] = useState(0);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const prevPathRef = useRef(pathname + searchParams.toString());

    useEffect(() => {
        const current = pathname + searchParams.toString();
        if (current !== prevPathRef.current) {
            setProgress(100);
            timerRef.current = setTimeout(() => {
                setLoading(false);
                setProgress(0);
            }, 300);
            prevPathRef.current = current;
        }
    }, [pathname, searchParams]);

    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            const target = (e.target as HTMLElement).closest("a");
            if (!target) return;
            const href = target.getAttribute("href");
            if (!href || href.startsWith("http") || href.startsWith("mailto") || href.startsWith("#") || target.getAttribute("target") === "_blank") return;

            setLoading(true);
            setProgress(15);

            let p = 15;
            timerRef.current = setInterval(() => {
                p += Math.random() * 15;
                if (p > 85) p = 85;
                setProgress(p);
            }, 200);
        };

        document.addEventListener("click", handleClick);
        return () => {
            document.removeEventListener("click", handleClick);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    if (!loading) return null;

    return (
        <>
            <div className="fixed top-0 left-0 right-0 z-[9999] h-0.5 bg-dark-800">
                <div
                    className="h-full transition-all duration-300 ease-out"
                    style={{
                        width: `${progress}%`,
                        background: "linear-gradient(90deg, #2B8FBF, #E8177A)",
                        boxShadow: "0 0 8px rgba(43,143,191,0.6)",
                    }}
                />
            </div>
            <div className="fixed top-4 right-4 z-[9999] flex items-center gap-2 bg-dark-800 border border-white/10 rounded-xl px-3 py-2 shadow-xl">
                <div
                    className="w-3.5 h-3.5 rounded-full border-2 border-transparent animate-spin"
                    style={{ borderTopColor: "#2B8FBF", borderRightColor: "#E8177A" }}
                />
                <span className="text-xs text-neutral-400 font-medium">A carregar...</span>
            </div>
        </>
    );
}

export default function NavigationLoader() {
    return (
        <Suspense fallback={null}>
            <NavigationEvents />
        </Suspense>
    );
}