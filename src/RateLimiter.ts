import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";
import { MemoryAdapter, RedisAdapter } from "./StorageAdapter";

type UserRecord = { token: string[]; lastupdate: number };

class RateLimiter {
  token_count: number;
  update_time: number;
  storage: MemoryAdapter | RedisAdapter;

  storageTypes: {
    memory: typeof MemoryAdapter;
    redis: typeof RedisAdapter;
  };
  storageType: keyof RateLimiter["storageTypes"];

  constructor(
    token_count = 10,
    update_time = 0.001,
    storageType: keyof RateLimiter["storageTypes"] = "memory",
  ) {
    this.storageType = storageType;
    this.storageTypes = {
      memory: MemoryAdapter,
      redis: RedisAdapter,
    };
    this.token_count = token_count;
    this.update_time = update_time;
    this.storage = new this.storageTypes[storageType]();
  }

  async registerUser(user_ip: string): Promise<UserRecord> {
    let user = await this.storage.find(user_ip);
    if (!user) {
      user = {
        token: this.generateTokens(this.token_count),
        lastupdate: this.getCurrentTimestamp(),
      };
      await this.storage.create(user_ip, user);
    }
    return user;
  }

  getCurrentTimestamp(): number {
    return Date.now();
  }

  generateTokens(count: number): string[] {
    const tokens: string[] = [];
    for (let i = 0; i < count; i++) {
      tokens.push(Math.random().toString(36).substring(2, 6));
    }
    return tokens;
  }

  async addTokens(user_ip: string, tokens: string[]) {
    if (tokens.length === 0) return;
    const currentLength = await this.getTokenCount(user_ip);
    const remainingSpace = Math.max(0, this.token_count - currentLength);

    if (remainingSpace > 0) {
      const tokensToAdd = tokens.slice(0, remainingSpace);
      this.storage.pushToken(user_ip, tokensToAdd);
    }
  }

  public middleware() {
    return (req: Request, res: Response, next: NextFunction) => {
      const user_ip = req.ip || req.socket.remoteAddress || "unknown";
      void this.refillTokens(user_ip, req, res, next);
    };
  }

  async refillTokens(
    user_ip: string,
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    let user = await this.storage.get(user_ip);
    if (!user) {
      user = await this.registerUser(user_ip);
    }

    const now = this.getCurrentTimestamp();
    const time_diff = Math.max(0, now - user.lastupdate);
    let update_count = Math.floor(time_diff * this.update_time);

    if (update_count > this.token_count) {
      update_count = this.token_count;
    }

    if (update_count > 0) {
      await this.addTokens(user_ip, this.generateTokens(update_count));
      const timeConsumed = Math.floor(update_count / this.update_time);
      this.storage.setLastime(user_ip, user.lastupdate + timeConsumed);
    }

    if ((await this.getTokenCount(user_ip)) === 0) {
      return res
        .status(429)
        .json({ message: "Out of tokens. Try again later." });
    }

    this.storage.popToken(user_ip);
    next();
  }

  async getTokenCount(user_ip: string): Promise<number> {
    return await this.storage.getTokenLength(user_ip);
  }
}

export default RateLimiter;
