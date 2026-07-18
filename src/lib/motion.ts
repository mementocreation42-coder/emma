// Loader for the shared framer-motion feature bundle. Passing this to
// <LazyMotion features={loadMotionFeatures}> keeps the animation engine
// out of the initial bundle; it loads in parallel right after hydration.
export const loadMotionFeatures = () =>
    import("./motion-features").then((mod) => mod.default);
