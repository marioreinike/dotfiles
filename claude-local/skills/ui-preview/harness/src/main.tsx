import { installNetworkMocks } from "./network";

// Network mocks must be in place before any app module (and its axios
// instances) is evaluated, so the runtime and scenarios load dynamically.
installNetworkMocks();

const scenarios = import.meta.glob("/scenarios/**/*.preview.tsx");

void import("./runtime").then(({ bootstrap }) => bootstrap(scenarios));
