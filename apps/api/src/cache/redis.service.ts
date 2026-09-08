import { Injectable } from '@nestjs/common';
import { Socket } from 'node:net';

@Injectable()
export class RedisService {
  async ping(): Promise<boolean> {
    const redisUrl = process.env.REDIS_URL;
    if (!redisUrl) return false;

    const url = new URL(redisUrl);
    const port = Number(url.port || 6379);
    const host = url.hostname;
    const password = decodeURIComponent(url.password);

    return new Promise((resolve) => {
      const socket = new Socket();
      let settled = false;

      const finish = (connected: boolean) => {
        if (settled) return;
        settled = true;
        socket.destroy();
        resolve(connected);
      };

      socket.setTimeout(1000);
      socket.once('error', () => finish(false));
      socket.once('timeout', () => finish(false));
      socket.once('connect', () => {
        const commands = password
          ? `*2\r\n$4\r\nAUTH\r\n$${Buffer.byteLength(password)}\r\n${password}\r\n*1\r\n$4\r\nPING\r\n`
          : '*1\r\n$4\r\nPING\r\n';
        socket.write(commands);
      });
      socket.on('data', (data) => {
        const response = data.toString('utf8');
        finish(response.includes('+PONG'));
      });
      socket.connect(port, host);
    });
  }
}
