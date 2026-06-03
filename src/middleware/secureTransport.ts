import { RequestHandler } from "express";
import helmet from "helmet";

export function enforceHttpsInProduction(): RequestHandler {
  return (req, res, next) => {
    const forwardedProto = req.headers["x-forwarded-proto"];
    const isHttps = req.secure || forwardedProto === "https";

    // En produccion forzamos HTTPS para proteger credenciales, formularios e imagenes contra escucha o manipulacion.
    if (process.env.NODE_ENV === "production" && !isHttps) {
      return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
    }

    next();
  };
}

export function secureHttpHeaders(): RequestHandler {
  const isProduction = process.env.NODE_ENV === "production";

  return helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        baseUri: ["'self'"],
        objectSrc: ["'none'"],
        frameAncestors: ["'none'"],
        imgSrc: ["'self'", "https:", "data:", "blob:"],
        scriptSrc: isProduction ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        connectSrc: isProduction ? ["'self'"] : ["'self'", "ws:", "wss:"],
        upgradeInsecureRequests: isProduction ? [] : null,
      },
    },
    crossOriginEmbedderPolicy: false,
    hsts: isProduction
      ? {
          maxAge: 15552000,
          includeSubDomains: true,
          preload: false,
        }
      : false,
    referrerPolicy: { policy: "no-referrer" },
    xContentTypeOptions: true,
    xFrameOptions: { action: "deny" },
  });
}
