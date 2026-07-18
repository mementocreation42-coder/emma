// framer-motion feature bundle isolated in its own module so the bundler can
// code-split it out of the initial JS (official LazyMotion pattern).
// domMax is needed for the media modal's drag/swipe navigation.
import { domMax } from "framer-motion";
export default domMax;
