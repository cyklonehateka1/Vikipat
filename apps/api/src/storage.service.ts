import { randomUUID } from 'crypto';
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { DeleteObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ARTWORK_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);

const EXTENSIONS: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

/**
 * Cloudflare R2 via the S3 API. Uploads used to land on the API container's
 * local disk, which meant a redeploy silently took every customer's artwork
 * with it — object storage keeps the files independent of the process.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private client: S3Client | null = null;

  get configured(): boolean {
    return Boolean(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
  }

  private get bucket(): string {
    return process.env.S3_BUCKET || 'vikipat-media';
  }

  private s3(): S3Client {
    if (!this.client) {
      this.client = new S3Client({
        endpoint: process.env.S3_ENDPOINT,
        region: process.env.S3_REGION || 'auto',
        credentials: {
          accessKeyId: process.env.S3_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || '',
        },
        forcePathStyle: process.env.S3_FORCE_PATH_STYLE !== 'false',
      });
    }
    return this.client;
  }

  /**
   * The browser-facing address of a stored object. R2 buckets are served
   * through a public bucket URL or a custom domain, configured separately
   * from the S3 API endpoint used for writes.
   */
  publicUrl(key: string): string {
    const base = (process.env.S3_PUBLIC_URL || `${process.env.S3_ENDPOINT}/${this.bucket}`).replace(/\/$/, '');
    return `${base}/${key}`;
  }

  async upload(
    file: { buffer: Buffer; mimetype: string; originalname: string; size: number },
    options: { prefix: string; kind: 'image' | 'artwork' },
  ): Promise<{ url: string; key: string; name: string }> {
    const allowed = options.kind === 'image' ? IMAGE_TYPES : ARTWORK_TYPES;
    if (!allowed.has(file.mimetype)) {
      throw new BadRequestException(
        options.kind === 'image'
          ? 'Image must be JPG, PNG or WebP'
          : 'Artwork must be PDF, JPG, PNG or WebP',
      );
    }

    // A random key, not the customer's filename: predictable keys would let
    // anyone who works out the pattern fetch other customers' artwork.
    const extension = EXTENSIONS[file.mimetype] || '';
    const key = `${options.prefix}/${randomUUID()}${extension}`;

    await this.s3().send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentLength: file.size,
        // The original name travels as metadata so production staff can still
        // see what the customer called the file.
        Metadata: { 'original-name': encodeURIComponent(file.originalname).slice(0, 180) },
      }),
    );

    return { url: this.publicUrl(key), key, name: file.originalname };
  }

  async delete(key: string): Promise<void> {
    try {
      await this.s3().send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
    } catch (error) {
      // The database row is what the application reads; a stranded object is
      // not worth failing the caller over.
      this.logger.warn(`Could not delete ${key}: ${error instanceof Error ? error.message : error}`);
    }
  }
}
