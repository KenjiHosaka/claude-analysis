import { getHandlers } from "@/lib/auth";

const { GET, POST } = await getHandlers();
export { GET, POST };
