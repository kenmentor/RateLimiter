import Redis from "ioredis";
type user = { token: string[]; lastupdate: number };

class MemoryAdapter {
  user_store: Record<string, { token: string[]; lastupdate: number }>;

  constructor() {
    this.user_store = {};
  }
  create(user_ip: string, data: any) {
    this.user_store[user_ip] = data;
  }

  find(user_ip: string) {
    return this.user_store[user_ip];
  }

  pushToken(user_ip: string, tokens: string[]) {
    this.user_store[user_ip].token.push(...tokens);
  }

  get(user_ip: string): user {
    return this.user_store[user_ip];
  }
  setLastime(user_ip: string, time: number) {
    this.user_store[user_ip].lastupdate = time;
    console.log(` updatelastime:${this.user_store[user_ip].lastupdate}`);
  }
  popToken(user_ip: string): string | undefined {
    return this.user_store[user_ip].token.pop();
  }
  getTokenLength(user_ip: string): number {
    return this.user_store[user_ip].token.length;
  }
}

class RedisAdapter {
  private client: Redis;

  constructor(redisUrl = "redis://127.0.0.1:6379") {
    this.client = new Redis(redisUrl);
  }

  // Key helper to scope user records in Redis
  private getKey(user_ip: string): string {
    return `rate_limit:${user_ip}`;
  }

  async create(user_ip: string, data: user): Promise<void> {
    const key = this.getKey(user_ip);
    await this.client.hset(key, {
      tokens: JSON.stringify(data.token),
      lastupdate: data.lastupdate.toString(),
    });
  }

  async find(user_ip: string): Promise<user | null> {
    return this.get(user_ip);
  }

  async get(user_ip: string): Promise<user | null> {
    const key = this.getKey(user_ip);
    const data = await this.client.hgetall(key);

    if (!data || !data.tokens) {
      return null;
    }

    return {
      token: JSON.parse(data.tokens),
      lastupdate: parseInt(data.lastupdate, 10),
    };
  }

  async pushToken(user_ip: string, tokens: string[]): Promise<void> {
    const user = await this.get(user_ip);
    if (!user) return;

    const updatedTokens = [...user.token, ...tokens];
    const key = this.getKey(user_ip);
    await this.client.hset(key, "tokens", JSON.stringify(updatedTokens));
  }

  async setLastime(user_ip: string, time: number): Promise<void> {
    const key = this.getKey(user_ip);
    await this.client.hset(key, "lastupdate", time.toString());
  }

  async popToken(user_ip: string): Promise<string | undefined> {
    const user = await this.get(user_ip);
    if (!user || user.token.length === 0) return undefined;

    const poppedToken = user.token.pop();
    const key = this.getKey(user_ip);
    await this.client.hset(key, "tokens", JSON.stringify(user.token));

    return poppedToken;
  }

  async getTokenLength(user_ip: string): Promise<number> {
    const user = await this.get(user_ip);
    return user ? user.token.length : 0;
  }
}

export { MemoryAdapter, RedisAdapter };
