export interface Env {
  DB: D1Database;
  JWT_SECRET: string;
  CORS_ORIGINS: string;
}

export interface JwtPayload {
  sub: string;
  email: string;
  role: string;
  fullName: string;
  iat: number;
  exp: number;
}

export type AppEnv = {
  Bindings: Env;
  Variables: {
    jwtPayload: JwtPayload;
  };
};
