import http from "http";

let serverReady: Promise<void> | null = null;

async function ensureServer() {
  if (!serverReady) {
    serverReady = (async () => {
      await import("../server");
      for (let i = 0; i < 50; i++) {
        try {
          await new Promise<void>((resolve, reject) => {
            const req = http.get("http://127.0.0.1:3000/api/home-data", (res) => {
              res.resume();
              res.statusCode && res.statusCode < 500 ? resolve() : reject(new Error("Server not ready"));
            });
            req.on("error", reject);
            req.setTimeout(200, () => {
              req.destroy();
              reject(new Error("timeout"));
            });
          });
          return;
        } catch {
          await new Promise((resolve) => setTimeout(resolve, 200));
        }
      }
      throw new Error("Express server did not start on port 3000");
    })();
  }
  return serverReady;
}

export default async function handler(req: any, res: any) {
  try {
    await ensureServer();

    const chunks: Buffer[] = [];
    for await (const chunk of req) chunks.push(Buffer.from(chunk));
    const body = Buffer.concat(chunks);

    await new Promise<void>((resolve, reject) => {
      const proxyReq = http.request(
        {
          hostname: "127.0.0.1",
          port: 3000,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: "127.0.0.1:3000",
            "content-length": body.length,
          },
        },
        (proxyRes) => {
          res.statusCode = proxyRes.statusCode || 500;
          for (const [key, value] of Object.entries(proxyRes.headers)) {
            if (value !== undefined) res.setHeader(key, value as any);
          }
          proxyRes.pipe(res);
          proxyRes.on("end", resolve);
          proxyRes.on("error", reject);
        }
      );
      proxyReq.on("error", reject);
      if (body.length && req.method !== "GET" && req.method !== "HEAD") proxyReq.write(body);
      proxyReq.end();
    });
  } catch (error: any) {
    console.error("Vercel Express bridge error:", error);
    res.statusCode = 500;
    res.setHeader("content-type", "application/json");
    res.end(JSON.stringify({ error: error?.message || "Backend unavailable" }));
  }
}
