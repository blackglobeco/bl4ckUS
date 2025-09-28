import path from "path";

export function getLogPath() {
  if (process.env.VERCEL) {
    // Running on Vercel → must use /tmp
    return path.join("/tmp", "log.txt");
  } else {
    // Local or other server → use views/log.txt
    return path.join(process.cwd(), "views", "log.txt");
  }
}
